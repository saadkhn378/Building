import bcrypt from 'bcryptjs';
import { query } from './config/db.js';

async function updateAllChairmen() {
  const newHash = await bcrypt.hash('Chairman@123', 10);
  const updateRes = await query("UPDATE users SET password_hash = $1 WHERE role = 'CHAIRMAN'", [newHash]);
  console.log('Updated rows:', updateRes.rowCount);
  process.exit(0);
}

updateAllChairmen();
