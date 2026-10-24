import ProductDetailView from "@/components/store/ProductDetailView";

// Product data is loaded from the API in the browser (see ProductDetailView), so pages stay
// correct as the catalog changes and the build does not depend on a running backend.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return { title: `${name || "Product"} | Soil & Soul` };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  return <ProductDetailView slug={slug} />;
}
