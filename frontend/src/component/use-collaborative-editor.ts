import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { API_URL } from '../config/env';
import {
  requestDocumentCollaborationBootstrap,
  type DocumentCollaborationBootstrapRead,
} from '../service/documents';
import {
  resolveCollaborationBootstrapRetryDelay,
  seedCollaborationDocument,
} from './collaboration-bootstrap';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UseCollaborativeEditorOptions {
  documentId: string;
  token: string;
  enabled: boolean;
  userName?: string;
}

export interface ConnectedUser {
  clientId: number;
  name?: string;
  color?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface CollaborativeEditorState {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connected: boolean;
  /** Granular connection lifecycle: disconnected → connecting → connected. */
  connectionStatus: ConnectionStatus;
  connectedUsers: ConnectedUser[];
  localUser: Required<Pick<ConnectedUser, 'name' | 'color'>>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
  '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800',
];

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function toWebsocketBaseUrl(apiUrl: string): string {
  return apiUrl.replace(/^https?/i, match => (match.toLowerCase() === 'https' ? 'wss' : 'ws')).replace(/\/$/, '');
}

function areConnectedUsersEqual(left: ConnectedUser[], right: ConnectedUser[]): boolean {
  if (left.length !== right.length) return false;

  return left.every((user, index) => (
    user.clientId === right[index]?.clientId
    && user.name === right[index]?.name
    && user.color === right[index]?.color
  ));
}

export function buildCollaborationSocketConfig(apiUrl: string, documentId: string): {
  serverUrl: string;
  roomName: string;
} {
  const wsBaseUrl = toWebsocketBaseUrl(apiUrl);
  return {
    serverUrl: `${wsBaseUrl}/documents/${documentId}`,
    roomName: 'collaborate',
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCollaborativeEditor(
  options: UseCollaborativeEditorOptions,
): CollaborativeEditorState {
  const { documentId, token, enabled, userName } = options;

  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  const userColor = useMemo(() => randomColor(), []);
  const localUser = useMemo(() => ({
    name: userName?.trim() || 'User',
    color: userColor,
  }), [userColor, userName]);

  useEffect(() => {
    if (enabled && documentId && token) {
      return;
    }

    setYdoc(null);
    setProvider(null);
    setConnected(false);
    setConnectionStatus('disconnected');
    setConnectedUsers([]);
  }, [documentId, enabled, token]);

  useEffect(() => {
    if (!enabled || !documentId || !token) {
      return;
    }

    let isCancelled = false;
    let ydocInstance: Y.Doc | null = null;
    let providerInstance: WebsocketProvider | null = null;
    let updateAwareness: (() => void) | null = null;
    let retryTimeoutId: number | null = null;

    const waitForRetry = async (delayMs: number) => new Promise<void>(resolve => {
      retryTimeoutId = window.setTimeout(() => {
        retryTimeoutId = null;
        resolve();
      }, delayMs);
    });

    const buildConnectBootstrapResponse = (): DocumentCollaborationBootstrapRead => ({
      status: 'connect',
      collaboration_token: null,
      retry_after_ms: null,
      content: null,
      content_format: null,
    });

    const resolveBootstrap = async (): Promise<DocumentCollaborationBootstrapRead | null> => {
      let attempt = 0;

      while (!isCancelled) {
        try {
          const bootstrap = await requestDocumentCollaborationBootstrap(token, documentId);
          if (bootstrap.status !== 'pending') {
            return bootstrap;
          }

          await waitForRetry(
            resolveCollaborationBootstrapRetryDelay(bootstrap.retry_after_ms, attempt),
          );
          attempt += 1;
        } catch {
          if (isCancelled) {
            return null;
          }

          return buildConnectBootstrapResponse();
        }
      }

      return null;
    };

    const initialize = async () => {
      const bootstrap = await resolveBootstrap();
      if (isCancelled || bootstrap === null) {
        return;
      }

      ydocInstance = new Y.Doc();

      if (
        bootstrap.status === 'seed'
        && bootstrap.content
        && bootstrap.content_format === 'tiptap_json'
      ) {
        seedCollaborationDocument(ydocInstance, bootstrap.content);
      }

      if (isCancelled || ydocInstance === null) {
        return;
      }

      if (!bootstrap.collaboration_token) {
        return;
      }

      const { serverUrl, roomName } = buildCollaborationSocketConfig(API_URL, documentId);

      providerInstance = new WebsocketProvider(
        serverUrl,
        roomName,
        ydocInstance,
        {
          params: { collaboration_token: bootstrap.collaboration_token },
          connect: false,
        },
      );
      setYdoc(ydocInstance);
      setProvider(providerInstance);

      providerInstance.on('status', (event: { status: string }) => {
        setConnected(event.status === 'connected');
        if (event.status === 'connected') {
          setConnectionStatus('connected');
        } else if (event.status === 'connecting') {
          setConnectionStatus('connecting');
        } else {
          setConnectionStatus('disconnected');
        }
      });

      providerInstance.awareness.setLocalStateField('user', localUser);

      updateAwareness = () => {
        const states = providerInstance?.awareness.getStates() ?? new Map();
        const users: ConnectedUser[] = [];

        states.forEach((state, clientId) => {
          if (state.user) {
            users.push({
              clientId,
              name: state.user.name,
              color: state.user.color,
            });
          }
        });

        users.sort((left, right) => left.clientId - right.clientId);
        setConnectedUsers(previous => (areConnectedUsersEqual(previous, users) ? previous : users));
      };

      providerInstance.awareness.on('change', updateAwareness);
      updateAwareness();
      providerInstance.connect();
    };

    void initialize();

    return () => {
      isCancelled = true;
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
      }
      if (providerInstance && updateAwareness) {
        providerInstance.awareness.off('change', updateAwareness);
      }
      providerInstance?.disconnect();
      providerInstance?.destroy();
      ydocInstance?.destroy();
      setYdoc(null);
      setProvider(null);
      setConnected(false);
      setConnectionStatus('disconnected');
      setConnectedUsers([]);
    };
  }, [documentId, token, enabled, localUser]);

  return {
    ydoc,
    provider,
    connected,
    connectionStatus,
    connectedUsers,
    localUser,
  };
}
