import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { pool } from './db.js'
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  validateRegistration,
  verifyPassword,
} from './security.js'

const SESSION_COOKIE = 'crestearn_session'
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000

function normalizePhone(phone) {
  return String(phone ?? '').trim().replace(/[ ()-]/g, '')
}

function isSupportUser(user) {
  const configuredPhone = normalizePhone(process.env.SUPPORT_PHONE)
  return Boolean(configuredPhone && normalizePhone(user?.phone) === configuredPhone)
}

function requireSupport(request, response, next) {
  if (!isSupportUser(request.currentUser)) {
    return response.status(403).json({ error: 'Support account access required.' })
  }
  return next()
}

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(';') ?? []
  const cookie = cookies.map(value => value.trim()).find(value => value.startsWith(`${name}=`))
  return cookie?.slice(name.length + 1) ?? ''
}

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secure}`,
  )
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  )
}

function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    referralCode: user.referral_code,
    isSupport: isSupportUser(user),
  }
}

function toPublicInvestment(investment) {
  return {
    id: investment.id,
    projectId: investment.project_id,
    projectName: investment.project_name,
    principalUgx: Number(investment.principal_ugx),
    dailyYieldBps: investment.daily_yield_bps,
    durationDays: investment.duration_days,
    status: investment.status,
    createdAt: investment.created_at,
    startedAt: investment.started_at,
    maturesAt: investment.matures_at,
  }
}

function createAuthentication(database) {
  return async (request, response, next) => {
    const token = readCookie(request, SESSION_COOKIE)
    if (!token) {
      return response.status(401).json({ error: 'Authentication required.' })
    }

    const tokenHash = hashSessionToken(token)
    const result = await database.query(
      `SELECT users.id, users.full_name, users.email, users.phone, users.referral_code
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.token_hash = $1
         AND auth_sessions.expires_at > now()
         AND users.is_active = true`,
      [tokenHash],
    )
    if (result.rowCount === 0) {
      clearSessionCookie(response)
      return response.status(401).json({ error: 'Your session has expired. Please log in again.' })
    }

    request.currentUser = result.rows[0]
    request.sessionTokenHash = tokenHash
    return next()
  }
}

async function createSession(database, userId) {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await database.query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashSessionToken(token), userId, expiresAt],
  )
  return token
}

export function createApp(database = pool) {
  const app = express()
  const authenticate = createAuthentication(database)
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({ error: 'Too many attempts. Please wait and try again.' })
    },
  })
  const chatMessageRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Please wait a few minutes before sending more messages.' },
  })

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(express.json({ limit: '20kb' }))

  app.get('/api/health', async (_request, response) => {
    await database.query('SELECT 1')
    response.json({ status: 'ok', database: 'connected' })
  })

  app.get('/api/projects', async (_request, response) => {
    const result = await database.query(
      `SELECT id, name, price_ugx, previous_price_ugx, duration_days,
              daily_yield_bps, image_key, is_featured, sort_order
       FROM projects
       WHERE is_active = true
       ORDER BY sort_order, name`,
    )
    response.json({
      projects: result.rows.map(project => ({
        id: project.id,
        name: project.name,
        price: Number(project.price_ugx),
        previousPrice: project.previous_price_ugx === null
          ? null
          : Number(project.previous_price_ugx),
        durationDays: project.duration_days,
        dailyYieldBps: project.daily_yield_bps,
        imageKey: project.image_key,
        featured: project.is_featured,
      })),
    })
  })

  app.get('/api/investments', authenticate, async (request, response) => {
    const result = await database.query(
      `SELECT i.id, i.project_id, COALESCE(i.project_name, p.name) AS project_name,
              i.principal_ugx, i.daily_yield_bps, i.duration_days, i.status,
              i.created_at, i.started_at, i.matures_at
       FROM investments i
       JOIN projects p ON p.id = i.project_id
       WHERE i.user_id = $1 AND i.status <> 'cancelled'
       ORDER BY i.created_at DESC, i.id DESC`,
      [request.currentUser.id],
    )
    response.json({ investments: result.rows.map(toPublicInvestment) })
  })

  app.get('/api/chat/messages', authenticate, async (request, response) => {
    await database.query(
      `UPDATE chat_messages SET read_at = now()
       WHERE user_id = $1 AND sender = 'support' AND read_at IS NULL`,
      [request.currentUser.id],
    )
    const result = await database.query(
      `SELECT id, sender, body, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [request.currentUser.id],
    )
    response.json({
      messages: result.rows.reverse().map(message => ({
        id: message.id,
        sender: message.sender,
        body: message.body,
        createdAt: message.created_at,
      })),
    })
  })

  app.post('/api/chat/messages', authenticate, chatMessageRateLimit, async (request, response) => {
    const body = typeof request.body?.body === 'string' ? request.body.body.trim() : ''
    if (body.length === 0 || body.length > 4000) {
      return response.status(400).json({ error: 'Write a message between 1 and 4000 characters.' })
    }

    const result = await database.query(
      `INSERT INTO chat_messages (id, user_id, sender, body)
       VALUES ($1, $2, 'user', $3)
       RETURNING id, sender, body, created_at`,
      [randomUUID(), request.currentUser.id, body],
    )
    const message = result.rows[0]
    return response.status(201).json({
      message: {
        id: message.id,
        sender: message.sender,
        body: message.body,
        createdAt: message.created_at,
      },
    })
  })

  app.get('/api/chat/unread', authenticate, async (request, response) => {
    const result = await database.query(
      `SELECT count(*)::int AS unread_count
       FROM chat_messages
       WHERE user_id = $1 AND sender = 'support' AND read_at IS NULL`,
      [request.currentUser.id],
    )
    return response.json({ unreadCount: result.rows[0].unread_count })
  })

  app.get('/api/support/conversations', authenticate, requireSupport, async (_request, response) => {
    const result = await database.query(
      `SELECT u.id AS user_id, u.full_name, u.phone,
              latest.body AS last_message, latest.created_at AS last_message_at,
              (SELECT count(*)::int FROM chat_messages unread
               WHERE unread.user_id = u.id AND unread.sender = 'user' AND unread.read_at IS NULL) AS unread_count
       FROM users u
       JOIN LATERAL (
         SELECT body, created_at FROM chat_messages
         WHERE user_id = u.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       ) latest ON true
       ORDER BY latest.created_at DESC, u.id`,
    )
    return response.json({
      conversations: result.rows.map(conversation => ({
        userId: conversation.user_id,
        fullName: conversation.full_name,
        phone: conversation.phone,
        lastMessage: conversation.last_message,
        lastMessageAt: conversation.last_message_at,
        unreadCount: conversation.unread_count,
      })),
    })
  })

  app.get('/api/support/conversations/:userId/messages', authenticate, requireSupport, async (request, response) => {
    const userId = request.params.userId
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) {
      return response.status(400).json({ error: 'Choose a valid support conversation.' })
    }
    await database.query(
      `UPDATE chat_messages SET read_at = now()
       WHERE user_id = $1 AND sender = 'user' AND read_at IS NULL`,
      [userId],
    )
    const result = await database.query(
      `SELECT id, sender, body, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [userId],
    )
    return response.json({
      messages: result.rows.reverse().map(message => ({
        id: message.id,
        sender: message.sender,
        body: message.body,
        createdAt: message.created_at,
      })),
    })
  })

  app.post('/api/support/conversations/:userId/messages', authenticate, requireSupport, chatMessageRateLimit, async (request, response) => {
    const userId = request.params.userId
    const body = typeof request.body?.body === 'string' ? request.body.body.trim() : ''
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) {
      return response.status(400).json({ error: 'Choose a valid support conversation.' })
    }
    if (body.length === 0 || body.length > 4000) {
      return response.status(400).json({ error: 'Write a message between 1 and 4000 characters.' })
    }
    const result = await database.query(
      `INSERT INTO chat_messages (id, user_id, sender, body)
       SELECT $1, users.id, 'support', $3
       FROM users WHERE users.id = $2
       RETURNING id, sender, body, created_at`,
      [randomUUID(), userId, body],
    )
    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Member not found.' })
    }
    const message = result.rows[0]
    return response.status(201).json({
      message: {
        id: message.id,
        sender: message.sender,
        body: message.body,
        createdAt: message.created_at,
      },
    })
  })

  app.delete('/api/investments/:investmentId', authenticate, async (request, response) => {
    const investmentId = request.params.investmentId
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(investmentId)) {
      return response.status(400).json({ error: 'Choose a valid order.' })
    }

    const cancelled = await database.query(
      `UPDATE investments
       SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [investmentId, request.currentUser.id],
    )
    if (cancelled.rowCount > 0) {
      return response.json({ cancelled: true })
    }

    const existing = await database.query(
      'SELECT status FROM investments WHERE id = $1 AND user_id = $2',
      [investmentId, request.currentUser.id],
    )
    if (existing.rowCount === 0) {
      return response.status(404).json({ error: 'Order not found.' })
    }
    if (existing.rows[0].status === 'cancelled') {
      return response.json({ cancelled: true })
    }
    return response.status(409).json({ error: 'Only pending orders can be removed.' })
  })

  app.post('/api/investments', authenticate, async (request, response) => {
    const projectId = typeof request.body?.projectId === 'string'
      ? request.body.projectId.trim()
      : ''
    const idempotencyKey = request.get('Idempotency-Key') || ''
    if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(projectId)) {
      return response.status(400).json({ error: 'Choose a valid project.' })
    }
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) {
      return response.status(400).json({ error: 'A valid Idempotency-Key header is required.' })
    }

    const client = await database.connect()
    try {
      await client.query('BEGIN')

      const existing = await client.query(
        `SELECT id, project_id, project_name, principal_ugx, daily_yield_bps,
                duration_days, status, created_at, started_at, matures_at
         FROM investments
         WHERE user_id = $1 AND idempotency_key = $2`,
        [request.currentUser.id, idempotencyKey],
      )
      if (existing.rowCount > 0) {
        const investment = existing.rows[0]
        if (investment.project_id !== projectId) {
          await client.query('ROLLBACK')
          return response.status(409).json({
            error: 'This request key was already used for a different project.',
          })
        }
        await client.query('COMMIT')
        return response.status(200).json({
          investment: toPublicInvestment(investment),
          payment: { status: 'not_started', available: false },
        })
      }

      const projectResult = await client.query(
        `SELECT id, name, price_ugx, duration_days, daily_yield_bps
         FROM projects
         WHERE id = $1 AND is_active = true
         FOR SHARE`,
        [projectId],
      )
      const project = projectResult.rows[0]
      if (!project) {
        await client.query('ROLLBACK')
        return response.status(404).json({ error: 'This project is not available.' })
      }
      if (project.duration_days === null) {
        await client.query('ROLLBACK')
        return response.status(409).json({
          error: 'Investment requests are unavailable until this project term is configured.',
        })
      }

      const inserted = await client.query(
        `INSERT INTO investments (
           id, user_id, project_id, project_name, principal_ugx,
           daily_yield_bps, duration_days, idempotency_key, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
         ON CONFLICT (user_id, idempotency_key)
           WHERE idempotency_key IS NOT NULL
         DO NOTHING
         RETURNING id, project_id, project_name, principal_ugx, daily_yield_bps,
                   duration_days, status, created_at, started_at, matures_at`,
        [
          randomUUID(),
          request.currentUser.id,
          project.id,
          project.name,
          project.price_ugx,
          project.daily_yield_bps,
          project.duration_days,
          idempotencyKey,
        ],
      )

      if (inserted.rowCount === 0) {
        const concurrentRequest = await client.query(
          `SELECT id, project_id, project_name, principal_ugx, daily_yield_bps,
                  duration_days, status, created_at, started_at, matures_at
           FROM investments
           WHERE user_id = $1 AND idempotency_key = $2`,
          [request.currentUser.id, idempotencyKey],
        )
        const investment = concurrentRequest.rows[0]
        if (!investment) throw new Error('Unable to resolve the investment request key.')
        if (investment.project_id !== projectId) {
          await client.query('ROLLBACK')
          return response.status(409).json({
            error: 'This request key was already used for a different project.',
          })
        }
        await client.query('COMMIT')
        return response.status(200).json({
          investment: toPublicInvestment(investment),
          payment: { status: 'not_started', available: false },
        })
      }

      await client.query('COMMIT')
      return response.status(201).json({
        investment: toPublicInvestment(inserted.rows[0]),
        payment: { status: 'not_started', available: false },
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })

  app.get('/api/wallet', authenticate, async (request, response) => {
    const [balanceResult, transactionsResult] = await Promise.all([
      database.query(
        `SELECT COALESCE(
           SUM(amount_ugx) FILTER (WHERE status = 'posted'),
           0
         )::text AS balance_ugx
         FROM wallet_ledger
         WHERE user_id = $1`,
        [request.currentUser.id],
      ),
      database.query(
        `SELECT id, transaction_type, amount_ugx, status, external_reference,
                created_at
         FROM wallet_ledger
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 100`,
        [request.currentUser.id],
      ),
    ])

    response.json({
      balanceUgx: balanceResult.rows[0].balance_ugx,
      transactions: transactionsResult.rows.map(transaction => ({
        id: transaction.id,
        transactionType: transaction.transaction_type,
        amountUgx: String(transaction.amount_ugx),
        status: transaction.status,
        externalReference: transaction.external_reference,
        createdAt: transaction.created_at,
      })),
    })
  })

  app.post('/api/auth/register', authRateLimit, async (request, response) => {
    const validation = validateRegistration(request.body)
    if (validation.error) {
      return response.status(400).json({ error: validation.error })
    }

    const { fullName, phone, password } = validation.value
    const referralCode = typeof request.body.referralCode === 'string'
      ? request.body.referralCode.trim().toUpperCase()
      : ''
    if (referralCode && !/^[A-F0-9]{12}$/.test(referralCode)) {
      return response.status(400).json({ error: 'Enter a valid referral code.' })
    }
    let referrerId = null
    if (referralCode) {
      const referrerResult = await database.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referralCode],
      )
      if (referrerResult.rowCount === 0) {
        return response.status(400).json({ error: 'This referral link is invalid or expired.' })
      }
      referrerId = referrerResult.rows[0].id
    }

    const userId = randomUUID()
    const newReferralCode = userId.replaceAll('-', '').slice(0, 12).toUpperCase()
    const passwordHash = await hashPassword(password)
    const client = await database.connect()

    try {
      await client.query('BEGIN')
      const result = await client.query(
        `INSERT INTO users (
           id, full_name, email, phone, password_hash, referral_code, referred_by_user_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id, full_name, email, phone, referral_code`,
        [userId, fullName, null, phone, passwordHash, newReferralCode, referrerId],
      )

      if (result.rowCount === 0) {
        await client.query('ROLLBACK')
        return response.status(409).json({ error: 'An account with those details already exists.' })
      }

      const user = result.rows[0]
      const token = createSessionToken()
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
      await client.query(
        'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [hashSessionToken(token), user.id, expiresAt],
      )
      await client.query('COMMIT')

      setSessionCookie(response, token)
      return response.status(201).json({ user: toPublicUser(user) })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })

  app.post('/api/auth/login', authRateLimit, async (request, response) => {
    const phone = typeof request.body?.phone === 'string'
      ? request.body.phone.trim().replace(/[ ()-]/g, '')
      : ''
    const password = typeof request.body?.password === 'string'
      ? request.body.password
      : ''
    if (!/^\+?[0-9]{9,15}$/.test(phone) || password.length === 0) {
      return response.status(400).json({ error: 'Enter a valid phone number and password.' })
    }

    const result = await database.query(
      `SELECT id, full_name, email, phone, referral_code, password_hash, is_active
       FROM users
       WHERE phone = $1`,
      [phone],
    )
    const user = result.rows[0]
    if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
      return response.status(401).json({ error: 'Phone number or password is incorrect.' })
    }

    const token = await createSession(database, user.id)
    setSessionCookie(response, token)
    return response.json({ user: toPublicUser(user) })
  })

  app.get('/api/auth/me', authenticate, (request, response) => {
    response.json({ user: toPublicUser(request.currentUser) })
  })

  app.post('/api/auth/change-password', authenticate, async (request, response) => {
    const currentPassword = typeof request.body?.currentPassword === 'string'
      ? request.body.currentPassword
      : ''
    const newPassword = typeof request.body?.newPassword === 'string'
      ? request.body.newPassword
      : ''
    if (!currentPassword || newPassword.length < 8 || newPassword.length > 128) {
      return response.status(400).json({ error: 'Enter your current password and a new password between 8 and 128 characters.' })
    }

    const userResult = await database.query(
      'SELECT password_hash FROM users WHERE id = $1 AND is_active = true',
      [request.currentUser.id],
    )
    const user = userResult.rows[0]
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      return response.status(401).json({ error: 'Your current password is incorrect.' })
    }

    const newPasswordHash = await hashPassword(newPassword)
    await database.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newPasswordHash, request.currentUser.id],
    )
    await database.query(
      'DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2',
      [request.currentUser.id, request.sessionTokenHash],
    )
    return response.json({ message: 'Password updated successfully.' })
  })

  app.post('/api/auth/logout', async (request, response) => {
    const token = readCookie(request, SESSION_COOKIE)
    if (token) {
      await database.query(
        'DELETE FROM auth_sessions WHERE token_hash = $1',
        [hashSessionToken(token)],
      )
    }
    clearSessionCookie(response)
    return response.status(204).end()
  })

  app.use((error, _request, response, next) => {
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Request body must contain valid JSON.' })
    }

    if (response.headersSent) return next(error)
    console.error('API request failed:', error.message)
    return response.status(500).json({ error: 'The request could not be completed.' })
  })

  return app
}
