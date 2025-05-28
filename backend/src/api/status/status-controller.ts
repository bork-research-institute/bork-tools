import type { Elysia } from 'elysia';

export class StatusController {
  setupRoutes(app: Elysia) {
    app.get('/status', () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      };
    });

    // Alternative health check endpoint (common convention)
    app.get('/health', () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    });

    // Simple ping endpoint
    app.get('/ping', () => {
      return { message: 'pong' };
    });
  }
}
