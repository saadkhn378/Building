import { query, getClient } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';
import { formatINR } from '../utils/currency.js';

export const getTemplates = async (req, res) => {
  try {
    const tRes = await query('SELECT * FROM bill_templates WHERE society_id = $1 ORDER BY name', [req.user.societyId]);
    return sendSuccess(res, tRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to fetch bill templates.');
  }
};

export const createTemplate = async (req, res) => {
  const { name, base_amount_paise, description } = req.body;
  if (!name || !base_amount_paise) {
    return sendError(res, 'Template name and base amount in paise are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const tRes = await query(
      `INSERT INTO bill_templates (society_id, name, base_amount_paise, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.societyId, name.trim(), base_amount_paise, description || null]
    );
    return sendSuccess(res, tRes.rows[0], 'Bill template created.', null, 201);
  } catch (err) {
    return sendError(res, 'Failed to create template.');
  }
};

/**
 * One-Click Monthly Batch Bill Generator
 */
export const generateMonthlyBills = async (req, res) => {
  const { month, year, due_date, base_amount_paise, additional_items } = req.body;
  const societyId = req.user.societyId;

  if (!month || !year || !due_date || !base_amount_paise) {
    return sendError(res, 'Month, year, due date, and base amount in paise are required.', 'VALIDATION_ERROR', [], 400);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Fetch all active flats in society with their registered owner
    const flatsRes = await client.query(
      `SELECT f.id as flat_id, f.flat_number, u.id as owner_id, u.full_name as owner_name, u.expo_push_token
       FROM flats f
       JOIN users u ON f.id = u.flat_id AND u.role = 'OWNER' AND u.is_active = TRUE
       WHERE f.society_id = $1 AND f.deleted_at IS NULL`,
      [societyId]
    );

    if (!flatsRes.rows.length) {
      await client.query('ROLLBACK');
      return sendError(res, 'No registered flat owners found in the society to bill.', 'NO_FLATS_FOUND', [], 400);
    }

    const createdBills = [];
    const skippedFlats = [];

    for (const flat of flatsRes.rows) {
      const billNumber = `BILL-${year}-${String(month).padStart(2, '0')}-${flat.flat_number}`;

      // Check if bill for this flat & period already exists
      const existing = await client.query(
        `SELECT id FROM maintenance_bills 
         WHERE society_id = $1 AND flat_id = $2 AND billing_period_month = $3 AND billing_period_year = $4`,
        [societyId, flat.flat_id, month, year]
      );

      if (existing.rows.length) {
        skippedFlats.push(flat.flat_number);
        continue;
      }

      // Check member credits (from overpayments)
      const creditRes = await client.query(
        `SELECT amount_paise FROM member_credits WHERE society_id = $1 AND user_id = $2 AND flat_id = $3`,
        [societyId, flat.owner_id, flat.flat_id]
      );
      let availableCredit = creditRes.rows[0]?.amount_paise || 0n;
      availableCredit = BigInt(availableCredit);

      let basePaise = BigInt(base_amount_paise);
      let additionalPaise = 0n;

      if (Array.isArray(additional_items)) {
        for (const item of additional_items) {
          additionalPaise += BigInt(item.amount_paise || 0);
        }
      }

      let grossPaise = basePaise + additionalPaise;
      let discountPaise = 0n;

      if (availableCredit > 0n) {
        if (availableCredit >= grossPaise) {
          discountPaise = grossPaise;
          const remainingCredit = availableCredit - grossPaise;
          await client.query(
            `UPDATE member_credits SET amount_paise = $1, updated_at = NOW() 
             WHERE society_id = $2 AND user_id = $3 AND flat_id = $4`,
            [remainingCredit.toString(), societyId, flat.owner_id, flat.flat_id]
          );
        } else {
          discountPaise = availableCredit;
          await client.query(
            `UPDATE member_credits SET amount_paise = 0, updated_at = NOW() 
             WHERE society_id = $1 AND user_id = $2 AND flat_id = $3`,
            [societyId, flat.owner_id, flat.flat_id]
          );
        }
      }

      const totalPaise = grossPaise - discountPaise;
      const initialStatus = totalPaise === 0n ? 'PAID' : 'PENDING';

      const billRes = await client.query(
        `INSERT INTO maintenance_bills 
          (society_id, flat_id, owner_id, bill_number, billing_period_month, billing_period_year,
           base_amount_paise, additional_charges_paise, late_fee_paise, discount_paise, total_amount_paise,
           paid_amount_paise, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          societyId,
          flat.flat_id,
          flat.owner_id,
          billNumber,
          month,
          year,
          basePaise.toString(),
          additionalPaise.toString(),
          discountPaise.toString(),
          totalPaise.toString(),
          totalPaise === 0n ? totalPaise.toString() : '0',
          due_date,
          initialStatus,
        ]
      );

      const bill = billRes.rows[0];

      // Insert base line item
      await client.query(
        `INSERT INTO bill_items (bill_id, title, amount_paise) VALUES ($1, $2, $3)`,
        [bill.id, `Standard Maintenance (${month}/${year})`, basePaise.toString()]
      );

      if (Array.isArray(additional_items)) {
        for (const item of additional_items) {
          if (item.title && item.amount_paise) {
            await client.query(
              `INSERT INTO bill_items (bill_id, title, amount_paise) VALUES ($1, $2, $3)`,
              [bill.id, item.title, item.amount_paise]
            );
          }
        }
      }

      createdBills.push(bill);

      // Async push notification
      notifyUser({
        societyId,
        userId: flat.owner_id,
        title: `Maintenance Bill Generated (${month}/${year})`,
        body: `Your maintenance bill for ${month}/${year} of ${formatINR(totalPaise.toString())} is generated. Due date: ${due_date}.`,
        eventType: 'BILL_GENERATED',
        entityId: bill.id,
      });
    }

    await client.query('COMMIT');

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'BATCH_BILLS_GENERATED',
      entity: 'BILLING',
      entityId: societyId,
      newValue: { count: createdBills.length, month, year },
      req,
    });

    return sendSuccess(res, {
      generatedCount: createdBills.length,
      skippedCount: skippedFlats.length,
      skippedFlats,
      bills: createdBills,
    }, `Batch bill generation complete. ${createdBills.length} bills created.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Generate Bills Error]:', err);
    return sendError(res, 'Failed to generate monthly bills.');
  } finally {
    client.release();
  }
};

/**
 * List Maintenance Bills (Role Scoped)
 */
export const listBills = async (req, res) => {
  const societyId = req.user.societyId;
  const { status, month, year, flat_id } = req.query;

  try {
    let whereClause = 'WHERE b.society_id = $1';
    const params = [societyId];

    if (req.user.role === 'OWNER') {
      params.push(req.user.flatId);
      whereClause += ` AND b.flat_id = $${params.length}`;
    } else if (flat_id) {
      params.push(flat_id);
      whereClause += ` AND b.flat_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND b.status = $${params.length}`;
    }
    if (month) {
      params.push(month);
      whereClause += ` AND b.billing_period_month = $${params.length}`;
    }
    if (year) {
      params.push(year);
      whereClause += ` AND b.billing_period_year = $${params.length}`;
    }

    const sql = `
      SELECT b.*, f.flat_number, u.full_name as owner_name, u.mobile as owner_mobile,
             r.id as receipt_id, r.receipt_number
      FROM maintenance_bills b
      JOIN flats f ON b.flat_id = f.id
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN payment_receipts r ON b.id = r.bill_id
      ${whereClause}
      ORDER BY b.billing_period_year DESC, b.billing_period_month DESC, f.flat_number ASC
    `;

    const bRes = await query(sql, params);
    return sendSuccess(res, bRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to list maintenance bills.');
  }
};

/**
 * Get Single Bill Details
 */
export const getBillById = async (req, res) => {
  const { id } = req.params;
  const societyId = req.user.societyId;

  try {
    const billRes = await query(
      `SELECT b.*, f.flat_number, u.full_name as owner_name, u.mobile as owner_mobile,
              s.name as society_name, s.upi_id, s.upi_qr_image_url
       FROM maintenance_bills b
       JOIN flats f ON b.flat_id = f.id
       JOIN users u ON b.owner_id = u.id
       JOIN societies s ON b.society_id = s.id
       WHERE b.id = $1 AND b.society_id = $2`,
      [id, societyId]
    );

    if (!billRes.rows.length) return sendError(res, 'Bill not found.', 'NOT_FOUND', [], 404);

    const bill = billRes.rows[0];

    // Enforce owner scope
    if (req.user.role === 'OWNER' && bill.flat_id !== req.user.flatId) {
      return sendError(res, 'Access denied.', 'FORBIDDEN', [], 403);
    }

    const itemsRes = await query('SELECT * FROM bill_items WHERE bill_id = $1', [id]);
    const paymentsRes = await query('SELECT * FROM payments WHERE bill_id = $1 ORDER BY created_at DESC', [id]);

    bill.items = itemsRes.rows;
    bill.payments = paymentsRes.rows;

    return sendSuccess(res, bill);
  } catch (err) {
    return sendError(res, 'Failed to fetch bill details.');
  }
};

/**
 * Cancel an Unpaid Bill (Chairman only)
 */
export const cancelBill = async (req, res) => {
  const { id } = req.params;
  const { cancellation_reason } = req.body;
  const societyId = req.user.societyId;

  if (!cancellation_reason) {
    return sendError(res, 'A mandatory cancellation reason must be provided.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const billRes = await query('SELECT * FROM maintenance_bills WHERE id = $1 AND society_id = $2', [id, societyId]);
    if (!billRes.rows.length) return sendError(res, 'Bill not found.', 'NOT_FOUND', [], 404);

    const bill = billRes.rows[0];

    // Cannot cancel if verified payment exists
    if (BigInt(bill.paid_amount_paise) > 0n || bill.status === 'PAID') {
      return sendError(
        res,
        'Cannot cancel a bill with verified payments. Use a credit adjustment instead.',
        'BILL_HAS_PAYMENTS',
        [],
        400
      );
    }

    const updateRes = await query(
      `UPDATE maintenance_bills 
       SET status = 'CANCELLED', cancellation_reason = $1, updated_at = NOW()
       WHERE id = $2 AND society_id = $3
       RETURNING *`,
      [cancellation_reason.trim(), id, societyId]
    );

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'BILL_CANCELLED',
      entity: 'MAINTENANCE_BILL',
      entityId: id,
      oldValue: { status: bill.status },
      newValue: { status: 'CANCELLED', reason: cancellation_reason },
      req,
    });

    return sendSuccess(res, updateRes.rows[0], 'Bill cancelled successfully.');
  } catch (err) {
    return sendError(res, 'Failed to cancel bill.');
  }
};
