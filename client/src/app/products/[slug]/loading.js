import { PageContainer } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/States";

/* Loading UI for product pages (also the Suspense boundary for `params`). */
export default function Loading() {
  return (
    <main className="pb-12" role="status" aria-label="Loading product">
      <PageContainer className="pt-6">
        <Skeleton className="h-3 w-48" />
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-40" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
