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

	// Clean up local uploads directory created by tests
	defer func() { _ = os.RemoveAll("./uploads") }()

	// Create multipart request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "testimage.png")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, err = part.Write([]byte("mock-image-data-bytes"))
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
	if !ok || filenameVal != "testimage.png" {
		t.Errorf("Unexpected fileName in response: %v", response)
	}

	// Perform Get request to download the file
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", urlVal, nil)
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Download failed with status = %d", w2.Code)
	}

	if w2.Body.String() != "mock-image-data-bytes" {
		t.Errorf("Downloaded content mismatch: got %q, want %q", w2.Body.String(), "mock-image-data-bytes")
	}
}
