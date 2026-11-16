export type BusinessType =
  | 'mobile_shop'
  | 'shopping_mall'
  | 'cooperative'
  | 'grocery'
  | 'services'
  | 'custom';

export type InvoiceStatus = 'paid' | 'pending' | 'draft';

export type TemplateStyle =
  | 'modern'
  | 'classic'
  | 'thermal'
  | 'executive'
  | 'minimal';

export type InvoiceFont = 'cairo' | 'tajawal' | 'amiri' | 'ibm_plex';

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export type AppRoute =
  | 'dashboard'
  | 'builder'
  | 'invoices'
  | 'clients'
  | 'reports'
  | 'settings';

export type AuthMode = 'splash' | 'login' | 'signup' | 'authenticated';

export interface InvoiceItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface StoreSettings {
  ownerId: string;
  storeName: string;
  businessType: BusinessType;
  customBusinessLabel?: string;
  logoDataUrl?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  currency: string;
  taxRate: number;
  invoiceFooterNote?: string;
  accentColor: string;
  templateStyle: TemplateStyle;
  invoiceFont?: InvoiceFont;
  customFields?: CustomField[];
}

export interface ClientRecord {
  id: string;
  ownerId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  notes?: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface InvoiceRecord {
  id: string;
  ownerId: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  businessType: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  currency: string;
  taxRate: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  items: InvoiceItem[];
  customFields?: CustomField[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface BusinessPreset {
  id: BusinessType;
  label: string;
  shortDesc: string;
  skuLabel: string;
  sampleItemName: string;
  sampleItemSku: string;
  sampleUnitPrice: number;
  defaultLogoUrl: string;
  defaultFooterNote: string;
  defaultTaxRate: number;
}

export interface UserSession {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isDemo: boolean;
  emailVerified: boolean;
}
