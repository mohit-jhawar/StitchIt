import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCurrency, formatDate } from '../../../../lib/utils';

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: { include: { service: true } },
        payments: true,
      },
    });

    if (!order) return new Response('Order not found', { status: 404 });

    // Authorization check
    if (locals.user.role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
      if (order.customerId !== profile?.id) return new Response('Forbidden', { status: 403 });
    } else if (locals.user.role === 'TAILOR') {
      const profile = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
      if (order.tailorId !== profile?.id) return new Response('Forbidden', { status: 403 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Header
    page.drawText('STITCHSHOP INVOICE', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.2, 0.2, 0.6) });
    page.drawText(`Order #: ${order.orderNumber}`, { x: 400, y: height - 50, size: 12, font });
    page.drawText(`Date: ${formatDate(order.createdAt)}`, { x: 400, y: height - 70, size: 12, font });

    // Customer Info
    page.drawText('Bill To:', { x: 50, y: height - 120, size: 12, font: boldFont });
    page.drawText(order.customer.name, { x: 50, y: height - 140, size: 12, font });
    if (order.customer.phone) page.drawText(order.customer.phone, { x: 50, y: height - 160, size: 12, font });

    // Items Header
    const tableTop = height - 220;
    page.drawRectangle({ x: 50, y: tableTop - 5, width: 500, height: 25, color: rgb(0.9, 0.9, 0.9) });
    page.drawText('Service', { x: 60, y: tableTop, size: 10, font: boldFont });
    page.drawText('Qty', { x: 300, y: tableTop, size: 10, font: boldFont });
    page.drawText('Price', { x: 380, y: tableTop, size: 10, font: boldFont });
    page.drawText('Total', { x: 480, y: tableTop, size: 10, font: boldFont });

    // Items
    let y = tableTop - 30;
    order.items.forEach((item) => {
      page.drawText(item.service.name, { x: 60, y, size: 10, font });
      page.drawText(item.quantity.toString(), { x: 300, y, size: 10, font });
      page.drawText(formatCurrency(item.unitPrice), { x: 380, y, size: 10, font });
      page.drawText(formatCurrency(item.unitPrice * item.quantity), { x: 480, y, size: 10, font });
      y -= 25;
    });

    // Summary
    const summaryY = y - 20;
    page.drawLine({ start: { x: 50, y: summaryY + 10 }, end: { x: 550, y: summaryY + 10 }, thickness: 1 });
    page.drawText('Total Amount:', { x: 380, y: summaryY, size: 12, font: boldFont });
    page.drawText(formatCurrency(order.totalAmount), { x: 480, y: summaryY, size: 12, font: boldFont });

    const advancePaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    page.drawText('Paid:', { x: 380, y: summaryY - 20, size: 10, font });
    page.drawText(formatCurrency(advancePaid), { x: 480, y: summaryY - 20, size: 10, font });

    const balance = Math.max(0, order.totalAmount - advancePaid);
    page.drawText('Balance Due:', { x: 380, y: summaryY - 40, size: 12, font: boldFont, color: rgb(0.8, 0, 0) });
    page.drawText(formatCurrency(balance), { x: 480, y: summaryY - 40, size: 12, font: boldFont, color: rgb(0.8, 0, 0) });

    // Footer
    page.drawText('Thank you for choosing StitchShop!', { x: 200, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${order.orderNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Invoice PDF error:', err);
    return new Response('Internal server error', { status: 500 });
  }
};
