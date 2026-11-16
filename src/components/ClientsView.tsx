import { useMemo, useState, type FormEvent } from 'react';
import {
  FilePlus2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { ClientRecord, InvoiceRecord, StoreSettings } from '../types/invoice';
import { formatCurrency } from '../utils/invoiceMath';

interface ClientsViewProps {
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
  store: StoreSettings;
  onSaveClient: (
    client: Omit<ClientRecord, 'ownerId' | 'createdAtIso' | 'updatedAtIso'>,
    isNew: boolean
  ) => Promise<void>;
  onDeleteClient: (clientId: string) => Promise<void>;
  onCreateInvoiceForClient: (client: ClientRecord) => void;
}

export function ClientsView({
  clients,
  invoices,
  store,
  onSaveClient,
  onDeleteClient,
  onCreateInvoiceForClient,
}: ClientsViewProps) {
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<{
    isNew: boolean;
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    category: string;
    notes: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const clientStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const inv of invoices) {
      if (inv.status === 'draft') continue;
      const key = inv.clientId || inv.clientName.trim();
      const prev = map.get(key) || { count: 0, total: 0 };
      prev.count += 1;
      prev.total += Number(inv.total) || 0;
      map.set(key, prev);
    }
    return map;
  }, [invoices]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const openNewModal = () => {
    setFormError(null);
    setEditingClient({
      isNew: true,
      id: `cli-${Date.now()}`,
      name: '',
      phone: '',
      email: '',
      address: '',
      category: 'عملاء التجزئة',
      notes: '',
    });
  };

  const openEditModal = (c: ClientRecord) => {
    setFormError(null);
    setEditingClient({
      isNew: false,
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      category: c.category || '',
      notes: c.notes || '',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    if (editingClient.name.trim().length < 2) {
      setFormError('يرجى إدخال اسم العميل.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await onSaveClient(
        {
          id: editingClient.id,
          name: editingClient.name.trim(),
          phone: editingClient.phone.trim(),
          email: editingClient.email.trim(),
          address: editingClient.address.trim(),
          category: editingClient.category.trim(),
          notes: editingClient.notes.trim(),
        },
        editingClient.isNew
      );
      setEditingClient(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ بيانات العميل.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">إدارة العملاء</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل عملائك وإجمالي تعاملاتهم المالية مع إمكانية إصدار فاتورة فورية لأي عميل.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم العميل أو رقم الهاتف أو التصنيف..."
            className="w-full pr-10 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500">
              لا يوجد عملاء مطابقون. أضف أول عميل لبدء متابعة مبيعاته.
            </p>
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              إضافة عميل
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-5">اسم العميل</th>
                  <th className="py-3.5 px-4">التصنيف</th>
                  <th className="py-3.5 px-4">بيانات التواصل</th>
                  <th className="py-3.5 px-4 text-center">الفواتير</th>
                  <th className="py-3.5 px-4 text-left">إجمالي الإنفاق</th>
                  <th className="py-3.5 px-5 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClients.map((client) => {
                  const stats =
                    clientStats.get(client.id) ||
                    clientStats.get(client.name.trim()) || {
                      count: 0,
                      total: 0,
                    };
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-slate-900">{client.name}</p>
                        {client.address && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {client.address}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {client.category || 'عام'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 space-y-0.5">
                        {client.phone && (
                          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{client.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700 font-semibold">
                        {stats.count}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(stats.total, store.currency)}
                      </td>
                      <td className="py-3.5 px-5 text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onCreateInvoiceForClient(client)}
                            aria-label={`إصدار فاتورة للعميل ${client.name}`}
                            title="إصدار فاتورة للعميل"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>فاتورة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(client)}
                            aria-label={`تعديل العميل ${client.name}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void onDeleteClient(client.id)}
                            aria-label={`حذف العميل ${client.name}`}
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

      {/* Add/Edit Client Dialog */}
      {editingClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2
                id="client-dialog-title"
                className="text-base font-bold text-slate-900"
              >
                {editingClient.isNew ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                aria-label="إغلاق"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="cli-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  اسم العميل / الجهة *
                </label>
                <input
                  id="cli-name"
                  type="text"
                  value={editingClient.name}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="cli-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  رقم الهاتف / واتساب
                </label>
                <input
                  id="cli-phone"
                  type="tel"
                  dir="ltr"
                  value={editingClient.phone}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono text-left border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="cli-cat"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  التصنيف
                </label>
                <input
                  id="cli-cat"
                  type="text"
                  value={editingClient.category}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      category: e.target.value,
                    })
                  }
                  placeholder="عملاء التجزئة / جمعيات / VIP"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="cli-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  البريد الإلكتروني
                </label>
                <input
                  id="cli-email"
                  type="email"
                  dir="ltr"
                  value={editingClient.email}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm text-left border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="cli-addr"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  العنوان
                </label>
                <input
                  id="cli-addr"
                  type="text"
                  value={editingClient.address}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      address: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="cli-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  ملاحظات
                </label>
                <textarea
                  id="cli-notes"
                  rows={2}
                  value={editingClient.notes}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
