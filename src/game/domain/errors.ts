export type DomainErrorCode =
  | "INVALID_PHASE" | "INVALID_COMMAND" | "INVALID_OPTION"
  | "INVALID_STATE" | "NO_ELIGIBLE_EVENT" | "CAREER_COMPLETE";

export type GameResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: DomainErrorCode; message: string; path?: string } };

export const gameError = <T>(
  code: DomainErrorCode,
  message: string,
  path?: string,
): GameResult<T> => ({ ok: false, error: { code, message, ...(path ? { path } : {}) } });
