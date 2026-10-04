import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generateReceiptPdfBuffer } from '../services/receiptService.js';

export const listReceipts = async (req, res) => {
  const societyId = req.user.societyId;

  try {
    let whereClause = 'WHERE r.society_id = $1';
    const params = [societyId];

    if (req.user.role === 'OWNER') {
      params.push(req.user.flatId);
      whereClause += ` AND b.flat_id = $${params.length}`;
    }

    const sql = `
      SELECT r.*, p.amount_paise, p.payment_method, p.payment_date, p.utr,
             b.bill_number, b.billing_period_month, b.billing_period_year,
             f.flat_number, u.full_name as member_name
      FROM payment_receipts r
      JOIN payments p ON r.payment_id = p.id
      JOIN maintenance_bills b ON r.bill_id = b.id
      JOIN flats f ON b.flat_id = f.id
      JOIN users u ON p.payer_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `;

    const rRes = await query(sql, params);
    return sendSuccess(res, rRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to list payment receipts.');
  }
};

export const downloadReceiptPdf = async (req, res) => {
  const { id } = req.params; // receipt_id or receipt_number
  const societyId = req.user.societyId;

  try {
    const sql = `
      SELECT r.*, p.amount_paise, p.payment_method, p.payment_date, p.utr,
             b.bill_number, b.billing_period_month, b.billing_period_year, b.flat_id,
             f.flat_number, u.full_name as member_name, u.mobile as member_mobile,
             s.name as society_name, s.address as society_address, s.registration_number as society_reg
      FROM payment_receipts r
      JOIN payments p ON r.payment_id = p.id
      JOIN maintenance_bills b ON r.bill_id = b.id
      JOIN flats f ON b.flat_id = f.id
      JOIN users u ON p.payer_id = u.id
      JOIN societies s ON r.society_id = s.id
      WHERE (r.id = $1 OR r.receipt_number = $1) AND r.society_id = $2
    `;

    const rRes = await query(sql, [id, societyId]);
    if (!rRes.rows.length) return sendError(res, 'Receipt not found.', 'NOT_FOUND', [], 404);

    const receipt = rRes.rows[0];

    // Check owner flat scope
    if (req.user.role === 'OWNER' && receipt.flat_id !== req.user.flatId) {
      return sendError(res, 'Access denied.', 'FORBIDDEN', [], 403);
    }

    const pdfBuffer = await generateReceiptPdfBuffer(receipt);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.receipt_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[Download Receipt Error]:', err);
    return sendError(res, 'Failed to generate receipt PDF.');
  }
};
