import { Menu, Plus } from 'lucide-react';
import type { AppRoute } from '../types/invoice';

interface TopBarProps {
  activeRoute: AppRoute;
  storeName: string;
  onCreateInvoice: () => void;
  onOpenMobileNav: () => void;
}

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'لوحة التحكم الذكية',
  builder: 'إنشاء فاتورة إلكترونية',
  invoices: 'سجل الفواتير',
  clients: 'إدارة العملاء',
  reports: 'التقارير المالية',
  settings: 'تخصيص النشاط والشعار',
};

export function TopBar({
  activeRoute,
  storeName,
  onCreateInvoice,
  onOpenMobileNav,
}: TopBarProps) {
  return (
    <header className="no-print sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="px-5 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand / Mobile Drawer Trigger */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="فتح القائمة الجانبية"
            className="lg:hidden p-2 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-base font-extrabold text-slate-900 whitespace-nowrap shrink-0">
            CXT - othman
          </span>
        </div>

        {/* Zone 2: Contextual Breadcrumb */}
        <nav
          aria-label="المسار الحالي"
          className="hidden sm:flex items-center gap-2 text-sm text-slate-500 min-w-0"
        >
          <span className="truncate max-w-[200px] text-slate-500">{storeName}</span>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-slate-900 whitespace-nowrap shrink-0">
            {ROUTE_TITLES[activeRoute]}
          </span>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onCreateInvoice}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>فاتورة جديدة</span>
          </button>
        </div>
      </div>
    </header>
  );
}
