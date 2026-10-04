import { Router } from 'express';
import multer from 'multer';

// Middlewares
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

// Controllers
import * as authController from '../controllers/authController.js';
import * as societyController from '../controllers/societyController.js';
import * as ownerController from '../controllers/ownerController.js';
import * as billingController from '../controllers/billingController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as cashPaymentController from '../controllers/cashPaymentController.js';
import * as complaintController from '../controllers/complaintController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as announcementController from '../controllers/announcementController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as receiptController from '../controllers/receiptController.js';
import * as storageController from '../controllers/storageController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max upload
});

// ---------------------------------------------------------------------------
// 1. Health Endpoint (also used by free GitHub Actions keep-alive cron)
// ---------------------------------------------------------------------------
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 2. Authentication Routes
// ---------------------------------------------------------------------------
router.post('/auth/login-chairman', authController.loginChairman);
router.post('/auth/verify-invite', authController.verifyInvite);
router.post('/auth/set-pin', authController.setPin);
router.post('/auth/login-owner', authController.loginOwner);
router.post('/auth/refresh', authController.refreshToken);
router.get('/auth/me', authenticateToken, authController.getMe);

// ---------------------------------------------------------------------------
// 3. Society & Structure Routes
// ---------------------------------------------------------------------------
router.get('/society/me', authenticateToken, societyController.getSocietyDetails);
router.patch('/society/settings', authenticateToken, requireRole('CHAIRMAN'), societyController.updateSocietySettings);
router.get('/society/structure', authenticateToken, requireRole('CHAIRMAN'), societyController.getStructure);
router.post('/society/buildings', authenticateToken, requireRole('CHAIRMAN'), societyController.createBuilding);
router.post('/society/wings', authenticateToken, requireRole('CHAIRMAN'), societyController.createWing);
router.post('/society/flats', authenticateToken, requireRole('CHAIRMAN'), societyController.createFlat);
router.patch('/society/flats/:id', authenticateToken, requireRole('CHAIRMAN'), societyController.updateFlat);

// ---------------------------------------------------------------------------
// 4. Owner Management Routes
// ---------------------------------------------------------------------------
router.get('/owners', authenticateToken, requireRole('CHAIRMAN'), ownerController.listOwners);
router.post('/owners', authenticateToken, requireRole('CHAIRMAN'), ownerController.createOwner);
router.post('/owners/:id/regenerate-invite', authenticateToken, requireRole('CHAIRMAN'), ownerController.regenerateInviteCode);
router.patch('/owners/:id/deactivate', authenticateToken, requireRole('CHAIRMAN'), ownerController.deactivateOwner);
router.get('/owners/family-members', authenticateToken, ownerController.listFamilyMembers);
router.post('/owners/family-members', authenticateToken, ownerController.addFamilyMember);

// ---------------------------------------------------------------------------
// 5. Maintenance Billing Routes
// ---------------------------------------------------------------------------
router.get('/billing/templates', authenticateToken, requireRole('CHAIRMAN'), billingController.getTemplates);
router.post('/billing/templates', authenticateToken, requireRole('CHAIRMAN'), billingController.createTemplate);
router.post('/billing/generate-monthly', authenticateToken, requireRole('CHAIRMAN'), billingController.generateMonthlyBills);
router.get('/billing/bills', authenticateToken, billingController.listBills);
router.get('/billing/bills/:id', authenticateToken, billingController.getBillById);
router.post('/billing/bills/:id/cancel', authenticateToken, requireRole('CHAIRMAN'), billingController.cancelBill);

// ---------------------------------------------------------------------------
// 6. Payments & Verification Queue
// ---------------------------------------------------------------------------
router.post('/payments/submit-proof', authenticateToken, paymentController.submitProof);
router.get('/verification/queue', authenticateToken, requireRole('CHAIRMAN'), paymentController.listVerificationQueue);
router.post('/verification/:paymentId/approve', authenticateToken, requireRole('CHAIRMAN'), paymentController.approvePayment);
router.post('/verification/:paymentId/reject', authenticateToken, requireRole('CHAIRMAN'), paymentController.rejectPayment);

// ---------------------------------------------------------------------------
// 7. Cash Settlement Protocol (with Verbal OTP confirmation)
// ---------------------------------------------------------------------------
router.post('/cash-payments/initiate', authenticateToken, requireRole('CHAIRMAN'), cashPaymentController.initiateCashPayment);
router.get('/cash-payments/active-prompt', authenticateToken, cashPaymentController.getActiveCashPrompt);
router.post('/cash-payments/confirm', authenticateToken, cashPaymentController.confirmCashPayment);

// ---------------------------------------------------------------------------
// 8. Receipts
// ---------------------------------------------------------------------------
router.get('/receipts', authenticateToken, receiptController.listReceipts);
router.get('/receipts/:id/download', authenticateToken, receiptController.downloadReceiptPdf);

// ---------------------------------------------------------------------------
// 9. Complaints
// ---------------------------------------------------------------------------
router.get('/complaints/tags', authenticateToken, complaintController.listTags);
router.get('/complaints', authenticateToken, complaintController.listComplaints);
router.post('/complaints', authenticateToken, complaintController.createComplaint);
router.get('/complaints/:id', authenticateToken, complaintController.getComplaintThread);
router.post('/complaints/:id/messages', authenticateToken, complaintController.addComplaintMessage);
router.patch('/complaints/:id/status', authenticateToken, complaintController.updateComplaintStatus);

// ---------------------------------------------------------------------------
// 10. Expenses & Financial Transparency
// ---------------------------------------------------------------------------
router.get('/expenses/categories', authenticateToken, expenseController.listCategories);
router.get('/expenses/policy', authenticateToken, expenseController.getTransparencyPolicy);
router.patch('/expenses/policy', authenticateToken, requireRole('CHAIRMAN'), expenseController.updateTransparencyPolicy);
router.get('/expenses', authenticateToken, expenseController.listExpenses);
router.post('/expenses', authenticateToken, requireRole('CHAIRMAN'), expenseController.createExpense);

// ---------------------------------------------------------------------------
// 11. Announcements
// ---------------------------------------------------------------------------
router.get('/announcements', authenticateToken, announcementController.listAnnouncements);
router.post('/announcements', authenticateToken, requireRole('CHAIRMAN'), announcementController.createAnnouncement);

// ---------------------------------------------------------------------------
// 12. Dashboard & Audit Logs
// ---------------------------------------------------------------------------
router.get('/dashboard/chairman', authenticateToken, requireRole('CHAIRMAN'), dashboardController.getChairmanDashboard);
router.get('/dashboard/member', authenticateToken, dashboardController.getMemberDashboard);
router.get('/dashboard/audit-logs', authenticateToken, requireRole('CHAIRMAN'), dashboardController.listAuditLogs);

// ---------------------------------------------------------------------------
// 13. File Storage
// ---------------------------------------------------------------------------
router.post('/storage/upload', authenticateToken, upload.single('file'), storageController.uploadFile);
router.get('/storage/signed-url', authenticateToken, storageController.getSignedUrl);

export default router;
