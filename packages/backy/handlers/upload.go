package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"verso/backy/features/page"
	"verso/backy/middleware"
	"verso/backy/shared/logger"
)

// maxUploadBytes bounds the in-memory buffer used for uploads to prevent
// unbounded memory consumption from a malicious multipart body.
const maxUploadBytes = 100 << 20 // 100 MiB

var (
	invalidBucketChars = regexp.MustCompile(`[^a-z0-9\-\.]`)
	consecutiveHyphens = regexp.MustCompile(`-+`)
	consecutiveDots    = regexp.MustCompile(`\.+`)
)

// inlineSafeMedia matches content types that are safe to serve inline.
var inlineSafeMedia = regexp.MustCompile(`^(image|video|audio)/`)

// setDownloadSecurityHeaders applies consistent content-type hardening to file
// serving responses: disable MIME sniffing and force a download disposition
// unless the content is a safe inline media type.
func setDownloadSecurityHeaders(c *gin.Context, contentType string) {
	c.Header("X-Content-Type-Options", "nosniff")
	if inlineSafeMedia.MatchString(contentType) {
		c.Header("Content-Disposition", "inline")
	} else {
		c.Header("Content-Disposition", "attachment")
	}
}

// SanitizeBucketName sanitizes space and page names into a valid S3 bucket name.
// S3 bucket names: 3-63 characters, lowercase letters, numbers, periods, and hyphens.
// Starts and ends with a letter or number.
func SanitizeBucketName(spaceName, pageName string) string {
	combined := fmt.Sprintf("%s-%s", spaceName, pageName)
	s := strings.ToLower(combined)
	s = invalidBucketChars.ReplaceAllString(s, "-")
	s = consecutiveHyphens.ReplaceAllString(s, "-")
	s = consecutiveDots.ReplaceAllString(s, ".")
	s = strings.Trim(s, "-.")

	if len(s) < 3 {
		s = "bucket-" + s
	}
	if len(s) > 63 {
		s = s[:63]
	}
	s = strings.Trim(s, "-.")
	return s
}

// UploadFile handles POST /api/console/upload.
// Accepts multipart/form-data with "file" and "pageId". The bucket and access
// scope are derived from the authenticated caller's resolved page, never from
// client-supplied space/page names.
func (h *Handlers) UploadFile(c *gin.Context) {
	logger.Log.Info().Msg("UploadFile handler entered")

	// Enforce the upload size limit before parsing the multipart body so
	// oversized requests are rejected without reading the full payload.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadBytes)

	// Read the multipart body fully into memory so it can be replayed to the
	// local fallback after an S3 failure and so the reported size is exact.
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		if strings.Contains(err.Error(), "request body too large") {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file exceeds size limit"})
			return
		}
		logger.Log.Warn().Err(err).Msg("failed to get file from request form")
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer func() { _ = file.Close() }()

	raw, err := io.ReadAll(io.LimitReader(file, maxUploadBytes+1))
	if err != nil {
		logger.Log.Error().Err(err).Msg("failed to read uploaded file into memory")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}
	if int64(len(raw)) > maxUploadBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file exceeds size limit"})
		return
	}
	size := int64(len(raw))

	attachmentID := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	uniqueFilename := fmt.Sprintf("%s%s", attachmentID, ext)

	// The storage bucket is derived from the resolved page identity and is
	// access-scoped. When a DB-backed page service is present we require a
	// valid pageId and verify write access before doing any work.
	if h.pageService != nil {
		pageID := c.PostForm("pageId")
		if pageID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "pageId is required"})
			return
		}

		p, err := h.pageService.GetPageByID(c.Request.Context(), pageID)
		if err != nil {
			if errors.Is(err, page.ErrPageNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
				return
			}
			logger.Log.Error().Err(err).Str("pageId", pageID).Msg("failed to resolve page for upload")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve page"})
			return
		}

		userID := middleware.GetCurrentUserID(c)
		canWrite, err := h.pageService.CanWrite(c.Request.Context(), p.SpaceID, userID)
		if err != nil {
			logger.Log.Error().Err(err).Str("pageId", pageID).Msg("upload permission check error")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "permission check failed"})
			return
		}
		if !canWrite {
			c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
			return
		}

		// Bucket identity is the canonical page ID: reversible for access
		// checks on download and immune to client-supplied name spoofing.
		bucketName := SanitizeBucketName(p.ID, "")
		h.uploadToStorage(c, bucketName, uniqueFilename, raw, header.Filename, size, attachmentID, ext)
		return
	}

	// Legacy / no-DB mode: bucket is derived from client names as before.
	spaceName := c.PostForm("spaceName")
	pageName := c.PostForm("pageName")
	if spaceName == "" {
		spaceName = "default"
	}
	if pageName == "" {
		pageName = "default"
	}
	bucketName := SanitizeBucketName(spaceName, pageName)

	logger.Log.Info().
		Str("bucketName", bucketName).
		Str("filename", header.Filename).
		Str("uniqueFilename", uniqueFilename).
		Int64("size", size).
		Msg("starting file upload process")

	h.uploadToStorage(c, bucketName, uniqueFilename, raw, header.Filename, size, attachmentID, ext)
}

// uploadToStorage writes the in-memory content to S3 (RustFS) when available and
// falls back to local storage on failure. Because the complete payload is held in
// raw, every S3/fallback attempt gets a fresh reader and is never truncated.
func (h *Handlers) uploadToStorage(c *gin.Context, bucketName, uniqueFilename string, raw []byte, originalFilename string, size int64, attachmentID, ext string) {
	if h.storageClient == nil {
		h.uploadLocal(c, bucketName, uniqueFilename, bytes.NewReader(raw), originalFilename, size, attachmentID)
		return
	}

	ctx := c.Request.Context()

	_, err := h.storageClient.S3().HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		logger.Log.Info().Str("bucket", bucketName).Msg("bucket does not exist, creating bucket")
		if _, createErr := h.storageClient.S3().CreateBucket(ctx, &s3.CreateBucketInput{
			Bucket: aws.String(bucketName),
		}); createErr != nil {
			logger.Log.Error().Err(createErr).Str("bucket", bucketName).Msg("failed to create bucket, falling back to local storage")
			h.uploadLocal(c, bucketName, uniqueFilename, bytes.NewReader(raw), originalFilename, size, attachmentID)
			return
		}
	}

	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if _, putErr := h.storageClient.S3().PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(uniqueFilename),
		Body:        bytes.NewReader(raw),
		ContentType: aws.String(contentType),
	}); putErr != nil {
		logger.Log.Error().Err(putErr).Str("bucket", bucketName).Str("key", uniqueFilename).Msg("failed to upload to S3, falling back to local storage")
		h.uploadLocal(c, bucketName, uniqueFilename, bytes.NewReader(raw), originalFilename, size, attachmentID)
		return
	}

	logger.Log.Info().Str("bucket", bucketName).Str("key", uniqueFilename).Msg("uploaded to S3 successfully")
	fileURL := fmt.Sprintf("/api/console/files/%s/%s", bucketName, uniqueFilename)
	c.JSON(http.StatusOK, gin.H{
		"id":       attachmentID,
		"url":      fileURL,
		"src":      fileURL,
		"fileName": originalFilename,
		"fileSize": size,
	})
}

func (h *Handlers) uploadLocal(c *gin.Context, bucketName, uniqueFilename string, file io.Reader, originalFilename string, size int64, attachmentID string) {
	uploadsDir := filepath.Join(".", "uploads", bucketName)
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		logger.Log.Error().Err(err).Str("dir", uploadsDir).Msg("failed to create local uploads directory")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file locally"})
		return
	}

	destPath := filepath.Join(uploadsDir, uniqueFilename)
	destFile, err := os.Create(destPath)
	if err != nil {
		logger.Log.Error().Err(err).Str("path", destPath).Msg("failed to create local file")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file locally"})
		return
	}
	defer func() { _ = destFile.Close() }()

	written, err := io.Copy(destFile, file)
	if err != nil {
		logger.Log.Error().Err(err).Str("path", destPath).Msg("failed to copy uploaded file content")
		_ = destFile.Close()
		_ = os.Remove(destPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write file locally"})
		return
	}
	if written != size {
		logger.Log.Error().Int64("written", written).Int64("expected", size).Str("path", destPath).Msg("uploaded file size mismatch")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write file locally"})
		return
	}

	logger.Log.Info().Str("path", destPath).Msg("saved file locally successfully")
	fileURL := fmt.Sprintf("/api/console/files/%s/%s", bucketName, uniqueFilename)
	c.JSON(http.StatusOK, gin.H{
		"id":       attachmentID,
		"url":      fileURL,
		"src":      fileURL,
		"fileName": originalFilename,
		"fileSize": size,
	})
}

// GetUploadedFile handles GET /api/console/files/:bucket/:filename.
// Streams the file from S3 (RustFS) if available, or reads it from local uploads.
// When a DB-backed page service is present, the bucket is the page ID and read
// access is enforced before any object is served.
func (h *Handlers) GetUploadedFile(c *gin.Context) {
	bucket := c.Param("bucket")
	filename := c.Param("filename")

	logger.Log.Debug().Str("bucket", bucket).Str("filename", filename).Msg("GetUploadedFile request received")

	// When a DB-backed page service is present, uploads are stored under the
	// page's UUID as the bucket, so read access can be enforced. Legacy
	// uploads used spaceSlug-pageSlug bucket names that are not page IDs;
	// those skip the access check and are served directly to preserve backward
	// compatibility and to avoid failing on non-UUID bucket names.
	if h.pageService != nil {
		if _, err := uuid.Parse(bucket); err == nil {
			p, err := h.pageService.GetPageByID(c.Request.Context(), bucket)
			if err != nil {
				if errors.Is(err, page.ErrPageNotFound) {
					c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
					return
				}
				logger.Log.Error().Err(err).Str("bucket", bucket).Msg("failed to resolve page for download")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve page"})
				return
			}

			userID := middleware.GetCurrentUserID(c)
			if err := h.pageService.RequireRead(c.Request.Context(), p.SpaceID, userID); err != nil {
				c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
				return
			}
		}
	}

	ext := filepath.Ext(filename)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Try S3 first if storage client is initialized
	if h.storageClient != nil {
		ctx := c.Request.Context()
		rangeHeader := c.Request.Header.Get("Range")
		input := &s3.GetObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String(filename),
		}
		if rangeHeader != "" {
			input.Range = aws.String(rangeHeader)
		}
		out, err := h.storageClient.S3().GetObject(ctx, input)
		if err == nil {
			defer func() { _ = out.Body.Close() }()

			servedType := contentType
			if out.ContentType != nil && *out.ContentType != "" {
				servedType = *out.ContentType
				c.Header("Content-Type", *out.ContentType)
			} else {
				c.Header("Content-Type", contentType)
			}
			setDownloadSecurityHeaders(c, servedType)
			if out.ContentLength != nil {
				c.Header("Content-Length", fmt.Sprintf("%d", *out.ContentLength))
			}
			if out.ContentRange != nil {
				c.Header("Content-Range", *out.ContentRange)
			}
			if out.AcceptRanges != nil {
				c.Header("Accept-Ranges", *out.AcceptRanges)
			}

			if out.ContentRange != nil && rangeHeader != "" {
				c.Status(http.StatusPartialContent)
			} else {
				c.Status(http.StatusOK)
			}

			_, _ = io.Copy(c.Writer, out.Body)
			return
		}
		logger.Log.Warn().Err(err).Str("bucket", bucket).Str("filename", filename).Msg("failed to get object from S3, trying local fallback")
	}

	// Fallback to local storage
	localPath := filepath.Join(".", "uploads", bucket, filename)
	if _, err := os.Stat(localPath); errors.Is(err, os.ErrNotExist) {
		logger.Log.Warn().Str("path", localPath).Msg("file not found locally")
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	setDownloadSecurityHeaders(c, contentType)
	c.File(localPath)
}
