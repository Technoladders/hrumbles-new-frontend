
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Invoice } from "@/lib/accounts-data";
import { formatINR } from "@/utils/currency";
import { formatDateForFilename } from "@/utils/export-utils";

/**
 * Creates a professional PDF invoice 
 * @param invoice - The invoice data to include in the PDF
 * @returns Promise that resolves when PDF generation is complete
 */
export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  // Set some basic styles
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Company Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80); // Dark blue color
  doc.text("COMPANY NAME", margin, margin);
  
  // Contact info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray color
  doc.text("123 Business Street, City, State, 12345", margin, margin + 7);
  doc.text("Phone: +91 98765 43210 | Email: contact@company.com", margin, margin + 12);
  
  // Invoice Title & Number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80); // Dark blue color
  doc.text(`INVOICE #${invoice.invoiceNumber}`, margin, margin + 25);
  
  // Status badge
  const statusColor = invoice.status === 'Paid' ? [39, 174, 96] : 
                      invoice.status === 'Overdue' ? [231, 76, 60] : 
                      invoice.status === 'Unpaid' ? [243, 156, 18] : [149, 165, 166];
  
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  
  // Calculate status text width for proper positioning
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const statusWidth = doc.getTextWidth(invoice.status);
  const statusX = pageWidth - margin - statusWidth - 10; // 10 is padding
  
  // Draw status badge
  doc.roundedRect(statusX - 5, margin + 20, statusWidth + 10, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); // White text for badge
  doc.text(invoice.status, statusX, margin + 26);
  
  // Invoice details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(`Invoice Date: ${invoice.invoiceDate}`, margin, margin + 40);
  doc.text(`Due Date: ${invoice.dueDate}`, margin, margin + 47);
  
  // Client information
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80);
  doc.text("Bill To:", margin, margin + 60);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(invoice.clientName, margin, margin + 67);
  
  // Items Table
  const tableStartY = margin + 80;
  const itemHeight = 10;
  
  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, contentWidth, itemHeight, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(44, 62, 80);
  doc.text("Description", margin + 5, tableStartY + 7);
  doc.text("Qty", margin + contentWidth * 0.5, tableStartY + 7);
  doc.text("Rate", margin + contentWidth * 0.65, tableStartY + 7);
  doc.text("Amount", margin + contentWidth * 0.85, tableStartY + 7);
  
  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  
  let currentY = tableStartY + itemHeight;
  
  // Check if we need a new page - FIX: Added return value type annotation and ensure we actually use the boolean result
  const checkForNewPage = (height: number): boolean => {
    if (currentY + height > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };
  
  // Draw items rows
  invoice.items.forEach((item, index) => {
    const needNewPage = checkForNewPage(itemHeight);
    
    if (needNewPage) {
      // If we added a new page, redraw the header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, contentWidth, itemHeight, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("Description", margin + 5, currentY + 7);
      doc.text("Qty", margin + contentWidth * 0.5, currentY + 7);
      doc.text("Rate", margin + contentWidth * 0.65, currentY + 7);
      doc.text("Amount", margin + contentWidth * 0.85, currentY + 7);
      
      currentY += itemHeight;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
    }
    
    // Alternate row background for better readability
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY, contentWidth, itemHeight, 'F');
    }
    
    // Draw row text
    doc.text(item.description, margin + 5, currentY + 7);
    doc.text(item.quantity.toString(), margin + contentWidth * 0.5, currentY + 7);
    doc.text(formatINR(item.rate).replace('₹', ''), margin + contentWidth * 0.65, currentY + 7);
    doc.text(formatINR(item.amount).replace('₹', ''), margin + contentWidth * 0.85, currentY + 7);
    
    currentY += itemHeight;
  });
  
  // Summary section
  const needNewPage = checkForNewPage(50); // Check if we need a new page for summary
  
  const summaryStartY = currentY + 10;
  const summaryWidth = contentWidth * 0.4;
  const summaryX = pageWidth - margin - summaryWidth;
  
  // Draw summary box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(summaryX, summaryStartY, summaryX + summaryWidth, summaryStartY);
  
  // Subtotal
  currentY = summaryStartY + 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  doc.text("Subtotal:", summaryX, currentY);
  doc.text(formatINR(invoice.subtotal || 0).replace('₹', ''), summaryX + summaryWidth - 25, currentY, { align: "right" });
  
  // Tax
  currentY += 7;
  doc.text(`Tax (${invoice.taxRate || 0}%):`, summaryX, currentY);
  doc.text(formatINR(invoice.taxAmount || 0).replace('₹', ''), summaryX + summaryWidth - 25, currentY, { align: "right" });
  
  // Divider
  currentY += 5;
  doc.setDrawColor(220, 220, 220);
  doc.line(summaryX, currentY, summaryX + summaryWidth, currentY);
  
  // Total
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(44, 62, 80);
  doc.text("Total:", summaryX, currentY);
  doc.text(formatINR(invoice.totalAmount).replace('₹', ''), summaryX + summaryWidth - 25, currentY, { align: "right" });
  
  // Notes
  if (invoice.notes) {
    currentY += 20;
    const notesNeedNewPage = checkForNewPage(30);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Notes:", margin, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(invoice.notes, margin, currentY + 7, { 
      maxWidth: contentWidth
    });
  }
  
  // Terms
  if (invoice.terms) {
    currentY += 30;
    const termsNeedNewPage = checkForNewPage(30);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Terms & Conditions:", margin, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(invoice.terms, margin, currentY + 7, {
      maxWidth: contentWidth
    });
  }
  
  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business", pageWidth / 2, pageHeight - 15, { align: "center" });
  
  // Save the PDF
  const filename = `Invoice_${invoice.invoiceNumber}_${formatDateForFilename()}.pdf`;
  doc.save(filename);
}

/**
 * Generates a PDF with multiple invoices
 * @param invoices - Array of invoice data to include in the PDF
 * @returns Promise that resolves when PDF generation is complete
 */
export async function generateBatchInvoicePDF(invoices: Invoice[]): Promise<void> {
  if (invoices.length === 0) {
    throw new Error("No invoices to export");
  }
  
  if (invoices.length === 1) {
    return generateInvoicePDF(invoices[0]);
  }
  
  // For multiple invoices, we'll create a document with invoice summaries
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80);
  doc.text(`Invoice Summary (${invoices.length} invoices)`, margin, margin);
  
  // Table headers
  const tableStartY = margin + 15;
  const rowHeight = 10;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableStartY, contentWidth, rowHeight, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Invoice #", margin + 5, tableStartY + 7);
  doc.text("Client", margin + 35, tableStartY + 7);
  doc.text("Date", margin + contentWidth * 0.5, tableStartY + 7);
  doc.text("Status", margin + contentWidth * 0.65, tableStartY + 7);
  doc.text("Amount", margin + contentWidth * 0.85, tableStartY + 7);
  
  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  
  let currentY = tableStartY + rowHeight;
  let totalAmount = 0;
  
  // Check if we need a new page - FIX: Added proper boolean return and variable to capture result
  const checkForNewPage = (height: number): boolean => {
    if (currentY + height > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      
      // Redraw header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("Invoice #", margin + 5, currentY + 7);
      doc.text("Client", margin + 35, currentY + 7);
      doc.text("Date", margin + contentWidth * 0.5, currentY + 7);
      doc.text("Status", margin + contentWidth * 0.65, currentY + 7);
      doc.text("Amount", margin + contentWidth * 0.85, currentY + 7);
      
      currentY += rowHeight;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      
      return true;
    }
    return false;
  };
  
  // Draw rows for each invoice
  invoices.forEach((invoice, index) => {
    const needNewPage = checkForNewPage(rowHeight);
    
    // Alternate row colors
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }
    
    // Status color
    const statusColor = invoice.status === 'Paid' ? [39, 174, 96] : 
                      invoice.status === 'Overdue' ? [231, 76, 60] : 
                      invoice.status === 'Unpaid' ? [243, 156, 18] : [149, 165, 166];
    
    // Draw row data
    doc.text(invoice.invoiceNumber, margin + 5, currentY + 7);
    
    // Truncate client name if too long
    const clientName = invoice.clientName.length > 25 
      ? invoice.clientName.substring(0, 22) + '...' 
      : invoice.clientName;
    doc.text(clientName, margin + 35, currentY + 7);
    
    doc.text(invoice.invoiceDate, margin + contentWidth * 0.5, currentY + 7);
    
    // Status with color
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(invoice.status, margin + contentWidth * 0.65, currentY + 7);
    doc.setTextColor(70, 70, 70); // Reset text color
    
    // Amount
    doc.text(formatINR(invoice.totalAmount).replace('₹', ''), margin + contentWidth * 0.85, currentY + 7);
    
    currentY += rowHeight;
    totalAmount += invoice.totalAmount;
  });
  
  // Summary footer
  const summaryNeedNewPage = checkForNewPage(20);
  
  currentY += 10;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Amount:", margin + contentWidth * 0.65, currentY);
  doc.text(formatINR(totalAmount).replace('₹', ''), margin + contentWidth * 0.85, currentY);
  
  // Save the PDF
  const filename = `Invoices_Summary_${formatDateForFilename()}.pdf`;
  doc.save(filename);
}

/**
 * Creates a PDF preview element that can be shown in a modal
 * @param invoice - The invoice data to preview
 * @returns HTML element containing the invoice preview
 */
export function createInvoicePreviewElement(invoice: Invoice): HTMLDivElement {
  const previewElement = document.createElement('div');
  previewElement.className = 'invoice-preview bg-white p-8 shadow-lg max-w-3xl mx-auto';
  
  // Company header
  previewElement.innerHTML = `
    <div class="text-xl font-bold text-blue-950">COMPANY NAME</div>
    <div class="text-gray-500 text-sm mb-6">
      123 Business Street, City, State, 12345<br/>
      Phone: +91 98765 43210 | Email: contact@company.com
    </div>
    
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-2xl font-bold text-blue-950">INVOICE #${invoice.invoiceNumber}</h1>
        <div class="text-gray-600 mt-2">
          <div>Invoice Date: ${invoice.invoiceDate}</div>
          <div>Due Date: ${invoice.dueDate}</div>
        </div>
      </div>
      <div class="status-badge ${
        invoice.status === 'Paid' ? 'bg-green-500' : 
        invoice.status === 'Overdue' ? 'bg-red-500' : 
        invoice.status === 'Unpaid' ? 'bg-yellow-500' : 'bg-gray-400'
      } text-white px-3 py-1 rounded-md">
        ${invoice.status}
      </div>
    </div>
    
    <div class="mb-8">
      <h2 class="font-bold text-blue-950 mb-2">Bill To:</h2>
      <div class="text-gray-700">${invoice.clientName}</div>
    </div>
  `;
  
  // Items table
  const tableElement = document.createElement('table');
  tableElement.className = 'w-full mb-8 border-collapse';
  
  // Table header
  tableElement.innerHTML = `
    <thead>
      <tr class="bg-gray-100">
        <th class="p-2 text-left border-b">Description</th>
        <th class="p-2 text-center border-b">Qty</th>
        <th class="p-2 text-right border-b">Rate</th>
        <th class="p-2 text-right border-b">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, i) => `
        <tr class="${i % 2 === 1 ? 'bg-gray-50' : ''}">
          <td class="p-2 border-b">${item.description}</td>
          <td class="p-2 text-center border-b">${item.quantity}</td>
          <td class="p-2 text-right border-b">${formatINR(item.rate)}</td>
          <td class="p-2 text-right border-b">${formatINR(item.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  
  previewElement.appendChild(tableElement);
  
  // Summary section
  const summaryElement = document.createElement('div');
  summaryElement.className = 'ml-auto w-1/2 mt-8';
  summaryElement.innerHTML = `
    <div class="flex justify-between py-2 border-t">
      <span>Subtotal:</span>
      <span>${formatINR(invoice.subtotal || 0)}</span>
    </div>
    <div class="flex justify-between py-2">
      <span>Tax (${invoice.taxRate || 0}%):</span>
      <span>${formatINR(invoice.taxAmount || 0)}</span>
    </div>
    <div class="flex justify-between py-2 font-bold border-t border-gray-400 text-blue-950">
      <span>Total:</span>
      <span>${formatINR(invoice.totalAmount)}</span>
    </div>
  `;
  
  previewElement.appendChild(summaryElement);
  
  // Notes & Terms
  if (invoice.notes || invoice.terms) {
    const notesElement = document.createElement('div');
    notesElement.className = 'mt-12 text-gray-700 text-sm';
    
    if (invoice.notes) {
      notesElement.innerHTML += `
        <div class="mb-4">
          <h3 class="font-bold mb-1">Notes:</h3>
          <p>${invoice.notes}</p>
        </div>
      `;
    }
    
    if (invoice.terms) {
      notesElement.innerHTML += `
        <div>
          <h3 class="font-bold mb-1">Terms & Conditions:</h3>
          <p>${invoice.terms}</p>
        </div>
      `;
    }
    
    previewElement.appendChild(notesElement);
  }
  
  // Footer
  const footerElement = document.createElement('div');
  footerElement.className = 'mt-12 text-center text-gray-500 text-sm';
  footerElement.textContent = 'Thank you for your business';
  
  previewElement.appendChild(footerElement);
  
  return previewElement;
}
