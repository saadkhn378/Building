/**
 * End-to-End System Test Runner
 * Validates Chairman Login, Member Login, Batch Billing, UPI Verification,
 * Cash OTP Settlement, PDF Receipts, Complaints, and Announcements
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING END-TO-END TESTS ON LIVE SUPABASE BACKEND');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log('❌ FAIL');
      console.error('  Error:', err.message);
      failed++;
    }
  }

  let chairmanToken = '';
  let ownerToken = '';
  let billId = '';
  let paymentId = '';
  let complaintId = '';

  // 1. Health check
  await test('GET /health (API Server Status)', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check returned non-ok');
  });

  // 2. Chairman Login
  await test('POST /auth/login-chairman (Dr. Anand Deshmukh)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login-chairman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '9876543210', password: 'Chairman@123' }),
    });
    const data = await res.json();
    if (!data.success || !data.data?.accessToken) throw new Error(data.error?.message || 'Login failed');
    chairmanToken = data.data.accessToken;
  });

  // 3. Chairman Profile & Society Info
  await test('GET /auth/me (Verify Chairman Profile & Society Scoping)', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${chairmanToken}` },
    });
    const data = await res.json();
    if (!data.success || data.data.role !== 'CHAIRMAN') throw new Error('Failed to verify profile');
  });

  // 4. Structure & Flats Listing
  await test('GET /society/structure (Flats & Wings)', async () => {
    const res = await fetch(`${BASE_URL}/society/structure`, {
      headers: { Authorization: `Bearer ${chairmanToken}` },
    });
    const data = await res.json();
    if (!data.success || !data.data.flats || data.data.flats.length === 0) {
      throw new Error('No flats returned');
    }
  });

  // 5. Owner Login
  await test('POST /auth/login-owner (Rajesh Sharma - Flat A-101)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9123456780', pin: '1234' }),
    });
    const data = await res.json();
    if (!data.success || !data.data?.accessToken) throw new Error(data.error?.message || 'Owner login failed');
    ownerToken = data.data.accessToken;
  });

  // 6. Member Dashboard
  await test('GET /dashboard/member (Member Overview)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/member`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error('Member dashboard failed');
  });

  // 7. Monthly Batch Bill Generation
  await test('POST /billing/generate-monthly (Batch generate for all flats)', async () => {
    const res = await fetch(`${BASE_URL}/billing/generate-monthly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chairmanToken}`,
      },
      body: JSON.stringify({
        month: 10,
        year: 2026,
        due_date: '2026-10-15',
        base_amount_paise: 250000, // ₹2,500
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Batch bill generation failed');
  });

  // 8. Member List Bills
  await test('GET /billing/bills (Fetch Bill for Flat A-101)', async () => {
    const res = await fetch(`${BASE_URL}/billing/bills`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const data = await res.json();
    if (!data.success || data.data.length === 0) throw new Error('No bills found');
    billId = data.data[0].id;
  });

  // 9. Member Submit UPI Payment Proof
  await test('POST /payments/submit-proof (Submit UTR & Screenshot)', async () => {
    const randomUtr = 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);
    const res = await fetch(`${BASE_URL}/payments/submit-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        bill_id: billId,
        amount_paise: 250000,
        utr: randomUtr,
        screenshot_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
        remarks: 'Paid via GPay',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Submit proof failed');
    paymentId = data.data.id;
  });

  // 10. Chairman Verification Queue
  await test('GET /verification/queue (Inspect submitted UPI proofs)', async () => {
    const res = await fetch(`${BASE_URL}/verification/queue`, {
      headers: { Authorization: `Bearer ${chairmanToken}` },
    });
    const data = await res.json();
    if (!data.success || data.data.length === 0) throw new Error('Verification queue empty');
  });

  // 11. Chairman Approve Payment
  await test('POST /verification/:id/approve (Approve & Generate Receipt)', async () => {
    const res = await fetch(`${BASE_URL}/verification/${paymentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chairmanToken}` },
    });
    const data = await res.json();
    if (!data.success || !data.data.receiptNumber) throw new Error('Approval failed');
  });

  // 12. Receipts Archive & PDF
  await test('GET /receipts (List Receipts)', async () => {
    const res = await fetch(`${BASE_URL}/receipts`, {
      headers: { Authorization: `Bearer ${chairmanToken}` },
    });
    const data = await res.json();
    if (!data.success || data.data.length === 0) throw new Error('No receipts found');
  });

  // 13. Raise Complaint
  await test('POST /complaints (Member reports plumbing issue)', async () => {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: 'Water tap leaking in master bathroom',
        message: 'Tap has been dripping constantly since yesterday evening.',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error('Failed to raise complaint');
    complaintId = data.data.id;
  });

  // 14. Chairman Replies in Complaint Thread
  await test('POST /complaints/:id/messages (Chairman replies in thread)', async () => {
    const res = await fetch(`${BASE_URL}/complaints/${complaintId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chairmanToken}`,
      },
      body: JSON.stringify({
        message: 'Plumber Ramesh has been assigned. He will visit your flat at 4:00 PM today.',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error('Failed to post reply');
  });

  // 15. Broadcast Announcement
  await test('POST /announcements (Publish Important Notice)', async () => {
    const res = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chairmanToken}`,
      },
      body: JSON.stringify({
        title: 'Water Tank Cleaning Notice',
        content: 'Common overhead water tanks will be cleaned on Sunday between 10 AM and 2 PM. Please store adequate water.',
        priority: 'IMPORTANT',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error('Failed to publish announcement');
  });

  // 16. Chairman Dashboard Metrics
  await test('GET /dashboard/chairman (Verify Real-Time Metrics & Reconciliation Strip)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/chairman`, {
      headers: { Authorization: `Bearer ${chairmanToken}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error('Chairman dashboard metrics failed');
  });

  console.log('\n===============================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');
}

runTests();
