package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"verso/backy/models"
	"verso/backy/repositories"
)

// ErrSpaceNotFound is returned when a space is not found.
var ErrSpaceNotFound = errors.New("space not found")

// ErrSpaceNotEmpty is returned when trying to delete a space that still has pages.
var ErrSpaceNotEmpty = errors.New("space is not empty")

// SpaceService provides business logic for spaces.
type SpaceService struct {
	spaceRepo *repositories.SpaceRepo
	pageRepo  *repositories.PageRepo
}

// NewSpaceService creates a new space service.
func NewSpaceService(spaceRepo *repositories.SpaceRepo, pageRepo *repositories.PageRepo) *SpaceService {
	return &SpaceService{
		spaceRepo: spaceRepo,
		pageRepo:  pageRepo,
	}
}

// CreateSpace creates a new space within a workspace.
func (s *SpaceService) CreateSpace(ctx context.Context, name, slug, icon, workspaceID string) (models.Space, error) {
	space := models.Space{
		ID:          uuid.New().String(),
		Name:        name,
		Slug:        slug,
		Icon:        icon,
		WorkspaceID: workspaceID,
	}

	if err := s.spaceRepo.Insert(ctx, space); err != nil {
		return models.Space{}, fmt.Errorf("creating space: %w", err)
	}

	return space, nil
}

// UpdateSpace updates an existing space.
func (s *SpaceService) UpdateSpace(ctx context.Context, id, name, slug, icon string) (models.Space, error) {
	existing, err := s.spaceRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("getting space: %w", err)
	}

	existing.Name = name
	existing.Slug = slug
	existing.Icon = icon
	existing.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	if err := s.spaceRepo.Update(ctx, existing); err != nil {
		return models.Space{}, fmt.Errorf("updating space: %w", err)
	}

	return existing, nil
}

// DeleteSpace deletes a space only if it has no pages.
func (s *SpaceService) DeleteSpace(ctx context.Context, id string) error {
	count, err := s.spaceRepo.PageCount(ctx, id)
	if err != nil {
		return fmt.Errorf("checking page count: %w", err)
	}
	if count > 0 {
		return ErrSpaceNotEmpty
	}

	if err := s.spaceRepo.Delete(ctx, id); err != nil {
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			return ErrSpaceNotFound
		}
		return fmt.Errorf("deleting space: %w", err)
	}

	return nil
}

// ListSpaces returns all spaces in a workspace.
func (s *SpaceService) ListSpaces(ctx context.Context, workspaceID string) ([]models.Space, error) {
	spaces, err := s.spaceRepo.ListAll(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing spaces: %w", err)
	}
	return spaces, nil
}

// GetSpaceByID returns a space by ID.
func (s *SpaceService) GetSpaceByID(ctx context.Context, id string) (models.Space, error) {
	space, err := s.spaceRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrSpaceNotFound) {
			return models.Space{}, ErrSpaceNotFound
		}
		return models.Space{}, fmt.Errorf("getting space: %w", err)
	}
	return space, nil
}

// GetDefaultSpaceID returns the ID of the default space.
func (s *SpaceService) GetDefaultSpaceID(ctx context.Context) (string, error) {
	id, err := s.spaceRepo.GetDefaultSpaceID(ctx)
	if err != nil {
		return "", fmt.Errorf("getting default space id: %w", err)
	}
	return id, nil
}
