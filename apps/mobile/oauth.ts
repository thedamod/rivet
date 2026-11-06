import * as SecureStore from "expo-secure-store";
import { createOAuthSession } from "@rivet/github/oauth";
import config from "../../github-oauth.json";
const key = "github-oauth-session-v1";
export const oauth = createOAuthSession({
  clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || config.clientId,
  storage: {
    async load() {
      // PATs are intentionally not migrated into an OAuth session.
      await SecureStore.deleteItemAsync("github-token");
      const value = await SecureStore.getItemAsync(key);
      return value ? JSON.parse(value) : null;
    },
    async save(value) {
      if (value) await SecureStore.setItemAsync(key, JSON.stringify(value));
      else await SecureStore.deleteItemAsync(key);
    },
  },
});
