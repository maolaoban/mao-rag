import { createMiddleware } from 'hono/factory'
import { supabaseClient } from './config'

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401)
  }
  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseClient.auth.getUser(token)
  if (error || !user) {
    return c.json({ error: '登录已过期' }, 401)
  }
  c.set('userId', user.id)
  await next()
})
