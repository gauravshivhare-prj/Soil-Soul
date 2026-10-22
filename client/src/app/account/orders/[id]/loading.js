import { Skeleton } from "@/components/ui/States";

/* Loading UI for an order (also the Suspense boundary for `params`). */
export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading order">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
