import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant, User, PlanType, UserRole } from '../types';
import { store } from '../data/store';
import { TRANSLATIONS, Language } from '../utils/i18n';

interface AuthContextType {
  currentTenant: Tenant | null;
  currentUser: User;
  allTenants: Tenant[];
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof TRANSLATIONS.en;
  switchUser: (userId: string) => void;
  switchTenant: (tenantId: string) => void;
  registerNewTenant: (data: {
    businessName: string;
    businessType: 'hardware' | 'garage' | 'pharmacy' | 'general';
    plan: PlanType;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    district: string;
    address: string;
  }) => void;
  refreshData: () => void;
  isSuperAdmin: boolean;
  isOwner: boolean;
  canManageCatalog: boolean;
  canRecordStock: boolean;
  canViewFinancials: boolean;
  canManageTeam: boolean;
  canManageBilling: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allTenants, setAllTenants] = useState<Tenant[]>(store.getTenants());
  // Default to Jean-Claude Mugisha (Owner @ Kigali Auto Spares)
  const [currentUserId, setCurrentUserId] = useState<string>('user-jc-mugisha');
  const [language, setLanguageState] = useState<Language>('en');

  const currentUser = store.getUser(currentUserId) || store.getUsers('tenant-kigali-auto')[0];
  const currentTenant =
    currentUser.tenantId === 'platform' ? null : store.getTenant(currentUser.tenantId) || allTenants[0];

  useEffect(() => {
    if (currentTenant && currentTenant.language) {
      setLanguageState(currentTenant.language);
    }
  }, [currentTenant?.id]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const refreshData = () => {
    setAllTenants(store.getTenants());
  };

  const switchUser = (userId: string) => {
    const user = store.getUser(userId);
    if (user) {
      setCurrentUserId(userId);
      refreshData();
    }
  };

  const switchTenant = (tenantId: string) => {
    const usersInTenant = store.getUsers(tenantId);
    if (usersInTenant.length > 0) {
      // Pick the owner or first user in that tenant
      const owner = usersInTenant.find((u) => u.role === 'owner') || usersInTenant[0];
      setCurrentUserId(owner.id);
    }
    refreshData();
  };

  const registerNewTenant = (data: {
    businessName: string;
    businessType: 'hardware' | 'garage' | 'pharmacy' | 'general';
    plan: PlanType;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    district: string;
    address: string;
  }) => {
    const { user } = store.registerTenant(data);
    refreshData();
    setCurrentUserId(user.id);
  };

  const isSuperAdmin = currentUser.role === 'superadmin';
  const role: UserRole = currentUser.role;

  // RBAC Permission Gates
  const canManageCatalog = ['owner', 'manager'].includes(role) || isSuperAdmin;
  const canRecordStock = ['owner', 'manager', 'staff'].includes(role) || isSuperAdmin;
  const canViewFinancials = ['owner', 'manager', 'auditor'].includes(role) || isSuperAdmin;
  const canManageTeam = role === 'owner' || isSuperAdmin;
  const canManageBilling = role === 'owner' || isSuperAdmin;

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <AuthContext.Provider
      value={{
        currentTenant,
        currentUser,
        allTenants,
        language,
        setLanguage,
        t,
        switchUser,
        switchTenant,
        registerNewTenant,
        refreshData,
        isSuperAdmin,
        isOwner: role === 'owner' || isSuperAdmin,
        canManageCatalog,
        canRecordStock,
        canViewFinancials,
        canManageTeam,
        canManageBilling,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
