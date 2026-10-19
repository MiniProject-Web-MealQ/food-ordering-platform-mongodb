#!/bin/sh
# Install operations independently from releases; preserve existing cron entries.
set -eu
umask 077
root=/home/linapspi4/mealq-app
source=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
operations="$root/shared/operations"
stamp="$(date +%Y%m%dT%H%M%S%z)-$$"
safety="$root/shared/backups/operations-before-$stamp"
mkdir -p -m 700 "$safety" "$operations"
if crontab -l > "$safety/crontab.txt" 2> "$safety/crontab.stderr"; then
  :
elif grep -q 'no crontab' "$safety/crontab.stderr"; then
  : > "$safety/crontab.txt"
else
  echo "Cannot read existing crontab; leaving it unchanged" >&2
  exit 1
fi
for script in backup-pi.sh backup-restore-drill.sh; do
  test -f "$source/$script"
  sh -n "$source/$script"
  if [ -f "$operations/$script" ]; then cp -p "$operations/$script" "$safety/$script"; fi
  install -m 700 "$source/$script" "$operations/$script"
done
# Pi local timezone is verified by the installer; keep every unrelated job intact.
[ "$(date +%Z)" = '+07' ] || { echo "Pi timezone must be Asia/Bangkok before installing cron" >&2; exit 1; }
python3 - "$safety/crontab.txt" "$safety/crontab.next" "$operations" "$root/shared/backups" <<'PY'
import pathlib, sys
previous = pathlib.Path(sys.argv[1]).read_text().splitlines()
marker = '# MealQ daily verified backup'
lines = [line for line in previous if not line.rstrip().endswith(marker)]
lines.append('35 3 * * * /bin/sh %s/backup-pi.sh >> %s/daily.log 2>&1 %s' % (sys.argv[3], sys.argv[4], marker))
pathlib.Path(sys.argv[2]).write_text('\n'.join(lines) + '\n')
PY
crontab "$safety/crontab.next"
crontab -l > "$safety/crontab.installed"
cmp "$safety/crontab.next" "$safety/crontab.installed"
printf 'Installed MealQ backup daily at 03:35 Asia/Bangkok; previous crontab saved at %s\n' "$safety"
