import { useEffect, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { ClientsView } from './components/ClientsView';
import { DashboardView } from './components/DashboardView';
import { InvoiceBuilderView } from './components/InvoiceBuilderView';
import { InvoicesListView } from './components/InvoicesListView';
import { ReportsView } from './components/ReportsView';
import { Sidebar } from './components/Sidebar';
import { SplashScreen } from './components/SplashScreen';
import { StoreSettingsView } from './components/StoreSettingsView';
import { TopBar } from './components/TopBar';
import { WhatsAppModal } from './components/WhatsAppModal';
import {
  BUSINESS_PRESETS,
  SEED_CLIENTS,
  SEED_INVOICES,
  SEED_STORE_SETTINGS,
} from './data/presets';
import {
  deleteClientFromFirestore,
  deleteInvoiceFromFirestore,
  markInvoicePaidInFirestore,
  requestPasswordReset,
  saveClientToFirestore,
  saveInvoiceToFirestore,
  saveStoreSettingsToFirestore,
  signInWithEmail,
  signInWithGooglePopup,
  signOutFirebase,
  signUpWithEmail,
  subscribeAuth,
  subscribeClients,
  subscribeInvoices,
  subscribeStoreSettings,
} from './services/firebase';
import type {
  AppRoute,
  AuthMode,
  BusinessType,
  ClientRecord,
  InvoiceRecord,
  StoreSettings,
  UserSession,
} from './types/invoice';
import {
  calculateInvoiceTotals,
  generateNextInvoiceNumber,
} from './utils/invoiceMath';
import {
  sanitizeDemoWorkspacePayload,
  sanitizeHexColor,
  sanitizeImageUrl,
} from './utils/security';

const DEMO_STORAGE_KEY = 'cxt_othman_demo_workspace_v2';

interface DemoWorkspaceState {
  store: StoreSettings;
  clients: ClientRecord[];
  invoices: InvoiceRecord[];
}

function loadDemoWorkspace(): DemoWorkspaceState {
  const fallback: DemoWorkspaceState = {
    store: SEED_STORE_SETTINGS,
    clients: SEED_CLIENTS,
    invoices: SEED_INVOICES,
  };
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return sanitizeDemoWorkspacePayload(parsed, fallback);
    }
  } catch {
    // Fallback to deterministic seed
  }
  return fallback;
}

function saveDemoWorkspace(state: DemoWorkspaceState): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues
  }
}

function createFreshDraftInvoice(
  store: StoreSettings,
  invoices: InvoiceRecord[],
  client?: ClientRecord
): InvoiceRecord {
  const today = new Date().toISOString().slice(0, 10);
  const preset =
    BUSINESS_PRESETS[store.businessType] || BUSINESS_PRESETS.custom;
  const defaultItem = {
    id: `item-${Date.now()}`,
    name: preset.sampleItemName,
    sku: preset.sampleItemSku,
    quantity: 1,
    unitPrice: preset.sampleUnitPrice,
    discount: 0,
  };
  const totals = calculateInvoiceTotals([defaultItem], store.taxRate, 0);

  return {
    id: `inv-${Date.now()}`,
    ownerId: store.ownerId,
    invoiceNumber: generateNextInvoiceNumber(invoices),
    clientId: client?.id || '',
    clientName: client?.name || '',
    clientPhone: client?.phone || '',
    businessType: store.businessType,
    issueDate: today,
    dueDate: today,
    status: 'paid',
    currency: store.currency,
    taxRate: store.taxRate,
    discountAmount: totals.discountAmount,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    notes: '',
    items: [defaultItem],
    customFields: (store.customFields || []).map((f) => ({ ...f })),
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  };
}

function mapFirebaseAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'تم إغلاق نافذة تسجيل الدخول بجوجل قبل إتمام العملية.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في إعدادات Firebase Console حالياً. يمكنك استخدام "المتابعة عن طريق جوجل" أو الدخول التجريبي الفوري.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'بيانات البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.';
  }
  if (msg.includes('auth/unauthorized-domain')) {
    return 'نطاق المعاينة الحالي يحتاج اعتماداً في Firebase Auth، أو يمكنك الدخول عبر وضع المعاينة الفوري.';
  }
  return 'تعذر إتمام المصادقة. يرجى المحاولة عبر جوجل أو الدخول الفوري بالوضع التجريبي.';
}

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [authMode, setAuthMode] = useState<AuthMode>(
    isAutostart ? 'authenticated' : 'splash'
  );
  const [authReady, setAuthReady] = useState<boolean>(isAutostart);
  const [session, setSession] = useState<UserSession | null>(
    isAutostart
      ? {
          uid: 'demo-merchant',
          displayName: 'عثمان — متجر النخبة',
          email: 'othman@cxt-platform.app',
          isDemo: true,
          emailVerified: true,
        }
      : null
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  const initialDemo = loadDemoWorkspace();
  const [store, setStore] = useState<StoreSettings>(initialDemo.store);
  const [clients, setClients] = useState<ClientRecord[]>(initialDemo.clients);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(
    initialDemo.invoices
  );

  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<{
    invoice: InvoiceRecord;
    isExisting: boolean;
  } | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<InvoiceRecord | null>(
    null
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = subscribeAuth((firebaseUser) => {
      if (firebaseUser) {
        setSession({
          uid: firebaseUser.uid,
          displayName:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'تاجر CXT',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          isDemo: false,
          emailVerified: firebaseUser.emailVerified,
        });
        setAuthMode('authenticated');
      } else if (!isAutostart) {
        setSession((prev) => (prev?.isDemo ? prev : null));
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, [isAutostart]);

  // Firestore Real-time Sync for Authenticated Google/Firebase Users
  useEffect(() => {
    if (!authReady || !session || session.isDemo) return;

    const uid = session.uid;
    setClients([]);
    setInvoices([]);
    setEditingInvoice(null);
    setSyncError(null);

    const handleSyncError = (err: Error) => {
      if (err.message.includes('Quota exceeded')) {
        setSyncError(
          'تم بلوغ الحد اليومي المجاني لقراءة/كتابة قاعدة البيانات (Firebase Quota). ستتجدد الحصة تلقائياً غداً.'
        );
      } else {
        setSyncError('تعذر مزامنة بعض البيانات مع السحابة. يرجى التحقق من الاتصال.');
      }
    };

    const unsubStore = subscribeStoreSettings(
      uid,
      (remoteStore) => {
        setSyncError(null);
        if (remoteStore) {
          setStore(remoteStore);
        } else {
          const defaultForUser: StoreSettings = {
            ...SEED_STORE_SETTINGS,
            ownerId: uid,
            storeName: session.displayName
              ? `متجر ${session.displayName}`
              : SEED_STORE_SETTINGS.storeName,
          };
          setStore(defaultForUser);
          void saveStoreSettingsToFirestore(uid, defaultForUser).catch(() => {});
        }
      },
      handleSyncError
    );

    const unsubClients = subscribeClients(
      uid,
      (remoteClients) => {
        setSyncError(null);
        setClients(remoteClients);
      },
      handleSyncError
    );

    const unsubInvoices = subscribeInvoices(
      uid,
      (remoteInvoices) => {
        setSyncError(null);
        setInvoices(remoteInvoices);
      },
      handleSyncError
    );

    return () => {
      unsubStore();
      unsubClients();
      unsubInvoices();
    };
  }, [authReady, session]);

  // Persist demo workspace locally when in demo mode
  useEffect(() => {
    if (session?.isDemo) {
      saveDemoWorkspace({ store, clients, invoices });
    }
  }, [session, store, clients, invoices]);

  const enterDemoMode = () => {
    const loaded = loadDemoWorkspace();
    setStore(loaded.store);
    setClients(loaded.clients);
    setInvoices(loaded.invoices);
    setSession({
      uid: 'demo-merchant',
      displayName: 'عثمان — متجر النخبة',
      email: 'othman@cxt-platform.app',
      isDemo: true,
      emailVerified: true,
    });
    setAuthError(null);
    setAuthMode('authenticated');
  };

  const handleGoogleAuth = async () => {
    setIsAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      setAuthMode('login');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    setIsAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleEmailSignup = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setIsAuthBusy(true);
    setAuthError(null);
    try {
      await signUpWithEmail(email, password, displayName);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (session && !session.isDemo) {
      await signOutFirebase().catch(() => {});
    }
    setSession(null);
    setAuthMode('splash');
    setActiveRoute('dashboard');
  };

  const handleCreateNewInvoice = (client?: ClientRecord) => {
    const draft = createFreshDraftInvoice(store, invoices, client);
    setEditingInvoice({ invoice: draft, isExisting: false });
    setActiveRoute('builder');
  };

  const handleEditInvoice = (invoice: InvoiceRecord) => {
    setEditingInvoice({ invoice, isExisting: true });
    setActiveRoute('builder');
  };

  const handleDuplicateInvoice = (invoice: InvoiceRecord) => {
    const today = new Date().toISOString().slice(0, 10);
    const copy: InvoiceRecord = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices),
      issueDate: today,
      dueDate: today,
      status: 'pending',
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
    setEditingInvoice({ invoice: copy, isExisting: false });
    setActiveRoute('builder');
  };

  const handleSaveInvoice = async (
    invoice: InvoiceRecord,
    isNew: boolean
  ) => {
    if (session && !session.isDemo) {
      await saveInvoiceToFirestore(session.uid, invoice, isNew);
    } else {
      setInvoices((prev) => {
        if (isNew) {
          return [invoice, ...prev];
        }
        return prev.map((it) => (it.id === invoice.id ? invoice : it));
      });
    }
    setEditingInvoice({ invoice, isExisting: true });
  };

  const handleMarkPaid = async (invoiceId: string) => {
    if (session && !session.isDemo) {
      await markInvoicePaidInFirestore(session.uid, invoiceId);
    } else {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: 'paid', updatedAtIso: new Date().toISOString() }
            : inv
        )
      );
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (session && !session.isDemo) {
      await deleteInvoiceFromFirestore(session.uid, invoiceId);
    } else {
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    }
  };

  const handleSaveClient = async (
    client: Omit<ClientRecord, 'ownerId' | 'createdAtIso' | 'updatedAtIso'>,
    isNew: boolean
  ) => {
    if (session && !session.isDemo) {
      await saveClientToFirestore(session.uid, client, isNew);
    } else {
      const now = new Date().toISOString();
      const record: ClientRecord = {
        ...client,
        ownerId: session?.uid || 'demo-merchant',
        createdAtIso: now,
        updatedAtIso: now,
      };
      setClients((prev) =>
        isNew
          ? [record, ...prev]
          : prev.map((c) => (c.id === record.id ? { ...c, ...record } : c))
      );
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (session && !session.isDemo) {
      await deleteClientFromFirestore(session.uid, clientId);
    } else {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    }
  };

  const handleQuickAddClient = async (
    name: string,
    phone: string
  ): Promise<ClientRecord> => {
    const now = new Date().toISOString();
    const record: ClientRecord = {
      id: `cli-${Date.now()}`,
      ownerId: session?.uid || 'demo-merchant',
      name,
      phone,
      category: 'عميل سريع',
      createdAtIso: now,
      updatedAtIso: now,
    };
    await handleSaveClient(record, true);
    return record;
  };

  const handleSaveSettings = async (next: StoreSettings) => {
    const safeNext: StoreSettings = {
      ...next,
      accentColor: sanitizeHexColor(next.accentColor, '#047857'),
      logoDataUrl: sanitizeImageUrl(next.logoDataUrl),
    };
    setStore(safeNext);
    if (session && !session.isDemo) {
      await saveStoreSettingsToFirestore(session.uid, safeNext);
    }
  };

  const handleQuickStoreTypeChange = (businessType: BusinessType) => {
    const next = { ...store, businessType };
    setStore(next);
    if (session && !session.isDemo) {
      void saveStoreSettingsToFirestore(session.uid, next).catch(() => {});
    }
  };

  const handleUpdateStoreAppearance = (patch: Partial<StoreSettings>) => {
    const safePatch: Partial<StoreSettings> = {
      ...patch,
      ...(patch.accentColor !== undefined
        ? { accentColor: sanitizeHexColor(patch.accentColor, store.accentColor) }
        : {}),
      ...(patch.logoDataUrl !== undefined
        ? { logoDataUrl: sanitizeImageUrl(patch.logoDataUrl) }
        : {}),
    };
    const next = { ...store, ...safePatch };
    setStore(next);
    if (session && !session.isDemo) {
      void saveStoreSettingsToFirestore(session.uid, next).catch(() => {});
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await requestPasswordReset(email);
    } catch {
      // Intentionally swallow to prevent user enumeration
    }
  };

  if (authMode === 'splash' && !session) {
    return (
      <SplashScreen
        onLogin={() => {
          setAuthError(null);
          setAuthMode('login');
        }}
        onSignup={() => {
          setAuthError(null);
          setAuthMode('signup');
        }}
        onQuickGoogle={() => void handleGoogleAuth()}
        onDemoEnter={enterDemoMode}
        isGoogleLoading={isAuthBusy}
      />
    );
  }

  if ((authMode === 'login' || authMode === 'signup') && !session) {
    return (
      <AuthScreen
        initialTab={authMode}
        onBackToSplash={() => {
          setAuthError(null);
          setAuthMode('splash');
        }}
        onGoogleAuth={handleGoogleAuth}
        onEmailLogin={handleEmailLogin}
        onEmailSignup={handleEmailSignup}
        onResetPassword={handleResetPassword}
        onDemoEnter={enterDemoMode}
        authError={authError}
        isBusy={isAuthBusy}
      />
    );
  }

  if (!session) {
    return (
      <SplashScreen
        onLogin={() => setAuthMode('login')}
        onSignup={() => setAuthMode('signup')}
        onQuickGoogle={() => void handleGoogleAuth()}
        onDemoEnter={enterDemoMode}
        isGoogleLoading={isAuthBusy}
      />
    );
  }

  const activeBuilderState =
    editingInvoice || {
      invoice: createFreshDraftInvoice(store, invoices),
      isExisting: false,
    };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={(route) => {
          if (route === 'builder' && !editingInvoice) {
            setEditingInvoice({
              invoice: createFreshDraftInvoice(store, invoices),
              isExisting: false,
            });
          }
          setActiveRoute(route);
        }}
        session={session}
        store={store}
        onSignOut={() => void handleSignOut()}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeRoute={activeRoute}
          storeName={store.storeName}
          onCreateInvoice={() => handleCreateNewInvoice()}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 p-5 lg:p-8 max-w-7xl w-full mx-auto">
          {syncError && (
            <div
              role="alert"
              className="no-print mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-center justify-between gap-3"
            >
              <span>{syncError}</span>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                className="text-xs font-bold text-red-900 underline cursor-pointer shrink-0"
              >
                إغلاق
              </button>
            </div>
          )}
          {activeRoute === 'dashboard' && (
            <DashboardView
              invoices={invoices}
              clients={clients}
              store={store}
              onNavigate={setActiveRoute}
              onCreateNewInvoice={() => handleCreateNewInvoice()}
              onPreviewInvoice={(inv) => {
                if (inv.status === 'paid') {
                  setActiveRoute('invoices');
                } else {
                  handleEditInvoice(inv);
                }
              }}
              onShareWhatsApp={(inv) => setWhatsAppTarget(inv)}
            />
          )}

          {activeRoute === 'builder' && (
            <InvoiceBuilderView
              key={activeBuilderState.invoice.id}
              initialInvoice={activeBuilderState.invoice}
              isEditingExisting={activeBuilderState.isExisting}
              store={store}
              clients={clients}
              onSaveInvoice={handleSaveInvoice}
              onUpdateStoreType={handleQuickStoreTypeChange}
              onUpdateStoreAppearance={handleUpdateStoreAppearance}
              onShareWhatsApp={(inv) => setWhatsAppTarget(inv)}
              onQuickAddClient={handleQuickAddClient}
            />
          )}

          {activeRoute === 'invoices' && (
            <InvoicesListView
              invoices={invoices}
              store={store}
              onEditInvoice={handleEditInvoice}
              onDuplicateInvoice={handleDuplicateInvoice}
              onMarkPaid={handleMarkPaid}
              onDeleteInvoice={handleDeleteInvoice}
              onShareWhatsApp={(inv) => setWhatsAppTarget(inv)}
            />
          )}

          {activeRoute === 'clients' && (
            <ClientsView
              clients={clients}
              invoices={invoices}
              store={store}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              onCreateInvoiceForClient={(c) => handleCreateNewInvoice(c)}
            />
          )}

          {activeRoute === 'reports' && (
            <ReportsView invoices={invoices} clients={clients} store={store} />
          )}

          {activeRoute === 'settings' && (
            <StoreSettingsView
              store={store}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>

      <WhatsAppModal
        key={whatsAppTarget?.id || 'wa-closed'}
        invoice={whatsAppTarget}
        store={store}
        onClose={() => setWhatsAppTarget(null)}
      />
    </div>
  );
}
