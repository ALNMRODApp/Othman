import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { BRAND_IMAGES } from '../data/presets';
import { isValidEmailFormat, validateStrongPassword } from '../utils/security';

interface AuthScreenProps {
  initialTab: 'login' | 'signup';
  onBackToSplash: () => void;
  onGoogleAuth: () => Promise<void>;
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailSignup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
  onDemoEnter: () => void;
  authError: string | null;
  isBusy: boolean;
}

export function AuthScreen({
  initialTab,
  onBackToSplash,
  onGoogleAuth,
  onEmailLogin,
  onEmailSignup,
  onResetPassword,
  onDemoEnter,
  authError,
  isBusy,
}: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [localValidationError, setLocalValidationError] = useState<string | null>(
    null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);
    setResetMessage(null);

    if (!isValidEmailFormat(email)) {
      setLocalValidationError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (tab === 'login') {
      if (password.length < 6) {
        setLocalValidationError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
        return;
      }
      await onEmailLogin(email, password);
    } else {
      const pwdErr = validateStrongPassword(password);
      if (pwdErr) {
        setLocalValidationError(pwdErr);
        return;
      }
      if (displayName.trim().length < 2) {
        setLocalValidationError('يرجى إدخال اسم التاجر أو المنشأة.');
        return;
      }
      await onEmailSignup(email, password, displayName);
    }
  };

  const handleResetPassword = async () => {
    setLocalValidationError(null);
    setResetMessage(null);
    if (!isValidEmailFormat(email)) {
      setLocalValidationError('أدخل بريدك الإلكتروني أولاً لإرسال رابط استعادة كلمة المرور.');
      return;
    }
    if (onResetPassword) {
      await onResetPassword(email);
    }
    // Generic message prevents account enumeration
    setResetMessage(
      'إذا كان هذا البريد الإلكتروني مسجلاً ومفعلاً، فسيصلك رابط إعادة تعيين كلمة المرور خلال دقائق.'
    );
  };

  const displayError = localValidationError || authError;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToSplash}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لشاشة البداية</span>
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src={BRAND_IMAGES.brandEmblem}
            alt="CXT - othman"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-slate-200"
          />
          <span className="text-base font-extrabold text-slate-900">
            CXT - othman
          </span>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto my-8 bg-white border border-slate-200 rounded-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {tab === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب تاجر جديد'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            منصة <span className="font-semibold text-slate-800">CXT - othman</span>{' '}
            لإدارة الفواتير الإلكترونية والعملاء
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div
          role="tablist"
          aria-label="نوع العملية"
          className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => {
              setTab('login');
              setLocalValidationError(null);
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => {
              setTab('signup');
              setLocalValidationError(null);
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            إنشاء حساب
          </button>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={() => void onGoogleAuth()}
          disabled={isBusy}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
            />
          </svg>
          <span>المتابعة عن طريق جوجل</span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">أو عبر البريد الإلكتروني</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {displayError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed"
          >
            {displayError}
          </div>
        )}

        {resetMessage && (
          <div
            role="status"
            className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed"
          >
            {resetMessage}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                اسم التاجر أو النشاط التجاري
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: متجر النخبة للهواتف"
                  className="w-full pr-10 pl-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                className="w-full pr-10 pl-3 py-2.5 text-sm text-left border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-10 py-2.5 text-sm text-left border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <button
                type="button"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {tab === 'login' && onResetPassword && (
              <div className="mt-1.5 text-left">
                <button
                  type="button"
                  onClick={() => void handleResetPassword()}
                  className="text-xs font-medium text-slate-500 hover:text-emerald-700 cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {isBusy
              ? 'جاري المعالجة...'
              : tab === 'login'
              ? 'دخول إلى المنصة'
              : 'إنشاء الحساب والمتابعة'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onDemoEnter}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-4 cursor-pointer"
          >
            أو الدخول الفوري بحساب تجريبي لمعاينة لوحة التحكم
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        CXT - othman · حماية متكاملة لبيانات فواتيرك وعملائك
      </p>
    </div>
  );
}
