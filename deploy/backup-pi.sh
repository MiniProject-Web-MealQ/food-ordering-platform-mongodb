#!/bin/sh
# Stable, owner-only snapshots. This script never deletes a previous backup.
set -eu
umask 077
export TZ=Asia/Bangkok
root=/home/linapspi4/mealq-app
shared="$root/shared"
base="$shared/backups/daily"
mkdir -p "$base"
chmod 700 "$base"
exec 9>"$shared/backups/daily.lock"
flock -n 9 || { echo "MealQ backup already running"; exit 0; }
stamp="$(date +%Y%m%dT%H%M%S%z)-$$"
snapshot="$base/$stamp"
mkdir -m 700 "$snapshot" "$snapshot/config" "$snapshot/deploy" "$snapshot/operations"
failed() {
  result=$?
  if [ "$result" -ne 0 ]; then
    printf '%s Backup failed; incomplete files retained at %s\n' "$(date -Is)" "$snapshot" >&2
  fi
}
trap failed EXIT
# A failed dump or a full disk must never replace the last known good snapshot.
free_kb=$(df -Pk "$base" | awk 'NR == 2 { print $4 }')
[ "$free_kb" -ge 1048576 ] || { echo "MealQ backup requires at least 1 GiB free space" >&2; exit 1; }
docker inspect --format '{{.State.Running}}' mealq-db-1 | grep -qx true
docker exec mealq-db-1 mongodump --db mealq --archive --gzip > "$snapshot/mealq.archive.gz" 2> "$snapshot/mongodump.log"
test -s "$snapshot/mealq.archive.gz"
gzip -t "$snapshot/mealq.archive.gz"
for file in backend.env compose.env mealq-tunnel.token demo-credentials.json; do
  if [ -f "$shared/$file" ]; then cp -p "$shared/$file" "$snapshot/config/$file"; fi
done
for file in "$shared"/demo-credentials-*.json; do
  if [ -f "$file" ] && [ ! -L "$file" ]; then cp -p "$file" "$snapshot/config/${file##*/}"; fi
done
for file in backend.env compose.env mealq-tunnel.token; do
  test -s "$snapshot/config/$file"
done
release=$(readlink -f "$root/current")
case "$release" in "$root"/releases/*) ;; *) echo "Unexpected MealQ release path" >&2; exit 1;; esac
cp -Rp "$release/deploy/." "$snapshot/deploy/"
for file in "$shared"/operations/backup-*.sh; do
  if [ -f "$file" ] && [ ! -L "$file" ]; then cp -p "$file" "$snapshot/operations/${file##*/}"; fi
done
if crontab -l > "$snapshot/config/crontab.txt" 2> "$snapshot/config/crontab.stderr"; then
  :
elif ! grep -q 'no crontab' "$snapshot/config/crontab.stderr"; then
  echo "Cannot preserve installed backup schedule" >&2
  exit 1
fi
printf '%s\n' "$release" > "$snapshot/release.txt"
docker inspect --format '{{.Name}} {{.Config.Image}} {{.Image}}' mealq-api-1 mealq-web-1 mealq-db-1 mealq-tunnel-tunnel-1 > "$snapshot/images.txt"
python3 - "$snapshot" <<'PY'
import datetime, json, pathlib, re, sys
snapshot = pathlib.Path(sys.argv[1])
dump_log = (snapshot / 'mongodump.log').read_text()
counts = dict((name, int(count)) for name, count in re.findall(r'done dumping mealq\.([^\s]+) \((\d+) documents?\)', dump_log))
if not counts or any('/' in name for name in counts):
    raise SystemExit('Cannot verify collection counts in mongodump log')
manifest = {
    'format': 1,
    'database': 'mealq',
    'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'collections': dict(sorted(counts.items())),
    'total_documents': sum(counts.values()),
    'consistency': 'Online mongodump of a standalone MongoDB; collection-level copy, not an atomic point-in-time snapshot.',
    'retention': 'No automatic deletion. Review storage usage and copy verified archives off Pi before cleanup.',
}
(snapshot / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
PY
find "$snapshot" -type f -exec chmod 600 {} +
find "$snapshot" -type d -exec chmod 700 {} +
(cd "$snapshot" && find . -type f ! -name SHA256SUMS ! -name package.tar.gz ! -name package.sha256 -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
(cd "$snapshot" && sha256sum -c SHA256SUMS >/dev/null)
(cd "$snapshot" && tar -czf package.tar.gz mealq.archive.gz manifest.json mongodump.log config deploy operations release.txt images.txt SHA256SUMS)
(cd "$snapshot" && sha256sum package.tar.gz > package.sha256)
gzip -t "$snapshot/package.tar.gz"
printf '%s\n' "$stamp" > "$snapshot/COMPLETE"
# Write a new pointer then atomically publish it; retain each immutable snapshot.
ln -s "$stamp" "$base/latest.$stamp"
mv -Tf "$base/latest.$stamp" "$base/latest"
printf '%s MealQ backup complete: %s\n' "$(date -Is)" "$stamp"
