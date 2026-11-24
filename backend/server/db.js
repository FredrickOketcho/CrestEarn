import 'dotenv/config'
import pg from 'pg'
import process from 'node:process'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.')
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

  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

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
