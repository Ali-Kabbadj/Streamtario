import { Response } from "express";
import { buildLogger } from "./logger.js";

const logger = buildLogger(import.meta.url);


export function createSafeError(err: unknown, context: string): Error {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const newError = new Error(`Error in ${context}: ${errorMessage}`);
  if (err instanceof Error && err.stack) {
    newError.stack = err.stack;
  }
  return newError;
}

export function handleApiError(res: Response, err: unknown, context: string) {
  const safeError = createSafeError(err, context);
  logger.error(`[FATAL Error] ${safeError.message}`, { context: context, func: 'handleApiError', data: { stack: safeError.stack } })
  if (!res.headersSent) {
    res.status(500).json({ error: "Server Error: " + safeError.message });
  }
}

