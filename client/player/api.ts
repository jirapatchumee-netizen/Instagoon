export class ApiError extends Error {
  readonly status: number;
  readonly data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
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

export function createFollowSync() {
  const pending = new Map<string, { seq: number; following: boolean }>();
  let followSeq = 0;
  let feedVersion = 0;

  return {
    beginFollow(creatorId: string, currentFollowing?: boolean) {
      const existing = pending.get(creatorId);
      const nextFollowing = !(existing ? existing.following : !!currentFollowing);
      const seq = ++followSeq;
      feedVersion += 1;
      pending.set(creatorId, { seq, following: nextFollowing });
      return { seq, nextFollowing };
    },
    endFollow(creatorId: string, seq: number) {
      const current = pending.get(creatorId);
      if (!current || current.seq !== seq) {
        return { isLatestForCreator: false, allSettled: pending.size === 0 };
      }
      pending.delete(creatorId);
      return { isLatestForCreator: true, allSettled: pending.size === 0 };
    },
    beginFeedLoad() {
      feedVersion += 1;
      return feedVersion;
    },
    isCurrentFeedLoad(version: number) {
      return version === feedVersion && pending.size === 0;
    },
    applyPending<T extends { id: string; following?: boolean }>(creators: T[]): T[] {
      if (pending.size === 0) return creators;
      return creators.map((c) => {
        const entry = pending.get(c.id);
        return entry ? { ...c, following: entry.following } : c;
      });
    },
  };
}

