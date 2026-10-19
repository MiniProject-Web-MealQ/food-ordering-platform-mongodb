#!/bin/bash
# Deploy a tested frontend overlay while retaining the current API and data.
# Usage: bash THIS.sh /absolute/shared/overlay.tar.gz EXPECTED_SHA256 [/]
# Never deletes files, containers, volumes, old releases or old image tags.
set -Eeuo pipefail
umask 077

app_root=/home/linapspi4/mealq-app
shared="$app_root/shared"
release_tag=20261019-home-catalogue-sync
expected_previous="$app_root/releases/20261019-catalogue-v2-r2"
expected_api_image=mealq-api:20261019-catalogue-v2-r2
new_release="$app_root/releases/$release_tag"
new_web_image="mealq-web:$release_tag"
overlay=${1:?Provide the uploaded overlay archive}
overlay_hash=${2:?Provide the SHA-256 from the tested local archive}
verify_route=${3:-/}
stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
safety="$shared/backups/activation-$release_tag-$stamp"
activation_started=false
completed=false

fail() { printf 'REFUSED: %s\n' "$1" >&2; exit 1; }
case "$overlay_hash" in *[!a-fA-F0-9]*|'') fail 'Expected SHA-256 must be hexadecimal';; esac
[ "${#overlay_hash}" -eq 64 ] || fail 'Expected SHA-256 must have 64 characters'
case "$verify_route" in /*) ;; *) fail 'Verification route must start with /';; esac
[[ "$verify_route" =~ ^/[A-Za-z0-9/_-]*$ ]] || fail 'Unsafe verification route'
[ -f "$overlay" ] && [ ! -L "$overlay" ] || fail 'Overlay must be a regular archive, not a symlink'
overlay=$(readlink -f "$overlay")
case "$overlay" in "$shared"/*) ;; *) fail 'Overlay must be under MealQ shared/';; esac
[ "$(sha256sum "$overlay" | awk '{print $1}')" = "${overlay_hash,,}" ] || fail 'Overlay SHA-256 mismatch'
[ "$(readlink -f "$app_root/current")" = "$expected_previous" ] || fail 'Current release changed; review the deployment baseline'
[ -d "$expected_previous" ] || fail 'Expected previous release is missing'
[ ! -e "$new_release" ] && [ ! -L "$new_release" ] || fail 'New immutable release already exists; do not overwrite or delete it'
[ "$(docker inspect --format '{{.Config.Image}}' mealq-api-1)" = "$expected_api_image" ] || fail 'API image changed; review before proceeding'
[ "$(docker inspect --format '{{.Config.Image}}' mealq-web-1)" = 'mealq-web:20261019-catalogue-v2-r2' ] || fail 'Web image changed; review before proceeding'
docker image inspect "$new_web_image" >/dev/null 2>&1 && fail 'New image tag already exists; choose a fresh release instead of overwriting it'
test -s "$shared/compose.env"
mkdir -m 700 "$safety"
printf '%s\n' "$expected_previous" > "$safety/current-target-before.txt"
cp -p "$shared/compose.env" "$safety/compose-before.env"
docker inspect mealq-api-1 mealq-web-1 mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 > "$safety/containers-before.json"
docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}}' mealq-api-1 mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 > "$safety/protected-before.txt"
previous_web_image=$(docker inspect --format '{{.Config.Image}}' mealq-web-1)
previous_web_id=$(docker inspect --format '{{.Id}}' mealq-web-1)
docker image inspect "$previous_web_image" >/dev/null
[ "$(docker image inspect --format '{{.Id}}' "$previous_web_image")" = "$(docker inspect --format '{{.Image}}' mealq-web-1)" ] || fail 'Previous web tag no longer points at its running image'
[ "$(docker image inspect --format '{{.Id}}' "$expected_api_image")" = "$(docker inspect --format '{{.Image}}' mealq-api-1)" ] || fail 'Pinned API tag no longer points at its running image'
printf '%s\n' "$previous_web_image" > "$safety/previous-web-image.txt"
printf '%s\n' "$overlay_hash" > "$safety/overlay.sha256"
python3 - "$safety/containers-before.json" <<'PY'
import json, sys
containers = json.load(open(sys.argv[1]))
web = next(row for row in containers if row['Name'] == '/mealq-web-1')
ports = web['NetworkSettings']['Ports']['80/tcp']
assert ports == [{'HostIp': '127.0.0.1', 'HostPort': '8088'}], 'Unexpected existing MealQ bind'
for row in containers:
    assert row['State']['Running'], 'A baseline container is not running'
    if row['Name'] != '/mealq-tunnel-tunnel-1':
        assert row['State']['Health']['Status'] == 'healthy', 'A baseline container is unhealthy'
PY

cat > "$safety/rollback-images.yaml" <<EOF
services:
  api:
    image: $expected_api_image
  web:
    image: $previous_web_image
EOF

finish() {
  status=$?
  trap - EXIT INT TERM
  if [ "$completed" = false ] && [ "$activation_started" = true ]; then
    set +e
    printf 'Activation did not pass; restoring previous MealQ web only.\n' >&2
    cp -p "$shared/compose.env" "$safety/compose-at-failure.env"
    readlink -f "$app_root/current" > "$safety/current-at-failure.txt"
    docker inspect mealq-web-1 > "$safety/web-at-failure.json" 2>/dev/null
    cp -p "$safety/compose-before.env" "$shared/compose.env"
    env MEALQ_RELEASE=20261019-catalogue-v2-r2 docker compose -p mealq \
      --env-file "$safety/compose-before.env" \
      -f "$expected_previous/deploy/compose.yaml" -f "$safety/rollback-images.yaml" \
      up -d --no-deps --no-build --wait --wait-timeout 180 web > "$safety/rollback.log" 2>&1
    rollback_status=$?
    ln -s "$expected_previous" "$app_root/current.rollback.$stamp"
    mv -Tf "$app_root/current.rollback.$stamp" "$app_root/current"
    docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}}' mealq-api-1 mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 > "$safety/protected-after-rollback.txt"
    cmp -s "$safety/protected-before.txt" "$safety/protected-after-rollback.txt"
    protected_status=$?
    printf 'Rollback result=%s; protected-container comparison=%s; inspect %s\n' "$rollback_status" "$protected_status" "$safety" >&2
    [ "$rollback_status" -eq 0 ] && [ "$protected_status" -eq 0 ] || status=1
  fi
  if [ "$status" -ne 0 ]; then printf 'Failed attempt retained for review at %s; no automatic deletion performed.\n' "$safety" >&2; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# All preparation creates a separate source/image; the old release stays intact.
cp -a "$expected_previous" "$new_release"
python3 - "$overlay" "$new_release" <<'PY'
import pathlib, shutil, sys, tarfile
archive_path, target_path = sys.argv[1:]
target = pathlib.Path(target_path).resolve()
seen = set()
with tarfile.open(archive_path, 'r:*') as archive:
    members = archive.getmembers()
    checked = []
    for member in members:
        path = pathlib.PurePosixPath(member.name)
        if str(path) == '.' and member.isdir():
            continue
        if path.is_absolute() or '..' in path.parts or '\\' in member.name or ':' in member.name:
            raise SystemExit('Unsafe overlay path')
        if not (member.isfile() or member.isdir()):
            raise SystemExit('Overlay links/devices are forbidden')
        if any(part in {'node_modules', '.git', '.ssh', '.aws', '.codex', '.agents'} or part.startswith('.env') for part in path.parts):
            raise SystemExit('Private or dependency path in overlay')
        name = str(path)
        if not (name == 'frontend' or name.startswith('frontend/') or name == 'docs' or name.startswith('docs/') or name in {'deploy', 'deploy/frontend.Dockerfile', 'deploy/nginx.conf'}):
            raise SystemExit('Overlay may only contain frontend/, docs/, frontend.Dockerfile and nginx.conf')
        if member.isfile() and name in seen:
            raise SystemExit('Repeated overlay file')
        if member.isfile():
            seen.add(name)
        checked.append((member, path))
    if not {'frontend/dist/index.html', 'deploy/frontend.Dockerfile', 'deploy/nginx.conf'}.issubset(seen):
        raise SystemExit('Overlay is missing the tested frontend build or Docker/nginx files')
    for member, path in checked:
        destination = target.joinpath(*path.parts)
        cursor = target
        for part in path.parts:
            cursor = cursor / part
            if cursor.is_symlink():
                raise SystemExit('Overlay destination contains a symlink')
        if member.isdir():
            destination.mkdir(parents=True, exist_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, destination.open('wb') as output:
                shutil.copyfileobj(source, output)
            destination.chmod(0o755 if member.mode & 0o111 else 0o644)
PY

# Pin images independently so a later compose command cannot replace the API.
python3 - "$new_release/deploy/compose.yaml" "$expected_api_image" "$new_web_image" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
service = None
counts = {'api': 0, 'web': 0}
images = {'api': sys.argv[2], 'web': sys.argv[3]}
result = []
for line in path.read_text().splitlines():
    match = re.fullmatch(r'  ([A-Za-z0-9_-]+):', line)
    if match:
        service = match.group(1)
    if service in images and line.startswith('    image:'):
        line = '    image: ' + images[service]
        counts[service] += 1
    result.append(line)
assert counts == {'api': 1, 'web': 1}, 'Unexpected compose service definitions'
content = '\n'.join(result) + '\n'
assert '127.0.0.1:${MEALQ_PORT:-8088}:80' in content, 'Unexpected web port definition'
assert 'name: mealq_default' in content, 'Unexpected application network'
path.write_text(content)
PY

{
  env MEALQ_RELEASE="$release_tag" docker compose -p mealq --env-file "$safety/compose-before.env" \
    -f "$new_release/deploy/compose.yaml" config --format json | \
    python3 -c 'import json,sys; c=json.load(sys.stdin); w=c["services"]["web"]; p=w["ports"]; assert c["services"]["api"]["image"]==sys.argv[1]; assert w["image"]==sys.argv[2]; assert len(p)==1 and p[0]["target"]==80 and str(p[0]["published"])=="8088" and p[0]["host_ip"]=="127.0.0.1"' "$expected_api_image" "$new_web_image"
} > "$safety/config-check.log" 2>&1
docker build -t "$new_web_image" -f "$new_release/deploy/frontend.Dockerfile" "$new_release" > "$safety/build-web.log" 2>&1
# The short-lived config-test container is retained, not automatically removed.
check_name="mealq-home-nginx-check-$stamp"
docker run --name "$check_name" --network mealq_default "$new_web_image" nginx -t > "$safety/nginx-test.log" 2>&1
docker inspect "$check_name" > "$safety/nginx-test-container.json"

# A verified fresh snapshot is mandatory before the first live setting changes.
previous_backup=$(readlink -f "$shared/backups/daily/latest")
sh "$shared/operations/backup-pi.sh" > "$safety/full-backup.log" 2>&1
fresh_backup=$(readlink -f "$shared/backups/daily/latest")
[ "$fresh_backup" != "$previous_backup" ] || fail 'Full backup did not produce a fresh completed snapshot'
case "$fresh_backup" in "$shared"/backups/daily/*) ;; *) fail 'Unexpected fresh backup path';; esac
test -f "$fresh_backup/COMPLETE"
(cd "$fresh_backup" && sha256sum -c SHA256SUMS >/dev/null && sha256sum -c package.sha256 >/dev/null)
printf '%s\n' "$fresh_backup" > "$safety/full-backup-path.txt"
docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}}' mealq-api-1 mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 > "$safety/protected-before-activation.txt"
cmp -s "$safety/protected-before.txt" "$safety/protected-before-activation.txt" || fail 'Protected containers changed during preparation'
cmp -s "$safety/compose-before.env" "$shared/compose.env" || fail 'Compose settings changed during preparation'
[ "$(readlink -f "$app_root/current")" = "$expected_previous" ] || fail 'Current pointer changed during preparation'
[ "$(docker inspect --format '{{.Id}}' mealq-web-1)" = "$previous_web_id" ] || fail 'Previous web container changed during preparation'

activation_started=true
python3 - "$shared/compose.env" "$release_tag" "$stamp" <<'PY'
import os, pathlib, sys
path = pathlib.Path(sys.argv[1])
lines = path.read_text().splitlines()
matches = [n for n, line in enumerate(lines) if line.startswith('MEALQ_RELEASE=')]
assert len(matches) <= 1, 'Duplicate release keys require manual review'
if matches:
    lines[matches[0]] = 'MEALQ_RELEASE=' + sys.argv[2]
else:
    lines.append('MEALQ_RELEASE=' + sys.argv[2])
temporary = path.with_name(path.name + '.new.' + sys.argv[3])
with temporary.open('x') as output:
    output.write('\n'.join(lines) + '\n')
temporary.chmod(0o600)
os.replace(temporary, path)
PY
env MEALQ_RELEASE="$release_tag" docker compose -p mealq --env-file "$shared/compose.env" \
  -f "$new_release/deploy/compose.yaml" \
  up -d --no-deps --no-build --wait --wait-timeout 180 web > "$safety/activate-web.log" 2>&1
[ "$(docker inspect --format '{{.Config.Image}}' mealq-web-1)" = "$new_web_image" ] || fail 'Unexpected running web image'
curl -fsS --connect-timeout 5 --max-time 15 http://127.0.0.1:8088/api/v1/health > "$safety/health-after.json"
python3 - "$safety/health-after.json" <<'PY'
import json, sys
health = json.load(open(sys.argv[1]))
assert health.get('status') == 'ok' and health.get('database') == 'connected', 'Application health failed'
PY
curl -fsS --connect-timeout 5 --max-time 15 http://127.0.0.1:8088/ > "$safety/index-after.html"
cmp -s "$new_release/frontend/dist/index.html" "$safety/index-after.html" || fail 'Origin is not serving the new tested index'
curl -fsS --connect-timeout 5 --max-time 15 "http://127.0.0.1:8088$verify_route" > "$safety/demo-route-after.html"
cmp -s "$new_release/frontend/dist/index.html" "$safety/demo-route-after.html" || fail 'Requested route is not served by the SPA'
docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}}' mealq-api-1 mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 > "$safety/protected-after.txt"
cmp -s "$safety/protected-before.txt" "$safety/protected-after.txt" || fail 'A protected container ID or start time changed'
docker inspect mealq-api-1 mealq-web-1 mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 > "$safety/containers-after.json"
ln -s "$new_release" "$app_root/current.next.$stamp"
mv -Tf "$app_root/current.next.$stamp" "$app_root/current"
printf '%s\n' "$new_release" > "$safety/current-target-after.txt"
printf '%s\n' "$safety" > "$new_release/activation-safety-path.txt"
completed=true
printf 'Web-only deployment passed: %s\nSafety: %s\nFull backup: %s\nAPI/DB/Tunnel/muaysart IDs and start times unchanged.\n' "$release_tag" "$safety" "$fresh_backup"
