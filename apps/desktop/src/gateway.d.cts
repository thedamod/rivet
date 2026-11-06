export function validPath(path: unknown): boolean;
export function request(
  path: string,
  options?: { method?: string; body?: string },
  token?: string | null,
): Promise<{ status: number; body: any; headers: Record<string, string> }>;
