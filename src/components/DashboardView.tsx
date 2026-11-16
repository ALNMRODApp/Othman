import { useMemo } from 'react';
import {
  ArrowUpLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BUSINESS_PRESETS } from '../data/presets';
import type {
  AppRoute,
  BusinessType,
  ClientRecord,
  InvoiceRecord,
  StoreSettings,
} from '../types/invoice';
import {
  computeFinancialAnalytics,
  formatCurrency,
} from '../utils/invoiceMath';

interface DashboardViewProps {
  invoices: InvoiceRecord[];
  clients: ClientRecord[];
  store: StoreSettings;
  onNavigate: (route: AppRoute) => void;
  onCreateNewInvoice: () => void;
  onPreviewInvoice: (invoice: InvoiceRecord) => void;
  onShareWhatsApp: (invoice: InvoiceRecord) => void;
}

export function DashboardView({
  invoices,
  clients,
  store,
  onNavigate,
  onCreateNewInvoice,
  onPreviewInvoice,
  onShareWhatsApp,
}: DashboardViewProps) {
  const analytics = useMemo(
    () => computeFinancialAnalytics(invoices, clients),
    [invoices, clients]
  );

  const maxMonthlyTotal = Math.max(
    1,
    ...analytics.monthlySeries.map((m) => m.total)
  );

  const recentInvoices = invoices.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            مرحباً بك في {store.storeName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ملخص الأداء المالي وحركة الفواتير والعملاء عبر منصة CXT - othman
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>التقارير المالية</span>
          </button>
          <button
            type="button"
            onClick={onCreateNewInvoice}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>إصدار فاتورة</span>
            <ArrowUpLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <section
        aria-label="المؤشرات المالية الرئيسية"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">إجمالي المبيعات</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {formatCurrency(analytics.totalRevenue, store.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            من إجمالي {analytics.paidCount + analytics.pendingCount} فواتير صادرة
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">المبالغ المحصّلة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-emerald-800">
            {formatCurrency(analytics.paidRevenue, store.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            نسبة التحصيل:{' '}
            <span dir="ltr" className="inline-block font-mono font-bold text-slate-800">
              {analytics.collectionRate}%
            </span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">مبالغ قيد التحصيل</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-amber-700">
            {formatCurrency(analytics.pendingRevenue, store.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {analytics.pendingCount === 1
              ? 'فاتورة واحدة معلقة السداد'
              : `${analytics.pendingCount} فواتير معلقة السداد`}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">العملاء النشطون</span>
            <Users className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
            {clients.length}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            الضرائب المحصلة:{' '}
            <span className="font-mono tabular-nums">
              {formatCurrency(analytics.totalTaxCollected, store.currency)}
            </span>
          </p>
        </div>
      </section>

      {/* Chart + Top Clients Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Monthly Revenue SVG Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                أداء الإيرادات الشهرية
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة المبالغ المحصلة والمستحقة خلال الأشهر الأخيرة
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700" />
                مدفوع
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                معلق
              </span>
            </div>
          </div>

          {analytics.monthlySeries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              لا توجد بيانات مالية كافية لعرض الرسم البياني بعد.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 items-end pt-4">
              {analytics.monthlySeries.map((m) => {
                const paidPct = Math.round((m.paid / maxMonthlyTotal) * 100);
                const pendingPct = Math.round((m.pending / maxMonthlyTotal) * 100);
                return (
                  <div key={m.monthKey} className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatCurrency(m.total, store.currency)}
                    </span>
                    <div className="w-full h-36 bg-slate-100 rounded-xl p-1.5 flex flex-col justify-end gap-1">
                      {pendingPct > 0 && (
                        <div
                          className="w-full bg-amber-500 rounded-md transition-all"
                          style={{ height: `${Math.max(8, pendingPct)}%` }}
                          title={`معلق: ${formatCurrency(m.pending, store.currency)}`}
                        />
                      )}
                      {paidPct > 0 && (
                        <div
                          className="w-full bg-emerald-700 rounded-md transition-all"
                          style={{ height: `${Math.max(8, paidPct)}%` }}
                          title={`محصل: ${formatCurrency(m.paid, store.currency)}`}
                        />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Clients Leaderboard */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">
                أبرز العملاء حسب المبيعات
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('clients')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                إدارة العملاء
              </button>
            </div>

            {analytics.topClients.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                أضف فواتير لعملائك لعرض قائمة العملاء الأعلى إنفاقاً.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {analytics.topClients.map((c, index) => (
                  <div
                    key={c.clientName}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {index + 1}. {c.clientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.invoiceCount === 1
                          ? 'فاتورة واحدة'
                          : `${c.invoiceCount} فواتير`}
                        {c.clientPhone ? (
                          <>
                            {' · '}
                            <span dir="ltr" className="inline-block font-mono">
                              {c.clientPhone}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900 shrink-0">
                      {formatCurrency(c.totalSpent, store.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">أحدث الفواتير</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('invoices')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            عرض السجل الكامل
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">
              لم تصدر أي فواتير حتى الآن. ابدأ بإنشاء أول فاتورة إلكترونية.
            </p>
            <button
              type="button"
              onClick={onCreateNewInvoice}
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              إنشاء أول فاتورة
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-5">رقم الفاتورة</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">النشاط</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجمالي</th>
                  <th className="py-3 px-5 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentInvoices.map((inv) => {
                  const sector =
                    BUSINESS_PRESETS[inv.businessType as BusinessType]?.label ||
                    'نشاط مخصص';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {inv.clientName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {sector}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500">
                        {inv.issueDate}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {inv.status === 'paid' ? (
                          <span className="text-emerald-700">✓ مدفوعة</span>
                        ) : inv.status === 'pending' ? (
                          <span className="text-amber-700">◷ قيد الانتظار</span>
                        ) : (
                          <span className="text-slate-500">• مسودة</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="py-3 px-5 text-left">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPreviewInvoice(inv)}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                          >
                            معاينة / PDF
                          </button>
                          <button
                            type="button"
                            aria-label={`مشاركة الفاتورة ${inv.invoiceNumber} عبر واتساب`}
                            onClick={() => onShareWhatsApp(inv)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
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
      </section>
    </div>
  );
}
