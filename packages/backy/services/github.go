package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"verso/backy/models"
)

// GitHubService provides GitHub API operations
type GitHubService struct {
	client     *http.Client
	baseURL    string
	graphqlURL string
}

// NewGitHubService creates a new GitHub service with the given timeout
func NewGitHubService(timeout time.Duration) *GitHubService {
	return &GitHubService{
		client:     &http.Client{Timeout: timeout},
		baseURL:    "https://api.github.com",
		graphqlURL: "https://api.github.com/graphql",
	}
}

// FetchOrgs fetches the organizations a user belongs to
func (s *GitHubService) FetchOrgs(ctx context.Context, token string, username string) (orgs []models.GitHubOrg, err error) {
	// URL-encode the username to handle special characters
	encodedUsername := url.PathEscape(username)
	req, err := http.NewRequestWithContext(ctx, "GET",
		fmt.Sprintf("%s/users/%s/orgs?per_page=100", s.baseURL, encodedUsername), nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer func() {
		if closeErr := res.Body.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("closing response body: %w", closeErr)
		}
	}()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github API returned %d", res.StatusCode)
	}

	if err := json.NewDecoder(res.Body).Decode(&orgs); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	// Populate URLs if missing
	for i := range orgs {
		if orgs[i].HTMLURL == "" {
			orgs[i].HTMLURL = fmt.Sprintf("https://github.com/%s", orgs[i].Login)
		}
		if orgs[i].URL == "" {
			orgs[i].URL = fmt.Sprintf("%s/orgs/%s", s.baseURL, orgs[i].Login)
		}
	}

	return orgs, nil
}

// FetchContributions fetches contribution stats from GitHub GraphQL API
func (s *GitHubService) FetchContributions(
	ctx context.Context,
	token string,
	username string,
	from time.Time,
	to time.Time,
) (commits, prs int, err error) {
	query := `
query($login: String!, $from: DateTime!, $to: DateTime!) {
	user(login: $login) {
		contributionsCollection(from: $from, to: $to) {
			totalCommitContributions
			totalPullRequestContributions
		}
	}
}`

	payload := models.GraphQLRequest{
		Query: query,
		Variables: map[string]any{
			"login": username,
			"from":  from.Format(time.RFC3339),
			"to":    to.Format(time.RFC3339),
		},
	}

	reqBody, err := json.Marshal(payload)
	if err != nil {
		return 0, 0, fmt.Errorf("marshaling query: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.graphqlURL, bytes.NewReader(reqBody))
	if err != nil {
		return 0, 0, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("executing request: %w", err)
	}
	defer func() {
		if closeErr := res.Body.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("closing response body: %w", closeErr)
		}
	}()

	respBody, readErr := io.ReadAll(res.Body)
	if readErr != nil {
		return 0, 0, fmt.Errorf("reading response: %w", readErr)
	}

	if res.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("github API returned %d: %s", res.StatusCode, string(respBody))
	}

	var result models.GraphQLResponse
	if jsonErr := json.Unmarshal(respBody, &result); jsonErr != nil {
		return 0, 0, fmt.Errorf("decoding response: %w, body: %s", jsonErr, string(respBody))
	}

	if len(result.Errors) > 0 {
		return 0, 0, fmt.Errorf("graphql error: %s", result.Errors[0].Message)
	}

	if result.Data.User == nil {
		return 0, 0, fmt.Errorf("user not found")
	}

	collection := result.Data.User.ContributionsCollection
	return collection.TotalCommitContributions, collection.TotalPullRequestContributions, nil
}

// ComputeStats calculates GitHub statistics for a user
func (s *GitHubService) ComputeStats(
	ctx context.Context,
	token string,
	username string,
) (models.GitHubStats, error) {
	now := time.Now().UTC()
	firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	// Current month stats
	commitsThisMonth, prsThisMonth, err := s.FetchContributions(ctx, token, username, firstDay, now)
	if err != nil {
		return models.GitHubStats{}, fmt.Errorf("fetching current month: %w", err)
	}

	// Last year stats
	lastYear := now.AddDate(-1, 0, 0)
	commitsLastYear, _, err := s.FetchContributions(ctx, token, username, lastYear, now)
	if err != nil {
		return models.GitHubStats{}, fmt.Errorf("fetching last year: %w", err)
	}

	// Organizations
	orgs, err := s.FetchOrgs(ctx, token, username)
	if err != nil {
		// Log error but don't fail - orgs are optional
		orgs = []models.GitHubOrg{}
	}

	return models.GitHubStats{
		CommitsThisMonth: commitsThisMonth,
		CommitsLastYear:  commitsLastYear,
		PRsThisMonth:     prsThisMonth,
		Orgs:             orgs,
	}, nil
}
