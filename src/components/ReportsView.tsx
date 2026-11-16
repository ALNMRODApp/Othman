import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { BUSINESS_PRESETS } from '../data/presets';
import type {
  BusinessType,
  ClientRecord,
  InvoiceRecord,
  StoreSettings,
} from '../types/invoice';
import {
  buildCsvExport,
  computeFinancialAnalytics,
  formatCurrency,
} from '../utils/invoiceMath';

interface ReportsViewProps {
  invoices: InvoiceRecord[];
  clients: ClientRecord[];
  store: StoreSettings;
}

export function ReportsView({ invoices, clients, store }: ReportsViewProps) {
  const [sectorFilter, setSectorFilter] = useState<'all' | BusinessType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>(
    'all'
  );

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (sectorFilter !== 'all' && inv.businessType !== sectorFilter) {
        return false;
      }
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [invoices, sectorFilter, statusFilter]);

  const analytics = useMemo(
    () => computeFinancialAnalytics(filteredInvoices, clients),
    [filteredInvoices, clients]
  );

  const sectorBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; total: number }>();
    for (const inv of filteredInvoices) {
      if (inv.status === 'draft') continue;
      const key = inv.businessType || 'custom';
      const label =
        BUSINESS_PRESETS[key as BusinessType]?.label || 'نشاط مخصص';
      const prev = map.get(key) || { label, count: 0, total: 0 };
      prev.count += 1;
      prev.total += Number(inv.total) || 0;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredInvoices]);

  const handleDownloadCsv = () => {
    const csv = buildCsvExport(filteredInvoices);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CXT-othman-financial-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            التقارير المالية والضريبية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تحليل الإيرادات والضرائب المحصلة وتوزيع المبيعات حسب النشاط التجاري
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>تصدير التقرير CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="rep-sector"
            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            النشاط التجاري:
          </label>
          <select
            id="rep-sector"
            value={sectorFilter}
            onChange={(e) =>
              setSectorFilter(e.target.value as 'all' | BusinessType)
            }
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl bg-white"
          >
            <option value="all">جميع الأنشطة</option>
            {Object.values(BUSINESS_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="rep-status"
            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            حالة السداد:
          </label>
          <select
            id="rep-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')
            }
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-xl bg-white"
          >
            <option value="all">الكل (مدفوعة ومعلقة)</option>
            <option value="paid">المدفوعة فقط</option>
            <option value="pending">قيد الانتظار فقط</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500">صافي الإيرادات</p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
            {formatCurrency(analytics.totalRevenue, store.currency)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500">
            ضريبة القيمة المضافة المحصلة
          </p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-emerald-800 mt-2">
            {formatCurrency(analytics.totalTaxCollected, store.currency)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500">إجمالي الخصومات</p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
            {formatCurrency(analytics.totalDiscounts, store.currency)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500">معدل التحصيل</p>
          <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
            {analytics.collectionRate}%
          </p>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              التقرير الشهري التفصيلي
            </h2>
          </div>
          {analytics.monthlySeries.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              لا توجد حركات مالية ضمن النطاق المحدد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 px-5">الشهر</th>
                    <th className="py-3 px-4 text-center">الفواتير</th>
                    <th className="py-3 px-4 text-left">المحصل</th>
                    <th className="py-3 px-5 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {analytics.monthlySeries.map((m) => (
                    <tr key={m.monthKey}>
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        {m.label} ({m.monthKey})
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-600">
                        {m.count}
                      </td>
                      <td className="py-3 px-4 text-left font-mono tabular-nums text-emerald-700 font-semibold">
                        {formatCurrency(m.paid, store.currency)}
                      </td>
                      <td className="py-3 px-5 text-left font-mono tabular-nums font-bold text-slate-900">
                        {formatCurrency(m.total, store.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              توزيع الإيرادات حسب القطاع التجاري
            </h2>
          </div>
          {sectorBreakdown.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              لا توجد مبيعات مسجلة.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 px-5">النشاط التجاري</th>
                    <th className="py-3 px-4 text-center">عدد الفواتير</th>
                    <th className="py-3 px-5 text-left">المبيعات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sectorBreakdown.map((sec) => (
                    <tr key={sec.label}>
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        {sec.label}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-600">
                        {sec.count}
                      </td>
                      <td className="py-3 px-5 text-left font-mono tabular-nums font-bold text-slate-900">
                        {formatCurrency(sec.total, store.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
