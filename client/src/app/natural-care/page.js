import { redirect } from "next/navigation";

export const metadata = { title: "Natural Products | Soil & Soul" };

export default function Page() {
  redirect("/shop/natural-products");
}
