import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'

const PASSWORD_KEY_LENGTH = 64

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error)
        return
      }
      resolve(key)
    })
  })
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await deriveKey(password, salt)
  return `${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  const [salt, expectedHex, extra] = String(storedHash).split(':')
  if (!salt || !expectedHex || extra !== undefined || !/^[a-f0-9]{128}$/i.test(expectedHex)) {
    return false
  }

  const expected = Buffer.from(expectedHex, 'hex')
  const actual = await deriveKey(password, salt)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Provide valid account details.' }
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const phone = typeof body.phone === 'string'
    ? body.phone.trim().replace(/[ ()-]/g, '')
    : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (fullName.length < 2 || fullName.length > 120) {
    return { error: 'Enter a name between 2 and 120 characters.' }
  }
  if (!/^\+?[0-9]{9,15}$/.test(phone)) {
    return { error: 'Enter a valid phone number.' }
  }
  if (password.length < 8 || password.length > 128) {
    return { error: 'Password must be between 8 and 128 characters.' }
  }

  return {
    value: { fullName, phone, password },
  }
}
