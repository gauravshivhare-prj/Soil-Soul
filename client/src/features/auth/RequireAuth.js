"use client";

/**
 * RequireAuth — renders children only for a signed-in user (optionally an admin).
 * Signed-out visitors are sent to /login?next=<current path>; signed-in non-admins
 * on an admin page see an access message. The server still enforces every rule —
 * this guard only avoids showing pages that cannot load.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import Button from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/States";

export default function RequireAuth({ role, children }) {
  const { isReady, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isReady, isAuthenticated, pathname, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div role="status" aria-label="Checking your session" className="grid gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (role && user?.role !== role) {
    return (
      <EmptyState
        icon="lock"
        title="You don't have access to this page"
        description="This area is for store administrators."
        action={<Button href="/">Go to the Home Page</Button>}
      />
    );
  }

  return children;
}
