import type {
  ClientRecord,
  InvoiceItem,
  InvoiceRecord,
  StoreSettings,
} from '../types/invoice';
import { sanitizeCsvCell } from './security';

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineTotal(item: InvoiceItem): number {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const price = Math.max(0, Number(item.unitPrice) || 0);
  const discount = Math.max(0, Number(item.discount) || 0);
  const gross = qty * price;
  return roundCurrency(Math.max(0, gross - discount));
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRate: number,
  invoiceDiscount: number
): InvoiceTotals {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  );
  const safeDiscount = roundCurrency(
    Math.min(subtotal, Math.max(0, Number(invoiceDiscount) || 0))
  );
  const taxableAmount = roundCurrency(Math.max(0, subtotal - safeDiscount));
  const safeTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));
  const taxAmount = roundCurrency((taxableAmount * safeTaxRate) / 100);
  const total = roundCurrency(taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount: safeDiscount,
    taxableAmount,
    taxAmount,
    total,
  };
}

export const CURRENCY_LABELS: Record<string, string> = {
  SAR: 'ر.س',
  AED: 'د.إ',
  IQD: 'د.ع',
  KWD: 'د.ك',
  EGP: 'ج.م',
  USD: '$',
};

export function formatCurrency(amount: number, currency: string = 'IQD'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'IQD' ? 0 : 2,
    maximumFractionDigits: currency === 'IQD' ? 0 : 2,
  }).format(safeAmount);
  const symbol = CURRENCY_LABELS[currency] || currency;
  return `${formattedNumber} ${symbol}`;
}

export function normalizeWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  const clean = digits.startsWith('00') ? digits.slice(2) : digits;
  return clean.slice(0, 15);
}

export function buildWhatsAppMessage(
  invoice: InvoiceRecord,
  store: StoreSettings
): string {
  const statusText =
    invoice.status === 'paid'
      ? 'مدفوعة'
      : invoice.status === 'pending'
      ? 'قيد الانتظار'
      : 'مسودة';

  const itemLines = invoice.items
    .slice(0, 8)
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} (${item.quantity} × ${formatCurrency(
          item.unitPrice,
          invoice.currency
        )}) = ${formatCurrency(calculateLineTotal(item), invoice.currency)}`
    )
    .join('\n');

  const moreItemsNote =
    invoice.items.length > 8
      ? `\n... وعدد (${invoice.items.length - 8}) بنود إضافية`
      : '';

  const customFieldLines = (invoice.customFields || [])
    .filter((f) => f.label.trim() && f.value.trim())
    .map((f) => `${f.label}: ${f.value}`)
    .join('\n');

  return [
    `*فاتورة إلكترونية — ${store.storeName}*`,
    `منصة CXT - othman`,
    `──────────────────`,
    `رقم الفاتورة: ${invoice.invoiceNumber}`,
    `التاريخ: ${invoice.issueDate}`,
    `العميل: ${invoice.clientName}`,
    `الحالة: ${statusText}`,
    customFieldLines || null,
    `──────────────────`,
    `*التفاصيل:*`,
    `${itemLines}${moreItemsNote}`,
    `──────────────────`,
    `المجموع الفرعي: ${formatCurrency(invoice.subtotal, invoice.currency)}`,
    invoice.discountAmount > 0
      ? `الخصم: -${formatCurrency(invoice.discountAmount, invoice.currency)}`
      : null,
    invoice.taxRate > 0
      ? `الضريبة (${invoice.taxRate}%): ${formatCurrency(
          invoice.taxAmount,
          invoice.currency
        )}`
      : null,
    `*الإجمالي النهائي: ${formatCurrency(invoice.total, invoice.currency)}*`,
    store.invoiceFooterNote ? `\n${store.invoiceFooterNote}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppShareUrl(
  invoice: InvoiceRecord,
  store: StoreSettings,
  overridePhone?: string
): string {
  const text = encodeURIComponent(buildWhatsAppMessage(invoice, store));
  const cleanPhone = normalizeWhatsAppPhone(overridePhone ?? invoice.clientPhone);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

export function generateNextInvoiceNumber(
  invoices: InvoiceRecord[],
  year: number = new Date().getFullYear()
): string {
  const prefix = `CXT-${year}-`;
  let maxSeq = 0;
  for (const inv of invoices) {
    if (inv.invoiceNumber.startsWith(prefix)) {
      const tail = Number.parseInt(inv.invoiceNumber.slice(prefix.length), 10);
      if (Number.isFinite(tail) && tail > maxSeq) {
        maxSeq = tail;
      }
    }
  }
  const next = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${next}`;
}

export interface MonthlyMetric {
  monthKey: string;
  label: string;
  paid: number;
  pending: number;
  total: number;
  count: number;
}

export interface ClientSpendSummary {
  clientName: string;
  clientPhone?: string;
  invoiceCount: number;
  totalSpent: number;
  paidSpent: number;
}

export interface FinancialAnalytics {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  draftRevenue: number;
  totalTaxCollected: number;
  totalDiscounts: number;
  paidCount: number;
  pendingCount: number;
  draftCount: number;
  collectionRate: number;
  monthlySeries: MonthlyMetric[];
  topClients: ClientSpendSummary[];
}

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

export function computeFinancialAnalytics(
  invoices: InvoiceRecord[],
  _clients: ClientRecord[] = []
): FinancialAnalytics {
  let paidRevenue = 0;
  let pendingRevenue = 0;
  let draftRevenue = 0;
  let totalTaxCollected = 0;
  let totalDiscounts = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let draftCount = 0;

  const monthlyMap = new Map<string, MonthlyMetric>();
  const clientMap = new Map<string, ClientSpendSummary>();

  for (const inv of invoices) {
    const total = Number(inv.total) || 0;
    const tax = Number(inv.taxAmount) || 0;
    const discount = Number(inv.discountAmount) || 0;

    if (inv.status === 'paid') {
      paidRevenue = roundCurrency(paidRevenue + total);
      totalTaxCollected = roundCurrency(totalTaxCollected + tax);
      paidCount += 1;
    } else if (inv.status === 'pending') {
      pendingRevenue = roundCurrency(pendingRevenue + total);
      pendingCount += 1;
    } else {
      draftRevenue = roundCurrency(draftRevenue + total);
      draftCount += 1;
    }

    totalDiscounts = roundCurrency(totalDiscounts + discount);

    const monthKey = (inv.issueDate || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(monthKey)) {
      const [, monthNum] = monthKey.split('-');
      const existing = monthlyMap.get(monthKey) || {
        monthKey,
        label: ARABIC_MONTHS[monthNum] || monthKey,
        paid: 0,
        pending: 0,
        total: 0,
        count: 0,
      };
      if (inv.status === 'paid') {
        existing.paid = roundCurrency(existing.paid + total);
      } else if (inv.status === 'pending') {
        existing.pending = roundCurrency(existing.pending + total);
      }
      if (inv.status !== 'draft') {
        existing.total = roundCurrency(existing.total + total);
      }
      existing.count += 1;
      monthlyMap.set(monthKey, existing);
    }

    if (inv.status !== 'draft') {
      const clientKey = inv.clientName.trim();
      const prevClient = clientMap.get(clientKey) || {
        clientName: clientKey,
        clientPhone: inv.clientPhone,
        invoiceCount: 0,
        totalSpent: 0,
        paidSpent: 0,
      };
      prevClient.invoiceCount += 1;
      prevClient.totalSpent = roundCurrency(prevClient.totalSpent + total);
      if (inv.status === 'paid') {
        prevClient.paidSpent = roundCurrency(prevClient.paidSpent + total);
      }
      clientMap.set(clientKey, prevClient);
    }
  }

  const totalRevenue = roundCurrency(paidRevenue + pendingRevenue);
  const collectionRate =
    totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  const monthlySeries = Array.from(monthlyMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-6);

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return {
    totalRevenue,
    paidRevenue,
    pendingRevenue,
    draftRevenue,
    totalTaxCollected,
    totalDiscounts,
    paidCount,
    pendingCount,
    draftCount,
    collectionRate,
    monthlySeries,
    topClients,
  };
}

export function buildCsvExport(invoices: InvoiceRecord[]): string {
  const headers = [
    'رقم الفاتورة',
    'العميل',
    'رقم الهاتف',
    'تاريخ الإصدار',
    'الحالة',
    'المجموع الفرعي',
    'الخصم',
    'الضريبة',
    'الإجمالي',
    'العملة',
  ];

  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.clientName,
    inv.clientPhone || '',
    inv.issueDate,
    inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'قيد الانتظار' : 'مسودة',
    inv.subtotal,
    inv.discountAmount,
    inv.taxAmount,
    inv.total,
    inv.currency,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(sanitizeCsvCell).join(','))
    .join('\n');

  return `\uFEFF${csvContent}`;
}

export function clampString(value: string | undefined, maxLength: number): string {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}
