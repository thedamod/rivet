// Public-client GitHub device OAuth. This module also runs in React Native.
const scopes = "repo read:user read:org notifications";
function createOAuthSession({
  clientId,
  storage,
  initialState,
  fetch: fetcher = globalThis.fetch,
  now = Date.now,
}) {
  let credentials = null;
  let pending = null;
  let generation = 0;
  let polling = null;
  let refreshing = null;
  let starting = null;
  let writes = Promise.resolve();
  const persist = (value) => {
    const write = writes.then(() => storage?.save(value));
    writes = write.catch(() => {});
    return write;
  };
  const ready = Promise.resolve()
    .then(() => (storage ? storage.load() : initialState?.credentials))
    .then((value) => {
      if (value?.clientId === clientId && typeof value.accessToken === "string")
        credentials = value;
      if (
        initialState?.clientId === clientId &&
        initialState.pending?.expiresAt > now()
      )
        pending = initialState.pending;
    })
    .catch(() => {
      /* An unreadable saved session can be replaced by a new sign-in. */
    });
  async function timedFetch(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetcher(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
  async function post(endpoint, body) {
    const response = await timedFetch(`https://github.com/login/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ client_id: clientId, ...body }).toString(),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("GitHub sign-in is unavailable. Try again.");
    }
    // GitHub returns device-flow and refresh errors with HTTP 400 as well as 200.
    if (!response.ok && typeof data?.error !== "string")
      throw new Error("GitHub sign-in is unavailable. Try again.");
    return data;
  }
  const snapshot = () => ({
    configured: !!clientId,
    authenticated: !!credentials,
    pending: pending
      ? {
          userCode: pending.userCode,
          verificationUri: "https://github.com/login/device",
          expiresAt: pending.expiresAt,
          interval: pending.interval,
        }
      : null,
  });
  function fromResponse(data) {
    if (
      typeof data.access_token !== "string" ||
      data.token_type?.toLowerCase() !== "bearer"
    )
      throw new Error("GitHub returned an invalid sign-in response.");
    return {
      clientId,
      accessToken: data.access_token,
      refreshToken:
        typeof data.refresh_token === "string" ? data.refresh_token : undefined,
      expiresAt: data.expires_in ? now() + data.expires_in * 1000 : undefined,
      refreshExpiresAt: data.refresh_token_expires_in
        ? now() + data.refresh_token_expires_in * 1000
        : undefined,
    };
  }
  async function logout() {
    await ready;
    generation++;
    credentials = null;
    pending = null;
    await persist(null);
    return snapshot();
  }
  async function accessToken({ refresh = true } = {}) {
    await ready;
    if (!credentials) return null;
    if (!credentials.expiresAt || credentials.expiresAt > now() + 60000)
      return credentials.accessToken;
    if (!refresh) return null;
    if (refreshing) return refreshing;
    const current = credentials;
    const version = generation;
    refreshing = (async () => {
      if (
        !current.refreshToken ||
        (current.refreshExpiresAt && current.refreshExpiresAt <= now())
      ) {
        await logout();
        return null;
      }
      const result = await post("oauth/access_token", {
        grant_type: "refresh_token",
        refresh_token: current.refreshToken,
      });
      if (version !== generation) return null;
      if (result.error) {
        if (
          result.error === "bad_refresh_token" ||
          result.error === "incorrect_client_credentials"
        ) {
          await logout();
          return null;
        }
        throw new Error("GitHub could not refresh your session. Try again.");
      }
      const next = fromResponse(result);
      await persist(next);
      if (version !== generation) return null;
      credentials = next;
      return next.accessToken;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }
  async function begin() {
    await ready;
    if (!clientId)
      throw new Error(
        "Configure a GitHub OAuth App client ID with device flow enabled.",
      );
    if (pending && pending.expiresAt > now()) return snapshot();
    if (starting) return starting;
    const version = ++generation;
    starting = (async () => {
      const data = await post("device/code", { scope: scopes });
      if (version !== generation) return snapshot();
      if (data.error === "device_flow_disabled")
        throw new Error(
          "Enable device flow in your GitHub OAuth App settings.",
        );
      if (
        data.error ||
        typeof data.device_code !== "string" ||
        typeof data.user_code !== "string" ||
        !(data.expires_in > 0)
      )
        throw new Error(
          "GitHub could not start sign-in. Check the OAuth App client ID.",
        );
      const interval = Math.max(5, Number(data.interval) || 5);
      pending = {
        deviceCode: data.device_code,
        userCode: data.user_code,
        interval,
        expiresAt: now() + data.expires_in * 1000,
        nextPollAt: now() + interval * 1000,
      };
      return snapshot();
    })().finally(() => {
      starting = null;
    });
    return starting;
  }
  async function poll() {
    await ready;
    if (!pending) return snapshot();
    if (pending.expiresAt <= now()) {
      pending = null;
      throw new Error("Sign-in code expired. Sign in again.");
    }
    if (polling || now() < pending.nextPollAt) return snapshot();
    const flow = pending;
    const version = generation;
    flow.nextPollAt = now() + flow.interval * 1000;
    polling = (async () => {
      const data = await post("oauth/access_token", {
        device_code: flow.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
      if (version !== generation) return snapshot();
      // Count intervals from response completion to avoid overlapping requests.
      flow.nextPollAt = now() + flow.interval * 1000;
      if (data.error === "authorization_pending") return snapshot();
      if (data.error === "slow_down") {
        flow.interval = Math.max(flow.interval + 5, Number(data.interval) || 0);
        flow.nextPollAt = now() + flow.interval * 1000;
        return snapshot();
      }
      if (data.error) {
        pending = null;
        throw new Error(
          data.error === "access_denied"
            ? "GitHub sign-in was cancelled."
            : "Sign-in code expired or was rejected. Sign in again.",
        );
      }
      const next = fromResponse(data);
      // Validate the grant before saving it or mounting account queries.
      const viewer = await timedFetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${next.accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!viewer.ok)
        throw new Error("GitHub could not verify this account. Try again.");
      if (version !== generation) return snapshot();
      await persist(next);
      if (version !== generation) return snapshot();
      credentials = next;
      pending = null;
      return snapshot();
    })().finally(() => {
      polling = null;
    });
    return polling;
  }
  return {
    begin,
    poll,
    logout,
    accessToken,
    // Server adapters may seal this private state; never expose it through a renderer API.
    exportState: async () => {
      await ready;
      return { clientId, credentials, pending };
    },
    invalidate: async (token) => {
      await ready;
      if (credentials?.accessToken === token) await logout();
    },
    cancel: async () => {
      await ready;
      generation++;
      pending = null;
      return snapshot();
    },
    status: async () => {
      await accessToken();
      return snapshot();
    },
  };
}
module.exports = { createOAuthSession, scopes };
