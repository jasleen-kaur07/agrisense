"use client";

import { useEffect } from "react";

/** Registers /sw.js in production only. The worker never caches /api/* or authenticated pages. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* installability is optional */
    });
  }, []);
  return null;
}
