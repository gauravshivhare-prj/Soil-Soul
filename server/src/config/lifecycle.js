// Process lifecycle state shared by server.js (which starts shutdown) and the readiness probe.
let shuttingDown = false;

/** Mark the process as draining: readiness reports 503 from now on. Irreversible. */
export function markShuttingDown() {
  shuttingDown = true;
}

export function isShuttingDown() {
  return shuttingDown;
}
