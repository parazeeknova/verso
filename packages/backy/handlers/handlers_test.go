package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"verso/backy/models"
)

func setupRouter() (*gin.Engine, *Handlers) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	cfg := Config{
		GitHubToken:    "test-token",
		GitHubUsername: "testuser",
	}

	h := New(cfg)

	r.GET("/health", h.Health)
	r.GET("/api/profile", h.GetProfile)
	r.GET("/api/experience", h.GetExperience)
	r.GET("/api/projects", h.GetProjects)
	r.GET("/api/github/stats", h.GetGitHubStats)
	r.GET("/api/blogs/:slug", h.GetBlogPost)

	return r, h
}

func TestHealth(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Health status = %d, want %d", w.Code, http.StatusOK)
	}

	var response map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf("status = %s, want ok", response["status"])
	}
}

func TestGetProfile(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/profile", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GetProfile status = %d, want %d", w.Code, http.StatusOK)
	}

	var profile models.Profile
	if err := json.Unmarshal(w.Body.Bytes(), &profile); err != nil {
		t.Fatalf("Failed to unmarshal profile: %v", err)
	}

	if profile.Name == "" {
		t.Error("Profile.Name is empty")
	}

	if len(profile.Links) == 0 {
		t.Error("Profile.Links is empty")
	}
}

func TestGetExperience(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/experience", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GetExperience status = %d, want %d", w.Code, http.StatusOK)
	}

	var experiences []models.ExperienceItem
	if err := json.Unmarshal(w.Body.Bytes(), &experiences); err != nil {
		t.Fatalf("Failed to unmarshal experiences: %v", err)
	}

	if len(experiences) == 0 {
		t.Error("Experiences is empty")
	}
}

func TestGetProjects(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/projects", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GetProjects status = %d, want %d", w.Code, http.StatusOK)
	}

	var projects []models.Project
	if err := json.Unmarshal(w.Body.Bytes(), &projects); err != nil {
		t.Fatalf("Failed to unmarshal projects: %v", err)
	}

	if len(projects) == 0 {
		t.Error("Projects is empty")
	}
}

func TestGetGitHubStats_NoToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	cfg := Config{
		GitHubToken:    "",
		GitHubUsername: "testuser",
	}

	h := New(cfg)
	r.GET("/api/github/stats", h.GetGitHubStats)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/github/stats", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("GetGitHubStats status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}

	var response map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "GITHUB_TOKEN not configured" {
		t.Errorf("error = %s, want GITHUB_TOKEN not configured", response["error"])
	}
}

func TestGetGitHubStats_Caching(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	cfg := Config{
		GitHubToken:    "invalid-token", // Will cause error, but we can test caching
		GitHubUsername: "testuser",
	}

	h := New(cfg)

	// Pre-populate cache
	h.statsCache.Set("testuser", models.GitHubStats{
		CommitsThisMonth: 42,
		CommitsLastYear:  365,
		PRsThisMonth:     5,
	})

	r.GET("/api/github/stats", h.GetGitHubStats)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/github/stats", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GetGitHubStats status = %d, want %d", w.Code, http.StatusOK)
	}

	var stats models.GitHubStats
	if err := json.Unmarshal(w.Body.Bytes(), &stats); err != nil {
		t.Fatalf("Failed to unmarshal stats: %v", err)
	}

	if stats.CommitsThisMonth != 42 {
		t.Errorf("CommitsThisMonth = %d, want 42", stats.CommitsThisMonth)
	}
}

func TestGetGitHubStats_CacheExpiration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	cfg := Config{
		GitHubToken:    "invalid-token",
		GitHubUsername: "testuser",
	}

	h := New(cfg)

	// Override cache with very short TTL
	h.statsCache.TTL = 1 * time.Millisecond
	h.statsCache.Set("testuser", models.GitHubStats{
		CommitsThisMonth: 100,
	})

	// Wait for expiration
	time.Sleep(2 * time.Millisecond)

	r.GET("/api/github/stats", h.GetGitHubStats)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/github/stats", nil)
	r.ServeHTTP(w, req)

	// Should return an upstream failure once cache is expired and fetch fails
	if w.Code != http.StatusBadGateway {
		t.Errorf("GetGitHubStats status = %d, want %d", w.Code, http.StatusBadGateway)
	}

	var response map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "failed to fetch GitHub stats" {
		t.Errorf("error = %s, want failed to fetch GitHub stats", response["error"])
	}
}

func TestGetBlogPost_NoDB(t *testing.T) {
	router, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/blogs/crdts-101-a-primer", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("GetBlogPost status = %d, want %d (no DB available)", w.Code, http.StatusServiceUnavailable)
	}
}
