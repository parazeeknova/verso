export interface CollaboratorAwarenessUser {
  id?: string;
  isOwner?: boolean;
}

export const isPageOwnerPresence = (user: CollaboratorAwarenessUser, creatorId?: string): boolean =>
  user.isOwner === true || (creatorId !== undefined && user.id === creatorId);
