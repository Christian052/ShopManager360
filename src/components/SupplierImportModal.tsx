import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  Sliders,
  ChevronDown,
  ArrowRight,
  Database,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { SupplierContact } from '../types';
import { store } from '../data/store';
import {
  parseCsvText,
  autoDetectColumnMapping,
  validateImportRows,
  generateSampleSupplierCsv,
  downloadCsvBlob,
  CsvColumnMapping,
  SupplierImportRow,
} from '../utils/csvImport';

interface SupplierImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onImportComplete: (count: number) => void;
}

type ImportMode = 'update_existing' | 'append' | 'skip_duplicates' | 'overwrite';

export const SupplierImportModal: React.FC<SupplierImportModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({
    name: -1,
    contactPerson: -1,
    phone: -1,
    email: -1,
    category: -1,
    address: -1,
    tinNumber: -1,
    paymentTerms: -1,
    leadTimeDays: -1,
    notes: -1,
  });
  const [validatedRows, setValidatedRows] = useState<SupplierImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warnings' | 'invalid'>('all');
  const [importMode, setImportMode] = useState<ImportMode>('update_existing');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showMappingConfig, setShowMappingConfig] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingSuppliers = store.getSuppliers(tenantId);

  const processCsvContent = (content: string, name: string, sizeBytes?: number) => {
    setFileName(name);
    if (sizeBytes !== undefined) {
      setFileSize((sizeBytes / 1024).toFixed(1) + ' KB');
    } else {
      setFileSize((new Blob([content]).size / 1024).toFixed(1) + ' KB');
    }
    setRawText(content);

    const parsed = parseCsvText(content);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      alert('The uploaded file appears to be empty or does not contain valid CSV data.');
      return;
    }

    setHeaders(parsed.headers);
    setDataRows(parsed.rows);

    const mapping = autoDetectColumnMapping(parsed.headers);
    setColumnMapping(mapping);

    const validated = validateImportRows(parsed.rows, mapping, existingSuppliers);
    setValidatedRows(validated);
    setStep('preview');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCsvContent(text, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCsvContent(text, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = () => {
    const sampleCsv = generateSampleSupplierCsv();
    processCsvContent(sampleCsv, 'Sample_Rwanda_Suppliers.csv');
  };

  const handleDownloadSample = () => {
    const sampleCsv = generateSampleSupplierCsv();
    downloadCsvBlob('ShopManager360_Supplier_Import_Template.csv', sampleCsv);
  };

  const handleRemapColumn = (field: keyof CsvColumnMapping, colIndex: number) => {
    const updatedMapping = {
      ...columnMapping,
      [field]: colIndex,
    };
    setColumnMapping(updatedMapping);
    const validated = validateImportRows(dataRows, updatedMapping, existingSuppliers);
    setValidatedRows(validated);
  };

  const handleRemoveRow = (indexToRemove: number) => {
    const updated = validatedRows.filter((_, idx) => idx !== indexToRemove);
    setValidatedRows(updated);
  };

  const handleConfirmImport = () => {
    setIsProcessing(true);

    const validRowsToImport = validatedRows.filter((r) => r.isValid);

    if (validRowsToImport.length === 0) {
      alert('No valid supplier rows available to import. Please review errors or map the Company Name column.');
      setIsProcessing(false);
      return;
    }

    try {
      const payload: Array<Omit<SupplierContact, 'id' | 'tenantId' | 'createdAt'>> = validRowsToImport.map((r) => ({
        name: r.name,
        contactPerson: r.contactPerson,
        phone: r.phone,
        email: r.email,
        category: r.category,
        address: r.address,
        tinNumber: r.tinNumber,
        paymentTerms: r.paymentTerms,
        leadTimeDays: r.leadTimeDays,
        notes: r.notes,
        status: r.status,
      }));

      const res = store.bulkImportSuppliers(
        tenantId,
        payload,
        importMode === 'skip_duplicates' ? 'update_existing' : (importMode as any)
      );

      setImportResult(res);
      setIsProcessing(false);
      setStep('complete');
      onImportComplete(res.imported + res.updated);
    } catch (err: any) {
      alert('Failed to import suppliers: ' + err.message);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setFileSize('');
    setRawText('');
    setHeaders([]);
    setDataRows([]);
    setValidatedRows([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const warningCount = validatedRows.filter((r) => r.validationWarnings.length > 0).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  const filteredDisplayRows = validatedRows.filter((row) => {
    if (previewFilter === 'valid') return row.isValid && row.validationWarnings.length === 0;
    if (previewFilter === 'warnings') return row.validationWarnings.length > 0;
    if (previewFilter === 'invalid') return !row.isValid;
    return true;
  });

  return (
    <div
      id="modal-bulk-import-suppliers"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Import Supplier Contacts</h2>
              <p className="text-xs text-slate-500">
                Upload CSV file with vendor contacts, payment terms, and delivery lead times
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-close-supplier-import-modal"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-amber-500 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Choose CSV file or drag and drop here
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Accepts standard comma or semicolon-delimited CSV files containing vendor name, phone, email, and terms.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Select File from Computer
                </div>
              </div>

              {/* Sample Template & Quick Test Helper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900 mb-1">Download CSV Template</div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Get a pre-formatted template with standard column headers for Rwandan suppliers.
                    </p>
                    <button
                      id="btn-download-csv-template"
                      type="button"
                      onClick={handleDownloadSample}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                    >
                      <span>Download .CSV Template</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-amber-950 mb-1">Load Demo Supplier Dataset</div>
                    <p className="text-[11px] text-amber-800/80 mb-3">
                      Instantly test the CSV parser with 7 pre-configured Rwandan auto and hardware distributors.
                    </p>
                    <button
                      id="btn-load-sample-suppliers-demo"
                      type="button"
                      onClick={handleLoadSampleData}
                      className="text-xs font-bold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg shadow-2xs transition"
                    >
                      ⚡ Test with Sample Rwandan Vendors
                    </button>
                  </div>
                </div>
              </div>

              {/* Tips & Supported Columns */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Auto-Detected Column Names</span>
                </div>
                <p className="text-slate-600">
                  Our system automatically recognizes columns matching:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Supplier Name / Company',
                    'Contact Person',
                    'Phone Number',
                    'Email Address',
                    'Category / Specialty',
                    'District & Address',
                    'TIN Number',
                    'Payment Terms (Net 30, COD)',
                    'Lead Time Days',
                    'Notes / Remarks',
                  ].map((field) => (
                    <span
                      key={field}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & MAPPING */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* File Info & Stats Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{fileName}</span>
                    <span className="text-slate-500 ml-2">({fileSize})</span>
                    <div className="text-[11px] text-slate-500">
                      {validatedRows.length} rows parsed from file • {existingSuppliers.length} existing suppliers in catalog
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMappingConfig(!showMappingConfig)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                      showMappingConfig
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Column Mapping</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showMappingConfig ? 'rotate-180' : ''}`} />
                  </button>

                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Upload Different File</span>
                  </button>
                </div>
              </div>

              {/* Column Mapping Panel (Collapsible) */}
              {showMappingConfig && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-amber-950">
                      Verify or Custom Map CSV Columns to Supplier Fields:
                    </div>
                    <span className="text-[11px] text-amber-800">
                      (Change mappings if columns were not recognized automatically)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { key: 'name', label: 'Company / Supplier Name *', required: true },
                      { key: 'contactPerson', label: 'Contact Person' },
                      { key: 'phone', label: 'Phone Number' },
                      { key: 'email', label: 'Email Address' },
                      { key: 'category', label: 'Category / Supplies' },
                      { key: 'address', label: 'Address / District' },
                      { key: 'tinNumber', label: 'RRA TIN Number' },
                      { key: 'paymentTerms', label: 'Payment Terms' },
                      { key: 'leadTimeDays', label: 'Lead Time (Days)' },
                      { key: 'notes', label: 'Notes / Remarks' },
                    ].map(({ key, label, required }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 block">
                          {label} {required && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          value={columnMapping[key as keyof CsvColumnMapping]}
                          onChange={(e) =>
                            handleRemapColumn(key as keyof CsvColumnMapping, parseInt(e.target.value, 10))
                          }
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                        >
                          <option value={-1}>-- Not In CSV / Skip --</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              Column {i + 1}: {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deduplication & Strategy Controls */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900">
                  Duplicate Matching & Update Strategy:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                      importMode === 'update_existing'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="update_existing"
                      checked={importMode === 'update_existing'}
                      onChange={() => setImportMode('update_existing')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold">Update Existing (Recommended)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Updates contact details if company name or phone already exists; adds new vendors.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                      importMode === 'skip_duplicates'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="skip_duplicates"
                      checked={importMode === 'skip_duplicates'}
                      onChange={() => setImportMode('skip_duplicates')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold">Skip Existing Records</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Only imports brand new suppliers, preserving existing catalog contacts untouched.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                      importMode === 'append'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold">Append All as New</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Imports every row without deduplication checks.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      previewFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All Rows ({validatedRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      previewFilter === 'valid'
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    Ready to Import ({validCount})
                  </button>
                  {warningCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('warnings')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        previewFilter === 'warnings'
                          ? 'bg-amber-600 text-white'
                          : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      Updates / Warnings ({warningCount})
                    </button>
                  )}
                  {invalidCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('invalid')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        previewFilter === 'invalid'
                          ? 'bg-rose-700 text-white'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Invalid ({invalidCount})
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 hidden sm:block">
                  Showing {filteredDisplayRows.length} of {validatedRows.length} rows
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Company / Supplier</th>
                      <th className="py-2.5 px-3">Contact Person</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Payment Terms</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDisplayRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDisplayRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            !row.isValid ? 'bg-rose-50/40' : row.isExistingInTenant ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.rowNumber}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {!row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3" />
                                Invalid
                              </span>
                            ) : row.isExistingInTenant ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <RefreshCw className="w-3 h-3" />
                                Updates Existing
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                New Vendor
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            <div>{row.name || <span className="text-rose-500 italic">Missing Name</span>}</div>
                            {row.validationErrors.length > 0 && (
                              <div className="text-[10px] text-rose-600">{row.validationErrors[0]}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{row.contactPerson || '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{row.phone || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{row.email || '-'}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">{row.paymentTerms}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Exclude row from import"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETE */}
          {step === 'complete' && importResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Supplier Contacts Successfully Imported!</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Vendor directory has been updated in your shop catalog and synced with stock transactions.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xl font-black text-emerald-700">{importResult.imported}</div>
                  <div className="text-[11px] font-medium text-emerald-800">New Added</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-xl font-black text-amber-700">{importResult.updated}</div>
                  <div className="text-[11px] font-medium text-amber-800">Existing Updated</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xl font-black text-slate-700">{importResult.skipped}</div>
                  <div className="text-[11px] font-medium text-slate-600">Skipped</div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  id="btn-supplier-import-done"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-xs transition"
                >
                  View Updated Supplier Directory
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                >
                  Import Another CSV File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 'preview' && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Back to Upload
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {validCount} ready to import
              </span>

              <button
                id="btn-confirm-bulk-import-suppliers"
                onClick={handleConfirmImport}
                disabled={isProcessing || validCount === 0}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing Suppliers...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Import ({validCount} Suppliers)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
