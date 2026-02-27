export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT_STALE_STATE"
  | "ILLEGAL_ACTION"
  | "INTERNAL_ERROR";

export type ApiError = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type ApiResponse<T> = ApiOk<T> | ApiError;
