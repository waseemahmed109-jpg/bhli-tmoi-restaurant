import { Hono } from 'hono'
import { createBunWebSocket } from 'hono/bun'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const { upgradeWebSocket, websocket } = createBunWebSocket()

const app = new Hono<{ Variables: { user: any } }>()

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

// ── WebSocket ────────────────────────────────────────────────
const wsClients = new Set<any>()

function broadcast(type: string, data: any, excludeWs?: any) {
  const msg = JSON.stringify({ type, data, ts: Date.now() })
  for (const ws of wsClients) {
    try {
      if (ws !== excludeWs && ws.readyState === 1) ws.send(msg)
    } catch (_) { /* ignore dead sockets */ }
  }
}

app.get('/ws', upgradeWebSocket(() => ({
  onOpen(_evt: any, ws: any) { wsClients.add(ws.raw) },
  onClose(_evt: any, ws: any) { wsClients.delete(ws.raw) },
  onMessage(_evt: any, _ws: any) { /* ping/pong handled by runtime */ },
})))

// ── Auth middleware ──────────────────────────────────────────
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    c.set('user', payload)
    await next()
  } catch (_) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

const adminMiddleware = async (c: any, next: any) => {
  const user = c.get('user')
  const role = (user?.role || '').toLowerCase()
  if (role !== 'admin' && role !== 'owner') {
    return c.json({ error: 'Forbidden: admin or owner role required' }, 403)
  }
  await next()
}

// ── Login / Logout ──────────────────────────────────────────
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ error: 'Missing credentials' }, 400)

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } }
  })
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return c.json({ error: 'Invalid credentials' }, 401)

  const payload = {
    sub: user.id, username: user.username, role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  }
  const token = jwt.sign(payload, JWT_SECRET)
  setCookie(c, 'auth_token', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict', maxAge: 60 * 60 * 24 * 7, path: '/'
  })
  return c.json({ success: true, user: { username: user.username, role: user.role } })
})

app.post('/api/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' })
  return c.json({ success: true })
})

app.get('/api/me', authMiddleware, (c) => c.json({ user: c.get('user') }))

// ── Legacy Sync (backward compat — kept for initial data migration) ──
app.get('/api/sync', authMiddleware, async (c) => {
  const states = await prisma.appState.findMany()
  const result: Record<string, string> = {}
  for (const s of states) result[s.key] = s.value
  return c.json(result)
})

app.post('/api/sync', authMiddleware, async (c) => {
  const { key, value } = await c.req.json()
  if (!key || typeof value !== 'string') return c.json({ error: 'Invalid payload' }, 400)
  await prisma.appState.upsert({ where: { key }, update: { value }, create: { key, value } })
  return c.json({ success: true })
})

// ── Public routes ───────────────────────────────────────────
app.get('/api/staff', async (c) => {
  const staff = await prisma.user.findMany({
    where: { role: { equals: 'staff', mode: 'insensitive' } },
    select: { username: true }
  })
  return c.json(staff)
})

// ── Orders ──────────────────────────────────────────────────
app.get('/api/orders', authMiddleware, async (c) => {
  const orders = await prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } })
  return c.json(orders)
})

app.post('/api/orders', authMiddleware, async (c) => {
  const body = await c.req.json()
  const { id, items, ...orderData } = body

  // Map waiterId: use username to find the user, or fallback
  let waiterId = orderData.waiterId
  if (!waiterId && orderData.waiter) {
    const waiterUser = await prisma.user.findFirst({ where: { username: { equals: orderData.waiter, mode: 'insensitive' } } })
    waiterId = waiterUser?.id || 'unknown'
  }

  if (id) {
    // Update existing order
    const existing = await prisma.order.findUnique({ where: { id: Number(id) } })
    if (existing) {
      await prisma.orderItem.deleteMany({ where: { orderId: Number(id) } })
      const updated = await prisma.order.update({
        where: { id: Number(id) },
        data: {
          status: orderData.status || 'OPEN',
          waiterId: waiterId || existing.waiterId,
          customerName: orderData.customerName || orderData.customer,
          table: orderData.table,
          salesType: orderData.salesType,
          subtotal: orderData.subtotal,
          gst: orderData.gst,
          parcelCharge: orderData.parcelCharge,
          discount: orderData.discount,
          totalAmount: orderData.totalAmount || orderData.amount || 0,
          chef: orderData.chef,
          paymentMethod: orderData.paymentMethod,
          remarks: orderData.remarks,
          guestSignature: orderData.guestSignature,
          items: items?.length ? { create: items.map((it: any) => ({ name: it.name, quantity: it.quantity || it.qty || 1, rate: it.rate || 0, amount: it.amount || 0 })) } : undefined,
        },
        include: { items: true }
      })
      broadcast('order:updated', updated)
      return c.json(updated)
    }
  }

  // Create new
  const order = await prisma.order.create({
    data: {
      status: orderData.status || 'OPEN',
      waiterId: waiterId || 'unknown',
      customerName: orderData.customerName || orderData.customer,
      table: orderData.table,
      salesType: orderData.salesType || 'DineIn',
      subtotal: orderData.subtotal,
      gst: orderData.gst,
      parcelCharge: orderData.parcelCharge,
      discount: orderData.discount,
      totalAmount: orderData.totalAmount || orderData.amount || 0,
      chef: orderData.chef,
      paymentMethod: orderData.paymentMethod || 'Cash',
      remarks: orderData.remarks,
      guestSignature: orderData.guestSignature,
      items: items?.length ? { create: items.map((it: any) => ({ name: it.name, quantity: it.quantity || it.qty || 1, rate: it.rate || 0, amount: it.amount || 0 })) } : undefined,
    },
    include: { items: true }
  })
  broadcast('order:created', order)
  return c.json(order, 201)
})

app.delete('/api/orders/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await prisma.order.delete({ where: { id } }).catch(() => {})
  broadcast('order:deleted', { id })
  return c.json({ success: true })
})

// ── Purchases ───────────────────────────────────────────────
app.get('/api/purchases', authMiddleware, async (c) => {
  return c.json(await prisma.purchase.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/purchases', authMiddleware, async (c) => {
  const body = await c.req.json()
  const { id, ...data } = body
  let record
  if (id) {
    record = await prisma.purchase.update({ where: { id: Number(id) }, data })
    broadcast('purchase:updated', record)
  } else {
    record = await prisma.purchase.create({ data })
    broadcast('purchase:created', record)
  }
  return c.json(record)
})

app.delete('/api/purchases/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await prisma.purchase.delete({ where: { id } }).catch(() => {})
  broadcast('purchase:deleted', { id })
  return c.json({ success: true })
})

// ── Spoilage ────────────────────────────────────────────────
app.get('/api/spoilage', authMiddleware, async (c) => {
  return c.json(await prisma.spoilage.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/spoilage', authMiddleware, async (c) => {
  const body = await c.req.json()
  const { id, ...data } = body
  let record
  if (id) {
    record = await prisma.spoilage.update({ where: { id: Number(id) }, data })
    broadcast('spoilage:updated', record)
  } else {
    record = await prisma.spoilage.create({ data })
    broadcast('spoilage:created', record)
  }
  return c.json(record)
})

app.delete('/api/spoilage/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await prisma.spoilage.delete({ where: { id } }).catch(() => {})
  broadcast('spoilage:deleted', { id })
  return c.json({ success: true })
})

// ── Expenses ────────────────────────────────────────────────
app.get('/api/expenses', authMiddleware, async (c) => {
  return c.json(await prisma.expense.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/expenses', authMiddleware, async (c) => {
  const body = await c.req.json()
  const { id, ...data } = body
  let record
  if (id) {
    record = await prisma.expense.update({ where: { id: Number(id) }, data })
    broadcast('expense:updated', record)
  } else {
    record = await prisma.expense.create({ data })
    broadcast('expense:created', record)
  }
  return c.json(record)
})

app.delete('/api/expenses/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  await prisma.expense.delete({ where: { id } }).catch(() => {})
  broadcast('expense:deleted', { id })
  return c.json({ success: true })
})

// ── Payments ────────────────────────────────────────────────
app.get('/api/payments', authMiddleware, async (c) => {
  return c.json(await prisma.payment.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/payments', authMiddleware, async (c) => {
  const body = await c.req.json()
  const record = await prisma.payment.create({ data: body })
  broadcast('payment:created', record)
  return c.json(record, 201)
})

// ── Deletion Log ────────────────────────────────────────────
app.get('/api/deletion-log', authMiddleware, async (c) => {
  return c.json(await prisma.deletionLog.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/deletion-log', authMiddleware, async (c) => {
  const body = await c.req.json()
  const record = await prisma.deletionLog.create({ data: body })
  broadcast('deletion-log:created', record)
  return c.json(record, 201)
})

// ── Edit History ────────────────────────────────────────────
app.get('/api/edit-history', authMiddleware, async (c) => {
  return c.json(await prisma.editHistory.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/edit-history', authMiddleware, async (c) => {
  const body = await c.req.json()
  const record = await prisma.editHistory.create({ data: body })
  return c.json(record, 201)
})

// ── Invoice Counter ─────────────────────────────────────────
app.get('/api/invoice-counter', authMiddleware, async (c) => {
  const counter = await prisma.invoiceCounter.findUnique({ where: { id: 'default' } })
  return c.json({ counter: counter?.counter || 0 })
})

app.post('/api/invoice-counter/increment', authMiddleware, async (c) => {
  const result = await prisma.invoiceCounter.upsert({
    where: { id: 'default' },
    update: { counter: { increment: 1 } },
    create: { id: 'default', counter: 1 }
  })
  broadcast('invoice-counter:updated', { counter: result.counter })
  return c.json({ counter: result.counter })
})

app.post('/api/invoice-counter/reset', authMiddleware, async (c) => {
  const result = await prisma.invoiceCounter.upsert({
    where: { id: 'default' },
    update: { counter: 0 },
    create: { id: 'default', counter: 0 }
  })
  return c.json({ counter: result.counter })
})

// ── Menu Items (Item Master) ────────────────────────────────
app.get('/api/menu-items', authMiddleware, async (c) => {
  return c.json(await prisma.menuItem.findMany({ orderBy: { name: 'asc' } }))
})

app.post('/api/menu-items/bulk', authMiddleware, async (c) => {
  const { items } = await c.req.json() // [{name, rate, category?}]
  if (!Array.isArray(items)) return c.json({ error: 'items must be an array' }, 400)
  // Replace all: delete existing, insert new
  await prisma.menuItem.deleteMany()
  if (items.length > 0) {
    await prisma.menuItem.createMany({
      data: items.map((it: any) => ({ name: it.name, rate: Number(it.rate) || 0, category: it.category || null }))
    })
  }
  const all = await prisma.menuItem.findMany({ orderBy: { name: 'asc' } })
  broadcast('menu-items:updated', all)
  return c.json(all)
})

// ── Item Master Upload History ──────────────────────────────
app.get('/api/item-master-history', authMiddleware, async (c) => {
  return c.json(await prisma.itemMasterUpload.findMany({ orderBy: { createdAt: 'desc' } }))
})

app.post('/api/item-master-history', authMiddleware, async (c) => {
  const body = await c.req.json()
  const record = await prisma.itemMasterUpload.create({ data: body })
  return c.json(record, 201)
})

// ── Admin: User Management ──────────────────────────────────
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true }
  })
  return c.json(users)
})

app.post('/api/admin/users', authMiddleware, adminMiddleware, async (c) => {
  const { username, password, role } = await c.req.json()
  if (!username || !password || !role) return c.json({ error: 'Missing required fields' }, 400)

  const existing = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
  if (existing) return c.json({ error: 'Username already exists' }, 409)

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, password: hashed, role },
    select: { id: true, username: true, role: true, createdAt: true }
  })
  return c.json(user, 201)
})

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  const currentUser = c.get('user')
  if (currentUser.sub === id) return c.json({ error: 'Cannot delete your own account' }, 400)

  await prisma.user.delete({ where: { id } }).catch(() => {})
  return c.json({ success: true })
})

app.put('/api/admin/users/:id/password', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  const { newPassword } = await c.req.json()
  if (!newPassword) return c.json({ error: 'New password required' }, 400)

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { password: hashed } })
  return c.json({ success: true })
})

app.put('/api/admin/users/:id/role', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id')
  const { role } = await c.req.json()
  if (!role) return c.json({ error: 'Role required' }, 400)

  const updated = await prisma.user.update({
    where: { id }, data: { role },
    select: { id: true, username: true, role: true, createdAt: true }
  })
  return c.json(updated)
})

// ── Serve HTML ──────────────────────────────────────────────
import { html } from './html'

app.get('/', (c) => c.html(html))
app.get('/index.html', (c) => c.html(html))

// ── Export for Bun runtime ──────────────────────────────────
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  websocket,
}
