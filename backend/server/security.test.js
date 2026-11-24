import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  validateRegistration,
  verifyPassword,
} from './security.js'

test('password hashes verify without storing plaintext', async () => {
  const password = 'correct-horse-battery'
  const storedHash = await hashPassword(password)

  assert.notEqual(storedHash, password)
  assert.equal(await verifyPassword(password, storedHash), true)
  assert.equal(await verifyPassword('incorrect-password', storedHash), false)
})

test('session tokens are random and stored as one-way hashes', () => {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)

  assert.notEqual(token, tokenHash)
  assert.match(tokenHash, /^[a-f0-9]{64}$/)
  assert.notEqual(createSessionToken(), token)
})

test('registration validation requires a phone number and no email', () => {
  const valid = validateRegistration({
    fullName: '  Crest Member ',
    phone: '+256 700 000 000',
    password: 'secure-password',
  })

  assert.deepEqual(valid.value, {
    fullName: 'Crest Member',
    phone: '+256700000000',
    password: 'secure-password',
  })
  assert.equal(validateRegistration({}).error, 'Enter a name between 2 and 120 characters.')
  assert.equal(validateRegistration({
    fullName: 'Crest Member',
    phone: 'not-a-phone',
    password: 'secure-password',
  }).error, 'Enter a valid phone number.')
})
