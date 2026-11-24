import 'dotenv/config'
import pg from 'pg'
import process from 'node:process'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy backend/.env.example to backend/.env and configure PostgreSQL.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: true } : undefined,
})

pool.on('error', error => {
  console.error('Unexpected PostgreSQL pool error:', error.message)
})

export async function migrate(database = pool) {
  const migrationsDirectory = fileURLToPath(new URL('./migrations/', import.meta.url))
  const files = (await readdir(migrationsDirectory))
    .filter(file => file.endsWith('.sql'))
    .sort()
  const client = await database.connect()
  const coreSchema = {
    users: ['id', 'full_name', 'email', 'phone', 'password_hash', 'is_active', 'created_at', 'updated_at'],
    auth_sessions: ['token_hash', 'user_id', 'expires_at', 'created_at'],
    projects: ['id', 'name', 'price_ugx', 'previous_price_ugx', 'duration_days', 'daily_yield_bps', 'image_key', 'is_featured', 'sort_order', 'is_active', 'created_at', 'updated_at'],
    investments: ['id', 'user_id', 'project_id', 'principal_ugx', 'daily_yield_bps', 'duration_days', 'status', 'started_at', 'matures_at', 'created_at'],
    wallet_ledger: ['id', 'user_id', 'investment_id', 'transaction_type', 'amount_ugx', 'status', 'idempotency_key', 'external_reference', 'created_at'],
    chat_messages: ['id', 'user_id', 'sender', 'body', 'created_at'],
  }

  try {
    await client.query('BEGIN')
    const historyExisted = await client.query(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS existed",
    )
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    if (!historyExisted.rows[0].existed) {
      const existingTables = await client.query(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = ANY($1::text[])
         ORDER BY table_name, ordinal_position`,
        [Object.keys(coreSchema)],
      )
      const actualSchema = Object.groupBy(existingTables.rows, row => row.table_name)
      const hasCoreTables = Object.keys(actualSchema).length > 0
      const matchesCoreSchema = Object.entries(coreSchema).every(([table, columns]) => (
        actualSchema[table]
        && JSON.stringify(actualSchema[table].map(row => row.column_name)) === JSON.stringify(columns)
      ))

      if (hasCoreTables && !matchesCoreSchema) {
        throw new Error(
          'Existing public tables do not match migration 001 and have no migration history. ' +
          'Review the database schema before applying migrations.',
        )
      }

      if (matchesCoreSchema) {
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ('001_core.sql') ON CONFLICT (name) DO NOTHING",
        )
        console.info('Detected existing core schema; recorded 001_core.sql as already applied.')
      }
    }

    for (const file of files) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [file],
      )
      if (applied.rowCount > 0) continue

      const migration = await readFile(path.join(migrationsDirectory, file), 'utf8')
      await client.query(migration)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
