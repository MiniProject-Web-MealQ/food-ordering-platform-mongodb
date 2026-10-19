# Receives selected settings over SSH stdin; never prints secret values.
import json
import os
import pathlib
import shutil
import sys

root = pathlib.Path("/home/linapspi4/mealq-app/shared")
target = root / "backend.env"
values = {}
for line in target.read_text().splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        try:
            value = json.loads(value)
        except (ValueError, TypeError):
            pass
        values[key] = value
backup = root / "backups/backend-before-20261019.env"
if not backup.exists():
    shutil.copy2(target, backup)
old_origins = str(values.get("FRONTEND_URL", "")).split(",")
values.update(json.load(sys.stdin))
values.update({"NODE_ENV": "production", "PORT": "5000", "PAYMENT_MODE": "demo", "TRUST_PROXY_HOPS": "2", "GOOGLE_REDIRECT_URI": "https://mealq.site/api/v1/auth/google/callback"})
values["FRONTEND_URL"] = ",".join(dict.fromkeys(["https://mealq.site", "https://www.mealq.site"] + [origin.strip() for origin in old_origins if origin.strip()]))
values.pop("DEMO_PAYMENTS_ENABLED", None)
assert str(values.get("MONGO_URI", "")).startswith("mongodb://db:27017/"), "Retain the existing MealQ database"
temporary = target.with_suffix(".env.next")
temporary.write_text("".join(key + "=" + json.dumps(str(value), ensure_ascii=False) + "\n" for key, value in values.items()))
os.chmod(temporary, 0o600)
os.replace(temporary, target)
print("Environment saved privately; existing database and session secret retained.")
