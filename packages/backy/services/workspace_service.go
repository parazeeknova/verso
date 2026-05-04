package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"verso/backy/models"
	"verso/backy/repositories"
)

var (
	ErrWorkspaceNotFound = errors.New("workspace not found")
	ErrWorkspaceNotEmpty = errors.New("workspace is not empty")
)

// WorkspaceService provides business logic for workspaces.
type WorkspaceService struct {
	workspaceRepo *repositories.WorkspaceRepo
	spaceRepo     *repositories.SpaceRepo
}

// NewWorkspaceService creates a new workspace service.
func NewWorkspaceService(workspaceRepo *repositories.WorkspaceRepo, spaceRepo *repositories.SpaceRepo) *WorkspaceService {
	return &WorkspaceService{
		workspaceRepo: workspaceRepo,
		spaceRepo:     spaceRepo,
	}
}

// CreateWorkspace creates a new workspace.
func (s *WorkspaceService) CreateWorkspace(ctx context.Context, name, slug, icon string) (models.Workspace, error) {
	w := models.Workspace{
		ID:   uuid.New().String(),
		Name: name,
		Slug: slug,
		Icon: icon,
	}

	if err := s.workspaceRepo.Insert(ctx, w); err != nil {
		return models.Workspace{}, fmt.Errorf("creating workspace: %w", err)
	}

	return w, nil
}

// UpdateWorkspace updates an existing workspace.
func (s *WorkspaceService) UpdateWorkspace(ctx context.Context, id, name, slug, icon string) (models.Workspace, error) {
	existing, err := s.workspaceRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrWorkspaceNotFound) {
			return models.Workspace{}, ErrWorkspaceNotFound
		}
		return models.Workspace{}, fmt.Errorf("getting workspace: %w", err)
	}

	existing.Name = name
	existing.Slug = slug
	existing.Icon = icon

	if err := s.workspaceRepo.Update(ctx, existing); err != nil {
		return models.Workspace{}, fmt.Errorf("updating workspace: %w", err)
	}

	return existing, nil
}

// DeleteWorkspace deletes a workspace only if it has no spaces.
func (s *WorkspaceService) DeleteWorkspace(ctx context.Context, id string) error {
	count, err := s.workspaceRepo.SpaceCount(ctx, id)
	if err != nil {
		return fmt.Errorf("checking space count: %w", err)
	}
	if count > 0 {
		return ErrWorkspaceNotEmpty
	}

	if err := s.workspaceRepo.Delete(ctx, id); err != nil {
		if errors.Is(err, repositories.ErrWorkspaceNotFound) {
			return ErrWorkspaceNotFound
		}
		return fmt.Errorf("deleting workspace: %w", err)
	}

	return nil
}

// ListWorkspaces returns all workspaces.
func (s *WorkspaceService) ListWorkspaces(ctx context.Context) ([]models.Workspace, error) {
	workspaces, err := s.workspaceRepo.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing workspaces: %w", err)
	}
	return workspaces, nil
}

// GetWorkspaceByID returns a workspace by ID.
func (s *WorkspaceService) GetWorkspaceByID(ctx context.Context, id string) (models.Workspace, error) {
	workspace, err := s.workspaceRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repositories.ErrWorkspaceNotFound) {
			return models.Workspace{}, ErrWorkspaceNotFound
		}
		return models.Workspace{}, fmt.Errorf("getting workspace: %w", err)
	}
	return workspace, nil
}

// GetDefaultWorkspaceID returns the ID of the default workspace.
func (s *WorkspaceService) GetDefaultWorkspaceID(ctx context.Context) (string, error) {
	id, err := s.workspaceRepo.GetDefaultWorkspaceID(ctx)
	if err != nil {
		return "", fmt.Errorf("getting default workspace id: %w", err)
	}
	return id, nil
}
