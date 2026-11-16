import { useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import {
  BRAND_IMAGES,
  BUSINESS_PRESETS,
  CURRENCIES,
  INVOICE_COLORS,
  INVOICE_FONTS,
  INVOICE_TEMPLATES,
} from '../data/presets';
import type {
  BusinessType,
  InvoiceFont,
  StoreSettings,
  TemplateStyle,
} from '../types/invoice';
import { compressLogoFile } from '../utils/pdfExport';
import { sanitizeImageUrl } from '../utils/security';

interface StoreSettingsViewProps {
  store: StoreSettings;
  onSaveSettings: (next: StoreSettings) => Promise<void>;
}

const LOGO_PRESETS = [
  { url: BRAND_IMAGES.mobileLogo, label: 'شعار متجر هواتف' },
  { url: BRAND_IMAGES.mallLogo, label: 'شعار مركز تسوق / جمعية' },
  { url: BRAND_IMAGES.brandEmblem, label: 'شعار CXT الرسمي' },
];

export function StoreSettingsView({
  store,
  onSaveSettings,
}: StoreSettingsViewProps) {
  const [draft, setDraft] = useState<StoreSettings>(store);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleBusinessSelect = (businessType: BusinessType) => {
    const preset = BUSINESS_PRESETS[businessType];
    setDraft((prev) => ({
      ...prev,
      businessType,
      invoiceFooterNote: prev.invoiceFooterNote || preset.defaultFooterNote,
    }));
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    try {
      const compressedDataUrl = await compressLogoFile(file, 320);
      setDraft((prev) => ({ ...prev, logoDataUrl: compressedDataUrl }));
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر تحميل الشعار.',
      });
    }
  };

  const handleAddDefaultField = () => {
    const current = draft.customFields || [];
    if (current.length >= 10) return;
    setDraft({
      ...draft,
      customFields: [
        ...current,
        { id: `cf-${Date.now()}`, label: '', value: '' },
      ],
    });
  };

  const handleUpdateDefaultField = (
    id: string,
    key: 'label' | 'value',
    val: string
  ) => {
    setDraft({
      ...draft,
      customFields: (draft.customFields || []).map((f) =>
        f.id === id ? { ...f, [key]: val } : f
      ),
    });
  };

  const handleRemoveDefaultField = (id: string) => {
    setDraft({
      ...draft,
      customFields: (draft.customFields || []).filter((f) => f.id !== id),
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.storeName.trim()) {
      setMessage({ type: 'error', text: 'يرجى إدخال اسم المتجر أو النشاط.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await onSaveSettings(draft);
      setMessage({
        type: 'success',
        text: 'تم حفظ إعدادات النشاط التجاري وتصميم الفاتورة بنجاح.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            تخصيص النشاط التجاري وقوالب الفاتورة
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            حدّد مجال عملك وشعار متجرك والتصميم والألوان والخطوط والحقول المخصصة لجميع فواتيرك.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
        </button>
      </div>

      {message && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Business Sector Picker */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          1. اختيار نوع النشاط التجاري
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(BUSINESS_PRESETS).map((preset) => {
            const active = draft.businessType === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleBusinessSelect(preset.id)}
                className={`text-right p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'border-emerald-700 bg-emerald-50/70'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {preset.shortDesc}
                </p>
              </button>
            );
          })}
        </div>

        {draft.businessType === 'custom' && (
          <div className="pt-2">
            <label
              htmlFor="custom-biz-label"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              اسم نشاطك التجاري المخصص
            </label>
            <input
              id="custom-biz-label"
              type="text"
              value={draft.customBusinessLabel || ''}
              onChange={(e) =>
                setDraft({ ...draft, customBusinessLabel: e.target.value })
              }
              placeholder="مثال: مركز صيانة سيارات / مكتبة قرطاسية / عيادة..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
            />
          </div>
        )}
      </section>

      {/* Logo & Store Identity */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-slate-900">
          2. شعار المحل وبيانات المنشأة
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-5 border-b border-slate-100">
          <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {sanitizeImageUrl(draft.logoDataUrl) ? (
              <img
                src={sanitizeImageUrl(draft.logoDataUrl)}
                alt="شعار المتجر الحالي"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-1.5 bg-white"
              />
            ) : (
              <span className="text-xs text-slate-400">بدون شعار</span>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                <span>رفع شعار من جهازك</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => void handleLogoUpload(e)}
                  className="sr-only"
                />
              </label>

              {draft.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, logoDataUrl: '' })}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 border border-slate-200 rounded-xl cursor-pointer"
                >
                  إزالة الشعار
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">أو اختر شعاراً جاهزاً:</span>
              {LOGO_PRESETS.map((lp) => (
                <button
                  key={lp.url}
                  type="button"
                  onClick={() => setDraft({ ...draft, logoDataUrl: lp.url })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <img
                    src={lp.url}
                    alt={lp.label}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-xs object-cover"
                  />
                  <span>{lp.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="set-store-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              اسم المتجر أو المركز أو الجمعية *
            </label>
            <input
              id="set-store-name"
              type="text"
              value={draft.storeName}
              onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label
              htmlFor="set-tax-no"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              الرقم الضريبي / السجل التجاري
            </label>
            <input
              id="set-tax-no"
              type="text"
              dir="ltr"
              value={draft.taxNumber || ''}
              onChange={(e) => setDraft({ ...draft, taxNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm font-mono text-left border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label
              htmlFor="set-phone"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              هاتف المتجر
            </label>
            <input
              id="set-phone"
              type="tel"
              dir="ltr"
              value={draft.phone || ''}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm font-mono text-left border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label
              htmlFor="set-addr"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              العنوان
            </label>
            <input
              id="set-addr"
              type="text"
              value={draft.address || ''}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* Template, Colors, Fonts & Default Custom Fields */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-bold text-slate-900">
          3. تصميم الفاتورة والألوان والخطوط والعملة
        </h2>

        {/* Template Cards */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            اختر تصميم القالب
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INVOICE_TEMPLATES.map((tpl) => {
              const active = draft.templateStyle === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      templateStyle: tpl.id as TemplateStyle,
                    })
                  }
                  className={`text-right p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-700 bg-emerald-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{tpl.label}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{tpl.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Selector */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            خط الفاتورة المعتمد
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INVOICE_FONTS.map((f) => {
              const active = (draft.invoiceFont || 'cairo') === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, invoiceFont: f.id as InvoiceFont })
                  }
                  style={{ fontFamily: f.cssFamily }}
                  className={`text-right p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-700 bg-emerald-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{f.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="set-currency"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              العملة الافتراضية
            </label>
            <select
              id="set-currency"
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="set-tax-rate"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              نسبة الضريبة الافتراضية (%)
            </label>
            <input
              id="set-tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={draft.taxRate}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  taxRate: Math.min(100, Math.max(0, Number(e.target.value))),
                })
              }
              className="w-full px-3 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            اللون المميز للفاتورة
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {INVOICE_COLORS.map((opt) => (
              <button
                key={opt.hex}
                type="button"
                onClick={() => setDraft({ ...draft, accentColor: opt.hex })}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  draft.accentColor === opt.hex
                    ? 'border-slate-900 bg-slate-50 text-slate-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: opt.hex }}
                />
                <span>{opt.label}</span>
              </button>
            ))}

            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="color"
                aria-label="تحديد لون مخصص"
                value={draft.accentColor || '#047857'}
                onChange={(e) =>
                  setDraft({ ...draft, accentColor: e.target.value })
                }
                className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer"
              />
              <span>لون مخصص</span>
            </label>
          </div>
        </div>

        {/* Default Custom Fields */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                الحقول المخصصة الافتراضية على الفواتير
              </h3>
              <p className="text-[11px] text-slate-500">
                تظهر تلقائياً في كل فاتورة جديدة ويمكن تعديلها لكل فاتورة على حدة
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDefaultField}
              disabled={(draft.customFields || []).length >= 10}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حقل</span>
            </button>
          </div>

          {(draft.customFields || []).map((field) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                placeholder="اسم الحقل (مثلاً: الفرع)"
                value={field.label}
                onChange={(e) =>
                  handleUpdateDefaultField(field.id, 'label', e.target.value)
                }
                className="col-span-5 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="القيمة الافتراضية"
                value={field.value}
                onChange={(e) =>
                  handleUpdateDefaultField(field.id, 'value', e.target.value)
                }
                className="col-span-6 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveDefaultField(field.id)}
                aria-label={`حذف الحقل ${field.label || 'المخصص'}`}
                className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 p-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div>
          <label
            htmlFor="set-footer"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            نص تذييل الفاتورة (الضمان / سياسة الاسترجاع)
          </label>
          <textarea
            id="set-footer"
            rows={2}
            value={draft.invoiceFooterNote || ''}
            onChange={(e) =>
              setDraft({ ...draft, invoiceFooterNote: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
          />
        </div>
      </section>
    </form>
  );
}
