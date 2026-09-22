import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { store } from './data/store';
import { SparePart, UserRole, PlanType } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { StockMovementView } from './components/StockMovementView';
import { ReportsView } from './components/ReportsView';
import { TeamView } from './components/TeamView';
import { BillingView } from './components/BillingView';
import { SecurityTestView } from './components/SecurityTestView';
import { SettingsView } from './components/SettingsView';
import { SuperAdminView } from './components/SuperAdminView';
import { PartModal } from './components/PartModal';
import { StockInModal } from './components/StockInModal';
import { StockOutModal } from './components/StockOutModal';
import { AdjustmentModal } from './components/AdjustmentModal';
import { RegisterShopModal } from './components/RegisterShopModal';
import { RestockEmailModal } from './components/RestockEmailModal';
import { LowStockBannerToast } from './components/LowStockBannerToast';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { StockAlertNotification } from './types';
import { CheckCircle, AlertTriangle, Shield } from 'lucide-react';

function AppContent() {
  const {
    currentTenant,
    currentUser,
    isSuperAdmin,
    allTenants,
    canRecordStock,
    canManageCatalog,
    t,
  } = useAuth();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals state
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | undefined>(undefined);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInPartId, setStockInPartId] = useState<string | undefined>(undefined);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [stockOutPartId, setStockOutPartId] = useState<string | undefined>(undefined);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentPartId, setAdjustmentPartId] = useState<string | undefined>(undefined);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);

  // Stock alert & restock email modal state
  const [selectedEmailNotification, setSelectedEmailNotification] = useState<StockAlertNotification | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [liveAlertToast, setLiveAlertToast] = useState<StockAlertNotification | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Trigger re-render whenever store data changes
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // If user switches to superadmin role, let them access superAdmin console
  useEffect(() => {
    if (isSuperAdmin && currentTab === 'dashboard') {
      // Keep dashboard or switch if preferred
    } else if (!isSuperAdmin && currentTab === 'superAdmin') {
      setCurrentTab('dashboard');
    }
  }, [isSuperAdmin, currentTab]);

  const tenantId = currentTenant?.id || '';

  // Get current tenant's scoped data
  const parts = store.getParts(tenantId);
  const categories = store.getCategories(tenantId);
  const transactions = store.getTransactions(tenantId);
  const users = store.getUsers(tenantId);
  const subscription = store.getSubscription(tenantId);
  const activityLogs = store.getActivityLogs(tenantId);
  const metrics = store.getDashboardMetrics(tenantId);
  const superAdminData = store.getSuperAdminData();

  const lowStockParts = parts.filter((p) => p.quantity <= p.reorderLevel);
  const notifications = store.getNotifications(tenantId);

  // Notification action handlers
  const handleMarkNotificationAsRead = (id: string) => {
    store.markNotificationAsRead(tenantId, id);
    triggerRefresh();
  };

  const handleMarkAllNotificationsAsRead = () => {
    store.markAllNotificationsAsRead(tenantId);
    triggerRefresh();
  };

  const handleClearNotifications = () => {
    store.clearNotifications(tenantId);
    triggerRefresh();
  };

  const handleViewRestockEmail = (notification: StockAlertNotification) => {
    setSelectedEmailNotification(notification);
    setIsEmailModalOpen(true);
  };

  const handleTriggerTestAlert = () => {
    try {
      const alert = store.sendTestAlert(tenantId);
      triggerRefresh();
      setSelectedEmailNotification(alert);
      setIsEmailModalOpen(true);
      setLiveAlertToast(alert);
      showToast('Simulated low-stock restock alert dispatched!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handlers for Stock In, Out, Adjust, Add Part
  const handleStockInConfirm = (data: {
    partId: string;
    quantity: number;
    unitCostPrice?: number;
    reason: string;
    referenceNo?: string;
    notes?: string;
  }) => {
    try {
      store.recordStockIn(tenantId, currentUser, {
        partId: data.partId,
        quantity: data.quantity,
        unitCostPrice: data.unitCostPrice,
        reason: data.reason,
        referenceNo: data.referenceNo,
        notes: data.notes,
      });
      triggerRefresh();
      showToast(`Successfully stocked in ${data.quantity} units.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStockOutConfirm = (data: {
    partId: string;
    quantity: number;
    unitSellPrice?: number;
    reason: string;
    referenceNo?: string;
    notes?: string;
  }) => {
    try {
      const prevNotifCount = store.getNotifications(tenantId).length;
      store.recordStockOut(tenantId, currentUser, {
        partId: data.partId,
        quantity: data.quantity,
        unitSellPrice: data.unitSellPrice,
        reason: data.reason,
        referenceNo: data.referenceNo,
        notes: data.notes,
      });
      triggerRefresh();
      showToast(`Dispatched ${data.quantity} units.`);

      // Check if this stock out triggered a low stock alert
      const currentNotifs = store.getNotifications(tenantId);
      if (currentNotifs.length > prevNotifCount) {
        const latest = currentNotifs[0];
        setLiveAlertToast(latest);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAdjustmentConfirm = (data: {
    partId: string;
    actualPhysicalCount: number;
    reason: string;
    notes?: string;
  }) => {
    try {
      const prevNotifCount = store.getNotifications(tenantId).length;
      store.recordAdjustment(tenantId, currentUser, {
        partId: data.partId,
        actualPhysicalCount: data.actualPhysicalCount,
        reason: data.reason,
        notes: data.notes,
      });
      triggerRefresh();
      showToast(`Physical shelf count reconciled to ${data.actualPhysicalCount} units.`);

      // Check if this adjustment triggered a low stock alert
      const currentNotifs = store.getNotifications(tenantId);
      if (currentNotifs.length > prevNotifCount) {
        const latest = currentNotifs[0];
        setLiveAlertToast(latest);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSavePart = (partData: Partial<SparePart>) => {
    try {
      if (editingPart) {
        store.updatePart(tenantId, currentUser, editingPart.id, partData);
        showToast(`Updated "${partData.name}".`);
      } else {
        store.createPart({
          tenantId,
          name: partData.name!,
          sku: partData.sku!,
          categoryId: partData.categoryId!,
          categoryName: categories.find((c) => c.id === partData.categoryId)?.name || 'General Parts',
          costPrice: partData.costPrice || 0,
          sellPrice: partData.sellPrice || 0,
          quantity: partData.quantity || 0,
          reorderLevel: partData.reorderLevel || 5,
          unit: partData.unit || 'pcs',
          shelfLocation: partData.shelfLocation,
          supplier: partData.supplier || 'Local Supplier',
          supplierPhone: partData.supplierPhone,
          barcode: partData.barcode,
          description: partData.description,
        });
        showToast(`Created new spare part: "${partData.name}".`);
      }
      setIsPartModalOpen(false);
      setEditingPart(undefined);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePart = (partId: string) => {
    try {
      store.deletePart(tenantId, currentUser, partId);
      triggerRefresh();
      showToast('Part deleted from catalog.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddCategory = (catName: string) => {
    try {
      store.createCategory(tenantId, catName);
      triggerRefresh();
      showToast(`Category "${catName}" created.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleInviteUser = (userData: { name: string; email: string; phone: string; role: UserRole }) => {
    try {
      store.createUser({
        tenantId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        status: 'active',
      });
      triggerRefresh();
      showToast(`Invited ${userData.name} as ${userData.role.toUpperCase()}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveUser = (userId: string) => {
    try {
      store.deleteUser(tenantId, userId);
      triggerRefresh();
      showToast('User removed.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitMomoPayment = (data: {
    plan: PlanType;
    provider: 'MTN MoMo' | 'Airtel Money';
    momoPhone: string;
    transactionReference: string;
    amountRwf: number;
  }) => {
    try {
      store.submitMomoPayment(tenantId, data);
      triggerRefresh();
      showToast('Mobile Money payment receipt queued for Super Admin approval.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveSubscription = (subId: string) => {
    try {
      store.approveSubscription(subId);
      triggerRefresh();
      showToast('Subscription approved and activated.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateTenantStatus = (targetTenantId: string, status: 'active' | 'suspended' | 'trial') => {
    try {
      store.updateTenant(targetTenantId, { subscriptionStatus: status });
      triggerRefresh();
      showToast(`Tenant status updated to ${status.toUpperCase()}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExtendTrial = (subId: string, days: number) => {
    try {
      store.extendTrial(subId, days);
      triggerRefresh();
      showToast(`Trial extended by ${days} days.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border ${
              toastMessage.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenStockIn={(partId) => {
          setStockInPartId(partId);
          setIsStockInModalOpen(true);
        }}
        onOpenStockOut={() => {
          setStockOutPartId(undefined);
          setIsStockOutModalOpen(true);
        }}
        onOpenRegisterShop={() => setIsRegisterModalOpen(true)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onClearNotifications={handleClearNotifications}
        onViewRestockEmail={handleViewRestockEmail}
        onTriggerTestAlert={handleTriggerTestAlert}
        onOpenScanner={() => setIsGlobalScannerOpen(true)}
      />

      {/* Body: Sidebar + Main Workspace View */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          lowStockCount={lowStockParts.length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {currentTab === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              lowStockParts={lowStockParts}
              parts={parts}
              transactions={transactions}
              notifications={notifications}
              onOpenStockIn={(partId) => {
                setStockInPartId(partId);
                setIsStockInModalOpen(true);
              }}
              onOpenStockOut={(partId) => {
                setStockOutPartId(partId);
                setIsStockOutModalOpen(true);
              }}
              onOpenAdjustment={(partId) => {
                setAdjustmentPartId(partId);
                setIsAdjustmentModalOpen(true);
              }}
              onOpenAddPart={() => {
                setEditingPart(undefined);
                setIsPartModalOpen(true);
              }}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              parts={parts}
              categories={categories}
              onOpenAddPart={() => {
                setEditingPart(undefined);
                setIsPartModalOpen(true);
              }}
              onOpenEditPart={(part) => {
                setEditingPart(part);
                setIsPartModalOpen(true);
              }}
              onDeletePart={handleDeletePart}
              onOpenStockIn={(partId) => {
                setStockInPartId(partId);
                setIsStockInModalOpen(true);
              }}
              onOpenStockOut={(partId) => {
                setStockOutPartId(partId);
                setIsStockOutModalOpen(true);
              }}
              onOpenAdjustment={(partId) => {
                setAdjustmentPartId(partId);
                setIsAdjustmentModalOpen(true);
              }}
              onAddCategory={handleAddCategory}
            />
          )}

          {currentTab === 'stock' && (
            <StockMovementView
              transactions={transactions}
              parts={parts}
              onOpenStockIn={() => {
                setStockInPartId(undefined);
                setIsStockInModalOpen(true);
              }}
              onOpenStockOut={() => {
                setStockOutPartId(undefined);
                setIsStockOutModalOpen(true);
              }}
              onOpenAdjustment={() => {
                setAdjustmentPartId(undefined);
                setIsAdjustmentModalOpen(true);
              }}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              parts={parts}
              transactions={transactions}
              categories={categories}
            />
          )}

          {currentTab === 'team' && (
            <TeamView
              users={users}
              activityLogs={activityLogs}
              onInviteUser={handleInviteUser}
              onRemoveUser={handleRemoveUser}
            />
          )}

          {currentTab === 'billing' && (
            <BillingView
              subscription={subscription}
              onSubmitMomoPayment={handleSubmitMomoPayment}
            />
          )}

          {currentTab === 'securityTest' && <SecurityTestView />}

          {currentTab === 'settings' && (
            <SettingsView
              onOpenStockIn={(partId) => {
                setStockInPartId(partId);
                setIsStockInModalOpen(true);
              }}
            />
          )}

          {currentTab === 'superAdmin' && isSuperAdmin && (
            <SuperAdminView
              tenants={superAdminData.tenantSummaries.map((ts) => ts.tenant)}
              subscriptions={superAdminData.allSubscriptions}
              onApproveSubscription={handleApproveSubscription}
              onUpdateTenantStatus={handleUpdateTenantStatus}
              onExtendTrial={handleExtendTrial}
            />
          )}
        </main>
      </div>

      {/* Reusable Modals */}
      <PartModal
        isOpen={isPartModalOpen}
        onClose={() => {
          setIsPartModalOpen(false);
          setEditingPart(undefined);
        }}
        onSave={handleSavePart}
        initialPart={editingPart}
        categories={categories}
      />

      <StockInModal
        isOpen={isStockInModalOpen}
        onClose={() => {
          setIsStockInModalOpen(false);
          setStockInPartId(undefined);
        }}
        parts={parts}
        preSelectedPartId={stockInPartId}
        onConfirm={handleStockInConfirm}
      />

      <StockOutModal
        isOpen={isStockOutModalOpen}
        onClose={() => {
          setIsStockOutModalOpen(false);
          setStockOutPartId(undefined);
        }}
        parts={parts}
        preSelectedPartId={stockOutPartId}
        onConfirm={handleStockOutConfirm}
      />

      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setAdjustmentPartId(undefined);
        }}
        parts={parts}
        preSelectedPartId={adjustmentPartId}
        onConfirm={handleAdjustmentConfirm}
      />

      <RegisterShopModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {/* Automated Restock Email Details Modal */}
      <RestockEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setSelectedEmailNotification(null);
        }}
        notification={selectedEmailNotification}
        tenant={currentTenant}
        onSendEmail={(recipient) => {
          showToast(`Automated restock purchase order sent to ${recipient}!`);
        }}
      />

      {/* Floating Real-Time Low Stock Toast Banner */}
      <LowStockBannerToast
        alert={liveAlertToast}
        onClose={() => setLiveAlertToast(null)}
        onStockIn={(partId) => {
          setStockInPartId(partId);
          setIsStockInModalOpen(true);
        }}
        onViewEmail={(alert) => {
          setSelectedEmailNotification(alert);
          setIsEmailModalOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
