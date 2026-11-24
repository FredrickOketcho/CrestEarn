import 'dotenv/config'
import { migrate, pool } from './db.js'

try {
  await migrate()
  console.info('Database migrations applied.')
} finally {
  await pool.end()
}
