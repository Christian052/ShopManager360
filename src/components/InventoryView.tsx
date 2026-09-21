import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Edit2,
  Trash2,
  AlertTriangle,
  QrCode,
  Tag,
  Barcode,
  Layers,
} from 'lucide-react';
import { SparePart, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';

interface InventoryViewProps {
  parts: SparePart[];
  categories: Category[];
  onOpenAddPart: () => void;
  onOpenEditPart: (part: SparePart) => void;
  onDeletePart: (partId: string) => void;
  onOpenStockIn: (partId: string) => void;
  onOpenStockOut: (partId: string) => void;
  onOpenAdjustment: (partId: string) => void;
  onAddCategory: (name: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  parts,
  categories,
  onOpenAddPart,
  onOpenEditPart,
  onDeletePart,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAdjustment,
  onAddCategory,
}) => {
  const { currentTenant, currentUser, canManageCatalog, canRecordStock, canViewFinancials, t } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'instock' | 'low' | 'out'>('all');
  const [barcodeModalPart, setBarcodeModalPart] = useState<SparePart | null>(null);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Filter parts
  const filteredParts = parts.filter((part) => {
    if (selectedCategory !== 'all' && part.categoryId !== selectedCategory) {
      return false;
    }
    if (statusFilter === 'low' && (part.quantity > part.reorderLevel || part.quantity === 0)) {
      return false;
    }
    if (statusFilter === 'out' && part.quantity !== 0) {
      return false;
    }
    if (statusFilter === 'instock' && part.quantity <= part.reorderLevel) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = part.name.toLowerCase().includes(q);
      const matchSku = part.sku.toLowerCase().includes(q);
      const matchBarcode = part.barcode && part.barcode.toLowerCase().includes(q);
      const matchSupplier = part.supplier && part.supplier.toLowerCase().includes(q);
      const matchLoc = part.shelfLocation && part.shelfLocation.toLowerCase().includes(q);
      return matchName || matchSku || matchBarcode || matchSupplier || matchLoc;
    }
    return true;
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim());
      setNewCatName('');
      setShowNewCatInput(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t.navInventory}</h1>
          <p className="text-xs text-slate-500">
            {parts.length} registered parts in {currentTenant?.businessName} • Barcode & SKU tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageCatalog && (
            <>
              <button
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                + Category
              </button>
              <button
                onClick={onOpenAddPart}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.addPart}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category Creation Drawer */}
      {showNewCatInput && (
        <form onSubmit={handleCreateCategory} className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name (e.g. Electrical Sensors, Suspension Parts)"
            className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-800"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700"
          >
            Create Category
          </button>
          <button
            type="button"
            onClick={() => setShowNewCatInput(false)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">{t.allCategories} ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({parts.filter((p) => p.categoryId === c.id).length})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({parts.length})
            </button>
            <button
              onClick={() => setStatusFilter('instock')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'instock' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setStatusFilter('low')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'low' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low Alert
            </button>
            <button
              onClick={() => setStatusFilter('out')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'out' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Item & Code</th>
                <th className="py-3 px-3">{t.filterCategory}</th>
                <th className="py-3 px-3 text-right">{t.quantity}</th>
                {canViewFinancials && (
                  <>
                    <th className="py-3 px-3 text-right">{t.unitCost}</th>
                    <th className="py-3 px-3 text-right">{t.unitSell}</th>
                    <th className="py-3 px-3 text-right">{t.margin}</th>
                  </>
                )}
                {!canViewFinancials && (
                  <th className="py-3 px-3 text-right">{t.unitSell}</th>
                )}
                <th className="py-3 px-3">Location / Supplier</th>
                <th className="py-3 px-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No spare parts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const isLow = part.quantity > 0 && part.quantity <= part.reorderLevel;
                  const isOut = part.quantity === 0;
                  const marginPct =
                    part.sellPrice > 0 ? Math.round(((part.sellPrice - part.costPrice) / part.sellPrice) * 100) : 0;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{part.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-500 px-1.5 py-0.2 bg-slate-100 rounded">
                            {part.sku}
                          </span>
                          {part.barcode && (
                            <button
                              onClick={() => setBarcodeModalPart(part)}
                              className="text-[10px] text-amber-700 hover:text-amber-800 flex items-center gap-0.5 font-mono"
                              title="View Barcode / SKU Label"
                            >
                              <Barcode className="w-3 h-3" />
                              {part.barcode}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {part.categoryName}
                        </span>
                      </td>

                      {/* Quantity & Stock Status Pill */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          {part.quantity} <span className="text-[11px] font-normal text-slate-500">{part.unit}</span>
                        </div>
                        {isOut ? (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Reorder (≤ {part.reorderLevel})
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium text-emerald-700">
                            Optimal
                          </span>
                        )}
                      </td>

                      {/* Financials (if permitted) */}
                      {canViewFinancials && (
                        <>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {formatRwf(part.costPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatRwf(part.sellPrice)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`font-semibold ${
                                marginPct >= 25 ? 'text-emerald-600' : marginPct > 0 ? 'text-amber-600' : 'text-rose-600'
                              }`}
                            >
                              {marginPct}%
                            </span>
                          </td>
                        </>
                      )}

                      {!canViewFinancials && (
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatRwf(part.sellPrice)}
                        </td>
                      )}

                      {/* Location & Supplier */}
                      <td className="py-3 px-3 text-slate-500">
                        <div>{part.shelfLocation || 'Main Floor'}</div>
                        <div className="text-[11px] text-slate-400">{part.supplier}</div>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canRecordStock && (
                            <>
                              <button
                                onClick={() => onOpenStockIn(part.id)}
                                title="Record Stock In (Delivery)"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenStockOut(part.id)}
                                disabled={part.quantity === 0}
                                title={part.quantity === 0 ? 'No stock to dispatch' : 'Record Stock Out (Sale)'}
                                className="p-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-30 rounded-lg transition-colors"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {canManageCatalog && (
                            <>
                              <button
                                onClick={() => onOpenAdjustment(part.id)}
                                title="Reconcile Shelf Count"
                                className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                              >
                                <SlidersHorizontal className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenEditPart(part)}
                                title="Edit Part Master"
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {currentUser.role === 'owner' && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${part.name}?`)) {
                                  onDeletePart(part.id);
                                }
                              }}
                              title="Delete Part (Owner Only)"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode & Label Quick Modal */}
      {barcodeModalPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Shelf Label & Barcode Tag</h3>
            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl space-y-2">
              <div className="font-extrabold text-sm text-slate-900">{barcodeModalPart.name}</div>
              <div className="font-mono text-xs text-slate-500">SKU: {barcodeModalPart.sku}</div>
              <div className="h-12 bg-white flex items-center justify-center border border-slate-200 rounded font-mono text-sm tracking-widest text-slate-800">
                |||| | ||||| || |||||| |
              </div>
              <div className="text-[11px] font-mono text-slate-600">{barcodeModalPart.barcode}</div>
              <div className="text-xs font-bold text-amber-700">Retail: {formatRwf(barcodeModalPart.sellPrice)}</div>
            </div>
            <button
              onClick={() => setBarcodeModalPart(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Close Label
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
