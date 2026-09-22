import { apiOrigin } from "./api-client";

let socketPromise;

function ensureSocketScript() {
  if (window.io) return Promise.resolve(window.io);
  if (socketPromise) return socketPromise;

  socketPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${apiOrigin()}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve(window.io);
    script.onerror = () => reject(new Error("Socket.IO client could not be loaded"));
    document.head.appendChild(script);
  });

  return socketPromise;
}

export async function connectSocket() {
  const io = await ensureSocketScript();
  if (!io) throw new Error("Socket.IO client is unavailable");
  return io(apiOrigin(), { withCredentials: true, transports: ["websocket", "polling"] });
}
