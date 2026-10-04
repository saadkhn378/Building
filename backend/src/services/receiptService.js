import PDFDocument from 'pdfkit';
import { query } from '../config/db.js';
import { formatINR, paiseToRupees } from '../utils/currency.js';

/**
 * Generates an official payment receipt for an approved payment
 */
export const createReceipt = async (paymentId, societyId) => {
  // 1. Fetch full payment, bill, society, and user details
  const sql = `
    SELECT 
      p.id as payment_id,
      p.amount_paise,
      p.payment_method,
      p.payment_date,
      p.utr,
      p.created_at as payment_created_at,
      b.id as bill_id,
      b.bill_number,
      b.billing_period_month,
      b.billing_period_year,
      u.full_name as member_name,
      u.mobile as member_mobile,
      f.flat_number,
      s.name as society_name,
      s.address as society_address,
      s.city as society_city,
      s.registration_number as society_reg
    FROM payments p
    JOIN maintenance_bills b ON p.bill_id = b.id
    JOIN users u ON p.payer_id = u.id
    JOIN flats f ON b.flat_id = f.id
    JOIN societies s ON p.society_id = s.id
    WHERE p.id = $1 AND p.society_id = $2
  `;

  const res = await query(sql, [paymentId, societyId]);
  if (!res.rows.length) {
    throw new Error('Payment not found for receipt generation.');
  }

  const data = res.rows[0];
  const receiptNumber = `REC-${data.billing_period_year}-${data.payment_id.substring(0, 8).toUpperCase()}`;

  // Check if receipt already exists
  const existing = await query(
    'SELECT * FROM payment_receipts WHERE payment_id = $1',
    [paymentId]
  );
  if (existing.rows.length) {
    return existing.rows[0];
  }

  // Create receipt record
  const insertRes = await query(
    `INSERT INTO payment_receipts (society_id, payment_id, bill_id, receipt_number)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [societyId, paymentId, data.bill_id, receiptNumber]
  );

  return insertRes.rows[0];
};

/**
 * Builds PDF stream for a receipt
 */
export const generateReceiptPdfBuffer = (receiptData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header Banner
      doc.rect(0, 0, doc.page.width, 90).fill('#1E293B');
      doc.fillColor('#FFFFFF')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(receiptData.society_name || 'Society Maintenance Management', 50, 25);
      
      doc.fontSize(10)
        .font('Helvetica')
        .text(`${receiptData.society_address || ''} | Reg: ${receiptData.society_reg || 'N/A'}`, 50, 55);

      // Receipt Title & Number
      doc.fillColor('#0F172A')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('MAINTENANCE PAYMENT RECEIPT', 50, 120);

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(`Receipt Number: ${receiptData.receipt_number}`, 50, 142)
        .text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, 350, 142);

      // Divider Line
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, 165).lineTo(550, 165).stroke();

      // Member & Flat Details
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Billed To:', 50, 185);
      doc.font('Helvetica').fontSize(10).fillColor('#334155')
        .text(`Member Name: ${receiptData.member_name}`, 50, 205)
        .text(`Flat Number: ${receiptData.flat_number}`, 50, 222)
        .text(`Mobile: ${receiptData.member_mobile}`, 50, 239);

      // Payment Details Box
      doc.rect(340, 180, 210, 85).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Payment Summary', 355, 192);
      doc.font('Helvetica').fontSize(9).fillColor('#475569')
        .text(`Bill Ref: #${receiptData.bill_number}`, 355, 210)
        .text(`Period: ${receiptData.billing_period_month}/${receiptData.billing_period_year}`, 355, 225)
        .text(`Method: ${receiptData.payment_method}`, 355, 240)
        .text(`Ref/UTR: ${receiptData.utr || 'Cash Settlement'}`, 355, 255);

      // Itemized Table
      const tableTop = 290;
      doc.rect(50, tableTop, 500, 25).fill('#F1F5F9');
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(10)
        .text('Description', 65, tableTop + 7)
        .text('Amount (INR)', 430, tableTop + 7, { width: 100, align: 'right' });

      doc.font('Helvetica').fontSize(10).fillColor('#334155')
        .text(`Maintenance for Flat ${receiptData.flat_number} (${receiptData.billing_period_month}/${receiptData.billing_period_year})`, 65, tableTop + 35)
        .text(`₹${paiseToRupees(receiptData.amount_paise).toFixed(2)}`, 430, tableTop + 35, { width: 100, align: 'right' });

      // Total Row
      const totalTop = tableTop + 70;
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, totalTop).lineTo(550, totalTop).stroke();
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A')
        .text('Total Amount Paid:', 260, totalTop + 15)
        .fillColor('#16A34A')
        .text(`₹${paiseToRupees(receiptData.amount_paise).toFixed(2)}`, 430, totalTop + 15, { width: 100, align: 'right' });

      // Verification Badge & Footer
      doc.rect(50, totalTop + 60, 500, 45).fill('#F0FDF4');
      doc.fillColor('#15803D').font('Helvetica-Bold').fontSize(10)
        .text('STATUS: VERIFIED & SETTLED', 65, totalTop + 75);
      doc.font('Helvetica').fontSize(8).fillColor('#166534')
        .text('This is a computer-generated receipt issued by Society Administration. No physical signature is required.', 65, totalTop + 90);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
