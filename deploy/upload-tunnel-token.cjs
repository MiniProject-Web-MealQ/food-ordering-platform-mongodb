// The user supplies and authorizes this token for the dedicated MealQ Pi tunnel.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
// Read the copied command strictly as data. Never execute a clipboard command.
const text = fs.readFileSync(path.join(__dirname, "../backend/.env.tunnel"), "utf8").split("\n").filter((line) => !line.trim().startsWith("#")).join(" ").trim();
const token = text.match(/(?:--token|service install)\s+([A-Za-z0-9_+/=-]+)/)?.[1] || text;
if (!token || !/^[A-Za-z0-9_+/=-]{100,5000}$/.test(token)) throw new Error("Paste the MealQ tunnel command/token in ignored backend/.env.tunnel first");
let details;
try { details = JSON.parse(Buffer.from(token, "base64").toString()); } catch { throw new Error("Tunnel token is invalid"); }
if (details.t !== "fdda810f-d868-4378-9a48-887d21464b60") throw new Error("Token must belong to the newly created MealQ tunnel");
const script = "import os,pathlib,sys; p=pathlib.Path('/home/linapspi4/mealq-app/shared/mealq-tunnel.token'); value=sys.stdin.read().strip(); assert 100<=len(value)<=5000; fd=os.open(str(p),os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600); os.write(fd,value.encode()); os.close(fd); os.chmod(p,0o600); print('MealQ tunnel token saved privately')";
execFileSync("ssh", ["-o", "BatchMode=yes", "linapspi4@100.112.221.80", `python3 -c '${script.replaceAll("'", "'\\''")}'`], { input: token, stdio: ["pipe", "inherit", "inherit"] });
console.log(`Tunnel ID: ${details.t}`);
