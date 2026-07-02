// Runtime config, read from app.json `extra`. apiBaseUrl points at apps/web,
// which hosts /api/mobile/*. workosClientId/Domain are shared with mcloud and
// used only for the token-refresh call.
import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  webBaseUrl?: string;
  workosClientId?: string;
  workosDomain?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const config = {
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3000',
  webBaseUrl: extra.webBaseUrl ?? 'http://localhost:3000',
  workosClientId: extra.workosClientId ?? '',
  workosDomain: extra.workosDomain ?? 'https://api.workos.com',
};
