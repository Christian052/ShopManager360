import { SupplierContact } from '../types';

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  rawText: string;
}

export interface SupplierImportRow {
  rowNumber: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  address: string;
  tinNumber: string;
  paymentTerms: string;
  leadTimeDays: number;
  notes: string;
  status: 'active' | 'inactive';
  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingInTenant: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface CsvColumnMapping {
  name: number;
  contactPerson: number;
  phone: number;
  email: number;
  category: number;
  address: number;
  tinNumber: number;
  paymentTerms: number;
  leadTimeDays: number;
  notes: number;
}

/**
 * Robust CSV parser handling quotes, escaped quotes, semicolons/commas, and newlines
 */
export function parseCsvText(text: string): CsvParseResult {
  if (!text || !text.trim()) {
    return { headers: [], rows: [], rawText: text };
  }

  // Detect delimiter: check whether comma or semicolon is more frequent on first non-empty line
  const firstLine = text.split(/\r\n|\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push final trailing field & row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], rawText: text };
  }

  const rawHeaders = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const dataRows = rows.slice(1);

  return {
    headers: rawHeaders,
    rows: dataRows,
    rawText: text,
  };
}

/**
 * Automatically detects column index mapping from standard CSV headers
 */
export function autoDetectColumnMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = {
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
  };

  const normalized = headers.map((h) => h.toLowerCase().replace(/[\s_\-]/g, ''));

  normalized.forEach((header, index) => {
    // Name
    if (mapping.name === -1 && /^(suppliername|vendorname|companyname|supplier|vendor|company|name|nom|fournisseur)$/.test(header)) {
      mapping.name = index;
    }
    // Contact Person
    else if (mapping.contactPerson === -1 && /(contactperson|contactname|representative|rep|manager|person|agent|contact)$/.test(header)) {
      mapping.contactPerson = index;
    }
    // Phone
    else if (mapping.phone === -1 && /(phone|phonenumber|telephone|mobile|tel|cell|contactphone)$/.test(header)) {
      mapping.phone = index;
    }
    // Email
    else if (mapping.email === -1 && /(email|emailaddress|mail|contactemail)$/.test(header)) {
      mapping.email = index;
    }
    // Category
    else if (mapping.category === -1 && /(category|categories|supplies|specialty|productline|type|industry)$/.test(header)) {
      mapping.category = index;
    }
    // Address
    else if (mapping.address === -1 && /(address|location|city|district|street|physicaladdress)$/.test(header)) {
      mapping.address = index;
    }
    // TIN
    else if (mapping.tinNumber === -1 && /(tin|tinnumber|taxid|vatnumber|rratin)$/.test(header)) {
      mapping.tinNumber = index;
    }
    // Payment Terms
    else if (mapping.paymentTerms === -1 && /(paymentterms|terms|payment|paymentmethod)$/.test(header)) {
      mapping.paymentTerms = index;
    }
    // Lead Time
    else if (mapping.leadTimeDays === -1 && /(leadtime|leadtimedays|deliverydays|deliverytime)$/.test(header)) {
      mapping.leadTimeDays = index;
    }
    // Notes
    else if (mapping.notes === -1 && /(notes|remarks|comment|description|info)$/.test(header)) {
      mapping.notes = index;
    }
  });

  // Fallback defaults if first column isn't mapped
  if (mapping.name === -1 && headers.length > 0) mapping.name = 0;
  if (mapping.phone === -1 && headers.length > 1) mapping.phone = 1;

  return mapping;
}

/**
 * Standardize and clean phone numbers (supporting Rwandan +250 78x xxx xxx)
 */
export function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const cleaned = rawPhone.trim();
  // Remove unnecessary noise
  return cleaned;
}

/**
 * Validates parsed CSV rows against existing tenant suppliers
 */
export function validateImportRows(
  rows: string[][],
  mapping: CsvColumnMapping,
  existingSuppliers: SupplierContact[]
): SupplierImportRow[] {
  const existingNames = new Set(existingSuppliers.map((s) => s.name.toLowerCase().trim()));
  const existingPhones = new Set(
    existingSuppliers
      .map((s) => s.phone.replace(/[\s\-\+\(\)]/g, ''))
      .filter(Boolean)
  );

  const seenNamesInFile = new Set<string>();
  const results: SupplierImportRow[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1
    const name = (mapping.name >= 0 ? row[mapping.name] : '')?.trim() || '';
    const contactPerson = (mapping.contactPerson >= 0 ? row[mapping.contactPerson] : '')?.trim() || '';
    const phone = (mapping.phone >= 0 ? row[mapping.phone] : '')?.trim() || '';
    const email = (mapping.email >= 0 ? row[mapping.email] : '')?.trim() || '';
    const category = (mapping.category >= 0 ? row[mapping.category] : '')?.trim() || 'General Spares';
    const address = (mapping.address >= 0 ? row[mapping.address] : '')?.trim() || '';
    const tinNumber = (mapping.tinNumber >= 0 ? row[mapping.tinNumber] : '')?.trim() || '';
    const paymentTerms = (mapping.paymentTerms >= 0 ? row[mapping.paymentTerms] : '')?.trim() || 'Net 30';
    const rawLeadTime = mapping.leadTimeDays >= 0 ? parseInt(row[mapping.leadTimeDays], 10) : 3;
    const leadTimeDays = isNaN(rawLeadTime) ? 3 : Math.max(1, rawLeadTime);
    const notes = (mapping.notes >= 0 ? row[mapping.notes] : '')?.trim() || '';

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Validation: Name is mandatory
    if (!name) {
      validationErrors.push('Supplier/Vendor Company Name is required.');
    }

    // Validation: Phone or Email recommended
    if (!phone && !email) {
      validationWarnings.push('No contact phone or email provided.');
    }

    // Basic email format check
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationWarnings.push(`Invalid email format: "${email}".`);
    }

    // Check duplicate in current file
    const normalizedName = name.toLowerCase();
    let isDuplicateInFile = false;
    if (normalizedName) {
      if (seenNamesInFile.has(normalizedName)) {
        isDuplicateInFile = true;
        validationWarnings.push('Duplicate supplier name found within this CSV file.');
      } else {
        seenNamesInFile.add(normalizedName);
      }
    }

    // Check existing in shop catalog
    const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
    const isExistingInTenant =
      existingNames.has(normalizedName) || (cleanPhone.length > 5 && existingPhones.has(cleanPhone));

    if (isExistingInTenant) {
      validationWarnings.push('Supplier already exists in your directory (will be updated if enabled).');
    }

    results.push({
      rowNumber: rowNum,
      name,
      contactPerson,
      phone,
      email,
      category,
      address,
      tinNumber,
      paymentTerms,
      leadTimeDays,
      notes,
      status: 'active',
      isValid: validationErrors.length === 0,
      isDuplicateInFile,
      isExistingInTenant,
      validationErrors,
      validationWarnings,
    });
  });

  return results;
}

/**
 * Generates a pre-populated, formatted sample CSV template
 */
export function generateSampleSupplierCsv(): string {
  const headers = [
    'Supplier Name',
    'Contact Person',
    'Phone Number',
    'Email Address',
    'Category',
    'District & Address',
    'TIN Number',
    'Payment Terms',
    'Lead Time Days',
    'Notes',
  ];

  const sampleRows = [
    [
      'Toyota Rwanda Spares Agency',
      'Jean-Paul Mugisha',
      '+250 788 345 678',
      'orders@toyotarwanda.co.rw',
      'Genuine Engine & Filters',
      'Nyarugenge, KN 3 Rd, Nyabugogo',
      '100348912',
      'Net 30 Days',
      '2',
      'Official OEM distributor for Hilux, Prado & RAV4 components',
    ],
    [
      'Bosch Auto Center Kigali',
      'Claire Umutoni',
      '+250 783 112 990',
      'spares@bosch-rwanda.com',
      'Brake Systems & Electrical',
      'Kicukiro, Gikondo Industrial Park',
      '102458921',
      'Cash on Delivery',
      '3',
      'Supplies brake discs, sensors, and spark plugs',
    ],
    [
      'TotalEnergies Lubricants Rwanda',
      'David Nshimyumuremyi',
      '+250 788 556 221',
      'commercial@totalenergies.rw',
      'Lubricants & Fluids',
      'Gasabo, Boulevard de l Umuganda',
      '100029384',
      '15 Days Credit',
      '1',
      'Quartz 9000 engine oil, gear oils, and coolant drums',
    ],
    [
      'Denso Spark Plug Hub East Africa',
      'Patrick Habimana',
      '+250 781 445 670',
      'sales@densosparks.rw',
      'Ignition & Electrical',
      'Nyarugenge, Muhima Commercial Hub',
      '104889231',
      'MoMo / Airtel Money',
      '2',
      'Iridium spark plugs and high-performance alternators',
    ],
    [
      'Brembo Brake Systems Distributors',
      'Eric Karasira',
      '+250 788 901 234',
      'info@brembo-kigali.rw',
      'Braking & Hydraulics',
      'Nyarugenge, Nyabugogo Taxi Park Rd',
      '101994821',
      'Net 30 Days',
      '4',
      'Premium ceramic and semi-metallic brake pads',
    ],
    [
      'Monroe Shocks Ltd Gikondo',
      'Aline Uwase',
      '+250 785 667 890',
      'orders@monroeshocks.rw',
      'Suspension & Steering',
      'Kicukiro, KK 15 Rd, Gikondo',
      '103445901',
      '50% Advance, 50% on Delivery',
      '5',
      'Heavy-duty shock absorbers and coil springs',
    ],
    [
      'Kigali Hardware Wholesalers',
      'Emmanuel Bizimana',
      '+250 788 776 543',
      'sales@kigalihardware.rw',
      'Hardware & Fasteners',
      'Kicukiro, Gahanga Logistics Center',
      '102334812',
      'Net 60 Days',
      '3',
      'Bolts, nuts, fittings, and workshop consumables',
    ],
  ];

  const escapeField = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const csvLines = [
    headers.map(escapeField).join(','),
    ...sampleRows.map((row) => row.map(escapeField).join(',')),
  ];

  return csvLines.join('\r\n');
}

/**
 * Export existing supplier directory to CSV format
 */
export function exportSuppliersToCsv(suppliers: SupplierContact[]): string {
  const headers = [
    'Supplier Name',
    'Contact Person',
    'Phone Number',
    'Email Address',
    'Category',
    'Address',
    'TIN Number',
    'Payment Terms',
    'Lead Time Days',
    'Status',
    'Notes',
    'Created At',
  ];

  const escapeField = (val: string | number | undefined) => {
    const str = val === undefined || val === null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = suppliers.map((s) => [
    escapeField(s.name),
    escapeField(s.contactPerson),
    escapeField(s.phone),
    escapeField(s.email),
    escapeField(s.category),
    escapeField(s.address),
    escapeField(s.tinNumber),
    escapeField(s.paymentTerms),
    escapeField(s.leadTimeDays || 3),
    escapeField(s.status),
    escapeField(s.notes),
    escapeField(s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''),
  ]);

  const csvLines = [headers.map(escapeField).join(','), ...rows.map((r) => r.join(','))];
  return csvLines.join('\r\n');
}

/**
 * Helper to trigger browser download of a CSV file
 */
export function downloadCsvBlob(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
