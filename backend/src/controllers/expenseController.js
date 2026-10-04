import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';
import { getSignedFileUrl } from '../config/supabase.js';

export const listCategories = async (req, res) => {
  try {
    const cRes = await query('SELECT * FROM expense_categories WHERE society_id = $1 ORDER BY name', [req.user.societyId]);
    return sendSuccess(res, cRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to fetch expense categories.');
  }
};

export const getTransparencyPolicy = async (req, res) => {
  const societyId = req.user.societyId;
  try {
    const pRes = await query(
      `SELECT visibility_level FROM financial_transparency_policies WHERE society_id = $1`,
      [societyId]
    );
    const level = pRes.rows[0]?.visibility_level || 'SUMMARY';
    return sendSuccess(res, { visibilityLevel: level });
  } catch (err) {
    return sendError(res, 'Failed to fetch transparency policy.');
  }
};

export const updateTransparencyPolicy = async (req, res) => {
  const { visibility_level } = req.body;
  const societyId = req.user.societyId;

  if (!['PRIVATE', 'SUMMARY', 'DETAILED'].includes(visibility_level)) {
    return sendError(res, "Visibility level must be 'PRIVATE', 'SUMMARY', or 'DETAILED'.", 'VALIDATION_ERROR', [], 400);
  }

  try {
    const pRes = await query(
      `INSERT INTO financial_transparency_policies (society_id, visibility_level)
       VALUES ($1, $2)
       ON CONFLICT (society_id)
       DO UPDATE SET visibility_level = $2, updated_at = NOW()
       RETURNING *`,
      [societyId, visibility_level]
    );

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'TRANSPARENCY_POLICY_UPDATED',
      entity: 'POLICY',
      entityId: pRes.rows[0].id,
      newValue: { visibilityLevel: visibility_level },
      req,
    });

    return sendSuccess(res, pRes.rows[0], 'Financial transparency policy updated.');
  } catch (err) {
    return sendError(res, 'Failed to update transparency policy.');
  }
};

export const createExpense = async (req, res) => {
  const { category_id, title, description, amount_paise, expense_date, vendor_name, invoice_number, payment_method, attachment_url } = req.body;
  const societyId = req.user.societyId;
  const userId = req.user.userId;

  if (!category_id || !title || !amount_paise || !expense_date) {
    return sendError(res, 'Category, title, amount in paise, and expense date are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const expRes = await query(
      `INSERT INTO expenses 
        (society_id, category_id, title, description, amount_paise, expense_date, vendor_name, invoice_number, payment_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [societyId, category_id, title.trim(), description || null, amount_paise, expense_date, vendor_name || null, invoice_number || null, payment_method || 'BANK_TRANSFER', userId]
    );

    const expense = expRes.rows[0];

    if (attachment_url) {
      await query(
        `INSERT INTO expense_attachments (expense_id, file_url) VALUES ($1, $2)`,
        [expense.id, attachment_url]
      );
    }

    await logAudit({
      societyId,
      actorId: userId,
      action: 'EXPENSE_RECORDED',
      entity: 'EXPENSE',
      entityId: expense.id,
      newValue: { title, amount_paise, vendor_name },
      req,
    });

    return sendSuccess(res, expense, 'Expense recorded successfully.', null, 201);
  } catch (err) {
    return sendError(res, 'Failed to record expense.');
  }
};

export const listExpenses = async (req, res) => {
  const societyId = req.user.societyId;

  try {
    // If Owner, check visibility policy
    if (req.user.role === 'OWNER') {
      const pRes = await query(
        `SELECT visibility_level FROM financial_transparency_policies WHERE society_id = $1`,
        [societyId]
      );
      const level = pRes.rows[0]?.visibility_level || 'SUMMARY';

      if (level === 'PRIVATE') {
        return sendSuccess(res, { policy: 'PRIVATE', expenses: [], summary: [] }, 'Finances are currently set to private by society administration.');
      }

      if (level === 'SUMMARY') {
        // Return only monthly & category totals
        const summary = await query(
          `SELECT c.name as category, SUM(e.amount_paise) as total_paise, COUNT(e.id) as count
           FROM expenses e
           JOIN expense_categories c ON e.category_id = c.id
           WHERE e.society_id = $1
           GROUP BY c.name`,
          [societyId]
        );
        return sendSuccess(res, { policy: 'SUMMARY', summary: summary.rows, expenses: [] });
      }
    }

    // Full detailed list for Chairman or DETAILED policy for members
    const expRes = await query(
      `SELECT e.*, c.name as category_name, u.full_name as recorded_by_name,
              a.file_url as attachment_url
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       JOIN users u ON e.created_by = u.id
       LEFT JOIN expense_attachments a ON e.id = a.expense_id
       WHERE e.society_id = $1
       ORDER BY e.expense_date DESC`,
      [societyId]
    );

    const items = await Promise.all(
      expRes.rows.map(async (row) => {
        let signedUrl = null;
        if (row.attachment_url) {
          signedUrl = await getSignedFileUrl(row.attachment_url);
        }
        return {
          ...row,
          signedAttachmentUrl: signedUrl,
        };
      })
    );

    return sendSuccess(res, { policy: 'DETAILED', expenses: items });
  } catch (err) {
    return sendError(res, 'Failed to list expenses.');
  }
};
