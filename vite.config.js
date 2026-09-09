import 'dotenv/config';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only bridge for the Vercel-style functions in /api.
 * In production Vercel serves them; locally Vite mounts the same handlers
 * so fetch('/api/jobs') works during `npm run dev` without `vercel dev`.
 */
function apiDevPlugin() {
  return {
    name: 'cloudtruck-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        const route = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/+$/, '');
        if (!/^[\w-]+$/.test(route)) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${route}.js`);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[api/${route}] ${err.stack || err.message}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
