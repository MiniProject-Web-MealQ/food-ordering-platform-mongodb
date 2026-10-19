#!/bin/sh
set -eu
root=/home/linapspi4/mealq-app
release=20261019-complete
config="$root/releases/$release/deploy/compose.yaml"
backup="$root/shared/backups"
umask 077
mkdir -p "$backup"
if [ -e "$backup/mealq-before-20261019.archive.gz" ]; then
  echo "Initial release already deployed; refusing to overwrite the rollback backup. Use the documented compose update command." >&2
  exit 1
fi
# Only this Compose project is updated. The database and other projects stay running.
docker inspect mealq-api-1 mealq-web-1 mealq-db-1 muaysart-site-web-1 > "$backup/containers-before-20261019.json"
docker image tag "$(docker inspect mealq-api-1 --format '{{.Image}}')" mealq-api:before-20261019
docker image tag "$(docker inspect mealq-web-1 --format '{{.Image}}')" mealq-web:before-20261019
docker exec mealq-db-1 mongodump --db mealq --archive --gzip > "$backup/mealq-before-20261019.archive.gz"
test -s "$backup/mealq-before-20261019.archive.gz"
export MEALQ_RELEASE="$release"
docker compose -p mealq -f "$config" config -q
if ! docker compose -p mealq -f "$config" up -d --no-deps --wait --wait-timeout 180 api web; then
  cp "$backup/backend-before-20261019.env" "$root/shared/backend.env"
  MEALQ_RELEASE=before-20261019 docker compose -p mealq -f "$config" up -d --no-deps --wait --wait-timeout 180 api web
  echo "Health check failed; previous MealQ images and environment restored" >&2
  exit 1
fi
curl -fsS http://127.0.0.1:8088/api/v1/health
ln -sfn "$root/releases/$release" "$root/current"
echo "MealQ active; previous release and database backup retained"
