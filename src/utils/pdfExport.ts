import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SparePart, StockTransaction, Category, Tenant, User } from '../types';
import { formatRwf } from './i18n';

export interface PdfExportOptions {
  includeInventory?: boolean;
  includeTransactions?: boolean;
  includeSummaryKpis?: boolean;
  inventoryCategoryFilter?: string; // 'all' or categoryId
  inventoryStatusFilter?: 'all' | 'low' | 'out';
  transactionTypeFilter?: 'all' | 'in' | 'out' | 'adjustment';
  dateRangeFilter?: 'all' | '7days' | '30days' | 'thisMonth';
  reportTitle?: string;
  notes?: string;
  orientation?: 'portrait' | 'landscape';
}

export function exportInventoryAndTransactionsPdf(
  parts: SparePart[],
  transactions: StockTransaction[],
  categories: Category[],
  tenant: Tenant | null,
  currentUser: User | null,
  options: PdfExportOptions = {}
) {
  const {
    includeInventory = true,
    includeTransactions = true,
    includeSummaryKpis = true,
    inventoryCategoryFilter = 'all',
    inventoryStatusFilter = 'all',
    transactionTypeFilter = 'all',
    dateRangeFilter = 'all',
    reportTitle = 'Inventory Valuation & Transaction Audit Report',
    notes = '',
    orientation = 'portrait',
  } = options;

  // Initialize jsPDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Filter Parts according to options
  let filteredParts = [...parts];
  if (inventoryCategoryFilter && inventoryCategoryFilter !== 'all') {
    filteredParts = filteredParts.filter((p) => p.categoryId === inventoryCategoryFilter);
  }
  if (inventoryStatusFilter === 'low') {
    filteredParts = filteredParts.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel);
  } else if (inventoryStatusFilter === 'out') {
    filteredParts = filteredParts.filter((p) => p.quantity <= 0);
  }

  // Filter Transactions according to options
  let filteredTransactions = [...transactions];
  if (transactionTypeFilter && transactionTypeFilter !== 'all') {
    filteredTransactions = filteredTransactions.filter((t) => t.type === transactionTypeFilter);
  }

  if (dateRangeFilter !== 'all') {
    const now = new Date();
    filteredTransactions = filteredTransactions.filter((t) => {
      const txDate = new Date(t.createdAt);
      if (dateRangeFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= sevenDaysAgo;
      }
      if (dateRangeFilter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return txDate >= thirtyDaysAgo;
      }
      if (dateRangeFilter === 'thisMonth') {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }

  // Sort transactions by date descending
  filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Metrics
  const totalCostValue = filteredParts.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailValue = filteredParts.reduce((acc, p) => acc + p.sellPrice * p.quantity, 0);
  const totalUnits = filteredParts.reduce((acc, p) => acc + p.quantity, 0);
  const lowStockCount = filteredParts.filter((p) => p.quantity <= p.reorderLevel).length;

  const totalInTransactions = filteredTransactions.filter((t) => t.type === 'in');
  const totalOutTransactions = filteredTransactions.filter((t) => t.type === 'out');
  const totalInVal = totalInTransactions.reduce((acc, t) => acc + t.totalValue, 0);
  const totalOutVal = totalOutTransactions.reduce((acc, t) => acc + t.totalValue, 0);

  let currentY = 16;

  // 1. Header Banner & Business Info
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(tenant?.businessName || 'ShopManager360 Store', margin + 6, currentY + 9);

  // Business Details & TIN
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const tenantDetails = [
    tenant?.businessType ? `Type: ${tenant.businessType.toUpperCase()}` : '',
    tenant?.tinNumber ? `TIN: ${tenant.tinNumber}` : '',
    tenant?.phone ? `Tel: ${tenant.phone}` : '',
    tenant?.district ? `District: ${tenant.district}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(tenantDetails, margin + 6, currentY + 16);

  // SaaS Badge on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11); // amber-500
  doc.text('RWANDA SME ERP • AUDIT VERIFIED', pageWidth - margin - 6, currentY + 11, {
    align: 'right',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Currency: RWF (Frw)', pageWidth - margin - 6, currentY + 17, {
    align: 'right',
  });

  currentY += 30;

  // 2. Document Title and Metadata bar
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(reportTitle, margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const nowStr = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const generatedByText = currentUser
    ? `Generated on ${nowStr} by ${currentUser.name} (${currentUser.role.toUpperCase()})`
    : `Generated on ${nowStr}`;
  doc.text(generatedByText, margin, currentY);

  currentY += 8;

  // Notes if provided
  if (notes.trim()) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Report Notes / Scope: ${notes}`, margin + 3, currentY + 7);
    currentY += 16;
  }

  // 3. Executive KPI Summary Cards
  if (includeSummaryKpis) {
    const cardGap = 3;
    const cardCount = orientation === 'landscape' ? 6 : 4;
    const cardWidth = (contentWidth - cardGap * (cardCount - 1)) / cardCount;
    const cardHeight = 16;

    const cards = [
      {
        label: 'TOTAL ITEMS',
        value: `${filteredParts.length} parts`,
        sub: `${totalUnits} units on shelf`,
        color: [30, 41, 59], // slate-800
      },
      {
        label: 'INVENTORY COST VALUE',
        value: formatRwf(totalCostValue),
        sub: 'Capital tied up',
        color: [2, 132, 199], // sky-600
      },
      {
        label: 'RETAIL VALUE POTENTIAL',
        value: formatRwf(totalRetailValue),
        sub: `Est. Profit: ${formatRwf(totalRetailValue - totalCostValue)}`,
        color: [5, 150, 105], // emerald-600
      },
      {
        label: 'REORDER ALERTS',
        value: `${lowStockCount} items`,
        sub: lowStockCount > 0 ? 'Urgent attention' : 'Catalog optimal',
        color: lowStockCount > 0 ? [225, 29, 72] : [100, 116, 139], // rose-600 or slate-500
      },
    ];

    if (orientation === 'landscape') {
      cards.push(
        {
          label: 'TOTAL INBOUND SPEND',
          value: formatRwf(totalInVal),
          sub: `${totalInTransactions.length} deliveries`,
          color: [16, 185, 129],
        },
        {
          label: 'TOTAL OUTBOUND SALES',
          value: formatRwf(totalOutVal),
          sub: `${totalOutTransactions.length} dispatches`,
          color: [217, 119, 6],
        }
      );
    }

    cards.forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Top colored indicator line
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.rect(cardX, currentY, cardWidth, 1.2, 'F');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, cardX + 3, currentY + 5);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(card.value, cardX + 3, currentY + 10);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.sub, cardX + 3, currentY + 14);
    });

    currentY += cardHeight + 8;
  }

  // Helper for category lookup
  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'General';
  };

  // 4. Section 1: Current Inventory Catalog Table
  if (includeInventory) {
    // Section Header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFillColor(217, 119, 6); // amber-600 accent bar
    doc.rect(margin, currentY, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. CURRENT INVENTORY CATALOG & VALUATION (${filteredParts.length} ITEMS)`, margin + 5, currentY + 4.8);
    currentY += 9;

    const inventoryRows = filteredParts.map((p, idx) => {
      const isLow = p.quantity <= p.reorderLevel && p.quantity > 0;
      const isOut = p.quantity <= 0;
      const statusText = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';
      const itemCostVal = p.costPrice * p.quantity;
      const itemRetailVal = p.sellPrice * p.quantity;

      return [
        (idx + 1).toString(),
        p.name,
        p.sku,
        getCategoryName(p.categoryId),
        p.shelfLocation || '-',
        `${p.quantity} ${p.unit}`,
        formatRwf(p.costPrice),
        formatRwf(itemCostVal),
        formatRwf(p.sellPrice),
        formatRwf(itemRetailVal),
        statusText,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 20 },
      head: [
        [
          '#',
          'Part Name',
          'SKU',
          'Category',
          'Location',
          'In Stock',
          'Unit Cost',
          'Cost Value',
          'Unit Sell',
          'Sell Value',
          'Status',
        ],
      ],
      body: inventoryRows,
      foot: [
        [
          '',
          'TOTALS',
          '',
          '',
          '',
          `${totalUnits} units`,
          '-',
          formatRwf(totalCostValue),
          '-',
          formatRwf(totalRetailValue),
          `${lowStockCount} alerts`,
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'left',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: orientation === 'landscape' ? 45 : 32 },
        2: { cellWidth: orientation === 'landscape' ? 24 : 18, font: 'courier' },
        3: { cellWidth: orientation === 'landscape' ? 26 : 20 },
        4: { cellWidth: orientation === 'landscape' ? 18 : 14 },
        5: { cellWidth: orientation === 'landscape' ? 18 : 14, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: orientation === 'landscape' ? 22 : 16, halign: 'right' },
        7: { cellWidth: orientation === 'landscape' ? 24 : 18, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: orientation === 'landscape' ? 22 : 16, halign: 'right' },
        9: { cellWidth: orientation === 'landscape' ? 24 : 18, halign: 'right' },
        10: { cellWidth: orientation === 'landscape' ? 22 : 16, halign: 'center' },
      },
      didParseCell: (data) => {
        // Highlight status cell
        if (data.section === 'body' && data.column.index === 10) {
          const val = String(data.cell.raw);
          if (val === 'OUT OF STOCK') {
            data.cell.styles.textColor = [225, 29, 72]; // rose-600
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'LOW STOCK') {
            data.cell.styles.textColor = [217, 119, 6]; // amber-600
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          }
        }
      },
    });

    const lastTable = (doc as any).lastAutoTable;
    currentY = (lastTable ? lastTable.finalY : currentY) + 10;
  }

  // 5. Section 2: Stock Movement & Transaction Logs Table
  if (includeTransactions) {
    // If not enough room on current page for header and 2 rows, add page
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 18;
    }

    // Section Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFillColor(16, 185, 129); // emerald-500 accent bar
    doc.rect(margin, currentY, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `2. STOCK MOVEMENT AUDIT & TRANSACTION LOGS (${filteredTransactions.length} RECORDS)`,
      margin + 5,
      currentY + 4.8
    );
    currentY += 9;

    const transactionRows = filteredTransactions.map((t, idx) => {
      const typeLabel =
        t.type === 'in'
          ? 'STOCK IN'
          : t.type === 'out'
          ? 'STOCK OUT'
          : 'ADJUSTMENT';

      const formattedDate = new Date(t.createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const qtyPrefix = t.type === 'in' ? '+' : t.type === 'out' ? '-' : '=';
      const qtyStr = `${qtyPrefix}${t.quantity}`;
      const balanceStr = `${t.previousQuantity} -> ${t.newQuantity}`;
      const refOrReason = [t.reason, t.referenceNo ? `[Ref: ${t.referenceNo}]` : '']
        .filter(Boolean)
        .join(' ');

      return [
        (idx + 1).toString(),
        formattedDate,
        typeLabel,
        t.partName,
        t.partSku,
        qtyStr,
        balanceStr,
        formatRwf(t.totalValue),
        t.userName,
        refOrReason || '-',
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 20 },
      head: [
        [
          '#',
          'Date & Time',
          'Type',
          'Part Name',
          'SKU',
          'Qty',
          'Prev -> New',
          'Total Value',
          'Staff Member',
          'Reason / Reference #',
        ],
      ],
      body: transactionRows.length > 0 ? transactionRows : [['-', '-', '-', 'No transactions found for filter criteria', '-', '-', '-', '-', '-', '-']],
      foot: [
        [
          '',
          'TOTALS',
          `${filteredTransactions.length} txs`,
          `In: ${totalInTransactions.length} | Out: ${totalOutTransactions.length}`,
          '',
          '',
          '',
          `Net: ${formatRwf(totalOutVal - totalInVal)}`,
          '',
          '',
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'left',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: orientation === 'landscape' ? 24 : 18, font: 'courier' },
        2: { cellWidth: orientation === 'landscape' ? 22 : 16, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: orientation === 'landscape' ? 44 : 32 },
        4: { cellWidth: orientation === 'landscape' ? 24 : 18, font: 'courier' },
        5: { cellWidth: orientation === 'landscape' ? 16 : 13, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: orientation === 'landscape' ? 22 : 16, halign: 'center', font: 'courier' },
        7: { cellWidth: orientation === 'landscape' ? 26 : 20, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: orientation === 'landscape' ? 24 : 18 },
        9: { cellWidth: orientation === 'landscape' ? 46 : 28 },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 2) {
            const val = String(data.cell.raw);
            if (val === 'STOCK IN') {
              data.cell.styles.textColor = [5, 150, 105]; // emerald-600
            } else if (val === 'STOCK OUT') {
              data.cell.styles.textColor = [217, 119, 6]; // amber-600
            } else {
              data.cell.styles.textColor = [2, 132, 199]; // sky-600
            }
          }
          if (data.column.index === 5) {
            const val = String(data.cell.raw);
            if (val.startsWith('+')) {
              data.cell.styles.textColor = [5, 150, 105];
            } else if (val.startsWith('-')) {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
        }
      },
    });

    const lastTable = (doc as any).lastAutoTable;
    currentY = (lastTable ? lastTable.finalY : currentY) + 12;
  }

  // 6. Sign-off / Verification Block (ensure it's on page or create new if not enough space)
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 22, 1.5, 1.5, 'FD');

  const halfWidth = contentWidth / 2;

  // Left side signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('AUDIT PREPARED BY:', margin + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${currentUser?.name || 'Authorized Staff'}`, margin + 4, currentY + 11);
  doc.text('Signature: ______________________   Date: ____________', margin + 4, currentY + 17);

  // Right side verification
  doc.setFont('helvetica', 'bold');
  doc.text('VERIFIED / APPROVED BY (OWNER / MANAGER):', margin + halfWidth + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tenant: ${tenant?.businessName || 'Management'}`, margin + halfWidth + 4, currentY + 11);
  doc.text('Signature: ______________________   Date: ____________', margin + halfWidth + 4, currentY + 17);

  // 7. Multi-page Header & Footer with "Page X of Y"
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Top subtle running line on pages > 1
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${tenant?.businessName || 'ShopManager360'} — ${reportTitle}`,
        margin,
        9
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 11, pageWidth - margin, 11);
    }

    // Bottom running footer on every page
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ShopManager360 Multi-Tenant ERP • Rwandan SME Compliant Audit Document • Confidential',
      margin,
      pageHeight - 6.5
    );

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // Generate clean filename
  const cleanTenant = (tenant?.businessName || 'Store')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${cleanTenant}_Inventory_Audit_${dateStr}.pdf`;

  // Download PDF
  doc.save(filename);

  return filename;
}

export interface StockMovementPdfOptions {
  transactions: StockTransaction[];
  tenant: Tenant | null;
  currentUser: User | null;
  viewRangeLabel: string;
  appliedFilters?: {
    typeLabel?: string;
    partName?: string;
    searchQuery?: string;
  };
  canViewFinancials?: boolean;
  orientation?: 'portrait' | 'landscape';
  reportTitle?: string;
  notes?: string;
  includeKpis?: boolean;
  includeSignatures?: boolean;
  action?: 'download' | 'print';
}

export function exportStockMovementReportPdf(options: StockMovementPdfOptions): string {
  const {
    transactions,
    tenant,
    currentUser,
    viewRangeLabel,
    appliedFilters = {},
    canViewFinancials = true,
    orientation = 'landscape',
    reportTitle = 'Stock Movement & Transaction Audit Report',
    notes = '',
    includeKpis = true,
    includeSignatures = true,
    action = 'download',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Calculate Metrics based on the filtered transactions
  const totalCount = transactions.length;
  const inTransactions = transactions.filter((t) => t.type === 'in');
  const outTransactions = transactions.filter((t) => t.type === 'out');
  const adjTransactions = transactions.filter((t) => t.type === 'adjustment');

  const totalUnitsIn = inTransactions.reduce((acc, t) => acc + t.quantity, 0);
  const totalUnitsOut = outTransactions.reduce((acc, t) => acc + t.quantity, 0);
  const netUnitsDelta = totalUnitsIn - totalUnitsOut;

  const totalValueIn = inTransactions.reduce((acc, t) => acc + (t.totalValue || 0), 0);
  const totalValueOut = outTransactions.reduce((acc, t) => acc + (t.totalValue || 0), 0);
  const netFinancialDelta = totalValueOut - totalValueIn;

  let currentY = 12;

  // 1. Header Banner & Business Info
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 22, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(tenant?.businessName || 'ShopManager360 Store', margin + 5, currentY + 8);

  // Business Details & TIN
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  const tenantDetails = [
    tenant?.businessType ? `Sector: ${tenant.businessType.toUpperCase()}` : '',
    tenant?.tinNumber ? `TIN: ${tenant.tinNumber}` : '',
    tenant?.phone ? `Tel: ${tenant.phone}` : '',
    tenant?.district ? `District: ${tenant.district}` : '',
    tenant?.address || '',
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(tenantDetails, margin + 5, currentY + 15);

  // Right side tags
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(245, 158, 11); // amber-500
  doc.text('OFFICIAL STOCK MOVEMENT AUDIT • RWANDA SME ERP', pageWidth - margin - 5, currentY + 8, {
    align: 'right',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Currency: RWF (Frw)  |  Standard A4 ${orientation.toUpperCase()}`, pageWidth - margin - 5, currentY + 15, {
    align: 'right',
  });

  currentY += 27;

  // 2. Document Title and Scope Summary Card
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(reportTitle, margin, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const nowStr = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const generatedByStr = currentUser
    ? `Generated on ${nowStr} by ${currentUser.name} (${currentUser.role.toUpperCase()})`
    : `Generated on ${nowStr}`;
  doc.text(generatedByStr, margin, currentY);

  currentY += 6;

  // View Range & Active Filter Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('VIEW RANGE:', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(viewRangeLabel, margin + 26, currentY + 5);

  // Filters line
  const filterParts = [
    `Movement Type: ${appliedFilters.typeLabel || 'All Movements'}`,
    appliedFilters.partName ? `Part: ${appliedFilters.partName}` : '',
    appliedFilters.searchQuery ? `Search Query: "${appliedFilters.searchQuery}"` : '',
    `Record Count: ${totalCount} transactions`,
  ].filter(Boolean);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(filterParts.join('  •  '), margin + 4, currentY + 9.5);

  currentY += 16;

  // Optional Notes
  if (notes.trim()) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(251, 191, 36); // amber-400
    doc.roundedRect(margin, currentY, contentWidth, 9, 1, 1, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text(`Auditor Note: ${notes}`, margin + 3, currentY + 5.8);
    currentY += 12;
  }

  // 3. Executive KPI Metrics Cards
  if (includeKpis) {
    const cardGap = 3;
    const cardCount = 4;
    const cardWidth = (contentWidth - cardGap * (cardCount - 1)) / cardCount;
    const cardHeight = 15;

    const cards = [
      {
        label: 'TRANSACTIONS IN RANGE',
        value: `${totalCount} records`,
        sub: `${inTransactions.length} In | ${outTransactions.length} Out | ${adjTransactions.length} Adj`,
        color: [30, 41, 59], // slate-800
      },
      {
        label: 'TOTAL INWARD RESTOCK',
        value: `+${totalUnitsIn} units`,
        sub: canViewFinancials ? `Cost: ${formatRwf(totalValueIn)}` : `${inTransactions.length} receipts`,
        color: [5, 150, 105], // emerald-600
      },
      {
        label: 'TOTAL OUTWARD DISPATCH',
        value: `-${totalUnitsOut} units`,
        sub: canViewFinancials ? `Valuation: ${formatRwf(totalValueOut)}` : `${outTransactions.length} dispatches`,
        color: [217, 119, 6], // amber-600
      },
      {
        label: 'NET SHELF IMPACT',
        value: `${netUnitsDelta >= 0 ? '+' : ''}${netUnitsDelta} units`,
        sub: canViewFinancials ? `Net Margin: ${formatRwf(netFinancialDelta)}` : 'Inventory Balance Delta',
        color: netUnitsDelta >= 0 ? [2, 132, 199] : [225, 29, 72], // sky-600 or rose-600
      },
    ];

    cards.forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Top indicator line
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.rect(cardX, currentY, cardWidth, 1.2, 'F');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, cardX + 3, currentY + 4.8);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.value, cardX + 3, currentY + 9.5);

      // Sub
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.sub, cardX + 3, currentY + 13);
    });

    currentY += 19;
  }

  // 4. Transaction Rows Table
  const transactionRows = transactions.map((t, idx) => {
    const typeLabel =
      t.type === 'in' ? 'STOCK IN' : t.type === 'out' ? 'STOCK OUT' : 'ADJUST';
    const formattedDate = new Date(t.createdAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const qtyPrefix = t.type === 'in' ? '+' : t.type === 'out' ? '-' : 'Δ ';
    const qtyStr = `${qtyPrefix}${t.quantity}`;
    const shelfBalance = `${t.previousQuantity} -> ${t.newQuantity}`;
    const unitPrice = t.unitCostPrice ? formatRwf(t.unitCostPrice) : '-';
    const totalVal = formatRwf(t.totalValue || 0);
    const refAndReason = [t.reason, t.referenceNo ? `[Ref: ${t.referenceNo}]` : '']
      .filter(Boolean)
      .join(' ');
    const staff = `${t.userName} (${t.userRole})`;

    if (canViewFinancials) {
      return [
        (idx + 1).toString(),
        formattedDate,
        typeLabel,
        t.partName,
        t.partSku,
        qtyStr,
        shelfBalance,
        unitPrice,
        totalVal,
        refAndReason || '-',
        staff,
      ];
    } else {
      return [
        (idx + 1).toString(),
        formattedDate,
        typeLabel,
        t.partName,
        t.partSku,
        qtyStr,
        shelfBalance,
        refAndReason || '-',
        staff,
      ];
    }
  });

  const headers = canViewFinancials
    ? [
        [
          '#',
          'Date & Time',
          'Type',
          'Spare Part',
          'SKU',
          'Qty',
          'Shelf Balance',
          'Unit Price',
          'Total Value',
          'Reason / Reference #',
          'Staff Member',
        ],
      ]
    : [
        [
          '#',
          'Date & Time',
          'Type',
          'Spare Part',
          'SKU',
          'Qty',
          'Shelf Balance',
          'Reason / Reference #',
          'Staff Member',
        ],
      ];

  const footers = canViewFinancials
    ? [
        [
          '',
          'TOTALS',
          `${totalCount} txs`,
          `+${totalUnitsIn} in / -${totalUnitsOut} out`,
          '',
          `${netUnitsDelta >= 0 ? '+' : ''}${netUnitsDelta}`,
          'Net Balance',
          '',
          formatRwf(netFinancialDelta),
          `${inTransactions.length} In • ${outTransactions.length} Out • ${adjTransactions.length} Adj`,
          '',
        ],
      ]
    : [
        [
          '',
          'TOTALS',
          `${totalCount} txs`,
          `+${totalUnitsIn} in / -${totalUnitsOut} out`,
          '',
          `${netUnitsDelta >= 0 ? '+' : ''}${netUnitsDelta}`,
          'Net Balance',
          `${inTransactions.length} In • ${outTransactions.length} Out • ${adjTransactions.length} Adj`,
          '',
        ],
      ];

  const isLandscape = orientation === 'landscape';

  const colStyles: { [key: number]: any } = canViewFinancials
    ? {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: isLandscape ? 24 : 19, font: 'courier' },
        2: { cellWidth: isLandscape ? 19 : 16, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: isLandscape ? 40 : 28 },
        4: { cellWidth: isLandscape ? 20 : 16, font: 'courier' },
        5: { cellWidth: isLandscape ? 14 : 12, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: isLandscape ? 20 : 16, halign: 'center', font: 'courier' },
        7: { cellWidth: isLandscape ? 22 : 16, halign: 'right' },
        8: { cellWidth: isLandscape ? 24 : 17, halign: 'right', fontStyle: 'bold' },
        9: { cellWidth: isLandscape ? 50 : 26 },
        10: { cellWidth: isLandscape ? 33 : 20 },
      }
    : {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: isLandscape ? 28 : 22, font: 'courier' },
        2: { cellWidth: isLandscape ? 24 : 18, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: isLandscape ? 52 : 36 },
        4: { cellWidth: isLandscape ? 26 : 20, font: 'courier' },
        5: { cellWidth: isLandscape ? 18 : 14, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: isLandscape ? 24 : 18, halign: 'center', font: 'courier' },
        7: { cellWidth: isLandscape ? 58 : 34 },
        8: { cellWidth: isLandscape ? 35 : 24 },
      };

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 20 },
    head: headers,
    body:
      transactionRows.length > 0
        ? transactionRows
        : [
            [
              '-',
              '-',
              '-',
              'No stock movement records found for the current view range and filters.',
              '-',
              '-',
              '-',
              ...(canViewFinancials ? ['-', '-'] : []),
              '-',
              '-',
            ],
          ],
    foot: footers,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 2) {
          const val = String(data.cell.raw);
          if (val === 'STOCK IN') {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          } else if (val === 'STOCK OUT') {
            data.cell.styles.textColor = [217, 119, 6]; // amber-600
          } else {
            data.cell.styles.textColor = [2, 132, 199]; // sky-600
          }
        }
        if (data.column.index === 5) {
          const val = String(data.cell.raw);
          if (val.startsWith('+')) {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (val.startsWith('-')) {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      }
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  currentY = (lastTable ? lastTable.finalY : currentY) + 10;

  // 5. Sign-off / Verification Block
  if (includeSignatures) {
    if (currentY > pageHeight - 32) {
      doc.addPage();
      currentY = 18;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

    const halfWidth = contentWidth / 2;

    // Operator Sign-off
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('AUDIT PREPARED & CHECKED BY:', margin + 4, currentY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Staff: ${currentUser?.name || 'Store Operator'} (${currentUser?.role?.toUpperCase() || 'STAFF'})`, margin + 4, currentY + 10);
    doc.text('Signature: ___________________________   Date: ____________', margin + 4, currentY + 15.5);

    // Manager Sign-off
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('VERIFIED & APPROVED BY (MANAGER / OWNER):', margin + halfWidth + 4, currentY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Store: ${tenant?.businessName || 'Management'}`, margin + halfWidth + 4, currentY + 10);
    doc.text('Signature: ___________________________   Date: ____________', margin + halfWidth + 4, currentY + 15.5);
  }

  // 6. Running Page Numbers and Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running top line for page > 1
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${tenant?.businessName || 'ShopManager360'} — ${reportTitle} (${viewRangeLabel})`,
        margin,
        8
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 10, pageWidth - margin, 10);
    }

    // Running bottom footer
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ShopManager360 SME Inventory Ledger • Official Stock Movement Verification Document • Rwanda SME Certified',
      margin,
      pageHeight - 5
    );

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  // Generate Filename
  const cleanTenant = (tenant?.businessName || 'Store')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20);
  const cleanRange = viewRangeLabel.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${cleanTenant}_Stock_Movements_${cleanRange}_${dateStr}.pdf`;

  if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(filename);
  }

  return filename;
}

export interface InventoryPdfReportOptions {
  parts: SparePart[];
  categories: Category[];
  tenant: Tenant | null;
  currentUser: User | null;
  appliedFilters: {
    categoryLabel?: string;
    statusLabel?: string;
    searchQuery?: string;
  };
  canViewFinancials?: boolean;
  orientation?: 'portrait' | 'landscape';
  reportTitle?: string;
  notes?: string;
  includeKpis?: boolean;
  includeSignatures?: boolean;
  action?: 'download' | 'print';
}

export function exportInventoryCatalogReportPdf(options: InventoryPdfReportOptions): string {
  const {
    parts,
    categories,
    tenant,
    currentUser,
    appliedFilters,
    canViewFinancials = true,
    orientation = 'portrait',
    reportTitle = 'Inventory Catalog & Stock Valuation Audit',
    notes = '',
    includeKpis = true,
    includeSignatures = true,
    action = 'download',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  // 1. Header & Brand Block
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  // Amber Accent Line
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(margin, currentY, 4, 24, 'F');

  // Tenant Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(tenant?.businessName || 'ShopManager360 Store', margin + 8, currentY + 9);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  const locationStr = [tenant?.district, tenant?.address, 'Rwanda']
    .filter(Boolean)
    .join(', ');
  const tinStr = tenant?.tinNumber ? `TIN: ${tenant.tinNumber}` : '';
  const contactStr = [tenant?.phone, tenant?.email, tinStr].filter(Boolean).join(' • ');
  doc.text(`${locationStr} ${contactStr ? `| ${contactStr}` : ''}`, margin + 8, currentY + 15);
  doc.text('OFFICIAL INVENTORY VALUATION & QR-CODE STOCK AUDIT LEDGER', margin + 8, currentY + 20);

  // Right Header Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CATALOG AUDIT REPORT', pageWidth - margin - 6, currentY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - margin - 6, currentY + 13, { align: 'right' });
  doc.text(
    `Auditor: ${currentUser?.name || 'Staff'} (${(currentUser?.role || 'staff').toUpperCase()})`,
    pageWidth - margin - 6,
    currentY + 18,
    { align: 'right' }
  );

  currentY += 28;

  // 2. Report Title & Applied Filter Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle, margin, currentY);
  currentY += 5;

  // Filter criteria strip
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 9, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('AUDIT SCOPE:', margin + 3, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const filterParts = [
    `Category: ${appliedFilters.categoryLabel || 'All Categories'}`,
    `Status: ${appliedFilters.statusLabel || 'All Stock'}`,
    `Items Listed: ${parts.length} parts`,
  ];
  if (appliedFilters.searchQuery) {
    filterParts.push(`Search: "${appliedFilters.searchQuery}"`);
  }
  doc.text(filterParts.join('  |  '), margin + 25, currentY + 5.5);

  currentY += 13;

  // Calculate Metrics
  const totalUnits = parts.reduce((acc, p) => acc + p.quantity, 0);
  const totalCostVal = parts.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailVal = parts.reduce((acc, p) => acc + p.sellPrice * p.quantity, 0);
  const lowStockCount = parts.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel).length;
  const outOfStockCount = parts.filter((p) => p.quantity === 0).length;

  // 3. Executive KPI Summary Cards
  if (includeKpis) {
    const cardCount = canViewFinancials ? 5 : 4;
    const gap = 3;
    const cardWidth = (contentWidth - gap * (cardCount - 1)) / cardCount;
    const cardHeight = 16;

    const cards = [
      {
        title: 'ITEMS IN AUDIT',
        value: `${parts.length}`,
        sub: 'Catalog parts listed',
        color: [15, 23, 42],
      },
      {
        title: 'TOTAL UNITS',
        value: `${totalUnits.toLocaleString()}`,
        sub: 'Physical units in stock',
        color: [30, 41, 59],
      },
    ];

    if (canViewFinancials) {
      cards.push({
        title: 'COST VALUATION',
        value: formatRwf(totalCostVal),
        sub: 'Purchased inventory cost',
        color: [217, 119, 6],
      });
      cards.push({
        title: 'EXPECTED REVENUE',
        value: formatRwf(totalRetailVal),
        sub: 'Retail shelf valuation',
        color: [16, 185, 129],
      });
    } else {
      cards.push({
        title: 'RETAIL VALUATION',
        value: formatRwf(totalRetailVal),
        sub: 'Expected store revenue',
        color: [16, 185, 129],
      });
    }

    cards.push({
      title: 'ATTENTION ITEMS',
      value: `${lowStockCount} Low / ${outOfStockCount} Out`,
      sub: 'Need replenishment',
      color: lowStockCount + outOfStockCount > 0 ? [225, 29, 72] : [100, 116, 139],
    });

    cards.forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + gap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.rect(cardX, currentY, 2, cardHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(card.title, cardX + 3.5, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.text(card.value, cardX + 3.5, currentY + 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text(card.sub, cardX + 3.5, currentY + 13.5);
    });

    currentY += cardHeight + 5;
  }

  // Auditor Notes banner if present
  if (notes) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text('AUDITOR NOTES:', margin + 3, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(notes, margin + 26, currentY + 5);

    currentY += 11;
  }

  // 4. Inventory Catalog Table
  const getCatName = (catId: string) => {
    const c = categories.find((cat) => cat.id === catId);
    return c ? c.name : 'General';
  };

  const tableHeaders = canViewFinancials
    ? [
        '#',
        'Part Name',
        'SKU / QR',
        'Category',
        'Location',
        'In Stock',
        'Unit Cost',
        'Cost Value',
        'Unit Sell',
        'Retail Value',
        'Stock Status',
      ]
    : [
        '#',
        'Part Name',
        'SKU / QR',
        'Category',
        'Location',
        'In Stock',
        'Unit Sell',
        'Retail Value',
        'Stock Status',
      ];

  const tableRows = parts.map((part, idx) => {
    const isLow = part.quantity > 0 && part.quantity <= part.reorderLevel;
    const isOut = part.quantity === 0;
    const statusText = isOut ? 'OUT OF STOCK' : isLow ? 'LOW ALERT' : 'IN STOCK';
    const costVal = part.costPrice * part.quantity;
    const sellVal = part.sellPrice * part.quantity;

    if (canViewFinancials) {
      return [
        (idx + 1).toString(),
        part.name,
        part.sku,
        getCatName(part.categoryId),
        part.shelfLocation || '-',
        `${part.quantity} ${part.unit}`,
        formatRwf(part.costPrice),
        formatRwf(costVal),
        formatRwf(part.sellPrice),
        formatRwf(sellVal),
        statusText,
      ];
    }

    return [
      (idx + 1).toString(),
      part.name,
      part.sku,
      getCatName(part.categoryId),
      part.shelfLocation || '-',
      `${part.quantity} ${part.unit}`,
      formatRwf(part.sellPrice),
      formatRwf(sellVal),
      statusText,
    ];
  });

  const tableFoot = canViewFinancials
    ? [
        [
          '',
          `TOTALS (${parts.length} items)`,
          '',
          '',
          '',
          `${totalUnits} units`,
          '-',
          formatRwf(totalCostVal),
          '-',
          formatRwf(totalRetailVal),
          `${lowStockCount + outOfStockCount} alerts`,
        ],
      ]
    : [
        [
          '',
          `TOTALS (${parts.length} items)`,
          '',
          '',
          '',
          `${totalUnits} units`,
          '-',
          formatRwf(totalRetailVal),
          `${lowStockCount + outOfStockCount} alerts`,
        ],
      ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: includeSignatures ? 30 : 18 },
    head: [tableHeaders],
    body: tableRows,
    foot: tableFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: canViewFinancials
      ? {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 20, fontStyle: 'bold' },
          3: { cellWidth: 22 },
          4: { cellWidth: 16 },
          5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          8: { cellWidth: 20, halign: 'right' },
          9: { cellWidth: 22, halign: 'right' },
          10: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 25, fontStyle: 'bold' },
          3: { cellWidth: 28 },
          4: { cellWidth: 22 },
          5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 28, halign: 'right' },
          8: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const statusColIdx = canViewFinancials ? 10 : 8;
        if (data.column.index === statusColIdx) {
          const val = String(data.cell.raw);
          if (val === 'OUT OF STOCK') {
            data.cell.styles.textColor = [225, 29, 72]; // rose-600
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'LOW ALERT') {
            data.cell.styles.textColor = [217, 119, 6]; // amber-600
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          }
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;

  // 5. Verification Sign-Off Blocks
  if (includeSignatures) {
    let signY = finalY + 6;
    if (signY + 22 > pageHeight - margin) {
      doc.addPage();
      signY = margin + 5;
    }

    const halfWidth = (contentWidth - 6) / 2;

    // Inventory Controller Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, signY, halfWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('COUNT VERIFIED BY (STOREKEEPER / AUDITOR):', margin + 3, signY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${currentUser?.name || 'Staff Auditor'}`, margin + 3, signY + 9.5);
    doc.text('Signature: ___________________________   Date: ____________', margin + 3, signY + 15);

    // Manager Box
    doc.roundedRect(margin + halfWidth + 6, signY, halfWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('APPROVED BY (STORE MANAGER / OWNER):', margin + halfWidth + 9, signY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Store: ${tenant?.businessName || 'Management'}`, margin + halfWidth + 9, signY + 9.5);
    doc.text('Signature: ___________________________   Date: ____________', margin + halfWidth + 9, signY + 15);
  }

  // 6. Running Header and Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${tenant?.businessName || 'ShopManager360'} — ${reportTitle}`,
        margin,
        8
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 10, pageWidth - margin, 10);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ShopManager360 SME Inventory System • Official QR-Code Inventory Catalog & Stock Valuation Audit',
      margin,
      pageHeight - 5
    );

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  // Filename
  const cleanTenant = (tenant?.businessName || 'Store')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20);
  const fileDate = new Date().toISOString().slice(0, 10);
  const filename = `${cleanTenant}_Inventory_Catalog_${fileDate}.pdf`;

  if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(filename);
  }

  return filename;
}

