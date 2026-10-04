import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function seedDatabase() {
  console.log('[Seed] Seeding sample society, flats, chairman, and initial configuration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Society
    const socRes = await client.query(
      `INSERT INTO societies (name, registration_number, address, city, state, pincode, upi_id, currency, late_fee_type, late_fee_value, grace_period_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', 'PERCENTAGE', 500, 10)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        'Greenview Heights Housing Society',
        'BOM/HSG/2022/9482',
        'Plot 42, Sector 18, Palm Beach Road',
        'Mumbai',
        'Maharashtra',
        '400705',
        'greenview@upi',
      ]
    );

    let societyId;
    if (socRes.rows.length) {
      societyId = socRes.rows[0].id;
    } else {
      const existingSoc = await client.query('SELECT id FROM societies LIMIT 1');
      societyId = existingSoc.rows[0].id;
    }

    // 2. Chairman Account
    // Mobile: 9876543210, Password: Chairman@123
    const chairmanPassHash = await bcrypt.hash('Chairman@123', 10);
    await client.query(
      `INSERT INTO users (society_id, full_name, mobile, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'CHAIRMAN', TRUE)
       ON CONFLICT (society_id, mobile) 
       DO UPDATE SET password_hash = $5, role = 'CHAIRMAN', is_active = TRUE`,
      [
        societyId,
        'Dr. Anand Deshmukh (Chairman)',
        '9876543210',
        'chairman@greenview.org',
        chairmanPassHash,
      ]
    );

    // 3. Buildings & Wings
    const bldgRes = await client.query(
      `INSERT INTO buildings (society_id, name) VALUES ($1, 'Tower A') RETURNING id`,
      [societyId]
    );
    const buildingId = bldgRes.rows[0]?.id;

    let wingId;
    if (buildingId) {
      const wingRes = await client.query(
        `INSERT INTO wings (society_id, building_id, name) VALUES ($1, $2, 'Wing A') RETURNING id`,
        [societyId, buildingId]
      );
      wingId = wingRes.rows[0]?.id;
    }

    // 4. Sample Flats
    const flatNumbers = ['A-101', 'A-102', 'A-201', 'A-202'];
    const flatMap = {};

    for (const flatNum of flatNumbers) {
      const flatRes = await client.query(
        `INSERT INTO flats (society_id, flat_number, carpet_area_sqft, occupancy_status)
         VALUES ($1, $2, 950.00, 'OCCUPIED')
         ON CONFLICT (society_id, flat_number) DO UPDATE SET occupancy_status = 'OCCUPIED'
         RETURNING id`,
        [societyId, flatNum]
      );
      flatMap[flatNum] = flatRes.rows[0]?.id;
    }

    // 5. Sample Owner Account (Flat A-101)
    // Mobile: 9123456780, PIN: 1234
    if (flatMap['A-101']) {
      const ownerPinHash = await bcrypt.hash('1234', 10);
      await client.query(
        `INSERT INTO users (society_id, flat_id, full_name, mobile, email, pin_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 'OWNER', TRUE)
         ON CONFLICT (society_id, mobile)
         DO UPDATE SET pin_hash = $6, flat_id = $2, role = 'OWNER', is_active = TRUE`,
        [
          societyId,
          flatMap['A-101'],
          'Rajesh Sharma',
          '9123456780',
          'rajesh.sharma@example.com',
          ownerPinHash,
        ]
      );
    }

    // 6. Complaint Tags
    const tags = ['Plumbing', 'Electrical', 'Lift / Elevator', 'Water Supply', 'Cleanliness & Waste', 'Parking Issue', 'Other'];
    for (const tag of tags) {
      await client.query(
        `INSERT INTO complaint_tags (society_id, name) VALUES ($1, $2) ON CONFLICT (society_id, name) DO NOTHING`,
        [societyId, tag]
      );
    }

    // 7. Expense Categories
    const categories = ['Electricity (Common)', 'Water Supply', 'Housekeeping & Cleaning', 'Lift AMC', 'Security & Surveillance', 'Repairs & Maintenance', 'Garden & Landscaping', 'Miscellaneous'];
    for (const cat of categories) {
      await client.query(
        `INSERT INTO expense_categories (society_id, name) VALUES ($1, $2) ON CONFLICT (society_id, name) DO NOTHING`,
        [societyId, cat]
      );
    }

    // 8. Maintenance Bill Template (₹2,500 = 250000 paise)
    await client.query(
      `INSERT INTO bill_templates (society_id, name, base_amount_paise, description)
       VALUES ($1, 'Standard Monthly Maintenance', 250000, 'Standard 2BHK flat maintenance charge')`,
      [societyId]
    );

    // 9. Initial Financial Transparency Policy
    await client.query(
      `INSERT INTO financial_transparency_policies (society_id, visibility_level)
       VALUES ($1, 'SUMMARY')
       ON CONFLICT (society_id) DO NOTHING`,
      [societyId]
    );

    await client.query('COMMIT');
    console.log('[Seed] Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Credentials for Testing:');
    console.log('Chairman: Mobile: 9876543210 | Password: Chairman@123');
    console.log('Owner (Flat A-101): Mobile: 9123456780 | PIN: 1234');
    console.log('----------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed Error]:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
