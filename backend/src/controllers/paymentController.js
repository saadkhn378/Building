import { query, getClient } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';
import { createReceipt } from '../services/receiptService.js';
import { getSignedFileUrl } from '../config/supabase.js';
import { formatINR } from '../utils/currency.js';

/**
 * Submit UPI Payment Proof (Owner Mobile App)
 */
export const submitProof = async (req, res) => {
  const { bill_id, amount_paise, payment_date, utr, screenshot_url, remarks } = req.body;
  const societyId = req.user.societyId;
  const userId = req.user.userId;

  if (!bill_id || !amount_paise || !utr || !screenshot_url) {
    return sendError(res, 'Bill ID, paid amount, UTR number, and screenshot proof are required.', 'VALIDATION_ERROR', [], 400);
  }

  const cleanUtr = utr.trim().toUpperCase();

  try {
    // 1. Verify bill exists and belongs to this member's flat
    const billRes = await query(
      `SELECT * FROM maintenance_bills WHERE id = $1 AND society_id = $2`,
      [bill_id, societyId]
    );

    if (!billRes.rows.length) {
      return sendError(res, 'Bill not found.', 'NOT_FOUND', [], 404);
    }

    const bill = billRes.rows[0];
    if (req.user.role === 'OWNER' && bill.flat_id !== req.user.flatId) {
      return sendError(res, 'Access denied. You can only submit payment for your own flat.', 'FORBIDDEN', [], 403);
    }

    // 2. Check duplicate UTR within this society
    const utrCheck = await query(
      `SELECT id, bill_id, status FROM payments WHERE society_id = $1 AND utr = $2`,
      [societyId, cleanUtr]
    );

    if (utrCheck.rows.length) {
      return sendError(
        res,
        'This transaction UTR has already been submitted for your society. Duplicate submissions are not allowed.',
        'DUPLICATE_UTR',
        [],
        409
      );
    }

    // 3. Insert payment record
    const insertRes = await query(
      `INSERT INTO payments 
        (society_id, bill_id, payer_id, payment_method, amount_paise, payment_date, utr, screenshot_url, remarks, status)
       VALUES ($1, $2, $3, 'UPI', $4, $5, $6, $7, $8, 'PENDING')
       RETURNING *`,
      [societyId, bill_id, userId, amount_paise, payment_date || new Date(), cleanUtr, screenshot_url, remarks || null]
    );

    const payment = insertRes.rows[0];

    // 4. Update bill status to VERIFICATION_PENDING
    await query(
      `UPDATE maintenance_bills SET status = 'VERIFICATION_PENDING', updated_at = NOW() WHERE id = $1`,
      [bill_id]
    );

    await logAudit({
      societyId,
      actorId: userId,
      action: 'PAYMENT_PROOF_SUBMITTED',
      entity: 'PAYMENT',
      entityId: payment.id,
      newValue: { utr: cleanUtr, amount_paise, bill_id },
      req,
    });

    return sendSuccess(res, payment, 'Payment proof submitted. Awaiting Chairman verification.', null, 201);
  } catch (err) {
    if (err.code === '23505') {
      return sendError(res, 'This transaction UTR has already been registered.', 'DUPLICATE_UTR', [], 409);
    }
    console.error('[Submit Proof Error]:', err);
    return sendError(res, 'Failed to submit payment proof.');
  }
};

/**
 * Verification Queue (Chairman Portal)
 */
export const listVerificationQueue = async (req, res) => {
  const societyId = req.user.societyId;

  try {
    const qRes = await query(
      `SELECT p.*, b.bill_number, b.billing_period_month, b.billing_period_year,
              b.total_amount_paise, b.paid_amount_paise,
              (b.total_amount_paise - b.paid_amount_paise) as balance_due_paise,
              f.flat_number, u.full_name as member_name, u.mobile as member_mobile
       FROM payments p
       JOIN maintenance_bills b ON p.bill_id = b.id
       JOIN flats f ON b.flat_id = f.id
       JOIN users u ON p.payer_id = u.id
       WHERE p.society_id = $1 AND p.status = 'PENDING' AND p.payment_method = 'UPI'
       ORDER BY p.created_at ASC`,
      [societyId]
    );

    // Compute signed URLs and amount matching
    const items = await Promise.all(
      qRes.rows.map(async (row) => {
        const isMatch = BigInt(row.amount_paise) === BigInt(row.balance_due_paise);
        const signedScreenshotUrl = await getSignedFileUrl(row.screenshot_url);
        return {
          ...row,
          isAmountMatch: isMatch,
          amountDifferencePaise: (BigInt(row.amount_paise) - BigInt(row.balance_due_paise)).toString(),
          signedScreenshotUrl,
        };
      })
    );

    return sendSuccess(res, items);
  } catch (err) {
    console.error('[Verification Queue Error]:', err);
    return sendError(res, 'Failed to fetch payment verification queue.');
  }
};

/**
 * Approve Payment (Chairman Portal)
 */
export const approvePayment = async (req, res) => {
  const { paymentId } = req.params;
  const societyId = req.user.societyId;
  const chairmanId = req.user.userId;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Fetch payment and associated bill
    const pRes = await client.query(
      `SELECT p.*, b.total_amount_paise, b.paid_amount_paise, b.flat_id, b.owner_id
       FROM payments p
       JOIN maintenance_bills b ON p.bill_id = b.id
       WHERE p.id = $1 AND p.society_id = $2 FOR UPDATE`,
      [paymentId, societyId]
    );

    if (!pRes.rows.length) {
      await client.query('ROLLBACK');
      return sendError(res, 'Payment record not found.', 'NOT_FOUND', [], 404);
    }

    const payment = pRes.rows[0];

    if (payment.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return sendError(res, `Payment is already marked ${payment.status}.`, 'INVALID_STATE', [], 400);
    }

    // 1. Mark payment as APPROVED
    await client.query(
      `UPDATE payments 
       SET status = 'APPROVED', verified_by = $1, verified_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [chairmanId, paymentId]
    );

    // 2. Financial calculation
    const paidPaise = BigInt(payment.amount_paise);
    const prevPaidPaise = BigInt(payment.paid_amount_paise);
    const totalPaise = BigInt(payment.total_amount_paise);

    const newTotalPaid = prevPaidPaise + paidPaise;
    let newStatus = 'PAID';

    if (newTotalPaid < totalPaise) {
      newStatus = 'PARTIALLY_PAID';
    } else if (newTotalPaid > totalPaise) {
      // Overpayment: store excess credit
      const excessCredit = newTotalPaid - totalPaise;
      await client.query(
        `INSERT INTO member_credits (society_id, user_id, flat_id, amount_paise)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (society_id, user_id, flat_id)
         DO UPDATE SET amount_paise = member_credits.amount_paise + $4, updated_at = NOW()`,
        [societyId, payment.owner_id, payment.flat_id, excessCredit.toString()]
      );
    }

    // 3. Update Bill status and total paid
    await client.query(
      `UPDATE maintenance_bills 
       SET paid_amount_paise = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newTotalPaid.toString(), newStatus, payment.bill_id]
    );

    await client.query('COMMIT');

    // 4. Generate official receipt record
    const receipt = await createReceipt(paymentId, societyId);

    // 5. Notify Member
    notifyUser({
      societyId,
      userId: payment.payer_id,
      title: 'Payment Approved',
      body: `Your payment of ${formatINR(paidPaise.toString())} has been approved. Receipt #${receipt.receipt_number} is now available.`,
      eventType: 'PAYMENT_APPROVED',
      entityId: paymentId,
    });

    await logAudit({
      societyId,
      actorId: chairmanId,
      action: 'PAYMENT_APPROVED',
      entity: 'PAYMENT',
      entityId: paymentId,
      newValue: { status: 'APPROVED', newTotalPaid: newTotalPaid.toString(), billStatus: newStatus },
      req,
    });

    return sendSuccess(res, { paymentId, receiptNumber: receipt.receipt_number, billStatus: newStatus }, 'Payment approved and receipt generated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Approve Payment Error]:', err);
    return sendError(res, 'Failed to approve payment.');
  } finally {
    client.release();
  }
};

/**
 * Reject Payment (Chairman Portal)
 */
export const rejectPayment = async (req, res) => {
  const { paymentId } = req.params;
  const { rejection_reason } = req.body;
  const societyId = req.user.societyId;
  const chairmanId = req.user.userId;

  if (!rejection_reason) {
    return sendError(res, 'A mandatory rejection reason must be provided.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const pRes = await query(
      `SELECT p.*, b.status as bill_status, b.paid_amount_paise, b.total_amount_paise
       FROM payments p
       JOIN maintenance_bills b ON p.bill_id = b.id
       WHERE p.id = $1 AND p.society_id = $2`,
      [paymentId, societyId]
    );

    if (!pRes.rows.length) return sendError(res, 'Payment not found.', 'NOT_FOUND', [], 404);

    const payment = pRes.rows[0];

    // Mark payment REJECTED
    await query(
      `UPDATE payments 
       SET status = 'REJECTED', rejection_reason = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [rejection_reason.trim(), chairmanId, paymentId]
    );

    // Revert bill status back to PENDING or PARTIALLY_PAID
    const revertedStatus = BigInt(payment.paid_amount_paise) > 0n ? 'PARTIALLY_PAID' : 'REJECTED';
    await query(
      `UPDATE maintenance_bills SET status = $1, updated_at = NOW() WHERE id = $2`,
      [revertedStatus, payment.bill_id]
    );

    // Notify Member
    notifyUser({
      societyId,
      userId: payment.payer_id,
      title: 'Payment Verification Rejected',
      body: `Your payment proof of ${formatINR(payment.amount_paise)} was rejected. Reason: ${rejection_reason}. Please re-submit your proof.`,
      eventType: 'PAYMENT_REJECTED',
      entityId: paymentId,
    });

    await logAudit({
      societyId,
      actorId: chairmanId,
      action: 'PAYMENT_REJECTED',
      entity: 'PAYMENT',
      entityId: paymentId,
      newValue: { reason: rejection_reason },
      req,
    });

    return sendSuccess(res, { paymentId, status: 'REJECTED' }, 'Payment rejected and member notified.');
  } catch (err) {
    console.error('[Reject Payment Error]:', err);
    return sendError(res, 'Failed to reject payment.');
  }
};
