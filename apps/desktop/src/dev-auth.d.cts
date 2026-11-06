import type { IncomingMessage, ServerResponse } from "node:http";
import type { createOAuthSession } from "../../../packages/github/src/oauth.cjs";
export function createBrowserSessions(
  clientId: string,
): (
  req: IncomingMessage,
  res: ServerResponse,
) => ReturnType<typeof createOAuthSession>;
