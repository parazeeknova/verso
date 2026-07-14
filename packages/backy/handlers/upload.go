package handlers

import (
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

	"verso/backy/shared/logger"
)

var (
	invalidBucketChars = regexp.MustCompile(`[^a-z0-9\-\.]`)
	consecutiveHyphens = regexp.MustCompile(`-+`)
	consecutiveDots    = regexp.MustCompile(`\.+`)
)

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
// Accepts multipart/form-data with "file", "spaceName", "pageName", and optional "pageId".
func (h *Handlers) UploadFile(c *gin.Context) {
	logger.Log.Info().Msg("UploadFile handler entered")

	// Get form values
	spaceName := c.PostForm("spaceName")
	pageName := c.PostForm("pageName")
	pageId := c.PostForm("pageId")

	if spaceName == "" {
		spaceName = "default"
	}
	if pageName == "" {
		pageName = "default"
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		logger.Log.Warn().Err(err).Msg("failed to get file from request form")
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer func() { _ = file.Close() }()

	bucketName := SanitizeBucketName(spaceName, pageName)
	attachmentID := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	uniqueFilename := fmt.Sprintf("%s%s", attachmentID, ext)

	logger.Log.Info().
		Str("spaceName", spaceName).
		Str("pageName", pageName).
		Str("pageId", pageId).
		Str("bucketName", bucketName).
		Str("filename", header.Filename).
		Str("uniqueFilename", uniqueFilename).
		Int64("size", header.Size).
		Msg("starting file upload process")

	// Check if RustFS / S3 storage client is available
	if h.storageClient != nil {
		logger.Log.Info().Str("bucket", bucketName).Msg("uploading to S3/RustFS storage")
		ctx := c.Request.Context()

		// Ensure the bucket exists
		_, err = h.storageClient.S3().HeadBucket(ctx, &s3.HeadBucketInput{
			Bucket: aws.String(bucketName),
		})
		if err != nil {
			logger.Log.Info().Str("bucket", bucketName).Msg("bucket does not exist, creating bucket")
			_, createErr := h.storageClient.S3().CreateBucket(ctx, &s3.CreateBucketInput{
				Bucket: aws.String(bucketName),
			})
			if createErr != nil {
				logger.Log.Error().Err(createErr).Str("bucket", bucketName).Msg("failed to create bucket, falling back to local storage")
				h.uploadLocal(c, bucketName, uniqueFilename, file, header.Filename, header.Size, attachmentID)
				return
			}
		}

		// Upload file to S3
		contentType := mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		_, putErr := h.storageClient.S3().PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(bucketName),
			Key:         aws.String(uniqueFilename),
			Body:        file,
			ContentType: aws.String(contentType),
		})
		if putErr != nil {
			logger.Log.Error().Err(putErr).Str("bucket", bucketName).Str("key", uniqueFilename).Msg("failed to upload to S3, falling back to local storage")
			h.uploadLocal(c, bucketName, uniqueFilename, file, header.Filename, header.Size, attachmentID)
			return
		}

		logger.Log.Info().Str("bucket", bucketName).Str("key", uniqueFilename).Msg("uploaded to S3 successfully")
		fileURL := fmt.Sprintf("/api/console/files/%s/%s", bucketName, uniqueFilename)
		c.JSON(http.StatusOK, gin.H{
			"id":       attachmentID,
			"url":      fileURL,
			"src":      fileURL,
			"fileName": header.Filename,
			"fileSize": header.Size,
		})
		return
	}

	// S3 not available, fall back to local storage
	logger.Log.Info().Msg("S3 storage client not available, falling back to local storage")
	h.uploadLocal(c, bucketName, uniqueFilename, file, header.Filename, header.Size, attachmentID)
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

	if _, err = io.Copy(destFile, file); err != nil {
		logger.Log.Error().Err(err).Str("path", destPath).Msg("failed to copy uploaded file content")
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
func (h *Handlers) GetUploadedFile(c *gin.Context) {
	bucket := c.Param("bucket")
	filename := c.Param("filename")

	logger.Log.Debug().Str("bucket", bucket).Str("filename", filename).Msg("GetUploadedFile request received")

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

			if out.ContentType != nil {
				c.Header("Content-Type", *out.ContentType)
			} else {
				c.Header("Content-Type", contentType)
			}
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

	c.File(localPath)
}
