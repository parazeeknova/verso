import {
  CameraIcon,
  CaretDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "#/shared/hooks/use-theme";
import {
  useSpaceBySlug,
  useSpaceMembers,
  useUpdateSpace,
  useDeleteSpace,
  useAddSpaceMember,
  useAddSpaceGroup,
  useRemoveSpaceMember,
  useRemoveSpaceGroup,
  useUpdateSpaceMemberRole,
  useUpdateSpaceGroupRole,
} from "#/features/console/hooks/use-spaces";
import { usePageTree } from "#/features/console/hooks/use-pages";
import { useUsers } from "#/features/console/hooks/use-users";
import { AvatarBadge } from "#/shared/components/avatar-badge";
import { compressImage } from "#/shared/lib/image-compress";
import { UnsplashPicker } from "#/features/space/components/unsplash-picker";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import type { Group, SpaceMemberMixed } from "#/shared/types";

const roleOptions = [
  { desc: "manage members, settings, and all content", label: "full access", value: "admin" },
  {
    desc: "create and edit content, but cannot change settings",
    label: "can edit",
    value: "writer",
  },
  { desc: "read-only access to content", label: "can view", value: "reader" },
];

const useGroups = (workspaceId: string) =>
  useQuery<{ groups: Group[] }>({
    enabled: workspaceId !== "",
    queryFn: ({ signal }) =>
      fetchProtected<{ groups: Group[] }>(`/api/console/workspaces/${workspaceId}/groups`, {
        signal,
      }),
    queryKey: ["groups", workspaceId],
  });

interface RoleSelectProps {
  isDarkMode: boolean;
  onChange: (r: string) => void;
  role: string;
}

const RoleSelect = ({ isDarkMode, onChange, role }: RoleSelectProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = roleOptions.find((o) => o.value === role)?.label ?? role;

  useEffect(() => {
    if (!open) {
      return;
    }
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className={`flex items-center gap-1 text-[10px] lowercase ${t("text-text-dark/40 hover:text-text-dark/60", "text-text-light/40 hover:text-text-light/60")}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {label}
        <CaretDownIcon size={9} />
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full mt-1 border p-1 z-50 w-56 ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
        >
          {roleOptions.map((o) => (
            <button
              className={`w-full text-left px-2 py-1 hover:bg-white/5 ${o.value === role ? t("text-text-dark", "text-text-light") : t("text-text-dark/50", "text-text-light/50")}`}
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              type="button"
            >
              <div className="text-[10px] lowercase">{o.label}</div>
              <div
                className={`text-[8px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}
              >
                {o.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ isDarkMode, label }: { isDarkMode: boolean; label: string }) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <p
      className={`text-[10px] uppercase tracking-wider mb-2 mt-6 ${t("text-text-dark/20", "text-text-light/20")}`}
    >
      {label}
    </p>
  );
};

interface MembersSectionProps {
  isDarkMode: boolean;
  members: SpaceMemberMixed[];
  onRemove: (userId: string) => void;
  onRoleChange: (userId: string, role: string) => void;
  onAdd: (userId: string) => void;
  availableUsers: { id: string; name: string; email: string; avatar_url: string }[];
}

const MembersSection = ({
  isDarkMode,
  members,
  onRemove,
  onRoleChange,
  onAdd,
  availableUsers,
}: MembersSectionProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) {
      return availableUsers;
    }
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

  return (
    <div className={`border ${t("border-border-dark", "border-border-light")}`}>
      {members.map((m) => (
        <div
          className={`flex items-center justify-between px-3 py-2 border-b last:border-b-0 ${t("border-border-dark", "border-border-light")}`}
          key={m.id}
        >
          <div className="flex items-center gap-2">
            <AvatarBadge
              className="w-5 h-5"
              icon={m.avatarUrl || null}
              initialsClass="text-[0.3rem]"
              name={m.name}
            />
            <div>
              <div
                className={`text-[10px] lowercase ${t("text-text-dark/60", "text-text-light/60")}`}
              >
                {m.name}
              </div>
              {m.email && (
                <div className={`text-[8px] ${t("text-text-dark/20", "text-text-light/20")}`}>
                  {m.email}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSelect
              isDarkMode={isDarkMode}
              onChange={(role) => {
                if (m.userId) {
                  onRoleChange(m.userId, role);
                }
              }}
              role={m.role}
            />
            <button
              className={t(
                "text-text-dark/20 hover:text-red-400",
                "text-text-light/20 hover:text-red-500",
              )}
              onClick={() => {
                if (m.userId) {
                  onRemove(m.userId);
                }
              }}
              type="button"
            >
              <XIcon size={10} />
            </button>
          </div>
        </div>
      ))}
      <div className="px-3 py-2">
        <div className="relative">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon
              className={t("text-text-dark/15", "text-text-light/15")}
              size={11}
            />
            <input
              className={`flex-1 bg-transparent text-[10px] lowercase outline-none ${t("placeholder:text-text-dark/15 text-text-dark/50", "placeholder:text-text-light/15 text-text-light/50")}`}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="add member..."
              value={search}
            />
          </div>
          {search && filtered.length > 0 && (
            <div
              className={`absolute left-0 top-full mt-1 border p-1 z-50 w-full ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
            >
              {filtered.slice(0, 5).map((u) => (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 hover:bg-white/5 text-left"
                  key={u.id}
                  onClick={() => {
                    onAdd(u.id);
                    setSearch("");
                  }}
                  type="button"
                >
                  <AvatarBadge
                    className="w-4 h-4"
                    icon={u.avatar_url || null}
                    initialsClass="text-[0.25rem]"
                    name={u.name}
                  />
                  <div
                    className={`text-[9px] lowercase ${t("text-text-dark/50", "text-text-light/50")}`}
                  >
                    {u.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface GroupsSectionProps {
  groups: SpaceMemberMixed[];
  isDarkMode: boolean;
  onAdd: (groupId: string) => void;
  onRemove: (groupId: string) => void;
  onRoleChange: (groupId: string, role: string) => void;
  availableGroups: Group[];
}

const GroupsSection = ({
  groups,
  isDarkMode,
  onAdd,
  onRemove,
  onRoleChange,
  availableGroups,
}: GroupsSectionProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) {
      return availableGroups;
    }
    const q = search.toLowerCase();
    return availableGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [availableGroups, search]);

  return (
    <div className={`border ${t("border-border-dark", "border-border-light")}`}>
      {groups.map((m) => (
        <div
          className={`flex items-center justify-between px-3 py-2 border-b last:border-b-0 ${t("border-border-dark", "border-border-light")}`}
          key={m.id}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${t("bg-white/5 text-text-dark/40", "bg-black/5 text-text-light/40")}`}
            >
              <span className="text-[7px] uppercase">{m.isDefault ? "E" : "G"}</span>
            </div>
            <div>
              <div
                className={`text-[10px] lowercase ${t("text-text-dark/60", "text-text-light/60")}`}
              >
                {m.name}
              </div>
              <div className={`text-[8px] ${t("text-text-dark/20", "text-text-light/20")}`}>
                {m.memberCount} members
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSelect
              isDarkMode={isDarkMode}
              onChange={(role) => {
                if (m.groupId) {
                  onRoleChange(m.groupId, role);
                }
              }}
              role={m.role}
            />
            <button
              className={t(
                "text-text-dark/20 hover:text-red-400",
                "text-text-light/20 hover:text-red-500",
              )}
              onClick={() => {
                if (m.groupId) {
                  onRemove(m.groupId);
                }
              }}
              type="button"
            >
              <XIcon size={10} />
            </button>
          </div>
        </div>
      ))}
      <div className="px-3 py-2">
        <div className="relative">
          <div className="flex items-center gap-2">
            <PlusIcon className={t("text-text-dark/15", "text-text-light/15")} size={11} />
            <input
              className={`flex-1 bg-transparent text-[10px] lowercase outline-none ${t("placeholder:text-text-dark/15 text-text-dark/50", "placeholder:text-text-light/15 text-text-light/50")}`}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="add group..."
              value={search}
            />
          </div>
          {search && filtered.length > 0 && (
            <div
              className={`absolute left-0 top-full mt-1 border p-1 z-50 w-full ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
            >
              {filtered.slice(0, 5).map((g) => (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 hover:bg-white/5 text-left"
                  key={g.id}
                  onClick={() => {
                    onAdd(g.id);
                    setSearch("");
                  }}
                  type="button"
                >
                  <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="text-[6px] uppercase">{g.isDefault ? "E" : "G"}</span>
                  </div>
                  <div
                    className={`text-[9px] lowercase ${t("text-text-dark/50", "text-text-light/50")}`}
                  >
                    {g.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SecuritySection = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const item = (title: string, desc: string) => (
    <div
      className={`flex items-center justify-between px-3 py-3 border-b last:border-b-0 ${t("border-border-dark", "border-border-light")}`}
    >
      <div>
        <div className={`text-[11px] lowercase ${t("text-text-dark/60", "text-text-light/60")}`}>
          {title}
        </div>
        <div className={`text-[9px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}>
          {desc}
        </div>
      </div>
      <span className={`text-[9px] lowercase ${t("text-text-dark/15", "text-text-light/15")}`}>
        coming soon
      </span>
    </div>
  );
  return (
    <div className={`border ${t("border-border-dark", "border-border-light")}`}>
      {item("disable public sharing", "prevent pages in this space from being shared publicly.")}
      {item("allow viewers to comment", "allow viewers to add comments on pages in this space.")}
    </div>
  );
};
const DangerSection = ({
  isDarkMode,
  spaceName,
  onDelete,
  spaceId,
}: {
  isDarkMode: boolean;
  spaceName: string;
  onDelete: () => void;
  spaceId: string;
}) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [confirm, setConfirm] = useState("");
  const { data: treeItems } = usePageTree(spaceId);

  return (
    <div className={`border ${t("border-red-500/20", "border-red-500/20")}`}>
      <div className="px-3 py-3">
        <p className={`text-[9px] lowercase mb-2 ${t("text-text-dark/20", "text-text-light/20")}`}>
          type <span className={t("text-text-dark/50", "text-text-light/50")}>{spaceName}</span> to
          confirm
        </p>
        <div className="flex gap-2">
          <input
            className={`flex-1 bg-transparent border text-[10px] lowercase px-2 py-1 outline-none ${t("border-border-dark text-text-dark", "border-border-light text-text-light")}`}
            onChange={(e) => setConfirm(e.target.value)}
            value={confirm}
          />
          <button
            className={`text-[10px] lowercase px-3 py-1 border ${confirm === spaceName ? t("border-red-500/50 text-red-400 hover:bg-red-500/10", "border-red-500/50 text-red-600 hover:bg-red-500/10") : t("border-border-dark text-text-dark/15", "border-border-light text-text-light/15")}`}
            disabled={confirm !== spaceName}
            onClick={onDelete}
            type="button"
          >
            <TrashIcon size={11} />
          </button>
        </div>

        {treeItems && treeItems.length > 0 && (
          <div className="mt-3 px-1">
            <p
              className={`text-[9px] lowercase mb-1 font-semibold ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              the following pages will also be deleted recursively:
            </p>
            <ul
              className={`text-[9px] list-disc list-inside max-h-24 overflow-y-auto ${t("text-text-dark/50", "text-text-light/50")}`}
            >
              {treeItems.map((p) => (
                <li key={p.id} className="truncate">
                  {p.title || "untitled page"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
interface SettingsViewProps {
  avGroups: Group[];
  avUsers: { id: string; name: string; email: string; avatar_url: string }[];
  description: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  gMembers: SpaceMemberMixed[];
  isDarkMode: boolean;
  name: string;
  onAddG: (gid: string) => void;
  onAddM: (uid: string) => void;
  onAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDel: () => void;
  onPick: (url: string) => void;
  onRmG: (gid: string) => void;
  onRmM: (uid: string) => void;
  onSave: () => void;
  onUpdGRole: (gid: string, role: string) => void;
  onUpdMRole: (uid: string, role: string) => void;
  setDescription: (v: string) => void;
  setName: (v: string) => void;
  setShowUnsplash: (v: boolean) => void;
  showUnsplash: boolean;
  space:
    | { id: string; headerImage: string; icon: string; name: string; description: string }
    | undefined;
  spaceSlug: string;
  uMembers: SpaceMemberMixed[];
}

const SettingsView = (props: SettingsViewProps) => {
  const { space, isDarkMode, name, setName } = props;
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 min-h-full">
      <h1
        className={`text-center text-sm lowercase mb-8 ${t("text-text-dark", "text-text-light")}`}
      >
        space settings
      </h1>

      <SectionLabel isDarkMode={isDarkMode} label="appearance" />
      <div className={`border ${t("border-border-dark", "border-border-light")}`}>
        <div className="flex items-center justify-between px-3 py-3">
          <span className={`text-[11px] lowercase ${t("text-text-dark/60", "text-text-light/60")}`}>
            avatar
          </span>
          <button
            className="relative group cursor-pointer"
            onClick={() => props.fileInputRef.current?.click()}
            type="button"
          >
            <AvatarBadge
              className={`w-8 h-8 ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
              icon={space?.icon || null}
              initialsClass="text-[0.35rem]"
              name={space?.name ?? ""}
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <CameraIcon className="text-white/80" size={10} />
            </span>
          </button>
          <input
            ref={props.fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={props.onAvatar}
            type="file"
          />
        </div>
        <div
          className={`flex items-center justify-between px-3 py-3 border-t ${t("border-border-dark", "border-border-light")}`}
        >
          <span className={`text-[11px] lowercase ${t("text-text-dark/60", "text-text-light/60")}`}>
            header
          </span>
          <button
            className={`text-[10px] lowercase ${t("text-text-dark/30 hover:text-text-dark/60", "text-text-light/30 hover:text-text-light/60")}`}
            onClick={() => props.setShowUnsplash(true)}
            type="button"
          >
            {space?.headerImage ? "change" : "add"}&nbsp;cover
          </button>
        </div>
        {space?.headerImage && (
          <div className={`px-3 pb-3 border-t ${t("border-border-dark", "border-border-light")}`}>
            <img
              alt="header preview"
              className="w-full h-24 object-cover pt-3"
              src={space.headerImage}
            />
          </div>
        )}
      </div>

      <SectionLabel isDarkMode={isDarkMode} label="general" />
      <div className={`border ${t("border-border-dark", "border-border-light")}`}>
        <div className="px-3 py-3">
          <label
            className={`block text-[9px] uppercase tracking-wider mb-1 ${t("text-text-dark/20", "text-text-light/20")}`}
            htmlFor="space-settings-name"
          >
            name
          </label>
          <div className="flex items-center gap-2">
            <input
              className={`flex-1 bg-transparent text-[11px] lowercase outline-none border-b ${t("border-border-dark text-text-dark", "border-border-light text-text-light")}`}
              id="space-settings-name"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
            {name !== (space?.name ?? "") && (
              <div className="flex gap-1 shrink-0">
                <button
                  className={`text-[10px] lowercase px-1 py-0.5 ${t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
                  onClick={props.onSave}
                  type="button"
                >
                  save
                </button>
                <button
                  className={`text-[10px] lowercase px-1 py-0.5 ${t("text-text-dark/20 hover:text-text-dark/50", "text-text-light/20 hover:text-text-light/50")}`}
                  onClick={() => setName(space?.name ?? "")}
                  type="button"
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={`px-3 pb-3 ${t("border-border-dark", "border-border-light")}`}>
          <label
            className={`block text-[9px] uppercase tracking-wider mb-1 ${t("text-text-dark/20", "text-text-light/20")}`}
            htmlFor="space-settings-desc"
          >
            description
          </label>
          <div className="flex items-center gap-2">
            <input
              className={`flex-1 bg-transparent text-[11px] lowercase outline-none border-b ${t("border-border-dark text-text-dark", "border-border-light text-text-light")}`}
              id="space-settings-desc"
              onChange={(e) => props.setDescription(e.target.value)}
              value={props.description}
            />
            {props.description !== (space?.description ?? "") && (
              <div className="flex gap-1 shrink-0">
                <button
                  className={`text-[10px] lowercase px-1 py-0.5 ${t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
                  onClick={props.onSave}
                  type="button"
                >
                  save
                </button>
                <button
                  className={`text-[10px] lowercase px-1 py-0.5 ${t("text-text-dark/20 hover:text-text-dark/50", "text-text-light/20 hover:text-text-light/50")}`}
                  onClick={() => props.setDescription(space?.description ?? "")}
                  type="button"
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SectionLabel isDarkMode={isDarkMode} label="members" />
      <MembersSection
        availableUsers={props.avUsers}
        isDarkMode={isDarkMode}
        members={props.uMembers}
        onAdd={props.onAddM}
        onRemove={props.onRmM}
        onRoleChange={props.onUpdMRole}
      />

      <SectionLabel isDarkMode={isDarkMode} label="groups" />
      <GroupsSection
        availableGroups={props.avGroups}
        groups={props.gMembers}
        isDarkMode={isDarkMode}
        onAdd={props.onAddG}
        onRemove={props.onRmG}
        onRoleChange={props.onUpdGRole}
      />

      <SectionLabel isDarkMode={isDarkMode} label="security" />
      <SecuritySection isDarkMode={isDarkMode} />

      <p
        className={`text-[10px] uppercase tracking-wider mb-2 mt-6 ${t("text-red-400/40", "text-red-500/40")}`}
      >
        danger zone
      </p>
      <DangerSection
        isDarkMode={isDarkMode}
        spaceName={space?.name ?? ""}
        onDelete={props.onDel}
        spaceId={space?.id ?? ""}
      />

      {props.showUnsplash && (
        <UnsplashPicker onClose={() => props.setShowUnsplash(false)} onSelect={props.onPick} />
      )}
    </div>
  );
};

export const SpaceSettings = () => {
  const { spaceSlug } = useParams({ from: "/s/$spaceSlug" });
  const navigate = useNavigate();
  const { data: space } = useSpaceBySlug(spaceSlug);
  const { data: members } = useSpaceMembers(space?.id ?? "");
  const { data: users } = useUsers();
  const { data: groupsData } = useGroups(space?.workspaceId ?? "");
  const { isDarkMode } = useTheme();
  const updateSpace = useUpdateSpace();
  const del = useDeleteSpace();
  const addM = useAddSpaceMember();
  const rmM = useRemoveSpaceMember();
  const updMRole = useUpdateSpaceMemberRole();
  const addG = useAddSpaceGroup();
  const rmG = useRemoveSpaceGroup();
  const updGRole = useUpdateSpaceGroupRole();

  const [showUnsplash, setShowUnsplash] = useState(false);
  const [name, setName] = useState(space?.name ?? "");
  const [description, setDescription] = useState(space?.description ?? "");
  const [_uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = space?.name ? `verso — ${space.name} settings` : "verso — space settings";
    return () => {
      document.title = "verso — space";
    };
  }, [space?.name]);
  useEffect(() => {
    if (space) {
      setName(space.name);
      setDescription(space.description ?? "");
    }
  }, [space?.id, space?.name, space?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  const doUpdate = (u: Record<string, string>) => {
    if (!space) {
      return;
    }
    updateSpace.mutate({
      id: space.id,
      input: {
        defaultRole: u.defaultRole ?? space.defaultRole,
        description: u.description ?? space.description,
        headerImage: u.headerImage ?? space.headerImage,
        icon: u.icon ?? space.icon,
        name: u.name ?? space.name,
        slug: u.slug ?? space.slug,
        visibility: u.visibility ?? space.visibility,
      },
    });
  };

  const saveName = () => {
    if (!space) {
      return;
    }
    const n = name.trim();
    const d = description.trim();
    const slug = n
      .toLowerCase()
      .replaceAll(/[^\w\s-]/g, "")
      .replaceAll(/[\s_-]+/g, "-")
      .replaceAll(/^-+|-+$/g, "");
    const payload: Record<string, string> = {};
    if (n && n !== space.name) {
      payload.name = n;
      if (slug) {
        payload.slug = slug;
      }
    }
    if (d !== space.description) {
      payload.description = d;
    }
    if (Object.keys(payload).length > 0) {
      doUpdate(payload);
    }
  };
  const onDel = () => {
    if (!space) {
      return;
    }
    del.mutate(space.id, { onSuccess: () => navigate({ to: "/home" }) });
  };
  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      try {
        const icon = await compressImage(f);
        if (icon) {
          doUpdate({ icon });
        }
      } catch {
        setUploadError("failed to process image");
      }
    }
  };

  const avUsers = useMemo(() => {
    if (!users) {
      return [];
    }
    const ids = new Set(
      (members ?? []).filter((m) => m.memberType === "user").map((m) => m.userId ?? m.id),
    );
    return users.filter((u) => !ids.has(u.id));
  }, [users, members]);

  const avGroups = useMemo(() => {
    if (!groupsData?.groups) {
      return [];
    }
    const ids = new Set(
      (members ?? []).filter((m) => m.memberType === "group").map((m) => m.groupId ?? m.id),
    );
    return groupsData.groups.filter((g) => !ids.has(g.id));
  }, [groupsData, members]);

  const uMembers = (members ?? []).filter((m) => m.memberType === "user");
  const gMembers = (members ?? []).filter((m) => m.memberType === "group");

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  return space ? (
    <SettingsView
      avGroups={avGroups}
      avUsers={avUsers}
      description={description}
      fileInputRef={fileInputRef}
      gMembers={gMembers}
      isDarkMode={isDarkMode}
      name={name}
      onAddG={(gid) => addG.mutate({ groupId: gid, role: "reader", spaceId: space?.id ?? "" })}
      onAddM={(uid) => addM.mutate({ role: "reader", spaceId: space?.id ?? "", userId: uid })}
      onAvatar={onAvatar}
      onDel={onDel}
      onPick={(url) => {
        doUpdate({ headerImage: url });
        setShowUnsplash(false);
      }}
      onRmG={(gid) => rmG.mutate({ groupId: gid, spaceId: space?.id ?? "" })}
      onRmM={(uid) => rmM.mutate({ spaceId: space?.id ?? "", userId: uid })}
      onSave={saveName}
      onUpdGRole={(gid, role) => updGRole.mutate({ groupId: gid, role, spaceId: space?.id ?? "" })}
      onUpdMRole={(uid, role) => updMRole.mutate({ role, spaceId: space?.id ?? "", userId: uid })}
      setDescription={setDescription}
      setName={setName}
      setShowUnsplash={setShowUnsplash}
      showUnsplash={showUnsplash}
      space={space}
      spaceSlug={spaceSlug}
      uMembers={uMembers}
    />
  ) : (
    <div className="flex items-center justify-center pt-32">
      <p className={`text-[13px] lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
        loading...
      </p>
    </div>
  );
};
