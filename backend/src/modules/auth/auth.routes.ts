// HTTP layer for auth: parse input, call the service, shape the response. No business logic.
import { Router } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { validateBody } from '../../shared/validate';
import { requireAuth } from './auth.middleware';
import { loginSchema } from './auth.schemas';
import * as authService from './auth.service';

export const authRouter = Router();

// POST /auth/login -> { token, user }
authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await authService.login(req.body.email, req.body.password));
  }),
);

// GET /auth/me -> current user + team roles
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await authService.getProfile(req.user!.id));
  }),
);