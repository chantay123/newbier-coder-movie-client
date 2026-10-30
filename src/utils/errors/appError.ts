/**
 * @file appError.ts
 * @description Standardized enterprise application and API error handling classes.
 * Normalizes HTTP status codes, error codes, and server responses without leaking sensitive data.
 */

import { AxiosError } from 'axios';

export interface AppErrorDetails {
  code: string;
  statusCode: number;
  message: string;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

/**
 * Standard Application Error class for domain and service layers.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | null;
  public readonly timestamp: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_APP_ERROR', details?: Record<string, unknown> | null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Parses any unknown error (AxiosError, AppError, native Error, string) into a structured AppError.
 * @param error Unknown caught error
 * @param fallbackMessage Fallback friendly message if none is found
 * @returns Standard AppError instance
 */
export function parseApiError(error: unknown, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Axios HTTP Error Handling
  if (isAxiosError(error)) {
    const statusCode = error.response?.status || 500;
    const responseData = error.response?.data as Record<string, unknown> | undefined;

    // Extract message from typical backend envelope formats
    const responseStatusObj = responseData?.responseStatus as Record<string, unknown> | undefined;
    const serverMessage =
      (typeof responseStatusObj?.responseMessage === 'string' && responseStatusObj.responseMessage) ||
      (typeof responseData?.message === 'string' && responseData.message) ||
      (typeof responseData?.error === 'string' && responseData.error) ||
      (Array.isArray(responseData?.errors) && typeof responseData.errors[0] === 'string' && responseData.errors[0]) ||
      null;

    const isTimeout =
      error.code === 'ECONNABORTED' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout')) ||
      statusCode === 504;

    let friendlyMessage = serverMessage || fallbackMessage;
    let code = 'HTTP_ERROR';

    if (isTimeout) {
      code = 'TIMEOUT';
      friendlyMessage = 'Yêu cầu quá thời gian chờ (timeout). Vui lòng thử lại hoặc làm mới danh sách.';
    } else {
      switch (statusCode) {
        case 400:
          code = 'BAD_REQUEST';
          friendlyMessage = serverMessage || 'Dữ liệu gửi lên không hợp lệ.';
          break;
        case 401:
          code = 'UNAUTHORIZED';
          friendlyMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          break;
        case 403:
          code = 'FORBIDDEN';
          friendlyMessage = 'Bạn không có quyền quản trị để thực hiện thao tác này.';
          break;
        case 404:
          code = 'NOT_FOUND';
          friendlyMessage = serverMessage || 'Không tìm thấy dữ liệu yêu cầu.';
          break;
        case 409:
          code = 'CONFLICT';
          friendlyMessage = serverMessage || 'Dữ liệu đã tồn tại trong hệ thống.';
          break;
        case 422:
          code = 'UNPROCESSABLE_ENTITY';
          friendlyMessage = serverMessage || 'Dữ liệu không đáp ứng quy chuẩn của hệ thống.';
          break;
        case 429:
          code = 'TOO_MANY_REQUESTS';
          friendlyMessage = 'Thao tác quá nhanh. Vui lòng đợi trong giây lát.';
          break;
        case 500:
        case 502:
        case 503:
          code = 'SERVER_ERROR';
          friendlyMessage = 'Máy chủ đang bận hoặc gặp sự cố. Vui lòng thử lại sau.';
          break;
        default:
          break;
      }
    }

    return new AppError(friendlyMessage, statusCode, code, responseData);
  }

  // Native Error
  if (error instanceof Error) {
    return new AppError(error.message || fallbackMessage, 500, 'GENERIC_ERROR');
  }

  // Fallback for strings / unknown types
  return new AppError(typeof error === 'string' ? error : fallbackMessage, 500, 'UNKNOWN_ERROR');
}

/**
 * Type guard to safely check for AxiosError without throwing.
 */
function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as AxiosError).isAxiosError === true;
}
