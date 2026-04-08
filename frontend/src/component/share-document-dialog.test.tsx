import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserContext } from '../context/user-context';
import ShareDocumentDialog from './share-document-dialog';
import * as documentService from '../service/documents';
import * as userService from '../service/users';

vi.mock('../service/documents', async () => {
  const actual = await vi.importActual<typeof import('../service/documents')>('../service/documents');
  return {
    ...actual,
    getDocumentShares: vi.fn(),
    getDocumentShareCandidates: vi.fn(),
    createDocumentShare: vi.fn(),
    updateDocumentShare: vi.fn(),
    revokeDocumentShare: vi.fn(),
  };
});

const mockedGetDocumentShares = vi.mocked(documentService.getDocumentShares);
const mockedGetDocumentShareCandidates = vi.mocked(documentService.getDocumentShareCandidates);
const mockedAvatarUrl = vi.spyOn(userService, 'avatarUrl');

describe('ShareDocumentDialog', () => {
  beforeEach(() => {
    mockedGetDocumentShares.mockResolvedValue([
      {
        id: 'share-1',
        created_at: '2026-04-05T12:00:00Z',
        updated_at: '2026-04-05T12:15:00Z',
        document_id: 'doc-1',
        shared_with_user_id: 'user-1',
        shared_by_user_id: 'user-2',
        role: 'editor',
        shared_with_full_name: 'Morgan Lee',
        shared_with_email: 'morgan@example.com',
        shared_with_headline: null,
        shared_by_full_name: 'Taylor Brooks',
        shared_by_email: 'taylor@example.com',
      },
    ]);
    mockedGetDocumentShareCandidates.mockResolvedValue([
      {
        id: 'candidate-1',
        full_name: 'Alice Zhang',
        email: 'alice@example.com',
        headline: null,
        avatar_uri: 'uploads/avatars/candidate-1/avatar.png',
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders human-readable share metadata and searches document-specific candidates', async () => {
    render(
      <UserContext.Provider
        value={{
          user: null,
          setUser: vi.fn(),
          token: 'token-123',
          setToken: vi.fn(),
          loading: false,
          canAccessTier: vi.fn(() => true),
        }}
      >
        <ShareDocumentDialog open onClose={vi.fn()} documentId="doc-1" />
      </UserContext.Provider>,
    );

    expect(await screen.findByText('Morgan Lee')).toBeInTheDocument();
    expect(screen.getByText('morgan@example.com')).toBeInTheDocument();
    expect(screen.queryByText('user-1')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search people by name, email, or headline…'), { target: { value: 'ali' } });
    await waitFor(() => {
      expect(mockedGetDocumentShareCandidates).toHaveBeenCalledWith('token-123', 'doc-1', {
        q: 'ali',
        limit: 8,
      });
    });
    expect(await screen.findByText('Alice Zhang')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(mockedAvatarUrl).toHaveBeenCalledWith('candidate-1', 'uploads/avatars/candidate-1/avatar.png');
  });
});
