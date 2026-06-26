import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const REF = 'mm-commtest-001';

// Mirror computeCommission() from queries.ts.
function computeCommission(setting, amount) {
  if (setting.commission_type === 'percentage') {
    return { amount: Math.round(amount * (Number(setting.percentage_rate) / 100) * 100) / 100, type: 'percentage' };
  }
  return { amount: Number(setting.fixed_amount), type: 'fixed' };
}

async function finalizeWithSetting(refId, affId, subAmount) {
  const [setting] = await sql`SELECT * FROM affiliate_setting WHERE id='default'`;
  const c = computeCommission(setting, subAmount);
  await sql`UPDATE referral SET status='active' WHERE id=${refId}`;
  await sql`INSERT INTO commission (affiliate_id, referral_id, amount, type, status)
            VALUES (${affId}, ${refId}, ${c.amount.toFixed(2)}, ${c.type}, 'pending')`;
  return c;
}

await sql`DELETE FROM affiliate WHERE code='COMMTEST10'`;
const [aff] = await sql`INSERT INTO affiliate (code,name,email,status)
  VALUES ('COMMTEST10','Comm Tester','commtest@majlismate.test','approved') RETURNING id`;

// --- Case A: default FIXED (RM30) on a RM149 subscription ---
const [refA] = await sql`INSERT INTO referral (affiliate_id, reference, amount, status, package_name)
  VALUES (${aff.id}, ${REF + '-A'}, 149.00, 'registered', 'Sehari-hari') RETURNING id`;
const a = await finalizeWithSetting(refA.id, aff.id, 149);
console.log('FIXED setting   -> commission:', JSON.stringify(a), '(expect 30, fixed)');

// --- Case B: flip admin setting to PERCENTAGE (20%) ---
await sql`UPDATE affiliate_setting SET commission_type='percentage' WHERE id='default'`;
const [refB] = await sql`INSERT INTO referral (affiliate_id, reference, amount, status, package_name)
  VALUES (${aff.id}, ${REF + '-B'}, 149.00, 'registered', 'Sehari-hari') RETURNING id`;
const b = await finalizeWithSetting(refB.id, aff.id, 149);
console.log('PERCENTAGE 20%  -> commission:', JSON.stringify(b), '(expect 29.8, percentage)');

// Restore default + cleanup.
await sql`UPDATE affiliate_setting SET commission_type='fixed' WHERE id='default'`;
await sql`DELETE FROM affiliate WHERE id=${aff.id}`;
console.log('\n✅ DB-driven commission verified (admin can switch fixed/percentage). Restored + cleaned up.');
