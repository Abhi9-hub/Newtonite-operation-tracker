// Typed application errors. Services throw these; the error middleware turns
// them into consistent HTTP responses. Routes never build error responses by hand.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,      // stable machine-readable code the frontend can switch on
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do this') {
    super(403, 'FORBIDDEN', message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}
export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
  }
}
// Used in Phase 2: carries the item's current state so the UI can show a diff.
export class VersionConflictError extends ConflictError {
  constructor(current: unknown) {
    super('VERSION_CONFLICT', 'This item was changed by someone else', { current });
  }
}