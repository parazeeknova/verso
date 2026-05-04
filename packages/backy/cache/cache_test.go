package cache

import (
	"testing"
	"time"

	"verso/backy/models"
)

func TestStatsCache_Get_NotFound(t *testing.T) {
	c := NewStatsCache(10 * time.Minute)

	_, ok := c.Get("nonexistent")
	if ok {
		t.Error("expected cache miss for non-existent key")
	}
}

func TestStatsCache_SetAndGet(t *testing.T) {
	c := NewStatsCache(10 * time.Minute)

	stats := models.GitHubStats{
		CommitsThisMonth: 42,
		CommitsLastYear:  365,
		PRsThisMonth:     5,
		Orgs:             []models.GitHubOrg{},
	}

	c.Set("testuser", stats)

	got, ok := c.Get("testuser")
	if !ok {
		t.Fatal("expected cache hit after setting")
	}

	if got.CommitsThisMonth != 42 {
		t.Errorf("CommitsThisMonth = %d, want 42", got.CommitsThisMonth)
	}
	if got.CommitsLastYear != 365 {
		t.Errorf("CommitsLastYear = %d, want 365", got.CommitsLastYear)
	}
}

func TestStatsCache_Expiration(t *testing.T) {
	c := NewStatsCache(1 * time.Millisecond)

	stats := models.GitHubStats{
		CommitsThisMonth: 10,
		CommitsLastYear:  100,
	}

	c.Set("testuser", stats)

	// Wait for expiration
	time.Sleep(2 * time.Millisecond)

	_, ok := c.Get("testuser")
	if ok {
		t.Error("expected cache miss after expiration")
	}
}

func TestStatsCache_Clear(t *testing.T) {
	c := NewStatsCache(10 * time.Minute)

	c.Set("user1", models.GitHubStats{CommitsThisMonth: 1})
	c.Set("user2", models.GitHubStats{CommitsThisMonth: 2})

	c.Clear()

	if _, ok := c.Get("user1"); ok {
		t.Error("expected user1 to be cleared")
	}
	if _, ok := c.Get("user2"); ok {
		t.Error("expected user2 to be cleared")
	}
}

func TestStatsCache_ConcurrentAccess(t *testing.T) {
	c := NewStatsCache(10 * time.Minute)

	done := make(chan bool)

	// Concurrent writes
	go func() {
		for i := 0; i < 100; i++ {
			c.Set("user", models.GitHubStats{CommitsThisMonth: i})
		}
		done <- true
	}()

	// Concurrent reads
	go func() {
		for i := 0; i < 100; i++ {
			c.Get("user")
		}
		done <- true
	}()

	<-done
	<-done
}
