import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SEED_STORE_SETTINGS } from '../data/presets';
import type {
  ClientRecord,
  InvoiceRecord,
  InvoiceStatus,
  StoreSettings,
} from '../types/invoice';
import { clampString } from '../utils/invoiceMath';
import { sanitizeHexColor, sanitizeImageUrl } from '../utils/security';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await upsertUserProfile(result.user);
  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await upsertUserProfile(result.user);
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  if (displayName.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  await upsertUserProfile(result.user, displayName.trim());
  return result.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

export async function upsertUserProfile(
  user: User,
  overrideName?: string
): Promise<void> {
  if (!user.emailVerified) {
    return;
  }
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const existingSnap = await getDoc(ref);
    const displayName = clampString(
      overrideName || user.displayName || user.email?.split('@')[0] || 'تاجر CXT',
      120
    );
    const email = clampString(user.email || 'merchant@cxt-othman.app', 160);
    const photoURL = clampString(user.photoURL || '', 500);

    if (!existingSnap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(ref, payload);
    } else {
      const payload: Record<string, unknown> = {
        displayName,
        email,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeStoreSettings(
  userId: string,
  onData: (settings: StoreSettings | null) => void,
  onError: (err: Error) => void
) {
  const path = `users/${userId}/settings/store`;
  const ref = doc(db, 'users', userId, 'settings', 'store');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        ownerId: String(data.ownerId || userId),
        storeName: String(data.storeName || SEED_STORE_SETTINGS.storeName),
        businessType: data.businessType || 'mobile_shop',
        customBusinessLabel: data.customBusinessLabel || '',
        logoDataUrl: data.logoDataUrl || '',
        phone: data.phone || '',
        address: data.address || '',
        taxNumber: data.taxNumber || '',
        currency: String(data.currency || 'IQD'),
        taxRate: Number(data.taxRate ?? 0),
        invoiceFooterNote: data.invoiceFooterNote || '',
        accentColor: String(data.accentColor || '#047857'),
        templateStyle: data.templateStyle || 'modern',
        invoiceFont: data.invoiceFont || 'cairo',
        customFields: Array.isArray(data.customFields) ? data.customFields : [],
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        onError(e as Error);
      }
    }
  );
}

function sanitizeCustomFields(
  fields?: { id: string; label: string; value: string }[]
) {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((f) => f && (f.label?.trim() || f.value?.trim()))
    .slice(0, 10)
    .map((f, idx) => ({
      id: clampString(f.id || `cf-${idx}`, 64),
      label: clampString(f.label, 80),
      value: clampString(f.value, 160),
    }));
}

export async function saveStoreSettingsToFirestore(
  userId: string,
  settings: StoreSettings
): Promise<void> {
  const path = `users/${userId}/settings/store`;
  const ref = doc(db, 'users', userId, 'settings', 'store');
  try {
    const existingSnap = await getDoc(ref);
    const ALLOWED_CURRENCIES = new Set(['IQD', 'USD', 'SAR', 'AED', 'KWD', 'EGP']);
    const cleanCurrency = ALLOWED_CURRENCIES.has(settings.currency)
      ? settings.currency
      : 'IQD';
    const sanitized: Record<string, unknown> = {
      storeName: clampString(settings.storeName, 120) || 'متجري الإلكتروني',
      businessType: settings.businessType,
      customBusinessLabel: clampString(settings.customBusinessLabel, 120),
      logoDataUrl: sanitizeImageUrl(settings.logoDataUrl),
      phone: clampString(settings.phone, 40),
      address: clampString(settings.address, 200),
      taxNumber: clampString(settings.taxNumber, 60),
      currency: cleanCurrency,
      taxRate: Math.min(100, Math.max(0, Number(settings.taxRate) || 0)),
      invoiceFooterNote: clampString(settings.invoiceFooterNote, 300),
      accentColor: sanitizeHexColor(settings.accentColor, '#047857'),
      templateStyle: settings.templateStyle || 'modern',
      invoiceFont: settings.invoiceFont || 'cairo',
      customFields: sanitizeCustomFields(settings.customFields),
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      sanitized.ownerId = userId;
      sanitized.createdAt = serverTimestamp();
      await setDoc(ref, sanitized);
    } else {
      await updateDoc(ref, sanitized);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeClients(
  userId: string,
  onData: (clients: ClientRecord[]) => void,
  onError: (err: Error) => void
) {
  const path = `users/${userId}/clients`;
  const q = query(
    collection(db, 'users', userId, 'clients'),
    where('ownerId', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClientRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId || userId),
            name: String(data.name || ''),
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            category: data.category || '',
            notes: data.notes || '',
            createdAtIso: timestampToIso(data.createdAt),
            updatedAtIso: timestampToIso(data.updatedAt),
          };
        })
        .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        onError(e as Error);
      }
    }
  );
}

export async function saveClientToFirestore(
  userId: string,
  client: Omit<ClientRecord, 'ownerId' | 'createdAtIso' | 'updatedAtIso'>,
  isNew: boolean
): Promise<void> {
  const safeId =
    client.id.replace(/[^a-zA-Z0-9_-]/g, '') || `cli-${Date.now()}`;
  const path = `users/${userId}/clients/${safeId}`;
  const ref = doc(db, 'users', userId, 'clients', safeId);
  try {
    const payload: Record<string, unknown> = {
      name: clampString(client.name, 120) || 'عميل',
      phone: clampString(client.phone, 40),
      email: clampString(client.email, 160),
      address: clampString(client.address, 200),
      category: clampString(client.category, 60),
      notes: clampString(client.notes, 300),
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      payload.ownerId = userId;
      payload.createdAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deleteClientFromFirestore(
  userId: string,
  clientId: string
): Promise<void> {
  const path = `users/${userId}/clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeInvoices(
  userId: string,
  onData: (invoices: InvoiceRecord[]) => void,
  onError: (err: Error) => void
) {
  const path = `users/${userId}/invoices`;
  const q = query(
    collection(db, 'users', userId, 'invoices'),
    where('ownerId', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: InvoiceRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId || userId),
            invoiceNumber: String(data.invoiceNumber || ''),
            clientId: data.clientId || '',
            clientName: String(data.clientName || ''),
            clientPhone: data.clientPhone || '',
            businessType: String(data.businessType || 'custom'),
            issueDate: String(data.issueDate || ''),
            dueDate: data.dueDate || '',
            status: (data.status as InvoiceStatus) || 'pending',
            currency: String(data.currency || 'IQD'),
            taxRate: Number(data.taxRate ?? 0),
            discountAmount: Number(data.discountAmount ?? 0),
            subtotal: Number(data.subtotal ?? 0),
            taxAmount: Number(data.taxAmount ?? 0),
            total: Number(data.total ?? 0),
            notes: data.notes || '',
            items: Array.isArray(data.items) ? data.items : [],
            customFields: Array.isArray(data.customFields)
              ? data.customFields
              : [],
            createdAtIso: timestampToIso(data.createdAt),
            updatedAtIso: timestampToIso(data.updatedAt),
          };
        })
        .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        onError(e as Error);
      }
    }
  );
}

export async function saveInvoiceToFirestore(
  userId: string,
  invoice: InvoiceRecord,
  isNew: boolean
): Promise<void> {
  const safeId =
    invoice.id.replace(/[^a-zA-Z0-9_-]/g, '') || `inv-${Date.now()}`;
  const path = `users/${userId}/invoices/${safeId}`;
  const ref = doc(db, 'users', userId, 'invoices', safeId);
  try {
    const cleanItems = invoice.items.slice(0, 50).map((it, idx) => ({
      id: clampString(it.id || `item-${idx}`, 64),
      name: clampString(it.name, 140) || 'صنف',
      sku: clampString(it.sku, 60),
      quantity: Math.max(0, Number(it.quantity) || 0),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      discount: Math.max(0, Number(it.discount) || 0),
    }));

    const itemsPayload =
      cleanItems.length > 0
        ? cleanItems
        : [
            {
              id: `item-${Date.now()}`,
              name: 'صنف',
              sku: '',
              quantity: 1,
              unitPrice: 0,
              discount: 0,
            },
          ];

    const payload: Record<string, unknown> = {
      invoiceNumber: clampString(invoice.invoiceNumber, 40) || 'INV-001',
      clientId: clampString(invoice.clientId, 128),
      clientName: clampString(invoice.clientName, 120) || 'عميل نقدي',
      clientPhone: clampString(invoice.clientPhone, 40),
      businessType: clampString(invoice.businessType, 60) || 'custom',
      issueDate:
        clampString(invoice.issueDate, 40) ||
        new Date().toISOString().slice(0, 10),
      dueDate: clampString(invoice.dueDate, 40),
      status: invoice.status,
      currency: clampString(invoice.currency, 10) || 'IQD',
      taxRate: Math.min(100, Math.max(0, Number(invoice.taxRate) || 0)),
      discountAmount: Math.max(0, Number(invoice.discountAmount) || 0),
      subtotal: Math.max(0, Number(invoice.subtotal) || 0),
      taxAmount: Math.max(0, Number(invoice.taxAmount) || 0),
      total: Math.max(0, Number(invoice.total) || 0),
      notes: clampString(invoice.notes, 500),
      items: itemsPayload,
      customFields: sanitizeCustomFields(invoice.customFields),
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      payload.ownerId = userId;
      payload.createdAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function markInvoicePaidInFirestore(
  userId: string,
  invoiceId: string
): Promise<void> {
  const path = `users/${userId}/invoices/${invoiceId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'invoices', invoiceId), {
      status: 'paid',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInvoiceFromFirestore(
  userId: string,
  invoiceId: string
): Promise<void> {
  const path = `users/${userId}/invoices/${invoiceId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'invoices', invoiceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
