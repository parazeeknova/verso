package cache

import (
	"sync"
	"time"

	"verso/backy/models"
)

// StatsEntry represents a cached stats value with expiration
type StatsEntry struct {
	Stats     models.GitHubStats
	ExpiresAt time.Time
}

// StatsCache provides thread-safe caching for GitHub stats
type StatsCache struct {
	mu      sync.RWMutex
	entries map[string]StatsEntry
	TTL     time.Duration
}

// NewStatsCache creates a new stats cache with the given TTL
func NewStatsCache(ttl time.Duration) *StatsCache {
	return &StatsCache{
		entries: make(map[string]StatsEntry),
		TTL:     ttl,
	}
}

// Get retrieves cached stats for a username if not expired
func (c *StatsCache) Get(username string) (models.GitHubStats, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.entries[username]
	if !ok || time.Now().After(entry.ExpiresAt) {
		return models.GitHubStats{}, false
	}
	return entry.Stats, true
}

// Set stores stats for a username with the configured TTL
func (c *StatsCache) Set(username string, stats models.GitHubStats) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[username] = StatsEntry{
		Stats:     stats,
		ExpiresAt: time.Now().Add(c.TTL),
	}
}

// Clear removes all cached entries
func (c *StatsCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries = make(map[string]StatsEntry)
}
