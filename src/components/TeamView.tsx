import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Key,
} from 'lucide-react';
import { User, UserRole, ActivityLog } from '../types';
import { useAuth } from '../context/AuthContext';

interface TeamViewProps {
  users: User[];
  activityLogs: ActivityLog[];
  onInviteUser: (userData: { name: string; email: string; phone: string; role: UserRole }) => void;
  onRemoveUser: (userId: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  users,
  activityLogs,
  onInviteUser,
  onRemoveUser,
}) => {
  const { currentTenant, currentUser, switchUser } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+250 78');
  const [role, setRole] = useState<UserRole>('staff');
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUser.role === 'owner' || currentUser.role === 'superadmin';

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide user full name and email.');
      return;
    }

    onInviteUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
    });

    setName('');
    setEmail('');
    setPhone('+250 78');
    setRole('staff');
    setShowInviteModal(false);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'owner':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'manager':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'staff':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'auditor':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Staff & Role-Based Access Control (RBAC)</h1>
          <p className="text-xs text-slate-500">
            Manage who can record sales, restock shelves, edit prices, or audit records in {currentTenant?.businessName}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff Member
          </button>
        )}
      </div>

      {/* RBAC Role Permissions Matrix Card */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" />
          Enforced Permission Matrix for {currentTenant?.businessName}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-amber-800 uppercase block mb-1">Owner</span>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-3">
              <li>Full root tenant control</li>
              <li>Manage MTN MoMo billing</li>
              <li>Add / remove employees</li>
              <li>Delete catalog items</li>
              <li>Full financial valuation</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-blue-800 uppercase block mb-1">Manager</span>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-3">
              <li>Add & edit spare parts</li>
              <li>Record stock in & out</li>
              <li>Reconcile shelf counts</li>
              <li>View profit/loss reports</li>
              <li>Cannot delete tenant/users</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-emerald-800 uppercase block mb-1">Staff / Cashier</span>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-3">
              <li>Record customer sales</li>
              <li>Record supplier restock</li>
              <li>View retail catalog</li>
              <li>Cost & margin hidden</li>
              <li>Cannot alter master prices</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-purple-800 uppercase block mb-1">Auditor</span>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-3">
              <li>Strict Read-Only access</li>
              <li>View movement ledger</li>
              <li>Inspect discrepancy notes</li>
              <li>Export CSV audit logs</li>
              <li>Cannot alter quantities</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Active Workspace Users ({users.length})
          </h2>
          <span className="text-xs text-slate-400">
            Click 'Impersonate / Test' to preview application permissions under that role
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Actions & Role Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrentUser = currentUser.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {u.name}
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-white font-normal">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{u.phone}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!isCurrentUser && (
                          <button
                            onClick={() => switchUser(u.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Simulate this user to test RBAC gates"
                          >
                            <Key className="w-3 h-3" />
                            Simulate Role
                          </button>
                        )}
                        {isOwner && !isCurrentUser && u.role !== 'owner' && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${u.name} from the tenant workspace?`)) {
                                onRemoveUser(u.id);
                              }
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log Audit Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <h2 className="text-base font-bold text-slate-800 mb-1">Tenant Security & Activity Audit Log</h2>
        <p className="text-xs text-slate-500 mb-4">
          All employee actions inside {currentTenant?.businessName} are cryptographically signed to prevent repudiation
        </p>

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-400">No activity logged yet.</p>
          ) : (
            activityLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-800">{log.userName}:</span>{' '}
                  <span className="text-slate-600">{log.action}</span>
                  {log.details && <span className="text-slate-500 block text-[11px] mt-0.5">{log.details}</span>}
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Invite New Staff Member</h3>
            <p className="text-xs text-slate-500">
              Grant role-restricted access to {currentTenant?.businessName}
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Manzi Patrick"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@mybusiness.rw"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                >
                  <option value="staff">Staff / Cashier (Counter Sales & Restock)</option>
                  <option value="manager">Manager (Catalog + Movements + Reports)</option>
                  <option value="auditor">Auditor (Strict Read-Only Ledger)</option>
                  <option value="owner">Co-Owner (Full Administrative Access)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
