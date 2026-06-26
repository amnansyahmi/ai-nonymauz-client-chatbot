import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Seed: affiliate + referral(active) + commission(approved) + payout.
await sql`DELETE FROM affiliate WHERE code='ADMINTEST10'`;
const [a] = await sql`INSERT INTO affiliate (code,name,email,status,bank_name,bank_account)
  VALUES ('ADMINTEST10','Admin Test','admintest@majlismate.test','approved','Maybank','1234567890') RETURNING id`;
const [r] = await sql`INSERT INTO referral (affiliate_id,reference,customer_name,customer_email,package_name,amount,status)
  VALUES (${a.id},'mm-admintest-1','Buyer One','b1@example.com','Sehari-hari',149.00,'active') RETURNING id`;
await sql`INSERT INTO commission (affiliate_id,referral_id,amount,type,status) VALUES (${a.id},${r.id},30.00,'fixed','approved')`;

const results = {};

// getAdminDashboard
results.dashboard = (await sql`SELECT
  (SELECT count(*) FROM affiliate)::int AS total_affiliates,
  (SELECT coalesce(sum(amount),0) FROM referral WHERE status='active')::float AS revenue,
  (SELECT coalesce(sum(amount),0) FROM commission WHERE status IN ('pending','approved'))::float AS liability`)[0];

// listAffiliates
results.affiliates = (await sql`SELECT a.code,
  (SELECT count(*) FROM referral r WHERE r.affiliate_id=a.id)::int AS users,
  (SELECT coalesce(sum(amount),0) FROM commission c WHERE c.affiliate_id=a.id)::float AS commission
  FROM affiliate a WHERE a.id=${a.id}`)[0];

// listCommissions (join)
results.commissions = (await sql`SELECT c.amount, a.code AS affiliate_code, r.customer_name
  FROM commission c JOIN affiliate a ON a.id=c.affiliate_id LEFT JOIN referral r ON r.id=c.referral_id
  WHERE c.affiliate_id=${a.id}`)[0];

// getPayableAffiliates (group by)
results.payable = (await sql`SELECT a.code, coalesce(sum(c.amount),0)::float AS owed, count(c.id)::int AS n
  FROM affiliate a JOIN commission c ON c.affiliate_id=a.id AND c.status='approved'
  WHERE a.id=${a.id} GROUP BY a.id`)[0];

// getReports (FILTER)
results.reports = (await sql`SELECT a.code,
  coalesce(sum(r.amount) FILTER (WHERE r.status='active'),0)::float AS revenue
  FROM affiliate a LEFT JOIN referral r ON r.affiliate_id=a.id WHERE a.id=${a.id} GROUP BY a.id`)[0];

console.log(JSON.stringify(results, null, 2));

await sql`DELETE FROM affiliate WHERE id=${a.id}`;
console.log('\n✅ All admin queries ran on real Postgres. Cleaned up.');
