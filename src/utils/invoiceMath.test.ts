import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCsvExport,
  buildWhatsAppShareUrl,
  calculateInvoiceTotals,
  calculateLineTotal,
  computeFinancialAnalytics,
  formatCurrency,
  generateNextInvoiceNumber,
  normalizeWhatsAppPhone,
} from './invoiceMath';
import type { InvoiceItem, InvoiceRecord, StoreSettings } from '../types/invoice';

test('calculateLineTotal computes quantity * price minus discount with floor at 0', () => {
  const item: InvoiceItem = {
    id: '1',
    name: 'iPhone 16 Pro',
    quantity: 2,
    unitPrice: 4500,
    discount: 200,
  };
  assert.equal(calculateLineTotal(item), 8800);

  const overDiscounted: InvoiceItem = {
    id: '2',
    name: 'Cable',
    quantity: 1,
    unitPrice: 50,
    discount: 120,
  };
  assert.equal(calculateLineTotal(overDiscounted), 0);
});

test('calculateInvoiceTotals handles subtotal, discount clamping, VAT, and rounding', () => {
  const items: InvoiceItem[] = [
    { id: '1', name: 'Item A', quantity: 2, unitPrice: 100, discount: 0 },
    { id: '2', name: 'Item B', quantity: 1, unitPrice: 50, discount: 10 },
  ];
  const totals = calculateInvoiceTotals(items, 15, 40);
  assert.equal(totals.subtotal, 240);
  assert.equal(totals.discountAmount, 40);
  assert.equal(totals.taxableAmount, 200);
  assert.equal(totals.taxAmount, 30);
  assert.equal(totals.total, 230);
});

test('generateNextInvoiceNumber increments highest existing sequence for current year', () => {
  const invoices = [
    { invoiceNumber: 'CXT-2026-0001' },
    { invoiceNumber: 'CXT-2026-0007' },
    { invoiceNumber: 'CXT-2025-0099' },
  ] as InvoiceRecord[];

  assert.equal(generateNextInvoiceNumber(invoices, 2026), 'CXT-2026-0008');
  assert.equal(generateNextInvoiceNumber([], 2026), 'CXT-2026-0001');
});

test('normalizeWhatsAppPhone strips non-digits and leading 00', () => {
  assert.equal(normalizeWhatsAppPhone('+966 55-123-4567'), '966551234567');
  assert.equal(normalizeWhatsAppPhone('00964 770 123 4567'), '9647701234567');
});

test('buildWhatsAppShareUrl encodes CXT - othman receipt details cleanly', () => {
  const store: StoreSettings = {
    ownerId: 'demo',
    storeName: 'مركز النخبة للهواتف',
    businessType: 'mobile_shop',
    currency: 'SAR',
    taxRate: 15,
    accentColor: '#047857',
    templateStyle: 'modern',
  };
  const invoice: InvoiceRecord = {
    id: 'inv-1',
    ownerId: 'demo',
    invoiceNumber: 'CXT-2026-0001',
    clientName: 'أحمد العتيبي',
    clientPhone: '+966501112233',
    businessType: 'mobile_shop',
    issueDate: '2026-11-16',
    status: 'paid',
    currency: 'SAR',
    taxRate: 15,
    discountAmount: 0,
    subtotal: 1000,
    taxAmount: 150,
    total: 1150,
    items: [{ id: '1', name: 'شاحن سريع', quantity: 2, unitPrice: 500, discount: 0 }],
    createdAtIso: '2026-11-16T00:00:00Z',
    updatedAtIso: '2026-11-16T00:00:00Z',
  };

  const url = buildWhatsAppShareUrl(invoice, store);
  assert.ok(url.startsWith('https://wa.me/966501112233?text='));
  assert.ok(decodeURIComponent(url).includes('CXT - othman'));
  assert.ok(decodeURIComponent(url).includes('CXT-2026-0001'));
});

test('computeFinancialAnalytics aggregates revenue, tax, collection rate, and monthly series', () => {
  const sampleInvoices: InvoiceRecord[] = [
    {
      id: '1',
      ownerId: 'u1',
      invoiceNumber: 'CXT-2026-0001',
      clientName: 'شركة المدار',
      businessType: 'mobile_shop',
      issueDate: '2026-10-12',
      status: 'paid',
      currency: 'SAR',
      taxRate: 15,
      discountAmount: 0,
      subtotal: 1000,
      taxAmount: 150,
      total: 1150,
      items: [{ id: '1', name: 'Item', quantity: 1, unitPrice: 1000, discount: 0 }],
      createdAtIso: '',
      updatedAtIso: '',
    },
    {
      id: '2',
      ownerId: 'u1',
      invoiceNumber: 'CXT-2026-0002',
      clientName: 'مؤسسة الفجر',
      businessType: 'shopping_mall',
      issueDate: '2026-11-05',
      status: 'pending',
      currency: 'SAR',
      taxRate: 15,
      discountAmount: 50,
      subtotal: 1000,
      taxAmount: 142.5,
      total: 1092.5,
      items: [{ id: '1', name: 'Item', quantity: 1, unitPrice: 1000, discount: 0 }],
      createdAtIso: '',
      updatedAtIso: '',
    },
  ];

  const analytics = computeFinancialAnalytics(sampleInvoices);
  assert.equal(analytics.paidRevenue, 1150);
  assert.equal(analytics.pendingRevenue, 1092.5);
  assert.equal(analytics.totalRevenue, 2242.5);
  assert.equal(analytics.totalTaxCollected, 150);
  assert.equal(analytics.collectionRate, 51);
  assert.equal(analytics.monthlySeries.length, 2);
  assert.equal(analytics.topClients[0].clientName, 'شركة المدار');
});

test('formatCurrency defaults to IQD without decimals and buildCsvExport produces valid output', () => {
  assert.equal(formatCurrency(1250000), '1,250,000 د.ع');
  assert.equal(formatCurrency(1250, 'SAR'), '1,250.00 ر.س');
  const csv = buildCsvExport([]);
  assert.ok(csv.startsWith('\uFEFFرقم الفاتورة'));
});

test('buildWhatsAppShareUrl includes custom fields when defined', () => {
  const store: StoreSettings = {
    ownerId: 'demo',
    storeName: 'متجر بغداد للهواتف',
    businessType: 'mobile_shop',
    currency: 'IQD',
    taxRate: 0,
    accentColor: '#047857',
    templateStyle: 'executive',
    invoiceFont: 'tajawal',
  };
  const invoice: InvoiceRecord = {
    id: 'inv-iqd',
    ownerId: 'demo',
    invoiceNumber: 'CXT-2026-0099',
    clientName: 'حيدر العزاوي',
    businessType: 'mobile_shop',
    issueDate: '2026-11-16',
    status: 'paid',
    currency: 'IQD',
    taxRate: 0,
    discountAmount: 0,
    subtotal: 1500000,
    taxAmount: 0,
    total: 1500000,
    customFields: [{ id: 'cf-1', label: 'المندوب', value: 'أحمد علي' }],
    items: [{ id: '1', name: 'هاتف', quantity: 1, unitPrice: 1500000, discount: 0 }],
    createdAtIso: '',
    updatedAtIso: '',
  };
  const decoded = decodeURIComponent(buildWhatsAppShareUrl(invoice, store));
  assert.ok(decoded.includes('1,500,000 د.ع'));
  assert.ok(decoded.includes('المندوب: أحمد علي'));
  assert.ok(decoded.includes('CXT - othman'));
});
