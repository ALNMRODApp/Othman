import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  MessageCircle,
  Palette,
  Plus,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import {
  BUSINESS_PRESETS,
  CURRENCIES,
  INVOICE_COLORS,
  INVOICE_FONTS,
  INVOICE_TEMPLATES,
} from '../data/presets';
import type {
  BusinessType,
  ClientRecord,
  CustomField,
  InvoiceFont,
  InvoiceItem,
  InvoiceRecord,
  InvoiceStatus,
  StoreSettings,
  TemplateStyle,
} from '../types/invoice';
import {
  calculateInvoiceTotals,
  calculateLineTotal,
  formatCurrency,
} from '../utils/invoiceMath';
import { exportInvoiceElementToPdf } from '../utils/pdfExport';
import { InvoicePreviewCard } from './InvoicePreviewCard';

interface InvoiceBuilderViewProps {
  initialInvoice: InvoiceRecord;
  isEditingExisting: boolean;
  store: StoreSettings;
  clients: ClientRecord[];
  onSaveInvoice: (invoice: InvoiceRecord, isNew: boolean) => Promise<void>;
  onUpdateStoreType: (businessType: BusinessType) => void;
  onUpdateStoreAppearance: (patch: Partial<StoreSettings>) => void;
  onShareWhatsApp: (invoice: InvoiceRecord) => void;
  onQuickAddClient: (name: string, phone: string) => Promise<ClientRecord>;
}

export function InvoiceBuilderView({
  initialInvoice,
  isEditingExisting,
  store,
  clients,
  onSaveInvoice,
  onUpdateStoreType,
  onUpdateStoreAppearance,
  onShareWhatsApp,
  onQuickAddClient,
}: InvoiceBuilderViewProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice.invoiceNumber
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    (initialInvoice.businessType as BusinessType) || store.businessType
  );
  const [selectedClientId, setSelectedClientId] = useState(
    initialInvoice.clientId || ''
  );
  const [clientName, setClientName] = useState(initialInvoice.clientName);
  const [clientPhone, setClientPhone] = useState(
    initialInvoice.clientPhone || ''
  );
  const [issueDate, setIssueDate] = useState(initialInvoice.issueDate);
  const [dueDate, setDueDate] = useState(initialInvoice.dueDate || '');
  const [status, setStatus] = useState<InvoiceStatus>(initialInvoice.status);
  const [currency, setCurrency] = useState(
    initialInvoice.currency || store.currency
  );
  const [taxRate, setTaxRate] = useState<number>(initialInvoice.taxRate);
  const [discountAmount, setDiscountAmount] = useState<number>(
    initialInvoice.discountAmount
  );
  const [notes, setNotes] = useState(initialInvoice.notes || '');
  const [items, setItems] = useState<InvoiceItem[]>(initialInvoice.items);
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialInvoice.customFields && initialInvoice.customFields.length > 0
      ? initialInvoice.customFields
      : store.customFields || []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [showNewClientInline, setShowNewClientInline] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);

  const isLockedPaid = isEditingExisting && initialInvoice.status === 'paid';
  const activePreset = BUSINESS_PRESETS[businessType] || BUSINESS_PRESETS.custom;

  const totals = useMemo(
    () => calculateInvoiceTotals(items, taxRate, discountAmount),
    [items, taxRate, discountAmount]
  );

  const liveInvoice: InvoiceRecord = useMemo(
    () => ({
      ...initialInvoice,
      invoiceNumber: invoiceNumber.trim() || initialInvoice.invoiceNumber,
      clientId: selectedClientId,
      clientName: clientName.trim() || 'عميل نقدي',
      clientPhone: clientPhone.trim(),
      businessType,
      issueDate,
      dueDate,
      status,
      currency,
      taxRate,
      discountAmount: totals.discountAmount,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      notes,
      items,
      customFields,
      updatedAtIso: new Date().toISOString(),
    }),
    [
      initialInvoice,
      invoiceNumber,
      selectedClientId,
      clientName,
      clientPhone,
      businessType,
      issueDate,
      dueDate,
      status,
      currency,
      taxRate,
      totals,
      notes,
      items,
      customFields,
    ]
  );

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const match = clients.find((c) => c.id === clientId);
    if (match) {
      setClientName(match.name);
      setClientPhone(match.phone || '');
    }
  };

  const handleBusinessChange = (nextType: BusinessType) => {
    setBusinessType(nextType);
    onUpdateStoreType(nextType);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        sku: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleAddCustomField = () => {
    if (customFields.length >= 10) return;
    setCustomFields((prev) => [
      ...prev,
      {
        id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        label: '',
        value: '',
      },
    ]);
  };

  const handleUpdateCustomField = (
    id: string,
    key: 'label' | 'value',
    val: string
  ) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: val } : f))
    );
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const validateBeforeSave = (): string | null => {
    if (!invoiceNumber.trim()) return 'يرجى إدخال رقم الفاتورة.';
    if (!clientName.trim()) return 'يرجى إدخال اسم العميل أو اختيار عميل.';
    if (items.length === 0) return 'يجب إضافة بند واحد على الأقل للفاتورة.';
    const hasNamedItem = items.some((it) => it.name.trim().length > 0);
    if (!hasNamedItem) return 'يرجى كتابة اسم الصنف أو الخدمة في بنود الفاتورة.';
    return null;
  };

  const handleSave = async () => {
    if (isLockedPaid) {
      setFeedback({
        type: 'success',
        text: 'هذه الفاتورة محفوظة ومعتمدة كمدفوعة مسبقاً. يمكنك تصدير PDF أو مشاركتها عبر واتساب.',
      });
      return;
    }
    const validationErr = validateBeforeSave();
    if (validationErr) {
      setFeedback({ type: 'error', text: validationErr });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await onSaveInvoice(liveInvoice, !isEditingExisting);
      setFeedback({
        type: 'success',
        text: `تم حفظ الفاتورة ${liveInvoice.invoiceNumber} بنجاح في السجل.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حفظ الفاتورة.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!previewRef.current) return;
    setIsExportingPdf(true);
    setFeedback(null);
    try {
      await exportInvoiceElementToPdf(
        previewRef.current,
        liveInvoice.invoiceNumber
      );
      setFeedback({
        type: 'success',
        text: `تم تصدير ملف PDF للفاتورة ${liveInvoice.invoiceNumber} بنجاح.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر إنشاء ملف PDF مباشرة. يمكنك استخدام زر الطباعة للحفظ كـ PDF.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveInlineClient = async () => {
    if (!newClientName.trim()) return;
    const created = await onQuickAddClient(
      newClientName.trim(),
      newClientPhone.trim()
    );
    setSelectedClientId(created.id);
    setClientName(created.name);
    setClientPhone(created.phone || '');
    setNewClientName('');
    setNewClientPhone('');
    setShowNewClientInline(false);
  };

  const activeTemplateLabel =
    INVOICE_TEMPLATES.find((t) => t.id === store.templateStyle)?.label || 'عصري';

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">
            {isEditingExisting
              ? `تعديل الفاتورة ${invoiceNumber}`
              : 'إنشاء فاتورة إلكترونية جديدة'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            خصّص نوع النشاط التجاري والتصميم والألوان والخط والحقول المخصصة وشاهد المعاينة فوراً.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isLockedPaid}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {isLockedPaid
                ? 'تم الحفظ والاعتماد'
                : isSaving
                ? 'جاري الحفظ...'
                : 'حفظ الفاتورة'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => onShareWhatsApp(liveInvoice)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-700" />
            <span>مشاركة واتساب</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            aria-label="طباعة الفاتورة"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`no-print p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 2-Column Builder + Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="no-print xl:col-span-6 space-y-6">
          {/* Sector & Invoice Metadata */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-900">
              1. النشاط التجاري وبيانات الفاتورة
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inv-sector"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  نوع النشاط التجاري
                </label>
                <select
                  id="inv-sector"
                  value={businessType}
                  onChange={(e) =>
                    handleBusinessChange(e.target.value as BusinessType)
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  {Object.values(BUSINESS_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inv-number"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  رقم الفاتورة
                </label>
                <input
                  id="inv-number"
                  type="text"
                  dir="ltr"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-mono text-left border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-date"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  تاريخ الإصدار
                </label>
                <input
                  id="inv-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-status"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  حالة السداد
                </label>
                <select
                  id="inv-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  <option value="paid">مدفوعة</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="draft">مسودة</option>
                </select>
              </div>
            </div>
          </section>

          {/* Client Selector */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">2. بيانات العميل</h2>
              <button
                type="button"
                onClick={() => setShowNewClientInline((p) => !p)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                {showNewClientInline ? 'إلغاء' : '+ حفظ كعميل جديد'}
              </button>
            </div>

            {showNewClientInline && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="اسم العميل الجديد"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="+964770..."
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="px-3 py-2 text-sm bg-white font-mono text-left border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveInlineClient()}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  إضافة وربط العميل
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="inv-client-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  اختيار عميل مسجل
                </label>
                <select
                  id="inv-client-select"
                  value={selectedClientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  <option value="">-- عميل جديد / مخصص --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inv-client-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  اسم العميل في الفاتورة
                </label>
                <input
                  id="inv-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="مثال: شركة الأفق للتجارة"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-client-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  رقم واتساب العميل
                </label>
                <input
                  id="inv-client-phone"
                  type="tel"
                  dir="ltr"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+964770..."
                  className="w-full px-3 py-2.5 text-sm font-mono text-left border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                3. الأصناف والبنود ({items.length})
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="py-4 first:pt-1 last:pb-1 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      بند رقم {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label={`حذف البند ${item.name || idx + 1}`}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        اسم الصنف / الخدمة
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'name', e.target.value)
                        }
                        placeholder={activePreset.sampleItemName}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {activePreset.skuLabel}
                      </label>
                      <input
                        type="text"
                        value={item.sku || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'sku', e.target.value)
                        }
                        placeholder={activePreset.sampleItemSku}
                        className="w-full px-3 py-2 text-sm bg-white font-mono border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        الكمية
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'quantity',
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full px-3 py-2 text-sm bg-white font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        سعر الوحدة
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'unitPrice',
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full px-3 py-2 text-sm bg-white font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        خصم البند
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.discount}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'discount',
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full px-3 py-2 text-sm bg-white font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-3 flex flex-col justify-end">
                      <span className="text-[11px] text-slate-500">الصافي</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900 py-2 whitespace-nowrap">
                        {formatCurrency(calculateLineTotal(item), currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Design, Colors, Fonts & Custom Fields */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                4. تخصيص التصميم والألوان والخط والحقول المخصصة
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="builder-template"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  تصميم القالب
                </label>
                <select
                  id="builder-template"
                  value={store.templateStyle}
                  onChange={(e) =>
                    onUpdateStoreAppearance({
                      templateStyle: e.target.value as TemplateStyle,
                    })
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  {INVOICE_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="builder-font"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  خط الفاتورة
                </label>
                <select
                  id="builder-font"
                  value={store.invoiceFont || 'cairo'}
                  onChange={(e) =>
                    onUpdateStoreAppearance({
                      invoiceFont: e.target.value as InvoiceFont,
                    })
                  }
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  {INVOICE_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color Swatches + Custom Color */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                لون الفاتورة المميز
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {INVOICE_COLORS.map((opt) => (
                  <button
                    key={opt.hex}
                    type="button"
                    onClick={() =>
                      onUpdateStoreAppearance({ accentColor: opt.hex })
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      store.accentColor === opt.hex
                        ? 'border-slate-900 bg-slate-100 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span>{opt.label}</span>
                  </button>
                ))}

                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="color"
                    aria-label="اختيار لون مخصص للفاتورة"
                    value={store.accentColor || '#047857'}
                    onChange={(e) =>
                      onUpdateStoreAppearance({ accentColor: e.target.value })
                    }
                    className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer"
                  />
                  <span>لون مخصص</span>
                </label>
              </div>
            </div>

            {/* Custom Fields Editor */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    حقول مخصصة لهذه الفاتورة
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مثل: اسم المندوب، رقم الصندوق، رقم الطلب، طريقة التسليم
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  disabled={customFields.length >= 10}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة حقل</span>
                </button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="اسم الحقل (مثلاً: المندوب)"
                        value={field.label}
                        onChange={(e) =>
                          handleUpdateCustomField(
                            field.id,
                            'label',
                            e.target.value
                          )
                        }
                        className="col-span-5 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="القيمة"
                        value={field.value}
                        onChange={(e) =>
                          handleUpdateCustomField(
                            field.id,
                            'value',
                            e.target.value
                          )
                        }
                        className="col-span-6 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        aria-label={`حذف الحقل ${field.label || 'المخصص'}`}
                        className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 p-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Tax, Discount & Notes */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              5. العملة والضريبة والخصم والملاحظات
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="inv-currency"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  العملة
                </label>
                <select
                  id="inv-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
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
                  htmlFor="inv-tax"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  نسبة الضريبة (%)
                </label>
                <input
                  id="inv-tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) =>
                    setTaxRate(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  className="w-full px-3 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-discount"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  خصم إضافي على الفاتورة
                </label>
                <input
                  id="inv-discount"
                  type="number"
                  min="0"
                  step="1"
                  value={discountAmount}
                  onChange={(e) =>
                    setDiscountAmount(Math.max(0, Number(e.target.value)))
                  }
                  className="w-full px-3 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="inv-notes"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                ملاحظات إضافية أو شروط الضمان
              </label>
              <textarea
                id="inv-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: الضمان ساري لمدة عام ضد عيوب التصنيع..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </section>
        </div>

        {/* Live WYSIWYG Electronic Invoice Preview Column */}
        <div className="xl:col-span-6 xl:sticky xl:top-20 space-y-3">
          <div className="no-print flex items-center justify-between text-xs text-slate-500 px-1">
            <span>المعاينة الفورية للفاتورة الإلكترونية</span>
            <span>قالب: {activeTemplateLabel}</span>
          </div>
          <InvoicePreviewCard ref={previewRef} invoice={liveInvoice} store={store} />
        </div>
      </div>
    </div>
  );
}
