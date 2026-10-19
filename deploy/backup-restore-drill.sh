#!/bin/sh
# Restore into a new isolated container/database only. No production writes/deletes.
set -eu
umask 077
export TZ=Asia/Bangkok
root=/home/linapspi4/mealq-app
base="$root/shared/backups"
snapshot=$(readlink -f "$base/daily/latest")
case "$snapshot" in "$base"/daily/*) ;; *) echo "Unexpected backup location" >&2; exit 1;; esac
test -f "$snapshot/COMPLETE"
(cd "$snapshot" && sha256sum -c SHA256SUMS >/dev/null && sha256sum -c package.sha256 >/dev/null)
available_kb=$(awk '/MemAvailable:/ { print $2 }' /proc/meminfo)
[ "$available_kb" -ge 1048576 ] || { echo "Restore drill requires 1 GiB available memory" >&2; exit 1; }
free_kb=$(df -Pk "$base" | awk 'NR == 2 { print $4 }')
[ "$free_kb" -ge 2097152 ] || { echo "Restore drill requires 2 GiB available disk space" >&2; exit 1; }
stamp="$(date +%Y%m%dT%H%M%S)-$$"
name="mealq-restore-drill-$stamp"
volume="mealq_restore_drill_$stamp"
database="mealq_restore_drill_$stamp"
report="$base/restore-drills/$stamp"
mkdir -p -m 700 "$report"
case "$database" in mealq_restore_drill_*) ;; *) exit 1;; esac
finish() {
  code=$?
  docker inspect "$name" > "$report/container.json" 2>/dev/null || true
  docker stop -t 15 "$name" >/dev/null 2>&1 || true
  printf '%s Restore drill exit=%s; artifacts retained at %s\n' "$(date -Is)" "$code" "$report"
}
trap finish EXIT
printf '%s\n' "$snapshot" > "$report/source.txt"
# No host port, no application network, a new volume, and no TTL expiration races.
docker run -d --name "$name" --network none --memory 768m --cpus 0.5 \
  --label mealq.purpose=restore-drill --mount "type=volume,source=$volume,target=/data/db" \
  mongo:4.4.18 --bind_ip 127.0.0.1 --wiredTigerCacheSizeGB 0.25 \
  --setParameter ttlMonitorEnabled=false > "$report/container-id.txt"
ready=false
for attempt in $(seq 1 45); do
  if docker exec "$name" mongo --quiet --eval "quit(db.adminCommand('ping').ok ? 0 : 1)" >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[ "$ready" = true ] || { echo "Isolated restore database did not become ready" >&2; exit 1; }
docker exec -i "$name" mongorestore --archive --gzip --stopOnError \
  --nsFrom 'mealq.*' --nsTo "$database.*" < "$snapshot/mealq.archive.gz" > "$report/mongorestore.log" 2>&1
docker exec "$name" mongo --quiet "$database" --eval \
  'print(JSON.stringify(db.getCollectionNames().sort().map(function(name) { return {name:name,count:db.getCollection(name).count(),valid:db.runCommand({validate:name}).valid}; })))' > "$report/restored.json"
python3 - "$snapshot/manifest.json" "$report/restored.json" "$report/result.json" <<'PY'
import datetime, json, pathlib, sys
manifest = json.loads(pathlib.Path(sys.argv[1]).read_text())
restored = json.loads(pathlib.Path(sys.argv[2]).read_text())
actual = {item['name']: item['count'] for item in restored}
if actual != manifest['collections'] or not all(item['valid'] for item in restored):
    raise SystemExit('Restored collection counts or validation do not match the backup')
result = {'passed': True, 'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'collections': len(actual), 'documents': sum(actual.values()),
          'source_manifest': str(pathlib.Path(sys.argv[1])),
          'production_database_modified': False,
          'cleanup': 'Stopped container and volume retained; no automatic deletion.'}
pathlib.Path(sys.argv[3]).write_text(json.dumps(result, indent=2) + '\n')
print('Restore verified: %s collections, %s documents' % (len(actual), sum(actual.values())))
PY
