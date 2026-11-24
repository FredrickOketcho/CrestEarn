import 'dotenv/config'
import process from 'node:process'
import { createApp } from './app.js'
import { migrate, pool } from './db.js'

const port = Number(process.env.PORT || 3001)
const host = process.env.API_HOST || '127.0.0.1'

try {
  await migrate()
  const app = createApp()
  const server = app.listen(port, host, () => {
    console.info(`CrestEarn API listening at http://${host}:${port}`)
  })

  const shutdown = () => {
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
} catch (error) {
  console.error('API startup failed. Check PostgreSQL and DATABASE_URL:', error.message)
  await pool.end()
  process.exitCode = 1
}

