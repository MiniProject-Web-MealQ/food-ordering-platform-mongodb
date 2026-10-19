#!/bin/bash
# Explicit demo catalogue replacement, separate from code activation.
# Never deletes backups, releases, images, orders, customers or financial history.
set -Eeuo pipefail
umask 077
app=/home/linapspi4/mealq-app
shared="$app/shared"
tag=20261019-catalogue-v2
release="$app/releases/$tag"
api_image="mealq-api:$tag"
action=${1:?preview, snapshot, apply or finish}
fail() { printf 'REFUSED: %s\n' "$1" >&2; exit 1; }
protected() { docker inspect --format '{{.Name}} {{.Id}} {{.State.StartedAt}}' mealq-db-1 mealq-web-1 mealq-tunnel-tunnel-1 muaysart-site-web-1 mealq-tls8443-proxy-1 mealq-acme-dns-dns-1; }
compose() { docker compose -p mealq --env-file "$shared/compose.env" -f "$release/deploy/compose.yaml" "$@"; }
baseline() {
  [ "$(readlink -f "$app/current")" = "$release" ] || fail 'Activate tested catalogue code before resetting data'
  [ "$(docker inspect --format '{{.Config.Image}}' mealq-api-1)" = "$api_image" ] || fail 'Unexpected API image'
  [ "$(docker inspect --format '{{.Config.Image}}' mealq-web-1)" = "mealq-web:$tag" ] || fail 'Unexpected web image'
}
exec 9>"$shared/backups/catalogue-reset.lock"
flock -n 9 || fail 'Another catalogue replacement action is running'
baseline

# docker run --env-file preserves literal quote characters; Compose parses them.
# Derive a private, disposable-by-operator runtime file from the already-resolved
# service environment. The original backend.env remains unchanged and private.
runtime_env=$(mktemp "$shared/backups/catalogue-runtime-$tag-XXXXXX.env")
compose config --format json | python3 -c '
import json, os, pathlib, sys
env=json.load(sys.stdin)["services"]["api"]["environment"]
assert isinstance(env,dict)
lines=[]
for key,value in env.items():
    if value is None: continue
    value=str(value)
    assert "=" not in key and not any(c in key+value for c in "\r\n\0"), "Invalid environment entry"
    lines.append(key+"="+value)
path=pathlib.Path(sys.argv[1]); path.write_text("\n".join(lines)+"\n"); path.chmod(0o600)
' "$runtime_env"

if [ "$action" = preview ]; then
  stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  docker run --name "mealq-catalogue-preview-$stamp" --network mealq_default \
    --user "$(id -u):$(id -g)" --env-file "$runtime_env" \
    "$api_image" node scripts/replace-live-catalogue.js preview
  exit 0
fi

fresh_backup() {
  local before fresh
  before=$(readlink -f "$shared/backups/daily/latest")
  sh "$shared/operations/backup-pi.sh" > "$safety/$1-backup.log" 2>&1
  fresh=$(readlink -f "$shared/backups/daily/latest")
  [ "$before" != "$fresh" ] && [ -f "$fresh/COMPLETE" ] || fail 'A new complete full backup is required'
  case "$fresh" in "$shared/backups/daily/"*) ;; *) fail 'Unexpected full backup location';; esac
  (cd "$fresh" && sha256sum -c SHA256SUMS >/dev/null && sha256sum -c package.sha256 >/dev/null)
  gzip -t "$fresh/mealq.archive.gz"
  printf '%s\n' "$fresh" > "$safety/$1-backup-path.txt"
}

if [ "$action" = snapshot ]; then
  [ "$(docker inspect --format '{{.State.Running}}' mealq-api-1)" = true ] || fail 'API must be healthy before starting a new maintenance run'
  [ "$(docker inspect --format '{{.State.Health.Status}}' mealq-api-1)" = healthy ] || fail 'API is not healthy'
  [ ! -e "$release/catalogue-reset-safety-path.txt" ] || fail 'A reset run already exists; resume its explicit safety path'
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  safety="$shared/backups/catalogue-reset-$stamp"
  [ ! -e "$safety" ] && [ ! -L "$safety" ] || fail 'Safety directory already exists'
  mkdir -m 700 "$safety"
  protected > "$safety/protected-before.txt"
  cp -p "$shared/backend.env" "$safety/backend-before.env"
  cp -p "$shared/compose.env" "$safety/compose-before.env"
  docker inspect mealq-api-1 > "$safety/api-before.json"
  printf '%s\n' "$safety" > "$release/catalogue-reset-safety-path.txt"
  # Back up before the first settings edit; stop API to fence in-flight checkouts,
  # Socket.IO sessions and all background mail/push/checkout workers.
  fresh_backup before-maintenance
  compose stop -t 30 api > "$safety/stop-api.log" 2>&1
  [ "$(docker inspect --format '{{.State.Running}}' mealq-api-1)" = false ] || fail 'API failed to stop'
  docker run --name "mealq-catalogue-pause-$stamp" --network mealq_default \
    --user "$(id -u):$(id -g)" --env-file "$runtime_env" \
    "$api_image" node -e '
const assert=require("node:assert/strict"), mongoose=require("mongoose"), Settings=require("./src/models/SystemSettings");
(async()=>{await mongoose.connect(process.env.MONGO_URI);assert.equal(mongoose.connection.name,"mealq");const row=await Settings.findById("global").lean();const previous=row?.accepting_orders??true;assert.equal(typeof previous,"boolean");await Settings.findByIdAndUpdate("global",{$set:{accepting_orders:false}}, {upsert:true,setDefaultsOnInsert:true});console.log(JSON.stringify({previousAcceptingOrders:previous,globalExisted:Boolean(row),serviceFee:row?.service_fee??4}));})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>mongoose.disconnect());
' > "$safety/settings-before.json" 2> "$safety/pause-errors.log"
  fresh_backup consistent
  fresh=$(cat "$safety/consistent-backup-path.txt")
  python3 - "$safety" "$fresh" <<'PY'
import datetime, hashlib, json, pathlib, sys
safety=pathlib.Path(sys.argv[1]); backup=pathlib.Path(sys.argv[2]); setting=json.loads((safety/'settings-before.json').read_text())
assert isinstance(setting['previousAcceptingOrders'],bool)
metadata={'release':'20261019-catalogue-v2','runId':'20261019-v2','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'snapshot':backup.name,'backup':str(backup),'mongoSha256':hashlib.sha256((backup/'mealq.archive.gz').read_bytes()).hexdigest(),
 'packageSha256':(backup/'package.sha256').read_text().split()[0],'previousAcceptingOrders':setting['previousAcceptingOrders']}
with (safety/'maintenance.json').open('x') as file: json.dump(metadata,file,indent=2); file.write('\n')
PY
  protected > "$safety/protected-after-stop.txt"
  cmp "$safety/protected-before.txt" "$safety/protected-after-stop.txt"
  printf 'Maintenance snapshot ready. API remains stopped for verified encrypted off-Pi backup.\nSafety: %s\nSnapshot: %s\nAfter sync, create offpi-verified.json with verified=true, snapshot and packageSha256 matching maintenance.json; then run apply with this safety path.\n' "$safety" "$fresh"
  exit 0
fi

[[ "$action" = apply || "$action" = finish ]] || fail 'Unknown action'
safety=${2:?explicit safety directory from snapshot}
[[ "$safety" =~ ^/home/linapspi4/mealq-app/shared/backups/catalogue-reset-[0-9]{8}T[0-9]{6}Z$ ]] || fail 'Invalid safety path'
[ -d "$safety" ] && [ ! -L "$safety" ] || fail 'Safety directory must be a real directory'
[ "$(cat "$release/catalogue-reset-safety-path.txt")" = "$safety" ] || fail 'Safety directory differs from active run'
cmp "$safety/backend-before.env" "$shared/backend.env" || fail 'Backend settings changed during maintenance'
cmp "$safety/compose-before.env" "$shared/compose.env" || fail 'Compose settings changed during maintenance'
protected > "$safety/protected-before-$action-$$.txt"
cmp "$safety/protected-before.txt" "$safety/protected-before-$action-$$.txt"
stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"

if [ "$action" = apply ]; then
  [ "$(docker inspect --format '{{.State.Running}}' mealq-api-1)" = false ] || fail 'API and background workers must remain stopped'
  python3 - "$safety" <<'PY'
import hashlib,json,pathlib,sys
safety=pathlib.Path(sys.argv[1]);meta=json.loads((safety/'maintenance.json').read_text());proof=json.loads((safety/'offpi-verified.json').read_text())
assert meta['release']=='20261019-catalogue-v2' and meta['runId']=='20261019-v2'
assert proof['verified'] is True and proof['snapshot']==meta['snapshot'] and proof['packageSha256']==meta['packageSha256'], 'Off-Pi verification evidence mismatch'
backup=pathlib.Path(meta['backup']); assert backup.parent==safety.parent/'daily' and backup.name==meta['snapshot']
assert (backup/'COMPLETE').is_file() and hashlib.sha256((backup/'mealq.archive.gz').read_bytes()).hexdigest()==meta['mongoSha256']
PY
  readarray -t info < <(python3 - "$safety/maintenance.json" <<'PY'
import json,sys
meta=json.load(open(sys.argv[1]));print(meta['snapshot']);print(meta['mongoSha256'])
PY
)
  backup_inside="/safety/daily/${info[0]}/mealq.archive.gz"
  # Every retained one-shot container imports scripts/models only. The server,
  # email transports and timer workers are never started in these containers.
  phases=(prepare apply verify)
  if [ -f "$safety/apply-started.json" ]; then phases=(apply verify); fi
  if [ -f "$safety/applied.json" ]; then phases=(verify); fi
  for phase in "${phases[@]}"; do
    options=()
    if [ "$phase" = apply ]; then options+=(--cancel-active); fi
    docker run --name "mealq-catalogue-reset-$phase-$stamp" --network mealq_default \
      --user "$(id -u):$(id -g)" --env-file "$runtime_env" \
      -v "$shared/backups:/safety" -v "$release/frontend/public:/assets:ro" \
      -e MEALQ_CATALOGUE_GUARD=REPLACE_ALL_MERCHANTS_STORES_MENUS:20261019-v2 \
      -e MEALQ_API_STOPPED=YES -e "MEALQ_CATALOGUE_WORKDIR=/safety/${safety##*/}" \
      -e MEALQ_CATALOGUE_ASSET_ROOT=/assets -e "MEALQ_CATALOGUE_BACKUP=$backup_inside" \
      -e "MEALQ_CATALOGUE_BACKUP_SHA256=${info[1]}" \
      "$api_image" node scripts/replace-live-catalogue.js "$phase" "${options[@]}" \
      > "$safety/$phase-$stamp.log" 2>&1 || {
        status=$?
        printf 'Catalogue phase %s failed. API remains stopped; all archives and partial stages retained at %s. Resume the same run after reviewing its log.\n' "$phase" "$safety" >&2
        exit "$status"
      }
  done
  protected > "$safety/protected-after-apply-$stamp.txt"
  cmp "$safety/protected-before.txt" "$safety/protected-after-apply-$stamp.txt"
  printf '%s\n' "$stamp" > "$safety/reset-verified.txt"
  printf 'Catalogue replacement verified. API remains stopped. Run finish with %s to restore previous ordering mode and start only API.\n' "$safety"
  exit 0
fi

test -s "$safety/reset-verified.txt" || fail 'Complete prepare/apply/verify before restarting API'
previous=$(python3 -c 'import json,sys; print("true" if json.load(open(sys.argv[1]))["previousAcceptingOrders"] else "false")' "$safety/maintenance.json")
docker run --name "mealq-catalogue-resume-settings-$stamp" --network mealq_default \
  --user "$(id -u):$(id -g)" --env-file "$runtime_env" -e "MEALQ_RESUME_ORDERS=$previous" \
  "$api_image" node -e '
const assert=require("node:assert/strict"),mongoose=require("mongoose"),Settings=require("./src/models/SystemSettings");
(async()=>{assert.ok(["true","false"].includes(process.env.MEALQ_RESUME_ORDERS));await mongoose.connect(process.env.MONGO_URI);assert.equal(mongoose.connection.name,"mealq");await Settings.updateOne({_id:"global"},{$set:{accepting_orders:process.env.MEALQ_RESUME_ORDERS==="true"}});console.log("Previous ordering mode restored");})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>mongoose.disconnect());
' > "$safety/resume-settings-$stamp.log" 2>&1
compose up -d --no-deps --no-build --wait --wait-timeout 180 api > "$safety/start-api-$stamp.log" 2>&1
# Re-resolve the API's Docker address without recreating or restarting web.
docker exec mealq-web-1 nginx -t > "$safety/nginx-check-$stamp.log" 2>&1
docker exec mealq-web-1 nginx -s reload > "$safety/nginx-reload-$stamp.log" 2>&1
curl -fsS --max-time 15 http://127.0.0.1:8088/api/v1/health > "$safety/health-after-$stamp.json"
curl -fsS --max-time 15 http://127.0.0.1:8088/api/v1/restaurants > "$safety/restaurants-after-$stamp.json"
curl -fsS --max-time 15 http://127.0.0.1:8088/api/v1/menus > "$safety/menus-after-$stamp.json"
python3 - "$safety" "$stamp" <<'PY'
import json,pathlib,sys
root=pathlib.Path(sys.argv[1]);stamp=sys.argv[2]
health=json.loads((root/f'health-after-{stamp}.json').read_text());assert health['status']=='ok' and health['database']=='connected'
stores=json.loads((root/f'restaurants-after-{stamp}.json').read_text())['restaurants'];menus=json.loads((root/f'menus-after-{stamp}.json').read_text())['menus']
assert len(stores)==6 and len(menus)==48 and len({m['cuisine'] for m in menus})==6 and len({m['category'] for m in menus})==4
assert all(s['status']=='active' and s['isOpen'] and s['logo'].startswith('/catalogue/20261019-v2/') for s in stores)
assert all(m['isAvailable'] and m['image'].startswith('/catalogue/20261019-v2/') for m in menus)
PY
docker run --name "mealq-catalogue-merchant-login-$stamp" --network mealq_default \
  --user "$(id -u):$(id -g)" -v "$safety:/catalogue-work:ro" \
  "$api_image" node -e '
const assert=require("node:assert/strict"),fs=require("node:fs");
(async()=>{const credentials=JSON.parse(fs.readFileSync("/catalogue-work/merchant-credentials.json","utf8"));for(const account of credentials.accounts){const response=await fetch("http://api:5000/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://mealq.site"},body:JSON.stringify({email:account.email,password:account.password,portal:"merchant"}),signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,"New merchant login failed");const body=await response.json();assert.equal(body.user.id,account.userId);assert.equal(body.store.id,account.storeId);assert.equal(body.user.mustChangePassword,true);const cookie=response.headers.getSetCookie().find(value=>value.startsWith("mealq_session="))?.split(";")[0];assert.ok(cookie);const logout=await fetch("http://api:5000/api/v1/auth/logout",{method:"POST",headers:{Cookie:cookie,Origin:"https://mealq.site"},signal:AbortSignal.timeout(15000)});assert.equal(logout.status,200);}console.log(JSON.stringify({ok:true,newMerchantLogins:credentials.accounts.length,firstPasswordChangeRequired:true}));})().catch(error=>{console.error(error.message);process.exitCode=1});
' > "$safety/merchant-login-$stamp.log" 2>&1
protected > "$safety/protected-after-finish-$stamp.txt"
cmp "$safety/protected-before.txt" "$safety/protected-after-finish-$stamp.txt"
credential_copy="$shared/demo-credentials-catalogue-20261019-v2.json"
if [ -e "$credential_copy" ]; then
  cmp "$safety/merchant-credentials.json" "$credential_copy" || fail 'Existing private credential copy differs; preserve both for review'
else
  cp -p "$safety/merchant-credentials.json" "$credential_copy"
  chmod 600 "$credential_copy"
fi
printf '%s\n' "$stamp" > "$safety/finished.txt"
printf 'Catalogue live: six stores, forty-eight menus, sixty images. Customer/admin/order/financial history retained. Protected web/DB/Tunnel/other projects unchanged.\nPrivate merchant credentials: %s/merchant-credentials.json\nCreate a post-reset full backup and verify an encrypted off-Pi copy.\n' "$safety"
