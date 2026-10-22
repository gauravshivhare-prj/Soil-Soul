import { Skeleton } from "@/components/ui/States";

/* Loading UI for admin pages (also the Suspense boundary for dynamic params). */
export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
