import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export const collaborationResyncInterval = 15_000;

export interface CreateCollaborationProviderOptions {
  connect?: boolean;
}

export const createCollaborationProvider = (
  serverUrl: string,
  documentName: string,
  token?: string,
  options?: CreateCollaborationProviderOptions,
) => {
  const provider = new WebsocketProvider(serverUrl, documentName, new Y.Doc(), {
    connect: options?.connect ?? true,
    disableBc: true,
    params: token ? { token } : {},
    // YGo does not send unsolicited application-level heartbeats. Periodic
    // sync requests keep the y-websocket provider from closing an idle link.
    resyncInterval: collaborationResyncInterval,
  });

  return provider;
};
