import 'dotenv/config';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAllowedCorsOrigins,
  buildContentSecurityPolicy,
  isBlockedSensitivePath,
  shouldRedirectToHttps,
  SlidingWindowRateLimiter,
} from './src/security/httpSecurity.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEV = NODE_ENV !== 'production';

function loadFirebaseAuthDomain(): string {
  try {
    const raw = fs.readFileSync(
      path.resolve(__dirname, 'firebase-applet-config.json'),
      'utf8'
    );
    const parsed = JSON.parse(raw) as { authDomain?: string };
    return parsed.authDomain || 'valid-crane-wf38q.firebaseapp.com';
  } catch {
    return 'valid-crane-wf38q.firebaseapp.com';
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

const FIREBASE_AUTH_DOMAIN = loadFirebaseAuthDomain();
const CSP_HEADER = buildContentSecurityPolicy({
  isDev: IS_DEV,
  firebaseAuthDomain: FIREBASE_AUTH_DOMAIN,
});
const ALLOWED_CORS_ORIGINS = buildAllowedCorsOrigins({
  appUrl: process.env.APP_URL,
  extraOriginsEnv: process.env.ALLOWED_ORIGINS,
  isDev: IS_DEV,
});

const apiRateLimiter = new SlidingWindowRateLimiter(60_000, 60);
const burstRateLimiter = new SlidingWindowRateLimiter(60_000, 400);

async function startServer() {
  const app = express();

  // Disable framework fingerprint header and trust reverse-proxy X-Forwarded-* headers
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // 1. Mandatory HTTP -> HTTPS Redirection behind reverse proxy (non-localhost)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.get('host');
    const forwardedProto = req.get('x-forwarded-proto');
    if (
      shouldRedirectToHttps({
        forwardedProto,
        host,
        nodeEnv: NODE_ENV,
        forceHttpsEnv: process.env.FORCE_HTTPS,
      })
    ) {
      const targetUrl = `https://${host}${req.originalUrl}`;
      res.redirect(301, targetUrl);
      return;
    }
    next();
  });

  // 2. Global HTTP Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    const proto = (req.get('x-forwarded-proto') || req.protocol || '').toLowerCase();
    if (req.secure || proto === 'https') {
      // HSTS for 1 year on verified HTTPS requests (no preload/includeSubDomains until all subdomains verified)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }

    res.setHeader('Content-Security-Policy', CSP_HEADER);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
    );
    // Allows Google Sign-In popup communication while preventing cross-origin window hijacking
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    if (req.path.startsWith('/api/')) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private'
      );
      res.setHeader('Pragma', 'no-cache');
    } else if (
      req.path === '/' ||
      req.path.endsWith('.html')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    next();
  });

  // 3. Block Sensitive Config, Rules, Dotfiles & Source Maps
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cleanPath = req.path;
    if (
      isBlockedSensitivePath(cleanPath, { isDev: IS_DEV }) ||
      (!IS_DEV &&
        cleanPath.startsWith('/src/') &&
        !cleanPath.startsWith('/src/assets/'))
    ) {
      console.warn(
        `[security] Blocked sensitive path request: method=${req.method} path=${cleanPath} ip=${getClientIp(req)}`
      );
      res.status(404).type('text/plain').send('Not Found');
      return;
    }
    next();
  });

  // 4. Global Burst Rate Limiting
  app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const result = burstRateLimiter.check(ip);
    if (!result.allowed) {
      console.warn(`[security] Global burst limit exceeded: ip=${ip}`);
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  });

  // 5. Strict CORS, Body Size Limits & Rate Limiting for /api/*
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    const host = req.get('host');
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'https')
      .split(',')[0]
      .trim();
    const sameOriginUrl = host ? `${proto}://${host}` : '';

    if (origin) {
      const isAllowed =
        ALLOWED_CORS_ORIGINS.has(origin) ||
        (sameOriginUrl !== '' && origin === sameOriginUrl);

      if (!isAllowed) {
        console.warn(
          `[security] Blocked CORS origin on API: origin=${origin} path=${req.path} ip=${getClientIp(req)}`
        );
        res.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const ip = getClientIp(req);
    const rateCheck = apiRateLimiter.check(ip);
    res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
    if (!rateCheck.allowed) {
      console.warn(`[security] API rate limit exceeded: ip=${ip} path=${req.path}`);
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    next();
  });

  app.use('/api', express.json({ limit: '64kb' }));
  app.use('/api', express.urlencoded({ extended: false, limit: '64kb' }));

  // Public minimal healthcheck endpoint (never exposes secrets, stack, or internal env)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      platform: 'CXT - othman',
      timestamp: new Date().toISOString(),
    });
  });

  // Unknown API routes return safe JSON 404
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // 6. Vite Middleware in Dev OR Hardened Static Bundle in Production
  if (IS_DEV) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        dotfiles: 'deny',
        etag: true,
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // 7. Centralized Safe Error Handler (never leaks stack traces or internals)
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;

    console.error(
      `[server-error] method=${req.method} path=${req.path} status=${status}`,
      err instanceof Error ? err.message : 'Unknown error'
    );

    if (res.headersSent) return;
    if (req.path.startsWith('/api/')) {
      res.status(status).json({
        error:
          status === 413
            ? 'Payload too large'
            : status < 500
            ? 'Invalid request'
            : 'Internal server error',
      });
      return;
    }
    res.status(status).type('text/plain').send('Error processing request');
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `CXT - othman server listening on http://0.0.0.0:${PORT} (${NODE_ENV})`
    );
  });
}

void startServer();
