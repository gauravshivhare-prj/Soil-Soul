import { PageContainer } from "@/components/ui/PageHeader";
import { ProductGridSkeleton, Skeleton } from "@/components/ui/States";

/* Route-level loading UI while a shop page is fetched. */
export default function Loading() {
  return (
    <main>
      <div className="border-b border-line bg-sand">
        <PageContainer className="py-9 lg:py-11">
          <Skeleton className="h-3 w-32 mb-4" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full mt-3" />
        </PageContainer>
      </div>
      <PageContainer className="py-8 lg:py-10">
        <ProductGridSkeleton count={8} />
      </PageContainer>
    </main>
  );
}
