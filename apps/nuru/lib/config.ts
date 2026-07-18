// Runtime config, read from app.json `extra`. apiBaseUrl points at apps/web,
// which hosts /api/mobile/*. workosClientId/Domain are shared with mcloud and
// used only for the token-refresh call.
import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  webBaseUrl?: string;
  workosClientId?: string;
  workosDomain?: string;
  reviewEmail?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const config = {
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3000',
  webBaseUrl: extra.webBaseUrl ?? 'http://localhost:3000',
  workosClientId: extra.workosClientId ?? '',
  workosDomain: extra.workosDomain ?? 'https://api.workos.com',
  // App-store review account email (NOT secret). Login reveals a password field
  // for this exact email and signs in by password instead of a magic code, since
  // reviewers can't get the emailed code. Empty for normal builds. Password lives
  // only in the server env.
  reviewEmail: (extra.reviewEmail ?? '').trim().toLowerCase(),
};
