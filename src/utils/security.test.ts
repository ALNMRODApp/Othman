import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmailFormat,
  sanitizeCsvCell,
  sanitizeDemoWorkspacePayload,
  sanitizeHexColor,
  sanitizeImageUrl,
  validateStrongPassword,
  validateUploadedImageMeta,
} from './security';
import {
  buildAllowedCorsOrigins,
  buildContentSecurityPolicy,
  isBlockedSensitivePath,
  shouldRedirectToHttps,
  SlidingWindowRateLimiter,
} from '../security/httpSecurity';
import { SEED_CLIENTS, SEED_INVOICES, SEED_STORE_SETTINGS } from '../data/presets';

test('sanitizeImageUrl blocks XSS SVGs, javascript URLs, and mixed-content HTTP', () => {
  assert.equal(sanitizeImageUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeImageUrl('http://insecure.example.com/logo.png'), '');
  assert.equal(
    sanitizeImageUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+'),
    ''
  );
  assert.equal(sanitizeImageUrl('/src/assets/../.env'), '');

  assert.equal(
    sanitizeImageUrl('/src/assets/images/cxt_brand_emblem_1794834674305.jpg'),
    '/src/assets/images/cxt_brand_emblem_1794834674305.jpg'
  );
  assert.equal(
    sanitizeImageUrl('https://cdn.example.com/logo.png'),
    'https://cdn.example.com/logo.png'
  );
  assert.equal(
    sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo='),
    'data:image/png;base64,iVBORw0KGgo='
  );
});

test('sanitizeHexColor rejects CSS injection and keeps valid hex colors', () => {
  assert.equal(sanitizeHexColor('#047857'), '#047857');
  assert.equal(sanitizeHexColor('red; background: url(evil)'), '#047857');
  assert.equal(sanitizeHexColor('#fff'), '#047857');
});

test('validateUploadedImageMeta blocks SVG and oversized image uploads', () => {
  assert.ok(
    validateUploadedImageMeta({
      name: 'payload.svg',
      type: 'image/svg+xml',
      size: 512,
    })
  );
  assert.ok(
    validateUploadedImageMeta({
      name: 'huge.png',
      type: 'image/png',
      size: 5 * 1024 * 1024,
    })
  );
  assert.equal(
    validateUploadedImageMeta({
      name: 'store-logo.png',
      type: 'image/png',
      size: 120 * 1024,
    }),
    null
  );
});

test('sanitizeCsvCell neutralizes spreadsheet formula injection triggers', () => {
  assert.equal(sanitizeCsvCell('=CMD|"/C calc"!A0'), '"\'=CMD|""/C calc""!A0"');
  assert.equal(sanitizeCsvCell('+9647701234890'), "'+9647701234890");
  assert.equal(sanitizeCsvCell('@SUM(A1:A2)'), "'@SUM(A1:A2)");
  assert.equal(sanitizeCsvCell('شركة الأفق'), 'شركة الأفق');
});

test('auth validators enforce valid email format and strong signup password', () => {
  assert.equal(isValidEmailFormat('merchant@cxt-othman.com'), true);
  assert.equal(isValidEmailFormat('bad-email'), false);

  assert.ok(validateStrongPassword('123456'));
  assert.ok(validateStrongPassword('onlyletters'));
  assert.equal(validateStrongPassword('CxtPass2026'), null);
});

test('sanitizeDemoWorkspacePayload strips unsafe URLs and colors from localStorage', () => {
  const sanitized = sanitizeDemoWorkspacePayload(
    {
      store: {
        storeName: 'متجر تجريبي',
        logoDataUrl: 'javascript:alert(1)',
        accentColor: 'url(evil)',
      },
      clients: [{ id: 'c1', name: 'عميل' }],
      invoices: [],
    },
    {
      store: SEED_STORE_SETTINGS,
      clients: SEED_CLIENTS,
      invoices: SEED_INVOICES,
    }
  );
  assert.equal(sanitized.store.logoDataUrl, '');
  assert.equal(sanitized.store.accentColor, SEED_STORE_SETTINGS.accentColor);
});

test('HTTP security helpers enforce HTTPS redirect, CSP, CORS allowlist, and sensitive path blocks', () => {
  assert.equal(
    shouldRedirectToHttps({
      forwardedProto: 'http',
      host: 'cxt-othman.example.com',
      nodeEnv: 'production',
    }),
    true
  );
  assert.equal(
    shouldRedirectToHttps({
      forwardedProto: 'http',
      host: 'localhost:3000',
      nodeEnv: 'production',
    }),
    false
  );

  assert.equal(isBlockedSensitivePath('/.env'), true);
  assert.equal(isBlockedSensitivePath('/firestore.rules'), true);
  assert.equal(isBlockedSensitivePath('/assets/index.js.map'), true);
  assert.equal(isBlockedSensitivePath('/node_modules/.vite/deps/react.js', { isDev: false }), true);
  assert.equal(isBlockedSensitivePath('/node_modules/.vite/deps/react.js', { isDev: true }), false);
  assert.equal(isBlockedSensitivePath('/api/health'), false);

  const prodCsp = buildContentSecurityPolicy({ isDev: false });
  assert.ok(prodCsp.includes("object-src 'none'"));
  assert.ok(prodCsp.includes('upgrade-insecure-requests'));
  assert.ok(!prodCsp.includes("'unsafe-eval'"));

  const origins = buildAllowedCorsOrigins({
    appUrl: 'https://app.cxt-othman.example',
    extraOriginsEnv: 'https://admin.cxt-othman.example,http://insecure.example',
    isDev: false,
  });
  assert.equal(origins.has('https://app.cxt-othman.example'), true);
  assert.equal(origins.has('http://insecure.example'), false);

  const limiter = new SlidingWindowRateLimiter(60_000, 2);
  assert.equal(limiter.check('1.2.3.4', 1000).allowed, true);
  assert.equal(limiter.check('1.2.3.4', 2000).allowed, true);
  assert.equal(limiter.check('1.2.3.4', 3000).allowed, false);
});
