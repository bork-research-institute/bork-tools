import type { Elysia } from 'elysia';
import { createYieldRoutes } from '../controllers/yield-controller';

/**
 * Configures all custom API routes
 */
export function configureApiRoutes(app: Elysia): Elysia {
  // Add yield routes
  app.use(createYieldRoutes());
  return app;
}
