#!/bin/bash
# Runs synthetic database tests from the native release image, retaining evidence.
set -Eeuo pipefail
umask 077
app=/home/linapspi4/mealq-app
tag=20261019-coupons-notifications
release="$app/releases/$tag"
safety=$(cat "$release/activation-safety-path.txt")
case "$safety" in "$app/shared/backups/activation-$tag-"*) ;; *) exit 1;; esac
stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
evidence="$safety/verification-$stamp"
mkdir -m 700 "$evidence"
name="mealq-coupons-verification-$stamp"
# No production env_file, credentials or mail transport. Each integration script
# refuses remote Mongo and snapshots its own randomly named database before drop.
if docker run --name "$name" --network container:mealq-db-1 \
  --user "$(id -u):$(id -g)" --cpus 1 --memory 512m \
  -v "$evidence:/verification" -e TMPDIR=/verification \
  -e NODE_ENV=development -e PAYMENT_MODE=demo \
  -e MONGO_URI=mongodb://127.0.0.1:27017/mealq_verification_unused \
  -e FRONTEND_URL=https://mealq.site \
  -e SESSION_SECRET=synthetic-local-release-verification-only \
  "mealq-api:$tag" sh -c 'npm test && npm run test:coupons && npm run test:order-notifications && npm run test:push' \
  > "$evidence/results.log" 2>&1; then
  docker inspect "$name" > "$evidence/container.json"
  sha256sum "$evidence/results.log" > "$evidence/results.sha256"
  printf '%s\n' "$evidence" > "$safety/verification-passed.txt"
  tail -n 18 "$evidence/results.log"
  printf 'Image verification passed. Evidence and test archives: %s\n' "$evidence"
else
  status=$?
  docker inspect "$name" > "$evidence/container.json" 2>/dev/null || true
  tail -n 65 "$evidence/results.log"
  printf 'Verification failed; container/data/logs retained: %s\n' "$evidence" >&2
  exit "$status"
fi
