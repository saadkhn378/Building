import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Chairman Overview Dashboard & Daily Reconciliation Strip
 */
export const getChairmanDashboard = async (req, res) => {
  const societyId = req.user.societyId;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  try {
    // 1. Total Collections (All time approved payments)
    const collectionsRes = await query(
      `SELECT COALESCE(SUM(amount_paise), 0) as total_collected_paise 
       FROM payments 
       WHERE society_id = $1 AND status = 'APPROVED'`,
      [societyId]
    );
    const totalCollected = BigInt(collectionsRes.rows[0].total_collected_paise);

    // 2. Total Expenses (All time)
    const expensesRes = await query(
      `SELECT COALESCE(SUM(amount_paise), 0) as total_expenses_paise 
       FROM expenses 
       WHERE society_id = $1`,
      [societyId]
    );
    const totalExpenses = BigInt(expensesRes.rows[0].total_expenses_paise);

    // Fund Balance
    const fundBalancePaise = (totalCollected - totalExpenses).toString();

    // 3. This Month Collection
    const monthCollectionRes = await query(
      `SELECT COALESCE(SUM(amount_paise), 0) as month_collected_paise
       FROM payments
       WHERE society_id = $1 AND status = 'APPROVED'
         AND EXTRACT(MONTH FROM payment_date) = $2 AND EXTRACT(YEAR FROM payment_date) = $3`,
      [societyId, currentMonth, currentYear]
    );

    // 4. This Month Expenses
    const monthExpensesRes = await query(
      `SELECT COALESCE(SUM(amount_paise), 0) as month_expenses_paise
       FROM expenses
       WHERE society_id = $1
         AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
      [societyId, currentMonth, currentYear]
    );

    // 5. Pending & Overdue Dues
    const duesRes = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE AND status IN ('PENDING', 'PARTIALLY_PAID', 'VERIFICATION_PENDING') THEN (total_amount_paise - paid_amount_paise) ELSE 0 END), 0) as pending_dues_paise,
         COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status IN ('PENDING', 'PARTIALLY_PAID', 'VERIFICATION_PENDING', 'OVERDUE') THEN (total_amount_paise - paid_amount_paise) ELSE 0 END), 0) as overdue_dues_paise
       FROM maintenance_bills
       WHERE society_id = $1 AND status NOT IN ('PAID', 'CANCELLED', 'DRAFT')`,
      [societyId]
    );

    // 6. Defaulters List (Unpaid for 3+ months)
    const defaultersRes = await query(
      `SELECT f.flat_number, u.full_name as owner_name, u.mobile as owner_mobile,
              COUNT(b.id) as unpaid_months,
              SUM(b.total_amount_paise - b.paid_amount_paise) as total_due_paise
       FROM maintenance_bills b
       JOIN flats f ON b.flat_id = f.id
       JOIN users u ON b.owner_id = u.id
       WHERE b.society_id = $1 AND b.status IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE', 'REJECTED')
         AND b.due_date < CURRENT_DATE - INTERVAL '60 days'
       GROUP BY f.flat_number, u.full_name, u.mobile
       HAVING COUNT(b.id) >= 2
       ORDER BY total_due_paise DESC`,
      [societyId]
    );

    // 7. Verification Queue & Open Complaints Count
    const queueCountRes = await query(
      `SELECT COUNT(*) as count FROM payments WHERE society_id = $1 AND status = 'PENDING' AND payment_method = 'UPI'`,
      [societyId]
    );
    const complaintsCountRes = await query(
      `SELECT COUNT(*) as count FROM complaints WHERE society_id = $1 AND status IN ('OPEN', 'REOPENED')`,
      [societyId]
    );

    // 8. Daily Reconciliation Strip (Today)
    const dailyStripRes = await query(
      `SELECT 
         COUNT(CASE WHEN payment_date = CURRENT_DATE THEN 1 END) as submitted_today,
         COUNT(CASE WHEN status = 'APPROVED' AND verified_at::date = CURRENT_DATE THEN 1 END) as verified_today,
         COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_verification,
         COALESCE(SUM(CASE WHEN status = 'APPROVED' AND verified_at::date = CURRENT_DATE THEN amount_paise ELSE 0 END), 0) as collected_today_paise
       FROM payments
       WHERE society_id = $1`,
      [societyId]
    );

    // 9. Last 6 Months Chart Data
    const chartRes = await query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
           date_trunc('month', CURRENT_DATE),
           '1 month'::interval
         )::date as m
       )
       SELECT 
         to_char(months.m, 'Mon YYYY') as month_label,
         COALESCE(SUM(p.amount_paise), 0) as collection_paise,
         COALESCE((
           SELECT SUM(e.amount_paise) FROM expenses e 
           WHERE e.society_id = $1 AND date_trunc('month', e.expense_date) = months.m
         ), 0) as expense_paise
       FROM months
       LEFT JOIN payments p ON date_trunc('month', p.payment_date) = months.m 
                            AND p.society_id = $1 AND p.status = 'APPROVED'
       GROUP BY months.m
       ORDER BY months.m ASC`,
      [societyId]
    );

    return sendSuccess(res, {
      fundBalancePaise,
      totalCollectedPaise: totalCollected.toString(),
      totalExpensesPaise: totalExpenses.toString(),
      monthCollectionPaise: monthCollectionRes.rows[0].month_collected_paise,
      monthExpensesPaise: monthExpensesRes.rows[0].month_expenses_paise,
      pendingDuesPaise: duesRes.rows[0].pending_dues_paise,
      overdueDuesPaise: duesRes.rows[0].overdue_dues_paise,
      pendingVerificationCount: parseInt(queueCountRes.rows[0].count),
      openComplaintsCount: parseInt(complaintsCountRes.rows[0].count),
      defaulterCount: defaultersRes.rows.length,
      defaulters: defaultersRes.rows,
      dailyStrip: dailyStripRes.rows[0],
      trendChart: chartRes.rows,
    });
  } catch (err) {
    console.error('[Chairman Dashboard Error]:', err);
    return sendError(res, 'Failed to fetch Chairman dashboard metrics.');
  }
};

/**
 * Member Home Dashboard Data
 */
export const getMemberDashboard = async (req, res) => {
  const societyId = req.user.societyId;
  const flatId = req.user.flatId;
  const userId = req.user.userId;

  try {
    // 1. Current Pending Bill
    const billRes = await query(
      `SELECT * FROM maintenance_bills 
       WHERE society_id = $1 AND flat_id = $2 AND status NOT IN ('PAID', 'CANCELLED', 'DRAFT')
       ORDER BY due_date ASC
       LIMIT 1`,
      [societyId, flatId]
    );

    // 2. Total Outstanding Balance
    const totalDueRes = await query(
      `SELECT COALESCE(SUM(total_amount_paise - paid_amount_paise), 0) as total_balance_due_paise,
              COUNT(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' THEN 1 END) as overdue_cycles
       FROM maintenance_bills
       WHERE society_id = $1 AND flat_id = $2 AND status NOT IN ('PAID', 'CANCELLED', 'DRAFT')`,
      [societyId, flatId]
    );

    const isDefaulter = parseInt(totalDueRes.rows[0].overdue_cycles) >= 2;

    // 3. Open Complaints Count
    const cCountRes = await query(
      `SELECT COUNT(*) as count FROM complaints WHERE flat_id = $1 AND status IN ('OPEN', 'REOPENED')`,
      [flatId]
    );

    // 4. Recent Announcements (Last 3)
    const announcementsRes = await query(
      `SELECT * FROM announcements 
       WHERE society_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY CASE WHEN priority = 'EMERGENCY' THEN 1 WHEN priority = 'IMPORTANT' THEN 2 ELSE 3 END, created_at DESC
       LIMIT 3`,
      [societyId]
    );

    // 5. Active Cash OTP confirmation prompt
    const cashPromptRes = await query(
      `SELECT p.id, p.amount_paise, p.cash_otp_expires_at 
       FROM payments p
       WHERE p.payer_id = $1 AND p.status = 'AWAITING_CONFIRMATION' AND p.cash_otp_expires_at > NOW()
       LIMIT 1`,
      [userId]
    );

    return sendSuccess(res, {
      currentBill: billRes.rows[0] || null,
      totalBalanceDuePaise: totalDueRes.rows[0].total_balance_due_paise,
      isDefaulter,
      openComplaintsCount: parseInt(cCountRes.rows[0].count),
      recentAnnouncements: announcementsRes.rows,
      pendingCashPayment: cashPromptRes.rows[0] || null,
    });
  } catch (err) {
    console.error('[Member Dashboard Error]:', err);
    return sendError(res, 'Failed to fetch member dashboard data.');
  }
};

/**
 * Audit Logs Listing (Chairman Portal)
 */
export const listAuditLogs = async (req, res) => {
  const societyId = req.user.societyId;
  const { limit = 50 } = req.query;

  try {
    const logsRes = await query(
      `SELECT l.*, u.full_name as actor_name, u.role as actor_role
       FROM audit_logs l
       LEFT JOIN users u ON l.actor_id = u.id
       WHERE l.society_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2`,
      [societyId, Math.min(parseInt(limit), 200)]
    );
    return sendSuccess(res, logsRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to list audit logs.');
  }
};
