/**
 * Admin deletion flow, shared by products and categories (no React, so it can be unit-tested):
 *   1. ask the server what deleting would involve (GET …/:id/deletion);
 *   2. if the server says it is blocked, stop and explain why — nothing is deleted;
 *   3. otherwise ask the admin to confirm, naming the item and the consequences;
 *   4. only after an explicit "yes", call DELETE with the slug as server-side confirmation.
 *
 * @param {{ label: string, loadCheck: () => Promise<{ canDelete: boolean, message: string }>,
 *           confirm: (message: string) => boolean, remove: () => Promise<any> }} steps
 * @returns {Promise<{ status: "blocked" | "cancelled" | "deleted", message?: string, result?: any }>}
 */
export async function runDeletion({ label, loadCheck, confirm, remove }) {
  const info = await loadCheck();
  if (!info?.canDelete) return { status: "blocked", message: info?.message || "This item can't be deleted." };
  const ok = confirm(deletionPrompt(label, info.message));
  if (!ok) return { status: "cancelled" };
  const result = await remove();
  return { status: "deleted", result };
}

/** The confirmation text: what is deleted, what else happens, and that it can't be undone. */
export function deletionPrompt(label, detail) {
  return `Delete “${label}” permanently?\n\n${detail}\n\nThis cannot be undone.`;
}
