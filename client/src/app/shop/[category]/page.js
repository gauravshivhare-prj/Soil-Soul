import { redirect } from "next/navigation";
import CategoryCatalog from "@/components/store/CategoryCatalog";

// Categories come from the API at request time (see CategoryCatalog).
export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  if (slug === "natural-products") {
    return { title: "Soil & Plant Care | Soil & Soul" };
  }
  const name = slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return { title: `${name || "Category"} | Soil & Soul` };
}

export default async function CategoryPage({ params }) {
  const { category: slug } = await params;
  if (slug === "natural-products") {
    redirect("/shop/soil-plant-care");
  }
  return <CategoryCatalog slug={slug} />;
}
