export interface CollaboratorAwarenessUser {
  avatar_url?: string | null;
  color?: string;
  id?: string;
  isGuest?: boolean;
  isOwner?: boolean;
  name?: string;
}

export const isPageOwnerPresence = (
  user: CollaboratorAwarenessUser,
  creatorId?: string,
): boolean => {
  if (user.isOwner === true) {
    return true;
  }
  if (creatorId !== undefined && creatorId !== "" && user.id !== undefined && user.id !== "") {
    return user.id.trim() === creatorId.trim();
  }
  return false;
};
