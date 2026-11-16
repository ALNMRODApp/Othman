import {
  BarChart3,
  FilePlus2,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { BRAND_IMAGES } from '../data/presets';
import type { AppRoute, StoreSettings, UserSession } from '../types/invoice';

interface SidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  session: UserSession;
  store: StoreSettings;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: AppRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'لوحة التحكم الذكية', icon: LayoutDashboard },
  { id: 'builder', label: 'إنشاء فاتورة جديدة', icon: FilePlus2 },
  { id: 'invoices', label: 'سجل الفواتير', icon: FileSpreadsheet },
  { id: 'clients', label: 'إدارة العملاء', icon: Users },
  { id: 'reports', label: 'التقارير المالية', icon: BarChart3 },
  { id: 'settings', label: 'النشاط التجاري والشعار', icon: SlidersHorizontal },
];

export function Sidebar({
  activeRoute,
  onNavigate,
  session,
  store,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <div className="h-full flex flex-col justify-between bg-white border-l border-slate-200 w-64">
      <div>
        {/* Platform Identity */}
        <div className="px-5 h-16 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={BRAND_IMAGES.brandEmblem}
              alt="CXT - othman"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900 truncate">
                CXT - othman
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {store.storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="القائمة الرئيسية" className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Account Footer */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3">
          {session.photoURL ? (
            <img
              src={session.photoURL}
              alt={session.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {session.displayName.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {session.displayName}
            </p>
            <p className="text-[11px] text-slate-500 truncate" dir="ltr">
              {session.isDemo ? 'وضع المعاينة المحلية' : session.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="no-print hidden lg:block shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
