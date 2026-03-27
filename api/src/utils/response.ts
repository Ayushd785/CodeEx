import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode: number = 500, code?: string): void {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
    code,
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendAccepted<T>(res: Response, data: T): void {
  sendSuccess(res, data, 202);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}