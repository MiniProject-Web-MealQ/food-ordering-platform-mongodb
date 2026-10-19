// Local test-only SMTP receiver. Never used by the application or real mail accounts.
const net = require("node:net");

function messageText(raw) {
  const split = raw.indexOf("\r\n\r\n");
  if (split < 0) return raw;
  const headers = raw.slice(0, split);
  const body = raw.slice(split + 4);
  // Nodemailer emits multipart/alternative when both plain text and HTML exist.
  // Read the actual text/plain part; raw HTML can contain unrelated six-digit
  // colour values and MIME boundaries must never be mistaken for OTP codes.
  if (/content-type:\s*multipart\//i.test(headers)) {
    const boundary = headers.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
    if (!boundary) throw new Error("Test SMTP message has no multipart boundary");
    const parts = body.split(`--${boundary[1] || boundary[2]}`).slice(1).filter((part) => !part.startsWith("--")).map((part) => part.replace(/^\r\n/, ""));
    const plain = parts.find((part) => /^content-type:\s*text\/plain\b/im.test(part.slice(0, part.indexOf("\r\n\r\n"))));
    if (plain) return messageText(plain);
    const nested = parts.find((part) => /^content-type:\s*multipart\//im.test(part.slice(0, part.indexOf("\r\n\r\n"))));
    if (nested) return messageText(nested);
    return parts.map(messageText).join("\n");
  }
  if (/content-transfer-encoding:\s*base64/i.test(headers)) return Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8");
  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    return Buffer.from(body.replace(/=\r\n/g, "").replace(/=([0-9a-f]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16))), "binary").toString("utf8");
  }
  return body;
}

async function startTestSmtp() {
  const messages = [];
  const sockets = new Set();
  let rejectMessages = false;
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {}); socket.setEncoding("utf8");
    socket.write("220 MealQ local test SMTP\r\n");
    let buffer = "", recipients = [], lines = [], data = false;
    socket.on("data", (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) {
          if (line === ".") {
            data = false;
            if (rejectMessages) socket.write("451 Test delivery failure\r\n");
            else {
              const text = messageText(lines.join("\r\n"));
              messages.push({ recipients: [...recipients], text, code: text.match(/\b\d{6}\b/)?.[0] });
              socket.write("250 Message accepted\r\n");
            }
            recipients = []; lines = [];
          } else lines.push(line.startsWith("..") ? line.slice(1) : line);
        } else if (/^(EHLO|HELO)\b/i.test(line)) socket.write("250 MealQ test SMTP\r\n");
        else if (/^MAIL FROM:/i.test(line)) { recipients = []; socket.write("250 OK\r\n"); }
        else if (/^RCPT TO:/i.test(line)) { recipients.push(line.match(/<([^>]+)>/)?.[1]); socket.write("250 OK\r\n"); }
        else if (/^DATA$/i.test(line)) { data = true; lines = []; socket.write("354 End with dot\r\n"); }
        else if (/^QUIT$/i.test(line)) socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    env: { SMTP_HOST: "127.0.0.1", SMTP_PORT: String(server.address().port), SMTP_SECURE: "false", SMTP_USER: "", SMTP_PASSWORD: "", SMTP_FROM: "MealQ Test <test@mealq.local>" },
    messages,
    reject(value) { rejectMessages = value; },
    codeFor(email) {
      const code = messages.findLast((message) => message.recipients.includes(email))?.code;
      if (!code) throw new Error(`No OTP received by the local test mailbox for ${email}`);
      return code;
    },
    close() { for (const socket of sockets) socket.destroy(); return new Promise((resolve) => server.close(resolve)); },
  };
}

module.exports = { startTestSmtp };
