import {
  ArrowLeft,
  Building2,
  FileText,
  Share2,
  ShieldCheck,
  Smartphone,
  Store,
} from 'lucide-react';
import { BRAND_IMAGES } from '../data/presets';

interface SplashScreenProps {
  onLogin: () => void;
  onSignup: () => void;
  onQuickGoogle: () => void;
  onDemoEnter: () => void;
  isGoogleLoading: boolean;
}

export function SplashScreen({
  onLogin,
  onSignup,
  onQuickGoogle,
  onDemoEnter,
  isGoogleLoading,
}: SplashScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={BRAND_IMAGES.brandEmblem}
              alt="شعار منصة CXT - othman"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
            />
            <span className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              CXT - othman
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#sectors"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              الأنشطة المدعومة
            </a>
            <a
              href="#capabilities"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              التصدير والمشاركة
            </a>
            <button
              type="button"
              onClick={onLogin}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onSignup}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              إنشاء حساب
            </button>
          </div>
        </div>
      </header>

      {/* Main Editorial Hero Split */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-8 lg:p-10">
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-3">
                  CXT - othman · نظام الفوترة الإلكترونية المتكامل
                </p>

                <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-slate-900 leading-[1.22] mb-5 text-balance">
                  فواتير إلكترونية دقيقة لمراكز التسوق والجمعيات ومحلات الهواتف
                </h1>

                <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-xl">
                  حدّد نوع نشاطك التجاري وخصّص شعار متجرك وتفاصيل الضريبة في ثوانٍ،
                  مع تصدير فوري بصيغة PDF ومشاركة مباشرة عبر واتساب ولوحة تحكم مالية
                  ذكية لإدارة عملائك وتقاريرك.
                </p>

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={onQuickGoogle}
                    disabled={isGoogleLoading}
                    className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                      />
                    </svg>
                    <span>
                      {isGoogleLoading ? 'جاري الاتصال بجوجل...' : 'المتابعة عن طريق جوجل'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onLogin}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-semibold text-sm rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>تسجيل الدخول بالبريد</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onDemoEnter}
                    className="font-semibold text-slate-800 hover:text-emerald-700 underline underline-offset-4 cursor-pointer"
                  >
                    معاينة المنصة مباشرة (وضع التجربة)
                  </button>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={onSignup}
                    className="font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    إنشاء حساب تاجر جديد
                  </button>
                </div>
              </div>

              {/* Clean unboxed proof row */}
              <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                    +6
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">قطاعات تجارية مخصصة</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                    PDF + QR
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">تصدير وتحقق فوري</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                    WhatsApp
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">إرسال مباشر للعميل</p>
                </div>
              </div>
            </div>

            {/* Right Visual Showcase */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[380px]">
              <img
                src={BRAND_IMAGES.splashHero}
                alt="بيئة متجر حديث يستخدم منصة CXT - othman للفواتير الإلكترونية"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-7 text-white">
                <p className="text-xs font-medium text-emerald-300 mb-1.5">
                  منصة CXT - othman السحابية
                </p>
                <p className="text-lg font-bold leading-snug">
                  صُممت لتناسب كاشير مراكز التسوق، مبيعات الهواتف بأرقام IMEI، وإيصالات الجمعيات التعاونية.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Sectors Section */}
        <section
          id="sectors"
          className="max-w-7xl mx-auto px-6 py-10 border-t border-slate-200"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                قوالب ذكية حسب نوع النشاط التجاري
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                اختر قطاعك التجاري أو أضف نشاطك الخاص لتتكيّف حقول الفاتورة والشعار تلقائياً.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <Smartphone className="w-6 h-6 text-emerald-700 mb-4" />
              <h3 className="text-base font-bold text-slate-900 mb-2">
                محلات الهواتف والإلكترونيات
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                توثيق رقم IMEI والموديل، شروط الضمان السنوي، وحساب الخصم وضريبة القيمة المضافة بدقة.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <Building2 className="w-6 h-6 text-emerald-700 mb-4" />
              <h3 className="text-base font-bold text-slate-900 mb-2">
                مراكز التسوق والمولات
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                فواتير متعددة الأصناف مع رمز القسم والباركود، وتصدير نسخة PDF أنيقة أو إيصال حراري فوري.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <Store className="w-6 h-6 text-emerald-700 mb-4" />
              <h3 className="text-base font-bold text-slate-900 mb-2">
                الجمعيات التعاونية وكافة الأنشطة
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                سجل منظم للمساهمين والعملاء، تقارير تحصيل شهرية، وحرية كاملة في تخصيص اسم النشاط والشعار.
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities Strip */}
        <section
          id="capabilities"
          className="max-w-7xl mx-auto px-6 py-10 border-t border-slate-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <FileText className="w-5 h-5 text-slate-700 shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">تصدير PDF احترافي</h3>
                <p className="text-sm text-slate-600 mt-1">
                  مخرجات عربية متناسقة مع رمز تحقق QR وشعار متجرك بضغطة زر واحدة.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Share2 className="w-5 h-5 text-slate-700 shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">مشاركة فورية عبر واتساب</h3>
                <p className="text-sm text-slate-600 mt-1">
                  إرسال ملخص الفاتورة المنسّق مباشرة إلى رقم العميل عبر WhatsApp دون تعقيد.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-5 h-5 text-slate-700 shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">لوحة تحكم وتقارير مالية</h3>
                <p className="text-sm text-slate-600 mt-1">
                  متابعة الإيرادات المحصلة والمعلقة، الضرائب، وكبار العملاء مع مزامنة سحابية آمنة.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>منصة CXT - othman للفواتير الإلكترونية وإدارة الأعمال</span>
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
