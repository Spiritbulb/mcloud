import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createNotesApi } from '@/services/notes';
import { createChatApi } from '@/services/chat';

// Threads the auth-scoped fetch into the API service factories.
export function useApi() {
  const { authedFetch } = useAuth();
  return useMemo(
    () => ({ notes: createNotesApi(authedFetch), chat: createChatApi(authedFetch) }),
    [authedFetch],
  );
}
