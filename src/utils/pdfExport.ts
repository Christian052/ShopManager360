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
