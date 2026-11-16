import { useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  MessageCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { BUSINESS_PRESETS } from '../data/presets';
import type {
  BusinessType,
  InvoiceRecord,
  InvoiceStatus,
  StoreSettings,
} from '../types/invoice';
import { formatCurrency } from '../utils/invoiceMath';
import { exportInvoiceElementToPdf } from '../utils/pdfExport';
import { InvoicePreviewCard } from './InvoicePreviewCard';

interface InvoicesListViewProps {
  invoices: InvoiceRecord[];
  store: StoreSettings;
  onEditInvoice: (invoice: InvoiceRecord) => void;
  onDuplicateInvoice: (invoice: InvoiceRecord) => void;
  onMarkPaid: (invoiceId: string) => Promise<void>;
  onDeleteInvoice: (invoiceId: string) => Promise<void>;
  onShareWhatsApp: (invoice: InvoiceRecord) => void;
}

export function InvoicesListView({
  invoices,
  store,
  onEditInvoice,
  onDuplicateInvoice,
  onMarkPaid,
  onDeleteInvoice,
  onShareWhatsApp,
}: InvoicesListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [previewTarget, setPreviewTarget] = useState<InvoiceRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const modalPreviewRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        (inv.clientPhone || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleDownloadPdf = async (inv: InvoiceRecord) => {
    if (!modalPreviewRef.current) return;
    setIsExporting(true);
    try {
      await exportInvoiceElementToPdf(modalPreviewRef.current, inv.invoiceNumber);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">سجل الفواتير الإلكترونية</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إجمالي الفواتير المسجلة: {invoices.length} فاتورة
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم العميل أو الهاتف..."
            className="w-full pr-10 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
        </div>

        <div
          role="group"
          aria-label="تصفية حسب حالة الفاتورة"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start"
        >
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'paid', label: 'مدفوعة' },
              { id: 'pending', label: 'قيد الانتظار' },
              { id: 'draft', label: 'مسودة' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            لا توجد فواتير مطابقة لمعايير البحث الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-5">رقم الفاتورة</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">النشاط</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-left">الإجمالي</th>
                  <th className="py-3.5 px-5 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((inv) => {
                  const sector =
                    BUSINESS_PRESETS[inv.businessType as BusinessType]?.label ||
                    'نشاط مخصص';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {inv.clientName}
                        </div>
                        {inv.clientPhone && (
                          <div className="text-xs text-slate-400 font-mono" dir="ltr">
                            {inv.clientPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {sector}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-500">
                        {inv.issueDate}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                        {inv.status === 'paid' ? (
                          <span className="text-emerald-700">✓ مدفوعة</span>
                        ) : inv.status === 'pending' ? (
                          <span className="text-amber-700">◷ قيد الانتظار</span>
                        ) : (
                          <span className="text-slate-500">• مسودة</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="py-3.5 px-5 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewTarget(inv)}
                            aria-label={`معاينة الفاتورة ${inv.invoiceNumber}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onShareWhatsApp(inv)}
                            aria-label={`مشاركة ${inv.invoiceNumber} عبر واتساب`}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => void onMarkPaid(inv.id)}
                              aria-label={`تحصيل الفاتورة ${inv.invoiceNumber}`}
                              title="تأكيد الدفع"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {inv.status !== 'paid' ? (
                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              تعديل
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onDuplicateInvoice(inv)}
                              aria-label={`تكرار الفاتورة ${inv.invoiceNumber}`}
                              title="نسخ كفاتورة جديدة"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void onDeleteInvoice(inv.id)}
                            aria-label={`حذف الفاتورة ${inv.invoiceNumber}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview & PDF Modal */}
      {previewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الفاتورة وتصدير PDF"
          className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto flex items-start justify-center"
        >
          <div className="bg-slate-100 rounded-2xl max-w-3xl w-full my-6 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf(previewTarget)}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'جاري التصدير...' : 'تنزيل PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShareWhatsApp(previewTarget)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                  <span>واتساب</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                aria-label="إغلاق المعاينة"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <InvoicePreviewCard
              ref={modalPreviewRef}
              invoice={previewTarget}
              store={store}
            />
          </div>
        </div>
      )}
    </div>
  );
}
