// Request-body validation middleware using zod. Invalid input never reaches a service.
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    try {
      req.body = schema.parse(req.body); // replace body with the cleaned, typed version
      next();
    } catch (err) {
      next(err); // ZodError is translated by the error middleware
    }
  };