import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote, QuoteItem, QuoteFee, Client, Product } from '../store';
import { useAuthStore } from '../authStore';
import { useStore } from '../store';
import { formatCurrency } from './currency';

const loadImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to load image', e);
    return null;
  }
};

export async function generateQuotePDF(quote: Quote, client?: Client, products?: Product[]) {
  const doc = new jsPDF();
  const profile = useAuthStore.getState().profile;
  const { currencyRates } = useStore.getState();
  const quoteCurrency = quote.currency || 'USD';
  
  const itemImages: Record<number, string> = {};
  for (let i = 0; i < quote.items.length; i++) {
    const item = quote.items[i];
    if (item.imageUrl) {
      const base64 = await loadImageBase64(item.imageUrl);
      if (base64) {
        itemImages[i] = base64;
      }
    }
  }

  // Header
  doc.setFontSize(22);
  doc.text('Quotation', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Quote #: ${quote.quoteNumber}`, 14, 28);
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 14, 34);

  // My Company Info (Top Right)
  if (profile) {
    let y = 20;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(profile.companyName || 'Your Company', 200, y, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    y += 6;
    if (profile.companyAddress) {
      const lines = doc.splitTextToSize(profile.companyAddress, 60);
      doc.text(lines, 200, y, { align: 'right' });
      y += 5 * lines.length;
    }
    if (profile.companyPhone) {
      doc.text(profile.companyPhone, 200, y, { align: 'right' });
      y += 6;
    }
    if (profile.companyEmail) {
      doc.text(profile.companyEmail, 200, y, { align: 'right' });
      y += 6;
    }
    if (profile.companyWebsite) {
      doc.text(profile.companyWebsite, 200, y, { align: 'right' });
    }
  }

  // Client Info
  if (client) {
    let cy = 52;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Bill To:', 14, cy);
    cy += 6;
    doc.setFontSize(10);
    doc.text(client.company || client.name, 14, cy);
    cy += 6;
    if (client.address) {
      const addressLines = doc.splitTextToSize(client.address, 80);
      doc.text(addressLines, 14, cy);
      cy += 5 * addressLines.length;
    }
    if (client.country) doc.text(client.country, 14, cy);
  }

  // Items Table
  const tableData = quote.items.map(item => [
    '', // Image placeholder
    item.description ? `${item.name || 'Unnamed Item'}\n\n${item.description}` : (item.name || 'Unnamed Item'),
    item.quantity.toString(),
    formatCurrency(item.unitPrice, quoteCurrency, currencyRates),
    formatCurrency(item.total || (item.quantity * item.unitPrice), quoteCurrency, currencyRates)
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Image', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo
    columnStyles: {
      0: { cellWidth: 24, minCellHeight: 24 }, // Image column
      1: { cellWidth: 'auto' }, // Description
    },
    styles: {
      minCellHeight: 24,
      valign: 'middle',
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const itemIndex = data.row.index;
        const img = itemImages[itemIndex];
        if (img) {
          const dim = 20;
          const x = data.cell.x + (data.cell.width - dim) / 2;
          const y = data.cell.y + (data.cell.height - dim) / 2;
          try {
            doc.addImage(img, 'JPEG', x, y, dim, dim);
          } catch(e) {
            console.error("Failed to add image to PDF", e);
          }
        }
      }
    }
  });

  // Calculate Subtotal & Fees
  const subtotal = quote.items.reduce((sum, item) => sum + (item.total || (item.quantity * item.unitPrice)), 0);
  
  const finalY = (doc as any).lastAutoTable.finalY || 80;
  
  let currentY = finalY + 10;
  
  // Fees Table (if any)
  if (quote.fees && quote.fees.length > 0) {
    const feeData = quote.fees.map(fee => [
      fee.name || 'Fee',
      formatCurrency(fee.amount, quoteCurrency, currencyRates)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Fee / Adjustment', 'Amount']],
      body: feeData,
      theme: 'plain',
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  const totalFees = (quote.fees || []).reduce((sum, fee) => sum + fee.amount, 0);
  const totalAmount = subtotal + totalFees;

  // Totals
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(subtotal, quoteCurrency, currencyRates)}`, 140, currentY);
  currentY += 6;
  if (totalFees !== 0) {
    doc.text(`Fees/Discounts: ${formatCurrency(totalFees, quoteCurrency, currencyRates)}`, 140, currentY);
    currentY += 6;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${formatCurrency(totalAmount, quoteCurrency, currencyRates)}`, 140, currentY + 2);

  // Footer / Terms
  if (quote.paymentTerms) {
    currentY += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Terms:', 14, currentY);
    
    // Split long payment terms into multiple lines
    const termsLines = doc.splitTextToSize(quote.paymentTerms, 180);
    doc.text(termsLines, 14, currentY + 6);
    currentY += 6 * termsLines.length;

    if (quote.advanceRatio && quote.advanceRatio > 0) {
      const advanceAmount = totalAmount * (quote.advanceRatio / 100);
      const balanceAmount = totalAmount * ((quote.balanceRatio || (100 - quote.advanceRatio)) / 100);
      doc.setFont('helvetica', 'bold');
      currentY += 6;
      doc.text(`Advance Payment (${quote.advanceRatio}%): ${formatCurrency(advanceAmount, quoteCurrency, currencyRates)}`, 14, currentY);
      currentY += 6;
      doc.text(`Balance Payment (${quote.balanceRatio || (100 - quote.advanceRatio)}%): ${formatCurrency(balanceAmount, quoteCurrency, currencyRates)}`, 14, currentY);
    }
  }

  // Save the PDF
  doc.save(`Quote_${quote.quoteNumber}.pdf`);
}
