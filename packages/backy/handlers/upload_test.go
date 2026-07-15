package handlers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSanitizeBucketName(t *testing.T) {
	tests := []struct {
		spaceName string
		pageName  string
		expected  string
	}{
		{"My Space", "My Page", "my-space-my-page"},
		{"Space/Name", "Page/Name", "space-name-page-name"},
		{"a", "b", "a-b"},
		{"a", "", "bucket-a"},
		{"Very Long Space Name That Will Be Trimmed At Sixty Three Characters Maximum", "Short Page", "very-long-space-name-that-will-be-trimmed-at-sixty-three-charac"},
		{"Space!", "@Page#", "space-page"},
	}

	for _, tt := range tests {
		got := SanitizeBucketName(tt.spaceName, tt.pageName)
		if got != tt.expected {
			t.Errorf("SanitizeBucketName(%q, %q) = %q, want %q", tt.spaceName, tt.pageName, got, tt.expected)
		}
	}
}

func TestLocalUploadAndDownload(t *testing.T) {
	// Setup router
	gin.SetMode(gin.TestMode)
	r := gin.New()
	cfg := Config{}
	h := New(cfg)

	r.POST("/api/console/upload", h.UploadFile)
	r.GET("/api/console/files/:bucket/:filename", h.GetUploadedFile)

	// Clean up only the test-owned directory created by tests
	defer func() { _ = os.RemoveAll("./uploads/test-space-test-page") }()

	testCases := []struct {
		name        string
		fileName    string
		contentType string
		content     string
	}{
		{
			name:        "Image Upload",
			fileName:    "testimage.png",
			contentType: "image/png",
			content:     "mock-image-data-bytes",
		},
		{
			name:        "Video Upload",
			fileName:    "testvideo.mp4",
			contentType: "video/mp4",
			content:     "mock-video-data-bytes",
		},
		{
			name:        "Audio Upload",
			fileName:    "testaudio.mp3",
			contentType: "audio/mpeg",
			content:     "mock-audio-data-bytes",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create multipart request
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, err := writer.CreateFormFile("file", tc.fileName)
			if err != nil {
				t.Fatalf("Failed to create form file: %v", err)
			}
			_, err = part.Write([]byte(tc.content))
			if err != nil {
				t.Fatalf("Failed to write mock file content: %v", err)
			}

			// Add form fields
			_ = writer.WriteField("spaceName", "test-space")
			_ = writer.WriteField("pageName", "test-page")
			_ = writer.WriteField("pageId", "test-page-id")
			_ = writer.Close()

			// Perform Upload request
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/console/upload", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			r.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("Upload failed with status = %d, response: %s", w.Code, w.Body.String())
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to unmarshal response: %v", err)
			}

			urlVal, ok := response["url"].(string)
			if !ok || urlVal == "" {
				t.Fatalf("Response does not contain a valid URL: %v", response)
			}

			filenameVal, ok := response["fileName"].(string)
			if !ok || filenameVal != tc.fileName {
				t.Errorf("Unexpected fileName in response: %v", response)
			}

			// Perform Get request to download the file
			w2 := httptest.NewRecorder()
			req2, _ := http.NewRequest("GET", urlVal, nil)
			r.ServeHTTP(w2, req2)

			if w2.Code != http.StatusOK {
				t.Fatalf("Download failed with status = %d", w2.Code)
			}

			if w2.Body.String() != tc.content {
				t.Errorf("Downloaded content mismatch: got %q, want %q", w2.Body.String(), tc.content)
			}

			// Range download should return 206 with the requested byte span.
			w3 := httptest.NewRecorder()
			req3, _ := http.NewRequest("GET", urlVal, nil)
			req3.Header.Set("Range", "bytes=0-3")
			r.ServeHTTP(w3, req3)

			if w3.Code != http.StatusPartialContent {
				t.Fatalf("Range download status = %d, want %d", w3.Code, http.StatusPartialContent)
			}
			if w3.Body.String() != tc.content[:4] {
				t.Errorf("Range content mismatch: got %q, want %q", w3.Body.String(), tc.content[:4])
			}
			if got := w3.Header().Get("Content-Range"); got == "" {
				t.Errorf("expected Content-Range header on 206 response")
			}
		})
	}
}
