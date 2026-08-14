import { jsPDF } from "jspdf";

export const generateOrderPDF = async (order: any) => {
  // 80mm width typical for thermal receipt printers
  const pageWidth = 80;
  
  // We do a single pass here assuming a standard height.
  // In production, we'd do a 2-pass approach to measure height like the legacy app.
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, 200] });
  let y = 10;
  const marginX = 4;

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TMOI RESTAURANT", pageWidth / 2, y, { align: "center" });
  y += 6;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Order Ticket", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Meta info
  doc.setFontSize(9);
  doc.text(`Order #: ${order.id}`, marginX, y);
  y += 5;
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, marginX, y);
  y += 5;
  doc.text(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`, marginX, y);
  y += 5;
  if (order.waiter) {
    doc.text(`Waiter: ${order.waiter.username || order.waiter.name || 'Unknown'}`, marginX, y);
    y += 5;
  }

  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // Items Header
  const colAmtX = pageWidth - marginX;
  const colRateX = colAmtX - 15;
  const colQtyX = colRateX - 10;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Item", marginX, y);
  doc.text("Qty", colQtyX, y, { align: "right" });
  doc.text("Rate", colRateX, y, { align: "right" });
  doc.text("Amt", colAmtX, y, { align: "right" });
  
  y += 3;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 4;

  // Items
  doc.setFont("helvetica", "normal");
  order.items.forEach((item: any) => {
    let name = item.name;
    if (name.length > 15) name = name.substring(0, 14) + "...";
    
    doc.text(name, marginX, y);
    doc.text(String(item.quantity), colQtyX, y, { align: "right" });
    doc.text(Number(item.rate).toFixed(2), colRateX, y, { align: "right" });
    doc.text(Number(item.amount).toFixed(2), colAmtX, y, { align: "right" });
    y += 5;
  });

  y += 2;
  doc.setLineDashPattern([], 0);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // Total
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", marginX, y);
  doc.text(`EUR ${Number(order.totalAmount).toFixed(2)}`, colAmtX, y, { align: "right" });

  y += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for dining with us!", pageWidth / 2, y, { align: "center" });

  return doc;
};

export const downloadOrderPDF = async (order: any) => {
  const doc = await generateOrderPDF(order);
  doc.save(`Order_${order.id}.pdf`);
};

export const printOrderPDF = async (order: any) => {
  const doc = await generateOrderPDF(order);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
