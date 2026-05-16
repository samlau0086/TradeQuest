import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await pool.query("UPDATE users SET role = 'superadmin' WHERE email = 'agqyed01@gmail.com'");
  await pool.query("UPDATE users SET role = 'superadmin' WHERE email = 'samlau0086@gmail.com'");
  const res = await pool.query("SELECT email, role FROM users");
  console.log(res.rows);
  pool.end();
}

run();
