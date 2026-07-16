import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpaceDetailSidebar } from "./space-detail-sidebar";
import { createWrapper } from "#/shared/test/utils";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/home" }),
  useNavigate: () => vi.fn(),
}));

const mockSpace = {
  createdAt: "2025-01-01T00:00:00Z",
  createdBy: "user-1",
  defaultRole: "writer",
  description: "test description",
  headerImage: "",
  icon: "",
  id: "space-1",
  memberCount: 0,
  name: "test space",
  settings: "{}",
  slug: "test-space",
  updatedAt: "2025-01-01T00:00:00Z",
  visibility: "private",
  workspaceId: "ws-1",
};

vi.mock("#/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({ data: { email: "alice@test.com", id: "user-1", name: "Alice" } }),
}));

vi.mock("#/features/console/hooks/use-spaces", () => ({
  useAddSpaceGroup: () => ({ isPending: false, mutate: vi.fn() }),
  useAddSpaceMember: () => ({ isPending: false, mutate: vi.fn() }),
  useDeleteSpace: () => ({ isPending: false, mutate: vi.fn() }),
  useRemoveSpaceGroup: () => ({ isPending: false, mutate: vi.fn() }),
  useRemoveSpaceMember: () => ({ isPending: false, mutate: vi.fn() }),
  useSpaceMembers: () => ({
    data: [
      {
        email: "alice@test.com",
        id: "member-user-1",
        memberType: "user",
        name: "Alice",
        role: "admin",
        spaceId: "space-1",
        userId: "user-1",
      },
      {
        description: "All workspace members",
        groupId: "group-1",
        id: "member-group-1",
        memberType: "group",
        name: "everyone",
        role: "reader",
        spaceId: "space-1",
        workspaceId: "ws-1",
      },
    ],
    isPending: false,
  }),
  useUpdateSpace: () => ({ isPending: false, mutate: vi.fn() }),
  useUpdateSpaceGroupRole: () => ({ isPending: false, mutate: vi.fn() }),
  useUpdateSpaceMemberRole: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("#/features/console/hooks/use-users", () => ({
  useUsers: () => ({
    data: [
      { email: "alice@test.com", id: "user-1", name: "Alice", role: "admin" },
      { email: "bob@test.com", id: "user-2", name: "Bob", role: "member" },
    ],
    isPending: false,
  }),
}));

describe("SpaceDetailSidebar", () => {
  it("renders mixed user and group members", () => {
    const wrapper = createWrapper();
    render(
      <SpaceDetailSidebar
        isOpen
        onClose={vi.fn()}
        space={mockSpace}
        workspaceName="Test Workspace"
      />,
      { wrapper },
    );

    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("everyone")).toBeDefined();
    expect(screen.getByText("groups")).toBeDefined();
    expect(screen.getByText("members")).toBeDefined();
  });

  it("renders space info inputs", () => {
    const wrapper = createWrapper();
    render(
      <SpaceDetailSidebar
        isOpen
        onClose={vi.fn()}
        space={mockSpace}
        workspaceName="Test Workspace"
      />,
      { wrapper },
    );

    expect(screen.getByDisplayValue("test space")).toBeDefined();
    expect(screen.getByDisplayValue("test-space")).toBeDefined();
    expect(screen.getByDisplayValue("test description")).toBeDefined();
  });

  it("shows overlap indicator when user is both direct member and in a group", () => {
    const wrapper = createWrapper();
    render(
      <SpaceDetailSidebar
        isOpen
        onClose={vi.fn()}
        space={mockSpace}
        workspaceName="Test Workspace"
      />,
      { wrapper },
    );

    // currentUser is Alice (user-1), who is also user-1 in direct members (admin)
    // and user-1 would be in "everyone" group — the overlap notice should appear
    expect(screen.getByText(/direct membership always takes priority/)).toBeDefined();
  });
});
