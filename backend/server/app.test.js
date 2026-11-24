import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import process from 'node:process'
import {
  createSessionToken,
  hashSessionToken,
} from './security.js'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/unused'
}

const { createApp } = await import('./app.js')

const currentUser = {
  id: '00000000-0000-4000-8000-000000000001',
  full_name: 'Investment Test',
  email: 'investment-test@example.test',
  phone: '+256700000001',
}

const projectCatalog = [
  {
    id: 'matooke',
    name: 'Matooke',
    price_ugx: '5000',
    daily_yield_bps: 1000,
    duration_days: 2,
    is_active: true,
  },
  {
    id: 'cotton',
    name: 'Cotton',
    price_ugx: '85500',
    daily_yield_bps: 1000,
    duration_days: null,
    is_active: true,
  },
  {
    id: 'inactive-project',
    name: 'Inactive Project',
    price_ugx: '10000',
    daily_yield_bps: 1000,
    duration_days: 10,
    is_active: false,
  },
]

class FakeDatabase {
  constructor() {
    this.sessionToken = createSessionToken()
    this.sessionHash = hashSessionToken(this.sessionToken)
    this.validSessionHashes = new Set([this.sessionHash])
    this.users = []
    this.investments = []
    this.walletEntries = []
    this.lastInvestmentListUserId = null
    this.lastWalletUserId = null
    this.queries = []
  }

  async query(sql, values = []) {
    this.queries.push(sql)
    if (sql.includes('FROM auth_sessions')) {
      const authenticated = this.validSessionHashes.has(values[0])
      return {
        rowCount: authenticated ? 1 : 0,
        rows: authenticated ? [{ ...currentUser }] : [],
      }
    }

    if (sql.includes('FROM users') && sql.includes('WHERE phone = $1')) {
      const user = this.users.find(account => account.phone === values[0])
      return { rowCount: user ? 1 : 0, rows: user ? [{ ...user }] : [] }
    }

    if (sql.includes('INSERT INTO auth_sessions')) {
      this.validSessionHashes.add(values[0])
      return { rowCount: 1, rows: [] }
    }

    if (sql.includes('FROM investments i')) {
      const [userId] = values
      this.lastInvestmentListUserId = userId
      const rows = this.investments
        .filter(investment => investment.user_id === userId)
        .sort((left, right) => right.created_at - left.created_at)
      return { rowCount: rows.length, rows }
    }

    if (sql.includes('FROM wallet_ledger') && sql.includes('SUM(amount_ugx)')) {
      const [userId] = values
      this.lastWalletUserId = userId
      const balance = this.walletEntries
        .filter(transaction => transaction.user_id === userId && transaction.status === 'posted')
        .reduce((sum, transaction) => sum + BigInt(transaction.amount_ugx), 0n)
      return { rowCount: 1, rows: [{ balance_ugx: balance.toString() }] }
    }

    if (sql.includes('FROM wallet_ledger')) {
      const [userId] = values
      this.lastWalletUserId = userId
      const rows = this.walletEntries
        .filter(transaction => transaction.user_id === userId)
        .sort((left, right) => right.created_at - left.created_at)
      return { rowCount: rows.length, rows }
    }

    throw new Error(`Unexpected database query: ${sql}`)
  }

  async connect() {
    return new FakeClient(this)
  }
}

class FakeClient {
  constructor(database) {
    this.database = database
  }

  async query(sql, values = []) {
    this.database.queries.push(sql)
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql.trim())) {
      return { rowCount: 0, rows: [] }
    }

    if (sql.includes('INSERT INTO users')) {
      const [id, fullName, email, phone, passwordHash] = values
      if (this.database.users.some(user => user.phone === phone)) {
        return { rowCount: 0, rows: [] }
      }

      const user = {
        id,
        full_name: fullName,
        email,
        phone,
        password_hash: passwordHash,
        is_active: true,
      }
      this.database.users.push(user)
      return { rowCount: 1, rows: [{ ...user }] }
    }

    if (sql.includes('INSERT INTO auth_sessions')) {
      this.database.validSessionHashes.add(values[0])
      return { rowCount: 1, rows: [] }
    }

    if (sql.includes('FROM investments') && sql.includes('idempotency_key = $2')) {
      const [userId, idempotencyKey] = values
      const rows = this.database.investments.filter(
        investment => investment.user_id === userId
          && investment.idempotency_key === idempotencyKey,
      )
      return { rowCount: rows.length, rows }
    }

    if (sql.includes('FROM projects')) {
      const project = projectCatalog.find(
        item => item.id === values[0] && item.is_active,
      )
      return { rowCount: project ? 1 : 0, rows: project ? [{ ...project }] : [] }
    }

    if (sql.includes('INSERT INTO investments')) {
      const [
        id,
        userId,
        projectId,
        projectName,
        principalUgx,
        dailyYieldBps,
        durationDays,
        idempotencyKey,
      ] = values
      const existing = this.database.investments.find(
        investment => investment.user_id === userId
          && investment.idempotency_key === idempotencyKey,
      )
      if (existing) return { rowCount: 0, rows: [] }

      const investment = {
        id,
        user_id: userId,
        project_id: projectId,
        project_name: projectName,
        principal_ugx: String(principalUgx),
        daily_yield_bps: dailyYieldBps,
        duration_days: durationDays,
        idempotency_key: idempotencyKey,
        status: 'pending',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        started_at: null,
        matures_at: null,
      }
      this.database.investments.push(investment)
      return { rowCount: 1, rows: [{ ...investment }] }
    }

    throw new Error(`Unexpected transaction query: ${sql}`)
  }

  release() {}
}

async function withServer(database, action) {
  const server = createApp(database).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    return await action(`http://127.0.0.1:${server.address().port}`)
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()))
    })
  }
}

function authHeaders(database, additionalHeaders = {}) {
  return {
    cookie: `crestearn_session=${database.sessionToken}`,
    ...additionalHeaders,
  }
}

test('registration and login use phone and password without email', async () => {
  const database = new FakeDatabase()
  await withServer(database, async baseUrl => {
    const registrationResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Crest Member',
        phone: '+256 700 000 002',
        password: 'secure-password',
      }),
    })
    assert.equal(registrationResponse.status, 201)
    const registration = await registrationResponse.json()
    assert.equal(registration.user.phone, '+256700000002')
    assert.equal(registration.user.email, null)
    assert.equal(database.users.length, 1)

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+256 700 000 002',
        password: 'secure-password',
      }),
    })
    assert.equal(loginResponse.status, 200)
    assert.equal((await loginResponse.json()).user.phone, '+256700000002')
    assert.ok(loginResponse.headers.get('set-cookie').includes('crestearn_session='))

    const invalidLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+256 700 000 002',
        password: 'incorrect-password',
      }),
    })
    assert.equal(invalidLoginResponse.status, 401)
  })
})

test('investment routes require an authenticated session', async () => {
  const database = new FakeDatabase()
  await withServer(database, async baseUrl => {
    const listResponse = await fetch(`${baseUrl}/api/investments`)
    assert.equal(listResponse.status, 401)

    const createResponse = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'request-key-000001' },
      body: JSON.stringify({ projectId: 'matooke' }),
    })
    assert.equal(createResponse.status, 401)

    const walletResponse = await fetch(`${baseUrl}/api/wallet`)
    assert.equal(walletResponse.status, 401)
  })
})

test('investment requests snapshot active project terms and are idempotent', async () => {
  const database = new FakeDatabase()
  const idempotencyKey = 'request-key-000001'
  await withServer(database, async baseUrl => {
    const createResponse = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: authHeaders(database, {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({ projectId: 'matooke' }),
    })
    assert.equal(createResponse.status, 201)
    const created = await createResponse.json()
    assert.equal(created.investment.projectId, 'matooke')
    assert.equal(created.investment.projectName, 'Matooke')
    assert.equal(created.investment.principalUgx, 5000)
    assert.equal(created.investment.dailyYieldBps, 1000)
    assert.equal(created.investment.durationDays, 2)
    assert.equal(created.investment.status, 'pending')
    assert.deepEqual(created.payment, { status: 'not_started', available: false })

    const retryResponse = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: authHeaders(database, {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({ projectId: 'matooke' }),
    })
    assert.equal(retryResponse.status, 200)
    assert.equal((await retryResponse.json()).investment.id, created.investment.id)
    assert.equal(database.investments.length, 1)

    const reuseResponse = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: authHeaders(database, {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({ projectId: 'cotton' }),
    })
    assert.equal(reuseResponse.status, 409)

    const listResponse = await fetch(`${baseUrl}/api/investments`, {
      headers: authHeaders(database),
    })
    assert.equal(listResponse.status, 200)
    const list = await listResponse.json()
    assert.deepEqual(list.investments.map(item => item.id), [created.investment.id])
    assert.equal(database.lastInvestmentListUserId, currentUser.id)
    assert.equal(database.queries.some(sql => sql.includes('wallet_ledger')), false)
  })
})

test('investment requests reject unknown projects and projects without configured terms', async () => {
  const database = new FakeDatabase()
  await withServer(database, async baseUrl => {
    for (const [projectId, idempotencyKey, expectedStatus] of [
      ['missing-project', 'request-key-000002', 404],
      ['inactive-project', 'request-key-000003', 404],
      ['cotton', 'request-key-000004', 409],
    ]) {
      const response = await fetch(`${baseUrl}/api/investments`, {
        method: 'POST',
        headers: authHeaders(database, {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        }),
        body: JSON.stringify({ projectId }),
      })
      assert.equal(response.status, expectedStatus)
    }
    assert.equal(database.investments.length, 0)
  })
})

test('wallet summary includes only the authenticated user and posted balance entries', async () => {
  const database = new FakeDatabase()
  database.walletEntries = [
    {
      id: '00000000-0000-4000-8000-000000000101',
      user_id: currentUser.id,
      transaction_type: 'deposit',
      amount_ugx: '12000',
      status: 'posted',
      external_reference: 'MOMO-TEST-1',
      description: 'Posted deposit',
      created_at: new Date('2026-03-01T10:00:00.000Z'),
    },
    {
      id: '00000000-0000-4000-8000-000000000102',
      user_id: currentUser.id,
      transaction_type: 'withdrawal',
      amount_ugx: '-3000',
      status: 'pending',
      external_reference: null,
      description: null,
      created_at: new Date('2026-03-02T10:00:00.000Z'),
    },
    {
      id: '00000000-0000-4000-8000-000000000103',
      user_id: '00000000-0000-4000-8000-000000000099',
      transaction_type: 'deposit',
      amount_ugx: '99000',
      status: 'posted',
      external_reference: 'OTHER-USER',
      description: null,
      created_at: new Date('2026-03-03T10:00:00.000Z'),
    },
  ]

  await withServer(database, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/wallet`, {
      headers: authHeaders(database),
    })
    assert.equal(response.status, 200)
    const wallet = await response.json()
    assert.equal(wallet.balanceUgx, '12000')
    assert.equal(wallet.transactions.length, 2)
    assert.deepEqual(wallet.transactions.map(item => item.status), ['pending', 'posted'])
    assert.equal(wallet.transactions[1].externalReference, 'MOMO-TEST-1')
    assert.equal(database.lastWalletUserId, currentUser.id)
  })
})
