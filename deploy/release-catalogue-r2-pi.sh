#!/bin/bash
# Immutable catalogue-code release. Database replacement is a separate operation.
# Preserves old releases, images, archives and verification containers.
set -Eeuo pipefail
umask 077
app=/home/linapspi4/mealq-app
shared="$app/shared"
tag=20261019-catalogue-v2-r2
previous="$app/releases/20261019-catalogue-v2"
release="$app/releases/$tag"
api_image="mealq-api:$tag"
web_image="mealq-web:$tag"
action=${1:?prepare, verify-image or activate}
fail() { printf 'REFUSED: %s\n' "$1" >&2; exit 1; }
protected() { docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}}' mealq-db-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 mealq-tls8443-proxy-1 mealq-acme-dns-dns-1; }
compose() { docker compose -p mealq --env-file "$shared/compose.env" -f "$release/deploy/compose.yaml" "$@"; }
baseline() {
  [ "$(readlink -f "$app/current")" = "$previous" ] || fail 'Current release changed'
  [ "$(docker inspect --format '{{.Config.Image}}' mealq-api-1)" = mealq-api:20261019-catalogue-v2 ] || fail 'API baseline changed'
  [ "$(docker inspect --format '{{.Config.Image}}' mealq-web-1)" = mealq-web:20261019-catalogue-v2 ] || fail 'Web baseline changed'
}
if [ "$action" = prepare ]; then
  overlay=${2:?source archive}; expected_hash=${3:?SHA-256}
  [[ "$expected_hash" =~ ^[a-fA-F0-9]{64}$ ]] || fail 'Invalid archive SHA-256'
  [ -f "$overlay" ] && [ ! -L "$overlay" ] || fail 'Source archive must be a regular file'
  overlay=$(readlink -f "$overlay")
  case "$overlay" in "$shared"/*) ;; *) fail 'Archive must be under MealQ shared';; esac
  [ "$(sha256sum "$overlay" | awk '{print $1}')" = "${expected_hash,,}" ] || fail 'Archive SHA-256 mismatch'
  baseline
  docker compose -p mealq --env-file "$shared/compose.env" -f "$previous/deploy/compose.yaml" config --format json | python3 -c 'import json,sys; s=json.load(sys.stdin)["services"]; assert s["api"]["image"]=="mealq-api:20261019-catalogue-v2" and s["web"]["image"]=="mealq-web:20261019-catalogue-v2", "Rollback compose images differ from baseline"'
  for service in api web; do
    image=$(docker inspect --format '{{.Config.Image}}' "mealq-$service-1")
    [ "$(docker image inspect --format '{{.Id}}' "$image")" = "$(docker inspect --format '{{.Image}}' "mealq-$service-1")" ] || fail 'Rollback image tag no longer matches running image'
  done
  [ ! -e "$release" ] && [ ! -L "$release" ] || fail 'Release already exists; never overwrite'
  for image in "$api_image" "$web_image"; do
    if docker image inspect "$image" >/dev/null 2>&1; then fail 'Image tag already exists'; fi
  done
  stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  safety="$shared/backups/activation-$tag-$stamp"
  mkdir -m 700 "$safety"
  cp -p "$shared/compose.env" "$safety/compose-before.env"
  cp -p "$shared/backend.env" "$safety/backend-before.env"
  protected > "$safety/protected-before.txt"
  docker inspect mealq-api-1 mealq-web-1 > "$safety/app-before.json"
  printf '%s\n' "$previous" > "$safety/previous-target.txt"
  printf '%s\n' "$expected_hash" > "$safety/source.sha256"
  cp -a "$previous" "$release"
  python3 - "$overlay" "$release" <<'PY'
import pathlib, shutil, sys, tarfile
target = pathlib.Path(sys.argv[2]).resolve()
seen = set()
with tarfile.open(sys.argv[1], 'r:*') as archive:
    checked = []
    for member in archive.getmembers():
        path = pathlib.PurePosixPath(member.name)
        if str(path) == '.' and member.isdir(): continue
        assert not path.is_absolute() and '..' not in path.parts and '\\' not in member.name and ':' not in member.name, 'Unsafe path'
        assert member.isfile() or member.isdir(), 'Links/devices forbidden'
        assert not any(p in {'node_modules', '.git', '.ssh', '.aws', '.codex', '.agents'} or p.startswith('.env') for p in path.parts), 'Private/dependency path'
        assert path.parts[0] in {'backend', 'frontend', 'deploy', 'docs'} or str(path) == '.dockerignore', 'Unexpected root'
        if member.isfile():
            assert str(path) not in seen, 'Repeated file'
            seen.add(str(path))
        checked.append((member, path))
    assert {'frontend/dist/index.html', 'backend/src/server.js', 'backend/src/models/CustomerCoupon.js', 'backend/src/services/order-store-view.js', 'backend/scripts/catalogue-replacement.js', 'backend/scripts/catalogue-v2-manifest.js', 'backend/scripts/check-catalogue-replacement.js', 'backend/scripts/replace-live-catalogue.js', 'deploy/backend.Dockerfile', 'deploy/frontend.Dockerfile', 'deploy/compose.yaml'}.issubset(seen), 'Required tested files missing'
    for member, path in checked:
        cursor = target
        for part in path.parts:
            cursor = cursor / part
            assert not cursor.is_symlink(), 'Symlink destination'
        destination = target.joinpath(*path.parts)
        if member.isdir(): destination.mkdir(parents=True, exist_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as src, destination.open('wb') as out: shutil.copyfileobj(src, out)
            destination.chmod(0o755 if member.mode & 0o111 else 0o644)
PY
  python3 - "$release/deploy/compose.yaml" "$api_image" "$web_image" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1]); service = None; counts = {'api':0,'web':0}; images = dict(zip(counts, sys.argv[2:])); result=[]
for line in path.read_text().splitlines():
    match = re.fullmatch(r'  ([A-Za-z0-9_-]+):', line)
    if match: service=match.group(1)
    if service in images and line.startswith('    image:'):
        line='    image: '+images[service]; counts[service]+=1
    result.append(line)
assert counts == {'api':1,'web':1}
path.write_text('\n'.join(result)+'\n')
PY
  compose config --format json | python3 -c 'import json,sys; c=json.load(sys.stdin); s=c["services"]; p=s["web"]["ports"]; assert s["api"]["image"]==sys.argv[1] and s["web"]["image"]==sys.argv[2]; assert not s["api"].get("ports") and not s["db"].get("ports"); assert len(p)==1 and p[0]["host_ip"]=="127.0.0.1" and str(p[0]["published"])=="8088" and p[0]["target"]==80; assert c["networks"]["default"]["name"]=="mealq_default" and c["volumes"]["db_data"]["name"]=="mealq_db_data"' "$api_image" "$web_image"
  python3 - "$release" <<'PY'
import pathlib, sys
root=pathlib.Path(sys.argv[1]); public=root/'frontend/public/catalogue/20261019-v2'; dist=root/'frontend/dist/catalogue/20261019-v2'
files=list(public.glob('*/*.webp'))
assert len(files)==60 and len(list(dist.glob('*/*.webp')))==60, 'Exactly sixty generated catalogue images are required'
assert len({file.parent.name for file in files})==6
for file in files:
    data=file.read_bytes(); assert len(data)>100 and data[:4]==b'RIFF' and data[8:12]==b'WEBP', 'Invalid WebP'
    assert data==(dist/file.relative_to(public)).read_bytes(), 'Built image differs from reviewed public asset'
PY
  docker build -t "$api_image" -f "$release/deploy/backend.Dockerfile" "$release" > "$safety/build-api.log" 2>&1
  docker build -t "$web_image" -f "$release/deploy/frontend.Dockerfile" "$release" > "$safety/build-web.log" 2>&1
  docker run --name "mealq-catalogue-nginx-check-$stamp" --network mealq_default "$web_image" nginx -t > "$safety/nginx-test.log" 2>&1
  protected > "$safety/protected-after-prepare.txt"
  cmp "$safety/protected-before.txt" "$safety/protected-after-prepare.txt"
  printf '%s\n' "$safety" > "$release/activation-safety-path.txt"
  printf 'Prepared %s\nSafety: %s\n' "$release" "$safety"
  exit 0
fi
if [ "$action" = verify-image ]; then
  baseline
  safety=$(cat "$release/activation-safety-path.txt")
  case "$safety" in "$shared/backups/activation-$tag-"*) ;; *) fail 'Invalid safety directory';; esac
  stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  evidence="$safety/verification-$stamp"
  mkdir -m 700 "$evidence"
  name="mealq-catalogue-verification-$stamp"
  # No production env file, SMTP/VAPID credentials or background server. Each
  # integration suite creates a random local database and archives it before drop.
  if docker run --name "$name" --network container:mealq-db-1 \
    --user "$(id -u):$(id -g)" --cpus 1 --memory 512m \
    -v "$evidence:/verification" -e TMPDIR=/verification \
    -e CATALOGUE_TEST_ARCHIVE_ROOT=/verification/catalogue \
    -e CATALOGUE_TEST_MONGO_URI=mongodb://127.0.0.1:27017/mealq_verification_unused \
    -e NODE_ENV=development -e PAYMENT_MODE=demo \
    -e MONGO_URI=mongodb://127.0.0.1:27017/mealq_verification_unused \
    -e FRONTEND_URL=https://mealq.site \
    -e SESSION_SECRET=synthetic-local-release-verification-only \
    "$api_image" sh -c 'npm test' \
    > "$evidence/results.log" 2>&1; then
    docker inspect "$name" > "$evidence/container.json"
    sha256sum "$evidence/results.log" > "$evidence/results.sha256"
    protected > "$evidence/protected-after.txt"
    cmp "$safety/protected-before.txt" "$evidence/protected-after.txt"
    printf '%s\n' "$evidence" > "$safety/verification-passed.txt"
    tail -n 20 "$evidence/results.log"
    printf 'Image verification passed; evidence retained: %s\n' "$evidence"
  else
    status=$?
    docker inspect "$name" > "$evidence/container.json" 2>/dev/null || true
    tail -n 70 "$evidence/results.log"
    printf 'Verification failed; container/data/logs retained: %s\n' "$evidence" >&2
    exit "$status"
  fi
  exit 0
fi
[ "$action" = activate ] || fail 'Unknown action'
baseline
safety=$(cat "$release/activation-safety-path.txt")
case "$safety" in "$shared/backups/activation-$tag-"*) ;; *) fail 'Invalid safety directory';; esac
test -s "$safety/verification-passed.txt" || fail 'Image verification must pass first'
cmp "$safety/backend-before.env" "$shared/backend.env" || fail 'Backend settings changed'
cmp "$safety/compose-before.env" "$shared/compose.env" || fail 'Compose settings changed'
protected > "$safety/protected-before-activation.txt"
cmp "$safety/protected-before.txt" "$safety/protected-before-activation.txt"
before=$(readlink -f "$shared/backups/daily/latest")
sh "$shared/operations/backup-pi.sh" > "$safety/full-backup.log" 2>&1
fresh=$(readlink -f "$shared/backups/daily/latest")
[ "$before" != "$fresh" ] && [ -f "$fresh/COMPLETE" ] || fail 'Fresh full backup required'
case "$fresh" in "$shared/backups/daily/"*) ;; *) fail 'Unexpected backup location';; esac
(cd "$fresh" && sha256sum -c SHA256SUMS >/dev/null && sha256sum -c package.sha256 >/dev/null)
printf '%s\n' "$fresh" > "$safety/full-backup-path.txt"
completed=false
rollback() {
  status=$?
  trap - EXIT INT TERM
  if [ "$completed" = false ]; then
    set +e
    cp -p "$shared/compose.env" "$safety/compose-at-failure.env"
    docker inspect mealq-api-1 mealq-web-1 > "$safety/app-at-failure.json" 2>/dev/null
    cp -p "$safety/compose-before.env" "$shared/compose.env"
    docker compose -p mealq --env-file "$shared/compose.env" -f "$previous/deploy/compose.yaml" up -d --no-deps --no-build --wait --wait-timeout 180 api web > "$safety/rollback.log" 2>&1
    result=$?
    ln -s "$previous" "$app/current.rollback.$$" && mv -Tf "$app/current.rollback.$$" "$app/current"
    printf 'Rollback result %s; evidence retained at %s\n' "$result" "$safety" >&2
    status=1
  fi
  exit "$status"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 - "$shared/compose.env" "$tag" <<'PY'
import os, pathlib, sys
path=pathlib.Path(sys.argv[1]); lines=path.read_text().splitlines(); keys=[i for i,l in enumerate(lines) if l.startswith('MEALQ_RELEASE=')]
assert len(keys)<=1
if keys: lines[keys[0]]='MEALQ_RELEASE='+sys.argv[2]
else: lines.append('MEALQ_RELEASE='+sys.argv[2])
tmp=path.with_name(path.name+'.new-catalogue-'+str(os.getpid()))
with tmp.open('x') as out: out.write('\n'.join(lines)+'\n')
tmp.chmod(0o600); os.replace(tmp,path)
PY
compose up -d --no-deps --no-build --wait --wait-timeout 180 api web > "$safety/activate.log" 2>&1
[ "$(docker inspect --format '{{.Config.Image}}' mealq-api-1)" = "$api_image" ]
[ "$(docker inspect --format '{{.Config.Image}}' mealq-web-1)" = "$web_image" ]
curl -fsS --max-time 15 http://127.0.0.1:8088/api/v1/health > "$safety/health-after.json"
python3 -c 'import json,sys; h=json.load(open(sys.argv[1])); assert h["status"]=="ok" and h["database"]=="connected"' "$safety/health-after.json"
for route in / /demo /customer/coupons /customer/notifications /customer/explore; do
  file="$safety/route$(printf '%s' "$route" | tr / _).html"
  curl -fsS --max-time 15 "http://127.0.0.1:8088$route" > "$file"
  cmp "$release/frontend/dist/index.html" "$file"
done
curl -fsS --max-time 15 'http://127.0.0.1:8088/catalogue/20261019-v2/khao-hom/logo.webp?v=20261019-v2-r2' > "$safety/logo-after.webp"
cmp "$release/frontend/dist/catalogue/20261019-v2/khao-hom/logo.webp" "$safety/logo-after.webp"
curl -fsS --max-time 15 http://127.0.0.1:8088/api/v1/restaurants > "$safety/catalogue-after.json"
python3 -c 'import json,sys; rows=json.load(open(sys.argv[1]))["restaurants"]; assert len(rows)==6 and all(row["logo"].endswith("?v=20261019-v2-r2") for row in rows)' "$safety/catalogue-after.json"
protected > "$safety/protected-after.txt"
cmp "$safety/protected-before.txt" "$safety/protected-after.txt"
cmp "$safety/backend-before.env" "$shared/backend.env"
docker inspect mealq-api-1 mealq-web-1 > "$safety/app-after.json"
ln -s "$release" "$app/current.next.$$"
mv -Tf "$app/current.next.$$" "$app/current"
completed=true
printf 'MealQ catalogue code activation passed: %s\nSafety: %s\nBackup: %s\nDatabase catalogue has not been replaced by this script. Protected DB/Tunnel/other projects unchanged.\n' "$tag" "$safety" "$fresh"
