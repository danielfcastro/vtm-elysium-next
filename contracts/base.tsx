// src/contracts/base.ts

export type UUID = string;
export type ISODateTime = string; // ex: 2025-12-31T11:29:50.167Z
export type ISODate = string; // ex: 2025-12-31

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INSUFFICIENT_XP"
  | "INVALID_SPEND"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
