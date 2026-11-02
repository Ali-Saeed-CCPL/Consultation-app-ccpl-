import { useEffect, useState } from "react";

/** The current time, re-read every `everyMs` — for clocks and "x min ago". */
export function useNow(everyMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}
