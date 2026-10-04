import { query, getClient } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generate6DigitCode, getExpiryHours } from '../utils/otp.js';
import { logAudit } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';
import { createReceipt } from '../services/receiptService.js';
import { formatINR } from '../utils/currency.js';

/**
 * Initiate Cash Payment (Chairman Portal)
 * Generates 6-digit single-use OTP for verbal communication to member
 */
export const initiateCashPayment = async (req, res) => {
  const { bill_id, amount_paise, remarks } = req.body;
  const societyId = req.user.societyId;
  const chairmanId = req.user.userId;

  if (!bill_id || !amount_paise) {
    return sendError(res, 'Bill ID and amount in paise are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const billRes = await query(
      `SELECT b.*, u.id as owner_id, u.full_name as owner_name, u.mobile as owner_mobile, f.flat_number
       FROM maintenance_bills b
       JOIN users u ON b.owner_id = u.id
       JOIN flats f ON b.flat_id = f.id
       WHERE b.id = $1 AND b.society_id = $2`,
      [bill_id, societyId]
    );

    if (!billRes.rows.length) return sendError(res, 'Bill not found.', 'NOT_FOUND', [], 404);

    const bill = billRes.rows[0];
    const otp = generate6DigitCode();
    const expiresAt = getExpiryHours(24);

    const paymentRes = await query(
      `INSERT INTO payments 
        (society_id, bill_id, payer_id, payment_method, amount_paise, payment_date, remarks, 
         status, cash_otp, cash_otp_expires_at, cash_otp_attempts, verified_by)
       VALUES ($1, $2, $3, 'CASH', $4, CURRENT_DATE, $5, 'AWAITING_CONFIRMATION', $6, $7, 0, $8)
       RETURNING *`,
      [societyId, bill.id, bill.owner_id, amount_paise, remarks || null, otp, expiresAt, chairmanId]
    );

    const payment = paymentRes.rows[0];

    // Notify member via push
    notifyUser({
      societyId,
      userId: bill.owner_id,
      title: 'Confirm Cash Payment',
      body: `Chairman recorded a cash payment of ${formatINR(amount_paise)} for Flat ${bill.flat_number}. Please confirm in your app using the verbal OTP.`,
      eventType: 'CASH_OTP_PROMPT',
      entityId: payment.id,
    });

    await logAudit({
      societyId,
      actorId: chairmanId,
      action: 'CASH_PAYMENT_INITIATED',
      entity: 'PAYMENT',
      entityId: payment.id,
      newValue: { amount_paise, bill_id, expiresAt },
      req,
    });

    return sendSuccess(res, {
      paymentId: payment.id,
      cashOtp: otp,
      expiresAt,
      amountPaise: amount_paise,
      ownerName: bill.owner_name,
      flatNumber: bill.flat_number,
    }, 'Cash payment recorded. Tell this OTP verbally to the member to confirm.');
  } catch (err) {
    console.error('[Initiate Cash Payment Error]:', err);
    return sendError(res, 'Failed to initiate cash payment.');
  }
};

/**
 * Check Active Cash OTP Confirmation (Member Mobile App)
 */
export const getActiveCashPrompt = async (req, res) => {
  const userId = req.user.userId;
  const societyId = req.user.societyId;

  try {
    const resP = await query(
      `SELECT p.id, p.amount_paise, p.payment_date, p.cash_otp_expires_at,
              b.bill_number, b.billing_period_month, b.billing_period_year, f.flat_number
       FROM payments p
       JOIN maintenance_bills b ON p.bill_id = b.id
       JOIN flats f ON b.flat_id = f.id
       WHERE p.payer_id = $1 AND p.society_id = $2 
         AND p.payment_method = 'CASH' AND p.status = 'AWAITING_CONFIRMATION'
         AND p.cash_otp_expires_at > NOW()
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [userId, societyId]
    );

    if (!resP.rows.length) {
      return sendSuccess(res, null, 'No pending cash payment confirmation.');
    }

    return sendSuccess(res, resP.rows[0], 'Active cash payment confirmation required.');
  } catch (err) {
    return sendError(res, 'Failed to check active cash payments.');
  }
};

/**
 * Confirm Cash Payment (Member Mobile App)
 * Member inputs the verbal OTP provided by Chairman
 */
export const confirmCashPayment = async (req, res) => {
  const { payment_id, otp } = req.body;
  const userId = req.user.userId;
  const societyId = req.user.societyId;

  if (!payment_id || !otp) {
    return sendError(res, 'Payment ID and 6-digit confirmation OTP are required.', 'VALIDATION_ERROR', [], 400);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const pRes = await client.query(
      `SELECT p.*, b.total_amount_paise, b.paid_amount_paise, b.flat_id
       FROM payments p
       JOIN maintenance_bills b ON p.bill_id = b.id
       WHERE p.id = $1 AND p.payer_id = $2 AND p.society_id = $3 FOR UPDATE`,
      [payment_id, userId, societyId]
    );

    if (!pRes.rows.length) {
      await client.query('ROLLBACK');
      return sendError(res, 'Cash payment record not found.', 'NOT_FOUND', [], 404);
    }

    const payment = pRes.rows[0];

    if (payment.status !== 'AWAITING_CONFIRMATION') {
      await client.query('ROLLBACK');
      return sendError(res, `This payment is already in status ${payment.status}.`, 'INVALID_STATE', [], 400);
    }

    // Check expiration
    if (new Date() > new Date(payment.cash_otp_expires_at)) {
      await client.query('ROLLBACK');
      return sendError(res, 'Confirmation OTP has expired (24 hours). Please contact Chairman to re-issue.', 'OTP_EXPIRED', [], 400);
    }

    // Check attempt limits
    if (payment.cash_otp_attempts >= 5) {
      await client.query('ROLLBACK');
      return sendError(res, 'Too many incorrect attempts (5/5). OTP locked.', 'OTP_LOCKED', [], 400);
    }

    // Validate OTP match
    if (payment.cash_otp !== otp.toString().trim()) {
      await client.query(
        'UPDATE payments SET cash_otp_attempts = cash_otp_attempts + 1 WHERE id = $1',
        [payment.id]
      );
      await client.query('COMMIT');
      return sendError(res, `Incorrect OTP. Attempts remaining: ${4 - payment.cash_otp_attempts}.`, 'INVALID_OTP', [], 400);
    }

    // OTP is valid! Mark Approved
    await client.query(
      `UPDATE payments 
       SET status = 'APPROVED', verified_at = NOW(), cash_otp = NULL, updated_at = NOW()
       WHERE id = $1`,
      [payment.id]
    );

    // Update bill financial state
    const paidPaise = BigInt(payment.amount_paise);
    const prevPaidPaise = BigInt(payment.paid_amount_paise);
    const totalPaise = BigInt(payment.total_amount_paise);
    const newTotalPaid = prevPaidPaise + paidPaise;
    const newStatus = newTotalPaid >= totalPaise ? 'PAID' : 'PARTIALLY_PAID';

    await client.query(
      `UPDATE maintenance_bills 
       SET paid_amount_paise = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newTotalPaid.toString(), newStatus, payment.bill_id]
    );

    await client.query('COMMIT');

    // Create official receipt
    const receipt = await createReceipt(payment.id, societyId);

    await logAudit({
      societyId,
      actorId: userId,
      action: 'CASH_PAYMENT_CONFIRMED',
      entity: 'PAYMENT',
      entityId: payment.id,
      newValue: { receiptNumber: receipt.receipt_number, newTotalPaid: newTotalPaid.toString() },
      req,
    });

    return sendSuccess(res, {
      paymentId: payment.id,
      receiptNumber: receipt.receipt_number,
      status: 'APPROVED',
      billStatus: newStatus,
    }, 'Cash payment successfully confirmed! Your receipt has been generated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Confirm Cash Payment Error]:', err);
    return sendError(res, 'Failed to confirm cash payment.');
  } finally {
    client.release();
  }
};
