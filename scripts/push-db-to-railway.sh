#!/usr/bin/env bash
# Copia la base LOCAL (Docker) a la base de Railway.
# - Antes hace un backup local en backups/.
# - La base local NO se modifica.
# - En Railway REEMPLAZA todo por los datos locales (pide confirmación).
set -euo pipefail
cd "$(dirname "$0")/.."

PG_IMAGE=postgres:18-alpine # cliente nuevo: lee dumps de v16 y habla con servidores más nuevos
COUNT_SQL="select (select count(*) from properties) || ' alquileres, ' || (select count(*) from property_images) || ' fotos, ' || (select count(*) from visits) || ' visitas'"

echo "1/5 Backup de la base local..."
mkdir -p backups
DUMP="backups/alquileres-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U alquileres -d alquileres -Fc > "$DUMP"
echo "    -> $DUMP ($(du -h "$DUMP" | cut -f1))"
echo "    Local: $(docker compose exec -T db psql -U alquileres -d alquileres -tAc "$COUNT_SQL")"

echo
read -rsp "2/5 Pegá la DATABASE_PUBLIC_URL de Railway (no se muestra) y Enter: " URL
echo
if [[ "$URL" != postgres* ]]; then
  echo "Eso no parece una URL de Postgres (debería empezar con postgresql://). Cancelado."
  exit 1
fi

remote_count() {
  docker run --rm "$PG_IMAGE" psql "$URL" -tAc "$COUNT_SQL" 2>/dev/null || echo "(todavía sin datos)"
}

echo "3/5 Así está Railway ahora: $(remote_count)"
echo
read -rp "Esto REEMPLAZA todo lo que haya en Railway por tus datos locales. ¿Seguimos? (si/no) " OK
if [[ "$OK" != "si" ]]; then
  echo "Cancelado. No se tocó nada."
  exit 0
fi

echo "4/5 Copiando a Railway (puede tardar por las fotos)..."
if ! docker run --rm -i "$PG_IMAGE" pg_restore --clean --if-exists --no-owner --no-acl -d "$URL" < "$DUMP"; then
  echo "    pg_restore terminó con avisos (revisá arriba). Verificamos igual:"
fi

echo "5/5 Verificación"
echo "    Local:   $(docker compose exec -T db psql -U alquileres -d alquileres -tAc "$COUNT_SQL")"
echo "    Railway: $(remote_count)"
echo
echo "Si los números coinciden, listo. Recargá la app en Railway."
