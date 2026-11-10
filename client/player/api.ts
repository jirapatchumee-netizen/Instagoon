export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly data?: any) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `เกิดข้อผิดพลาด (${response.status})`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}
