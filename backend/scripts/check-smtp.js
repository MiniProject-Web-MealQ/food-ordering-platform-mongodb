const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { mailConfigured, verifyMailConnection } = require("../src/services/mail");

async function run() {
  if (!mailConfigured()) throw Object.assign(new Error("Configure SMTP_HOST and SMTP_FROM in backend/.env"), { code: "EMAIL_NOT_CONFIGURED" });
  await verifyMailConnection();
  console.log("SMTP authentication verified. No email was sent.");
}
run().catch((error) => {
  console.error(`SMTP verification failed: ${error.code || "CONNECTION_ERROR"}${error.responseCode ? ` (${error.responseCode})` : ""}. Check backend/.env; credentials are not printed.`);
  process.exitCode = 1;
});
