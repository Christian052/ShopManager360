/**
 * ShopManager360 - Multi-Tenant Domain Types
 * Market Focus: Rwanda SMEs (Hardware, Pharmacies, Garages)
 */

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'staff' | 'auditor';

export type PlanType = 'trial' | 'basic' | 'pro';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'suspended';

export type TransactionType = 'in' | 'out' | 'adjustment';

export type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'MANUAL_CASH';

export interface Tenant {
  id: string;
  businessName: string;
  businessType: 'hardware' | 'garage' | 'pharmacy' | 'general';
  plan: PlanType;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
  subscriptionEndsAt: string;
  phone: string;
  email: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  tinNumber?: string;
  district: string;
  address: string;
  currency: 'RWF';
  language: 'en' | 'rw' | 'fr';
  logoUrl?: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  nameRw?: string;
  nameFr?: string;
  description?: string;
  itemCount?: number;
}

export interface SupplierContact {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  category?: string;
  address?: string;
  tinNumber?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface SparePart {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName?: string;
  costPrice: number; // in RWF
  sellPrice: number; // in RWF
  quantity: number;
  reorderLevel: number;
  unit: string; // pcs, sets, liters, boxes, meters, kg
  supplier: string;
  supplierPhone?: string;
  shelfLocation?: string;
  description?: string;
  photoUrl?: string;
  updatedAt: string;
  createdAt: string;
}

export interface StockTransaction {
  id: string;
  tenantId: string;
  partId: string;
  partName: string;
  partSku: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  type: TransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCostPrice: number;
  unitSellPrice?: number;
  totalValue: number;
  reason: string;
  referenceNo?: string; // Invoice / Receipt / Job card / PO #
  notes?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  businessName?: string;
  plan: PlanType;
  amountRwf: number;
  paymentMethod: PaymentMethod | string;
  momoPhone: string;
  transactionRef: string;
  transactionReference?: string;
  paymentProvider?: string;
  momoPhoneNumber?: string;
  status: 'pending' | 'active' | 'rejected' | 'pending_verification' | 'trial';
  startDate: string;
  endDate: string;
  verifiedBy?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entity: 'part' | 'transaction' | 'user' | 'subscription' | 'setting';
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalItems: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayInCount: number;
  todayOutCount: number;
  todaySalesVolumeRwf: number;
  topMovingParts: {
    partId: string;
    name: string;
    sku: string;
    totalQuantityOut: number;
    totalValueRwf: number;
  }[];
  recentTransactions: StockTransaction[];
  categoryBreakdown: {
    categoryName: string;
    itemCount: number;
    totalValueRwf: number;
  }[];
}

export interface IsolationTestResult {
  testName: string;
  targetTenantId: string;
  attackerTenantId: string;
  attemptedAction: string;
  blocked: boolean;
  passed?: boolean;
  httpStatus: number;
  details: string;
  timestamp: string;
}

export type NotificationChannel = 'desktop' | 'email' | 'in_app';
export type AlertSeverity = 'critical' | 'warning';

export interface StockAlertNotification {
  id: string;
  tenantId: string;
  partId: string;
  partName: string;
  partSku: string;
  currentQuantity: number;
  reorderLevel: number;
  unit: string;
  supplier: string;
  supplierPhone?: string;
  severity: AlertSeverity; // critical if quantity === 0, warning if quantity <= reorderLevel
  channels: NotificationChannel[];
  emailRecipient?: string;
  emailStatus?: 'sent' | 'queued' | 'disabled';
  emailSubject?: string;
  emailBody?: string;
  desktopStatus?: 'sent' | 'blocked' | 'disabled';
  message: string;
  suggestedReorderQty: number;
  estimatedCostRwf: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  tenantId: string;
  desktopAlertsEnabled: boolean;
  audioChimeEnabled: boolean;
  emailAlertsEnabled: boolean;
  emailRecipient: string;
  notifyOnZeroStock: boolean;
  notifyOnReorderLevel: boolean;
  autoTriggerOnStockOut: boolean;
  ccShopOwner: boolean;
}
