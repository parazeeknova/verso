package comment

import (
	"sync"
	"time"
)

type ipLimit struct {
	timestamps []time.Time
	lastTime   time.Time
}

// GuestCommentRateLimiter provides thread-safe IP rate limiting for guest comments.
type GuestCommentRateLimiter struct {
	mu     sync.Mutex
	limits map[string]*ipLimit
}

// NewGuestCommentRateLimiter creates a new rate limiter instance.
func NewGuestCommentRateLimiter() *GuestCommentRateLimiter {
	limiter := &GuestCommentRateLimiter{
		limits: make(map[string]*ipLimit),
	}
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			limiter.cleanup()
		}
	}()
	return limiter
}

// Allow checks if a guest IP is allowed to post a comment.
func (l *GuestCommentRateLimiter) Allow(ip string) (bool, string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	lim, exists := l.limits[ip]
	if !exists {
		l.limits[ip] = &ipLimit{
			timestamps: []time.Time{now},
			lastTime:   now,
		}
		return true, ""
	}

	// 1. Cooldown of 2 seconds between guest comments from same IP
	if now.Sub(lim.lastTime) < 2*time.Second {
		return false, "Please wait a moment before posting another comment."
	}

	// 2. Sliding window of max 5 comments per 60 seconds
	windowStart := now.Add(-60 * time.Second)
	var recent []time.Time
	for _, t := range lim.timestamps {
		if t.After(windowStart) {
			recent = append(recent, t)
		}
	}

	if len(recent) >= 5 {
		return false, "Comment rate limit exceeded. Please wait a minute before posting again."
	}

	recent = append(recent, now)
	lim.timestamps = recent
	lim.lastTime = now
	return true, ""
}

func (l *GuestCommentRateLimiter) cleanup() {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-60 * time.Second)
	for ip, lim := range l.limits {
		var recent []time.Time
		for _, t := range lim.timestamps {
			if t.After(windowStart) {
				recent = append(recent, t)
			}
		}
		if len(recent) == 0 {
			delete(l.limits, ip)
		} else {
			lim.timestamps = recent
		}
	}
}
