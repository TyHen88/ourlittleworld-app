export interface CursorPagination {
  hasMore: boolean;
  limit: number;
  nextCursor: string | null;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  pagination: CursorPagination;
}

export function createCursorPaginatedResponse<T>(
  data: T[],
  limit: number,
  nextCursor: string | null
): CursorPaginatedResponse<T> {
  return {
    data,
    nextCursor,
    pagination: {
      hasMore: nextCursor !== null,
      limit,
      nextCursor,
    },
  };
}

export function encodePaginationCursor(payload: Record<string, string>) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodePaginationCursor<T extends Record<string, string>>(
  cursor: string | null | undefined
): T | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}
