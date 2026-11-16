import type {
  ClientRecord,
  InvoiceRecord,
  StoreSettings,
} from '../types/invoice';

const SAFE_IMAGE_DATA_URL_REGEX =
  /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SAFE_PASSWORD_LETTER = /[A-Za-z\u0600-\u06FF]/;
const SAFE_PASSWORD_DIGIT = /\d/;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024; // 2 MB raw file ceiling
export const MAX_LOGO_DATA_URL_CHARS = 295_000; // Fits safely inside Firestore 300k rule

export function sanitizeHexColor(
  color: string | undefined,
  fallback: string = '#047857'
): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  return SAFE_HEX_COLOR_REGEX.test(trimmed) ? trimmed : fallback;
}

export function sanitizeImageUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Allow bundled static image assets without path traversal
  if (
    trimmed.startsWith('/src/assets/') &&
    !trimmed.includes('..') &&
    !trimmed.includes('\\') &&
    trimmed.length <= 300
  ) {
    return trimmed;
  }

  // Allow strictly raster base64 data URLs (SVG explicitly rejected to block embedded script XSS)
  if (
    trimmed.length <= MAX_LOGO_DATA_URL_CHARS &&
    SAFE_IMAGE_DATA_URL_REGEX.test(trimmed)
  ) {
    return trimmed;
  }

  // Allow strict HTTPS remote image URLs only (no HTTP mixed content, javascript:, etc.)
  if (trimmed.startsWith('https://') && trimmed.length <= 500) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch {
      return '';
    }
  }

  return '';
}

export function validateUploadedImageMeta(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const lowerName = (file.name || '').toLowerCase();
  if (
    lowerName.endsWith('.svg') ||
    lowerName.endsWith('.html') ||
    lowerName.endsWith('.htm') ||
    lowerName.endsWith('.js') ||
    file.type === 'image/svg+xml'
  ) {
    return 'صيغة SVG أو الملفات النصية غير مسموح بها لأسباب أمنية. يرجى رفع صورة PNG أو JPG أو WebP.';
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return 'يرجى اختيار صورة بصيغة PNG أو JPG أو WebP فقط.';
  }

  if (file.size <= 0 || file.size > MAX_LOGO_FILE_BYTES) {
    return 'حجم الشعار يجب ألا يتجاوز 2 ميجابايت.';
  }

  return null;
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) by prefixing an apostrophe
 * before cells beginning with formula triggers (=, +, -, @, tab, carriage return).
 */
export function sanitizeCsvCell(val: string | number | undefined): string {
  const raw = String(val ?? '');
  const needsNeutralization = /^[\t\r ]*[=+\-@]/.test(raw) || /^[\t\r]/.test(raw);
  const safe = needsNeutralization ? `'${raw}` : raw;
  if (
    safe.includes(',') ||
    safe.includes('"') ||
    safe.includes('\n') ||
    safe.includes('\r')
  ) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function isValidEmailFormat(email: string): boolean {
  const trimmed = email.trim();
  return (
    trimmed.length >= 3 &&
    trimmed.length <= 160 &&
    SAFE_EMAIL_REGEX.test(trimmed)
  );
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < 8) {
    return 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.';
  }
  if (password.length > 128) {
    return 'كلمة المرور طويلة جداً.';
  }
  if (!SAFE_PASSWORD_LETTER.test(password) || !SAFE_PASSWORD_DIGIT.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على أحرف وأرقام معاً لزيادة الأمان.';
  }
  return null;
}

export function sanitizeDemoWorkspacePayload(
  raw: unknown,
  fallback: {
    store: StoreSettings;
    clients: ClientRecord[];
    invoices: InvoiceRecord[];
  }
): {
  store: StoreSettings;
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
} {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const parsed = raw as Partial<{
    store: Partial<StoreSettings>;
    clients: unknown[];
    invoices: unknown[];
  }>;

  if (
    !parsed.store ||
    !Array.isArray(parsed.clients) ||
    !Array.isArray(parsed.invoices)
  ) {
    return fallback;
  }

  const cleanStore: StoreSettings = {
    ...fallback.store,
    ...parsed.store,
    ownerId: 'demo-merchant',
    storeName:
      typeof parsed.store.storeName === 'string' && parsed.store.storeName.trim()
        ? parsed.store.storeName.trim().slice(0, 120)
        : fallback.store.storeName,
    logoDataUrl: sanitizeImageUrl(parsed.store.logoDataUrl),
    accentColor: sanitizeHexColor(
      parsed.store.accentColor,
      fallback.store.accentColor
    ),
    taxRate: Math.min(100, Math.max(0, Number(parsed.store.taxRate) || 0)),
  };

  const cleanClients = parsed.clients
    .slice(0, 200)
    .filter((c): c is ClientRecord => Boolean(c && typeof c === 'object'))
    .map((c) => ({
      ...c,
      id: String(c.id || `cli-${Date.now()}`).slice(0, 128),
      ownerId: 'demo-merchant',
      name: String(c.name || 'عميل').slice(0, 120),
    }));

  const cleanInvoices = parsed.invoices
    .slice(0, 300)
    .filter((inv): inv is InvoiceRecord => Boolean(inv && typeof inv === 'object'))
    .map((inv) => ({
      ...inv,
      id: String(inv.id || `inv-${Date.now()}`).slice(0, 128),
      ownerId: 'demo-merchant',
      invoiceNumber: String(inv.invoiceNumber || 'CXT-0001').slice(0, 40),
      clientName: String(inv.clientName || 'عميل نقدي').slice(0, 120),
      total: Math.max(0, Number(inv.total) || 0),
      subtotal: Math.max(0, Number(inv.subtotal) || 0),
      taxAmount: Math.max(0, Number(inv.taxAmount) || 0),
      discountAmount: Math.max(0, Number(inv.discountAmount) || 0),
      items: Array.isArray(inv.items) ? inv.items.slice(0, 50) : [],
    }));

  return {
    store: cleanStore,
    clients: cleanClients,
    invoices: cleanInvoices,
  };
}
