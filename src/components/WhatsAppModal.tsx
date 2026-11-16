import { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import type { InvoiceRecord, StoreSettings } from '../types/invoice';
import {
  buildWhatsAppMessage,
  buildWhatsAppShareUrl,
} from '../utils/invoiceMath';

interface WhatsAppModalProps {
  invoice: InvoiceRecord | null;
  store: StoreSettings;
  onClose: () => void;
}

export function WhatsAppModal({ invoice, store, onClose }: WhatsAppModalProps) {
  const [phoneInput, setPhoneInput] = useState(invoice?.clientPhone || '');
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const message = buildWhatsAppMessage(invoice, store);
  const waUrl = buildWhatsAppShareUrl(invoice, store, phoneInput);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-emerald-700" />
            <h2 id="wa-modal-title" className="text-base font-bold text-slate-900">
              مشاركة الفاتورة عبر واتساب
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المشاركة"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label
            htmlFor="wa-phone"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            رقم واتساب العميل (مع رمز الدولة، اختياري)
          </label>
          <input
            id="wa-phone"
            type="tel"
            dir="ltr"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="+966551234567"
            className="w-full px-3.5 py-2.5 text-sm text-left font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1.5">
            معاينة الرسالة الجاهزة للإرسال
          </p>
          <pre className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
            {message}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح في واتساب الآن</span>
          </a>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-700" />
                <span>تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ النص</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
