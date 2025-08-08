import { Response } from 'express';

interface ApiError {
    type: string;
    dev_message: string;
    ui_message: string;
    details?: unknown;
}

export class ApiResponse<T> {
    ok: boolean;
    data?: T;
    error?: ApiError;

    constructor(ok: boolean, data?: T, error?: ApiError) {
        this.ok = ok;
        this.data = data;
        this.error = error;
    }
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
    res.status(statusCode).json(new ApiResponse<T>(true, data));
}

export function sendError(
    res: Response,
    statusCode: number,
    error: { type: string; dev_message: string; ui_message: string; details?: unknown },
) {
    res.status(statusCode).json(new ApiResponse(false, undefined, error));
}