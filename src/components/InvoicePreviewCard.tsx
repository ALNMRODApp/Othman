import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BUSINESS_PRESETS, INVOICE_FONTS } from '../data/presets';
import type {
  BusinessType,
  InvoiceRecord,
  StoreSettings,
} from '../types/invoice';
import { calculateLineTotal, formatCurrency } from '../utils/invoiceMath';
import { sanitizeHexColor, sanitizeImageUrl } from '../utils/security';

interface InvoicePreviewCardProps {
  invoice: InvoiceRecord;
  store: StoreSettings;
}

export const InvoicePreviewCard = forwardRef<
  HTMLDivElement,
  InvoicePreviewCardProps
>(function InvoicePreviewCard({ invoice, store }, ref) {
  const preset =
    BUSINESS_PRESETS[(invoice.businessType as BusinessType) || store.businessType] ||
    BUSINESS_PRESETS.custom;

  const businessLabel =
    store.businessType === 'custom' && store.customBusinessLabel
      ? store.customBusinessLabel
      : preset.label;

  const accent = sanitizeHexColor(store.accentColor, '#047857');
  const safeLogoUrl = sanitizeImageUrl(store.logoDataUrl);
  const styleMode = store.templateStyle || 'modern';
  const isThermal = styleMode === 'thermal';
  const isClassic = styleMode === 'classic';
  const isExecutive = styleMode === 'executive';
  const isMinimal = styleMode === 'minimal';

  const activeFont =
    INVOICE_FONTS.find((f) => f.id === (store.invoiceFont || 'cairo')) ||
    INVOICE_FONTS[0];

  const customFields = (
    invoice.customFields && invoice.customFields.length > 0
      ? invoice.customFields
      : store.customFields || []
  ).filter((f) => f.label.trim() || f.value.trim());

  const qrPayload = JSON.stringify({
    platform: 'CXT - othman',
    store: store.storeName,
    taxNo: store.taxNumber || 'N/A',
    inv: invoice.invoiceNumber,
    date: invoice.issueDate,
    total: invoice.total,
    currency: invoice.currency,
  });

  const statusLabel =
    invoice.status === 'paid'
      ? 'مدفوعة'
      : invoice.status === 'pending'
      ? 'قيد الانتظار'
      : 'مسودة';

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{ fontFamily: activeFont.cssFamily }}
      className={`print-only-invoice bg-white text-slate-900 mx-auto ${
        isThermal
          ? 'max-w-[360px] p-5 rounded-lg border border-slate-300'
          : isClassic
          ? 'w-full p-7 sm:p-9 rounded-none border-2 border-slate-800'
          : isMinimal
          ? 'w-full p-7 sm:p-10 rounded-xl border border-slate-200'
          : 'w-full p-7 sm:p-9 rounded-2xl border border-slate-200'
      }`}
    >
      {/* Top Accent Bar for Modern */}
      {styleMode === 'modern' && (
        <div
          className="h-1.5 w-full rounded-full mb-7"
          style={{ backgroundColor: accent }}
        />
      )}

      {/* Header */}
      <div
        className={`flex ${
          isThermal
            ? 'flex-col items-center text-center gap-3 pb-4 border-b border-dashed border-slate-300'
            : isExecutive
            ? 'flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-xl text-white mb-6'
            : 'flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200'
        }`}
        style={isExecutive ? { backgroundColor: accent } : undefined}
      >
        <div
          className={`flex ${
            isThermal ? 'flex-col items-center' : 'items-center gap-4'
          }`}
        >
          {safeLogoUrl ? (
            <img
              src={safeLogoUrl}
              alt={`شعار ${store.storeName}`}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
              style={{
                backgroundColor: isExecutive ? '#ffffff' : accent,
                color: isExecutive ? accent : '#ffffff',
              }}
            >
              {store.storeName.slice(0, 2)}
            </div>
          )}

          <div>
            <h2
              className={`text-lg font-extrabold ${
                isExecutive ? 'text-white' : 'text-slate-900'
              }`}
            >
              {store.storeName}
            </h2>
            <p
              className={`text-xs mt-0.5 ${
                isExecutive ? 'text-white/85' : 'text-slate-500'
              }`}
            >
              {businessLabel}
            </p>
            {store.address && (
              <p
                className={`text-xs mt-0.5 ${
                  isExecutive ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                {store.address}
              </p>
            )}
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] mt-1 ${
                isExecutive ? 'text-white/80' : 'text-slate-500'
              }`}
            >
              {store.phone && <span dir="ltr">{store.phone}</span>}
              {store.taxNumber && (
                <span>
                  الرقم الضريبي:{' '}
                  <span className="font-mono tabular-nums">{store.taxNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={isThermal ? 'w-full pt-2' : 'sm:text-left shrink-0'}>
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: isExecutive ? '#ffffff' : accent }}
          >
            فاتورة إلكترونية
          </p>
          <p
            className={`text-lg font-extrabold font-mono tabular-nums mt-0.5 ${
              isExecutive ? 'text-white' : 'text-slate-900'
            }`}
          >
            {invoice.invoiceNumber}
          </p>
          <p
            className={`text-xs mt-1 ${
              isExecutive ? 'text-white/85' : 'text-slate-500'
            }`}
          >
            الإصدار:{' '}
            <span className="font-mono tabular-nums">{invoice.issueDate}</span>
          </p>
          {invoice.dueDate && !isThermal && (
            <p
              className={`text-xs ${
                isExecutive ? 'text-white/85' : 'text-slate-500'
              }`}
            >
              الاستحقاق:{' '}
              <span className="font-mono tabular-nums">{invoice.dueDate}</span>
            </p>
          )}
          <p
            className={`text-xs font-semibold mt-1.5 ${
              isExecutive ? 'text-white' : 'text-slate-700'
            }`}
          >
            الحالة: {statusLabel}
          </p>
        </div>
      </div>

      {/* Client & Platform Info */}
      <div
        className={`py-4 ${
          isThermal
            ? 'border-b border-dashed border-slate-300 text-center'
            : 'grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200'
        }`}
      >
        <div>
          <p className="text-[11px] font-semibold text-slate-400">بيانات العميل</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">
            {invoice.clientName || 'عميل نقدي'}
          </p>
          {invoice.clientPhone && (
            <p className="text-xs text-slate-600 font-mono mt-0.5" dir="ltr">
              {invoice.clientPhone}
            </p>
          )}
        </div>
        {!isThermal && (
          <div className="sm:text-left">
            <p className="text-[11px] font-semibold text-slate-400">
              صادرة عبر منصة
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              CXT - othman
            </p>
            <p className="text-xs text-slate-500 mt-0.5">العملة: {invoice.currency}</p>
          </div>
        )}
      </div>

      {/* Custom Fields Section */}
      {customFields.length > 0 && (
        <div
          className={`py-3 border-b ${
            isThermal
              ? 'border-dashed border-slate-300 space-y-1 text-xs'
              : 'border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3'
          }`}
        >
          {customFields.map((field) => (
            <div
              key={field.id}
              className={isThermal ? 'flex items-center justify-between' : ''}
            >
              <span className="text-[11px] text-slate-500 block">
                {field.label || 'حقل إضافي'}
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {field.value || '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Line Items Table */}
      <div className="py-5 overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr
              className={`text-[11px] font-bold ${
                isClassic
                  ? 'bg-slate-900 text-white'
                  : isExecutive
                  ? 'border-b-2 text-slate-800'
                  : isMinimal
                  ? 'border-b border-slate-200 text-slate-500'
                  : 'bg-slate-50 border-b border-slate-200 text-slate-600'
              }`}
              style={isExecutive ? { borderColor: accent } : undefined}
            >
              <th className="py-2.5 px-2.5">الصنف / البيان</th>
              {!isThermal && <th className="py-2.5 px-2">{preset.skuLabel}</th>}
              <th className="py-2.5 px-2 text-center whitespace-nowrap">الكمية</th>
              <th className="py-2.5 px-2 text-left whitespace-nowrap">السعر</th>
              <th className="py-2.5 px-2.5 text-left whitespace-nowrap">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {invoice.items.map((item) => {
              const lineTotal = calculateLineTotal(item);
              return (
                <tr key={item.id}>
                  <td className="py-2.5 px-2.5 font-semibold text-slate-900">
                    <div>{item.name || 'بند'}</div>
                    {isThermal && item.sku && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.sku}
                      </div>
                    )}
                    {item.discount > 0 && (
                      <div className="text-[10px] text-emerald-700">
                        خصم: -{formatCurrency(item.discount, invoice.currency)}
                      </div>
                    )}
                  </td>
                  {!isThermal && (
                    <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {item.sku || '—'}
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-2 text-left font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-2.5 px-2.5 text-left font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(lineTotal, invoice.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals + QR */}
      <div
        className={`pt-5 border-t border-slate-200 flex ${
          isThermal
            ? 'flex-col gap-5 items-center'
            : 'flex-col sm:flex-row items-start sm:items-end justify-between gap-6'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-slate-200 rounded-xl">
            <QRCodeSVG value={qrPayload} size={isThermal ? 88 : 84} level="M" />
          </div>
          <div className="text-[11px] text-slate-500 max-w-[160px] leading-relaxed">
            رمز تحقق الفاتورة الإلكترونية
            <br />
            <span className="font-mono text-slate-700">CXT - othman</span>
          </div>
        </div>

        <div
          className={`${
            isThermal ? 'w-full space-y-2' : 'w-full sm:w-72 space-y-2'
          } ${isExecutive ? 'bg-slate-50 p-4 rounded-xl border border-slate-200' : ''}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>المجموع الفرعي</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </span>
          </div>

          {invoice.discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-700">
              <span>خصم الفاتورة</span>
              <span className="font-mono tabular-nums font-semibold whitespace-nowrap">
                -{formatCurrency(invoice.discountAmount, invoice.currency)}
              </span>
            </div>
          )}

          {invoice.taxRate > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>الضريبة ({invoice.taxRate}%)</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                {formatCurrency(invoice.taxAmount, invoice.currency)}
              </span>
            </div>
          )}

          <div
            className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold"
            style={{ color: accent }}
          >
            <span>الإجمالي المستحق</span>
            <span className="font-mono tabular-nums text-base whitespace-nowrap">
              {formatCurrency(invoice.total, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Footer */}
      {(invoice.notes || store.invoiceFooterNote) && (
        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
          {invoice.notes && (
            <p>
              <span className="font-semibold text-slate-700">ملاحظات: </span>
              {invoice.notes}
            </p>
          )}
          {store.invoiceFooterNote && <p>{store.invoiceFooterNote}</p>}
        </div>
      )}
    </div>
  );
});
