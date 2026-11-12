import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { runMigrations } from './db/client'
import { seed } from './db/seed'
import { checklistRoutes } from './features/checklist'
import { imagesRoutes } from './features/images'
import { messagesRoutes } from './features/messages'
import { propertiesRoutes } from './features/properties'
import { settingsRoutes } from './features/settings'
import { publicRoutes, sharesRoutes } from './features/shares'
import { visitsRoutes } from './features/visits'

const app = new Hono()

/**
 * Lo único público: la vista compartida (/c/<token>), su API (/api/public/...)
 * y los archivos estáticos del frontend. Todo lo demás pide la contraseña del dueño.
 */
const isPublic = (path: string) =>
  path.startsWith('/c/') ||
  path.startsWith('/api/public/') ||
  path.startsWith('/assets/') ||
  path === '/favicon.ico'

if (process.env.APP_PASSWORD) {
  const auth = basicAuth({ username: process.env.APP_USER || 'admin', password: process.env.APP_PASSWORD })
  app.use('*', (c, next) => (isPublic(c.req.path) ? next() : auth(c, next)))
}

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  if (err instanceof ZodError) return c.json({ error: 'Datos inválidos', issues: err.issues }, 400)
  console.error(err)
  return c.json({ error: err.message }, 500)
})

app.route('/api/properties', propertiesRoutes)
app.route('/api/images', imagesRoutes)
app.route('/api/visits', visitsRoutes)
app.route('/api/checklist', checklistRoutes)
app.route('/api/messages', messagesRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/shares', sharesRoutes)
app.route('/api/public', publicRoutes)
app.all('/api/*', (c) => c.json({ error: 'Ruta inexistente' }, 404))

// En producción el mismo server sirve el frontend compilado (dist/).
app.use('/*', serveStatic({ root: './dist' }))
app.get('*', serveStatic({ path: './dist/index.html' }))

await runMigrations()
await seed()

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, () => console.log(`API lista en http://localhost:${port}`))
