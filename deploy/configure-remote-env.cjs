// Run only after explicit approval to transfer these credentials to this Pi.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const dotenv = require("../backend/node_modules/dotenv");
const local = dotenv.parse(fs.readFileSync(path.join(__dirname, "../backend/.env")));
const selected = {};
for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]) {
  if (local[key]) selected[key] = local[key];
}
if (!selected.SMTP_PASSWORD || !selected.GOOGLE_CLIENT_SECRET) throw new Error("Mail and Google configuration must be present");
const result = execFileSync("ssh", ["-o", "BatchMode=yes", "linapspi4@100.112.221.80", "python3 /home/linapspi4/mealq-app/releases/20261019-complete/deploy/configure-env.py"], { input: JSON.stringify(selected), encoding: "utf8" });
process.stdout.write(result);
