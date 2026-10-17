// The single place where errors become HTTP responses.
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';

// Response shape used for ALL errors, so the frontend needs only one parser.
function send(res: Parameters<ErrorRequestHandler>[2], req: Parameters<ErrorRequestHandler>[1],
              status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ error: { code, message, details, requestId: req.requestId } });
}

// Unknown route -> 404 in the standard shape.
export const notFoundHandler: RequestHandler = (req, res) => {
  send(res, req, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // 1. Input validation failures from zod.
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, req, 400, 'VALIDATION_ERROR', 'Invalid request', details);
  }

  // 2. Errors we threw on purpose (401/403/404/409...).
  if (err instanceof AppError) {
    return send(res, req, err.status, err.code, err.message, err.details);
  }

  // 3. Malformed JSON body (thrown by express.json()).
  if (err?.type === 'entity.parse.failed') {
    return send(res, req, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }

  // 4. A few well-known Postgres errors mapped to client errors.
  if (err?.code === '22P02') return send(res, req, 400, 'VALIDATION_ERROR', 'Malformed identifier'); // bad uuid
  if (err?.code === '23505') return send(res, req, 409, 'CONFLICT', 'Resource already exists');      // unique violation

  // 5. Anything else is a bug: log full detail, return nothing sensitive.
  console.error(`[error] ${req.method} ${req.path} requestId=${req.requestId}`, err);
  return send(res, req, 500, 'INTERNAL_ERROR', 'Something went wrong');
};