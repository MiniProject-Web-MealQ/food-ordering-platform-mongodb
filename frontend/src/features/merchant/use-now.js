import { useEffect, useState } from "react";

/** เวลาปัจจุบันที่ render ใหม่ทุก `intervalMs` ใช้กับข้อความแบบ "สั่งมา 8 นาที" */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
