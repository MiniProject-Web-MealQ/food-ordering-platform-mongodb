const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { fork } = require("node:child_process");
const mongoose = require("mongoose");
const { startTestSmtp } = require("./smtp-inbox");

async function startIsolatedServer(prefix) {
  assert.ok(["mealq_workflow_", "mealq_otp_"].includes(prefix));
  const uri = new URL(process.env.MONGO_URI || "mongodb://127.0.0.1:27018/mealq");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname), "Tests require local MongoDB");
  const database = prefix + crypto.randomBytes(8).toString("hex"); uri.pathname = `/${database}`;
  let server, mail;
  async function close() {
    if (server && server.exitCode === null) await new Promise((resolve) => { server.once("exit", resolve); server.kill("SIGTERM"); });
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, database);
      await mongoose.connection.dropDatabase(); await mongoose.disconnect();
    }
    if (mail) await mail.close();
  }
  try {
    await mongoose.connect(uri.href);
    mail = await startTestSmtp();
    server = fork(path.resolve(__dirname, "../../src/server.js"), [], { cwd: path.resolve(__dirname, "../.."), env: { ...process.env, ...mail.env, MONGO_URI: uri.href, PORT: "0", NODE_ENV: "development", PAYMENT_MODE: "demo", SESSION_SECRET: crypto.randomUUID(), GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    server.stderr.on("data", (data) => process.stderr.write(data));
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Test backend readiness timed out")), 15000);
      server.once("error", (error) => { clearTimeout(timeout); reject(error); });
      server.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Test backend exited: ${code}`)); });
      server.on("message", (message) => { if (message.type === "ready") { clearTimeout(timeout); resolve(message.port); } });
    });
    return { base: `http://127.0.0.1:${port}/api/v1`, mail, close };
  } catch (error) { await close(); throw error; }
}

module.exports = { startIsolatedServer };
