import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { SparePart, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partData: Omit<SparePart, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => void;
  categories: Category[];
  initialPart?: SparePart | null;
}

export const PartModal: React.FC<PartModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  initialPart,
}) => {
  const { currentTenant, t } = useAuth();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [unit, setUnit] = useState('pcs');
  const [supplier, setSupplier] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPart) {
      setName(initialPart.name);
      setSku(initialPart.sku);
      setBarcode(initialPart.barcode || '');
      setCategoryId(initialPart.categoryId);
      setCostPrice(initialPart.costPrice);
      setSellPrice(initialPart.sellPrice);
      setQuantity(initialPart.quantity);
      setReorderLevel(initialPart.reorderLevel);
      setUnit(initialPart.unit);
      setSupplier(initialPart.supplier);
      setShelfLocation(initialPart.shelfLocation || '');
      setDescription(initialPart.description || '');
    } else {
      setName('');
      // Generate a default SKU
      const randomCode = Math.floor(100 + Math.random() * 900);
      const prefix = currentTenant?.businessType === 'pharmacy' ? 'MED' : currentTenant?.businessType === 'hardware' ? 'HW' : 'SP';
      setSku(`${prefix}-${randomCode}`);
      setBarcode(`250${Math.floor(10000000 + Math.random() * 90000000)}`);
      setCategoryId(categories[0]?.id || '');
      setCostPrice(10000);
      setSellPrice(14000);
      setQuantity(10);
      setReorderLevel(5);
      setUnit('pcs');
      setSupplier('Kigali Wholesale Distribution');
      setShelfLocation('Bay A-1');
      setDescription('');
    }
    setError(null);
  }, [initialPart, isOpen, categories, currentTenant]);

  if (!isOpen) return null;

  const margin = sellPrice > 0 ? Math.round(((sellPrice - costPrice) / sellPrice) * 100) : 0;
  const markup = costPrice > 0 ? Math.round(((sellPrice - costPrice) / costPrice) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Part name is required.');
      return;
    }
    if (!sku.trim()) {
      setError('SKU / Code is required.');
      return;
    }
    if (sellPrice < costPrice) {
      if (!confirm('Warning: Selling price is lower than cost price. Do you still wish to save?')) {
        return;
      }
    }

    onSave({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim() || undefined,
      categoryId: categoryId || categories[0]?.id || 'general',
      costPrice: Number(costPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      quantity: Number(quantity) || 0,
      reorderLevel: Number(reorderLevel) || 1,
      unit,
      supplier: supplier.trim() || 'General Supply',
      shelfLocation: shelfLocation.trim() || undefined,
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {initialPart ? 'Edit Spare Part' : 'Add New Spare Part / Inventory Item'}
            </h2>
            <p className="text-xs text-slate-500">
              {currentTenant?.businessName} • {t.marketBadge}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.partName} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Toyota Hilux Front Brake Pads (D4D)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.sku} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. BP-TY-084"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Barcode / EAN (Optional)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 07894561001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.filterCategory}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 bg-white"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="sets">Sets</option>
                <option value="cans">Cans / Gallons</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
                <option value="bags">Bags (50kg)</option>
                <option value="meters">Meters</option>
                <option value="sheets">Sheets</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.unitCost}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={costPrice}
                onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Formatted: {formatRwf(costPrice)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.unitSell}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={sellPrice}
                onChange={(e) => setSellPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
              />
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-slate-500">{formatRwf(sellPrice)}</span>
                <span className={`font-semibold ${margin >= 20 ? 'text-emerald-600' : margin > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  Margin: {margin}% ({markup}% markup)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {initialPart ? 'Current Stock Quantity' : 'Initial Stock Count'}
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.reorderLevel} (Low Stock Alert Threshold)
              </label>
              <input
                type="number"
                min="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.supplier}
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Akagera Motors / Dubai Imports"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t.location}
              </label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="e.g. Shelf A-04, Rack 2"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description / Compatibility Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Notes on vehicle models, compatibility, packaging, batch codes..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {initialPart ? 'Update Part' : 'Save Part to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
