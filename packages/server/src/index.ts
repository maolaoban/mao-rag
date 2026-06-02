import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import queryRoutes from './routes/query'
import knowledgeRoutes from './routes/knowledge'

// Hono
const app = new Hono()

// CORS
app.use('/*', cors({
  origin: [`http://localhost:${process.env.CLIENT_PORT}`,
  `http://127.0.0.1:${process.env.CLIENT_PORT}`,
  `http://localhost:${process.env.SERVER_PORT}`,
  `http://127.0.0.1:${process.env.SERVER_PORT}`],
  allowHeaders: ['Content-Type', 'Accept'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
}))

// 注册路由
app.route('/', queryRoutes)
app.route('/', knowledgeRoutes)

// Serve frontend
app.get('*', async (c) => {
  const filePath = c.req.path === '/' ? '/index.html' : c.req.path
  try {
    const fullPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', filePath)
    // Only serve static files in production
    if (!fs.existsSync(fullPath)) {
      return c.html('404 - File Not Found')
    }
    return c.html(fs.readFileSync(fullPath, 'utf-8'))
  } catch {
    return c.html('404 - File Not Found')
  }
})

// ==================== Server Start ====================

const PORT = parseInt(process.env.SERVER_PORT || '4000')

const server = serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`RAG服务运行在 http://localhost:${PORT}`)
console.log(`前端页面: http://localhost:${process.env.CLIENT_PORT} (通过 Vite HMR)`)

export { app, server }
