export interface HttpsRedirectCheckInput {
  forwardedProto?: string;
  host?: string;
  nodeEnv?: string;
  forceHttpsEnv?: string;
}

export function isLocalHostHeader(host?: string): boolean {
  if (!host) return true;
  const hostname = host.split(':')[0].toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]'
  );
}

/**
 * Determines whether an incoming HTTP request should be redirected to HTTPS.
 * Redirects only when sitting behind an HTTP proxy for a non-localhost domain
 * or when FORCE_HTTPS=true is explicitly enabled.
 */
export function shouldRedirectToHttps(input: HttpsRedirectCheckInput): boolean {
  if (isLocalHostHeader(input.host)) {
    return false;
  }
  const proto = (input.forwardedProto || '').split(',')[0].trim().toLowerCase();
  const forceEnabled =
    input.forceHttpsEnv === 'true' || input.nodeEnv === 'production';

  if (proto === 'http' && (forceEnabled || Boolean(input.host))) {
    return true;
  }
  return false;
}

export function buildContentSecurityPolicy(options: {
  isDev: boolean;
  firebaseAuthDomain?: string;
}): string {
  const authHost = options.firebaseAuthDomain
    ? `https://${options.firebaseAuthDomain}`
    : 'https://valid-crane-wf38q.firebaseapp.com';

  const scriptSrc = options.isDev
    ? `'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com`
    : `'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com`;

  const connectSrc = [
    `'self'`,
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'https://firestore.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://accounts.google.com',
    'wss://*.firebaseio.com',
    options.isDev ? 'ws://localhost:* wss://localhost:*' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com`,
    `connect-src ${connectSrc}`,
    `frame-src 'self' ${authHost} https://accounts.google.com`,
    `frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.usercontent.goog`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://accounts.google.com`,
  ];

  if (!options.isDev) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function buildAllowedCorsOrigins(options: {
  appUrl?: string;
  extraOriginsEnv?: string;
  isDev: boolean;
}): Set<string> {
  const origins = new Set<string>();

  const candidates = [
    options.appUrl,
    ...(options.extraOriginsEnv ? options.extraOriginsEnv.split(',') : []),
  ];

  for (const raw of candidates) {
    const trimmed = (raw || '').trim();
    if (!trimmed || trimmed === 'MY_APP_URL') continue;
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.protocol === 'https:' ||
        (options.isDev && parsed.protocol === 'http:')
      ) {
        origins.add(parsed.origin);
      }
    } catch {
      // Ignore malformed origin entries
    }
  }

  if (options.isDev) {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}

const SENSITIVE_EXACT_PATHS = new Set([
  '/package.json',
  '/package-lock.json',
  '/bun.lock',
  '/tsconfig.json',
  '/vite.config.ts',
  '/server.ts',
  '/firestore.rules',
  '/firebase-blueprint.json',
  '/metadata.json',
  '/.env',
  '/.env.example',
  '/.gitignore',
]);

export function isBlockedSensitivePath(
  pathname: string,
  options: { isDev?: boolean } = {}
): boolean {
  const normalized = pathname.split('?')[0].toLowerCase();
  const segments = normalized.split('/').filter(Boolean);

  // Vite dev middleware serves optimized dev deps from /node_modules/.vite/
  if (options.isDev && normalized.startsWith('/node_modules/.vite/')) {
    return false;
  }

  // Block any hidden/dotfile segment (except well-known diagnostics)
  for (const seg of segments) {
    if (seg.startsWith('.') && seg !== '.well-known') {
      return true;
    }
    if (seg === '..') {
      return true;
    }
  }

  if (SENSITIVE_EXACT_PATHS.has(normalized)) {
    return true;
  }

  if (
    normalized.endsWith('.map') ||
    normalized.endsWith('.pem') ||
    normalized.endsWith('.key') ||
    normalized.endsWith('.rules')
  ) {
    return true;
  }

  return false;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string, now: number = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      const oldest = recent[0] ?? now;
      const retryAfterMs = Math.max(1000, this.windowMs - (now - oldest));
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);

    // Opportunistic cleanup to avoid unbounded memory growth
    if (this.hits.size > 5000) {
      for (const [k, list] of this.hits.entries()) {
        if (list.every((ts) => ts <= cutoff)) {
          this.hits.delete(k);
        }
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - recent.length),
      retryAfterSeconds: 0,
    };
  }
}
