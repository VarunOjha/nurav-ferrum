/**
 * Approvals API error codes and their HTTP status (ip-approvals-api §2.2). The store throws
 * ApprovalError; the route adapter turns it into `{ error: { code, message, details } }`.
 */
export const ERROR_STATUS = {
  FORBIDDEN_ORIGIN: 403,
  READ_ONLY: 403,
  BAD_REQUEST: 400,
  UNSUPPORTED_MEDIA_TYPE: 415,
  COMMENT_REQUIRED: 400,
  UNKNOWN_KEY: 404,
  NOT_APPROVABLE: 422,
  NOT_A_PHASE: 422,
  EXIT_NOT_READY: 409,
  UNHASHABLE: 422,
  PAGE_CHANGED: 409,
  APPROVALS_FILE_INVALID: 500,
  LOCK_TIMEOUT: 503,
  WRITE_FAILED: 500,
} as const;

export type ApprovalErrorCode = keyof typeof ERROR_STATUS;
export const ERROR_CODES = Object.keys(ERROR_STATUS) as ApprovalErrorCode[];

export class ApprovalError extends Error {
  readonly code: ApprovalErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;
  constructor(code: ApprovalErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApprovalError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }
}

export interface ErrorEnvelope {
  error: { code: ApprovalErrorCode; message: string; details: Record<string, unknown> };
}

export const envelope = (e: ApprovalError): ErrorEnvelope => ({
  error: { code: e.code, message: e.message, details: e.details },
});
