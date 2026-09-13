
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      phone TEXT DEFAULT '',
      preferences JSONB DEFAULT '[]',
      experience TEXT DEFAULT '',
      provider TEXT DEFAULT 'local',
      provider_id TEXT,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);
}
init();

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    phone: row.phone,
    preferences: row.preferences,
    experience: row.experience,
    provider: row.provider,
    providerId: row.provider_id,
    createdAt: row.created_at
  };
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rowToUser(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rowToUser(rows[0]);
}

async function findBySocialId(provider, providerId) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
    [provider, providerId]
  );
  return rowToUser(rows[0]);
}

async function createUser(user) {
  await pool.query(
    `INSERT INTO users (id, username, email, password_hash, phone, preferences, experience, provider, provider_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      user.id,
      user.username,
      user.email.toLowerCase(),
      user.passwordHash || null,
      user.phone || '',
      JSON.stringify(user.preferences || []),
      user.experience || '',
      user.provider || 'local',
      user.providerId || null,
      user.createdAt
    ]
  );
  return findById(user.id);
}

module.exports = { findByEmail, findById, findBySocialId, createUser };