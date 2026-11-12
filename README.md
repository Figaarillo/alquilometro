# 🏠 Alquilómetro

App personal para buscar alquiler sin que se te escape nada. Cargás cada casa o departamento que ves, y Alquilómetro te arma un **ranking con puntaje automático**, agenda tus visitas, guarda tus mensajes y te deja **compartir** los mejores con quien quieras.

Pensada para Villa María (Córdoba), pero los puntos de referencia y el presupuesto se configuran.

## Arranque rápido

Necesitás **Node 22+**, **pnpm** y **Docker**.

```bash
cp .env.example .env    # DATABASE_URL tiene que apuntar al puerto 5434
pnpm install
pnpm db:up              # Postgres en Docker
pnpm dev                # API en :3000 + web en :5173
```

Abrí <http://localhost:5173>. La primera vez se crean solas las tablas, el checklist de visita y un mensaje de ejemplo.

## Qué hace

| Sección | Para qué sirve |
|---------|----------------|
| **Ranking** | Tabla (o tarjetas en el celu) ordenada por puntaje automático, tu nota, una combinación de ambas o el costo |
| **Alquiler** | Ficha completa: descripción original, datos con botones de un toque, fotos, mapa, Street View, costos, checklist y visitas |
| **Visitas** | Agenda con franja horaria, punto de encuentro, comentarios y links a Google Calendar y a "cómo llegar" |
| **Mapa** | Todos los alquileres coloreados por puntaje, con tus puntos de referencia |
| **Procesos** | Etapas (nuevo → contactado → visita → aplicando). Kanban en la compu, lista en el celu |
| **Mensajes** | Plantillas para WhatsApp con versiones (v1, v2…) y botón de copiar |
| **Checklist** | Lo que hay que revisar en cada visita (humedad, presión de agua, enchufes…). Se puede editar |
| **Compartidos** | Links de solo lectura para mostrar alquileres sin pedir cuenta |
| **Ajustes** | Presupuesto, peso de cada categoría y puntos de referencia |

## Cómo puntúa

El motor está en `src/shared/scoring.ts` y lo cubren tests (`pnpm test`).

1. **Categorías con peso**: ubicación, costo, espacio, servicios, estado, exteriores, cochera y contrato.
2. **Lo que no sabés no resta puntos.** Baja la *completitud* y aparece en "Te falta averiguar".
3. **Ajustes que restan puntos:**
   - No aceptan mascotas.
   - Alquiler + expensas por encima del tope.
   - Alquiler sobre el máximo **sin justificación**. Se justifica solo si el total entra en el tope y además no tiene expensas o tiene cochera para auto.
   - Alquiler muy elevado.
   - Todo eléctrico.
   - Mucha humedad.
4. **Ubicación**: distancia al Centro y a la Costanera. Corregí las coordenadas en *Ajustes* haciendo click en el mapa.

## Compartir

1. En el **Ranking** tocá **🔗 Compartir** y elegí los alquileres.
2. Elegí qué mostrar: puntaje y valoraciones vienen activados; tus notas, el contacto y tu nota personal vienen ocultos.
3. Mandá el link. Quien lo abre ve fotos y datos **sin cuenta y sin poder modificar nada**, y si querés puede dejar su opinión.
4. Desde **Compartidos** ves cuántas veces lo abrieron, cambiás qué alquileres incluye y lo desactivás cuando quieras.

> Para que otra persona abra el link, la app tiene que estar deployada (un link a `localhost` solo funciona en tu compu).

## Tus datos

- Todo vive en Postgres, **fotos incluidas** (se achican a 1600 px antes de subir).
- `pnpm db:backup` guarda un backup en `backups/` (ignorado por git).
- Las migraciones solo agregan cosas. Antes de cambiar el esquema hacé un backup.
- `docker-compose.yml` fija `name: alquileres`. No lo cambies, porque Docker usaría otro volumen y la base aparecería vacía.

## Deploy en Railway

1. Creá un proyecto con un servicio **PostgreSQL**.
2. Sumá este repo como servicio (usa `pnpm build` y `pnpm start`).
3. Configurá estas variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `APP_PASSWORD` | Contraseña para tu acceso. **Obligatoria**: sin esto la app queda pública |
| `APP_USER` | Opcional, por defecto `admin` |
| `VITE_GOOGLE_MAPS_EMBED_KEY` | Opcional: Street View embebido (Maps Embed API) |

Con `APP_PASSWORD` configurada todo pide login, **salvo** los links compartidos (`/c/<código>`).

## Stack

React 19 + Vite + TanStack Query + React Router · Hono + Drizzle + PostgreSQL · Leaflet + OpenStreetMap · Zod (validación compartida entre front y back) · Vitest.

```
src/
  shared/   dominio, validación y motor de puntaje (front y back)
  server/   API por feature (properties, visits, shares, …)
  web/      UI por feature (ranking, properties, visits, share, …)
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | API + web en modo desarrollo |
| `pnpm test` | Tests del motor de puntaje |
| `pnpm typecheck` | Chequeo de tipos |
| `pnpm db:up` | Levanta Postgres en Docker |
| `pnpm db:generate` | Crea una migración después de cambiar `src/server/db/schema.ts` |
| `pnpm db:backup` | Backup de la base en `backups/` |

## Licencia

[MIT](LICENSE)
