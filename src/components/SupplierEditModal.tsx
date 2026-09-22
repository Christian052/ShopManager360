import { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { SupplierContact } from '../types';
import { store } from '../data/store';

interface SupplierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  supplierToEdit?: SupplierContact | null;
  onSaved: (supplier: SupplierContact) => void;
}

export const SupplierEditModal: React.FC<SupplierEditModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  supplierToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Engine Parts & Filters');
  const [address, setAddress] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [leadTimeDays, setLeadTimeDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name);
      setContactPerson(supplierToEdit.contactPerson || '');
      setPhone(supplierToEdit.phone);
      setEmail(supplierToEdit.email || '');
      setCategory(supplierToEdit.category || 'Engine Parts & Filters');
      setAddress(supplierToEdit.address || '');
      setTinNumber(supplierToEdit.tinNumber || '');
      setPaymentTerms(supplierToEdit.paymentTerms || 'Net 30 Days');
      setLeadTimeDays(supplierToEdit.leadTimeDays || 3);
      setNotes(supplierToEdit.notes || '');
      setStatus(supplierToEdit.status || 'active');
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setCategory('Engine Parts & Filters');
      setAddress('');
      setTinNumber('');
      setPaymentTerms('Net 30 Days');
      setLeadTimeDays(3);
      setNotes('');
      setStatus('active');
    }
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Supplier company name is required.');
      return;
    }

    try {
      if (supplierToEdit) {
        const updated = store.updateSupplier(tenantId, supplierToEdit.id, {
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          category: category.trim(),
          address: address.trim(),
          tinNumber: tinNumber.trim(),
          paymentTerms: paymentTerms.trim(),
          leadTimeDays: Number(leadTimeDays) || 3,
          notes: notes.trim(),
          status,
        });
        onSaved(updated);
      } else {
        const created = store.addSupplier(tenantId, {
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          category: category.trim(),
          address: address.trim(),
          tinNumber: tinNumber.trim(),
          paymentTerms: paymentTerms.trim(),
          leadTimeDays: Number(leadTimeDays) || 3,
          notes: notes.trim(),
          status,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      alert('Error saving supplier: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {supplierToEdit ? 'Edit Supplier Contact' : 'Add New Supplier Contact'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Vendor details, payment conditions, and contact points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Company / Supplier Name *
            </label>
            <input
              id="input-supplier-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Toyota Rwanda Spares Agency"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                id="input-supplier-contact-person"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Jean-Paul Mugisha"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                id="input-supplier-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 788 123 456"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="input-supplier-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@supplier.rw"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Product Category / Line
              </label>
              <input
                id="input-supplier-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Engine & Filters"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                District / Physical Address
              </label>
              <input
                id="input-supplier-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Nyarugenge, Nyabugogo"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                RRA TIN Number
              </label>
              <input
                id="input-supplier-tin"
                type="text"
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                placeholder="e.g. 100348912"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="MoMo / Mobile Money">MoMo / Mobile Money</option>
                <option value="50% Advance / 50% Delivery">50% Advance / 50% Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
              >
                <option value="active">Active Vendor</option>
                <option value="inactive">Inactive / On-Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Authorized distributor, delivers directly to Nyabugogo workshop on Tuesdays."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              id="btn-save-supplier-contact"
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{supplierToEdit ? 'Update Supplier' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
