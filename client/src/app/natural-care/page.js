import { redirect } from "next/navigation";

export const metadata = { title: "Soil & Plant Care | Soil & Soul" };

export default function Page() {
  redirect("/shop/soil-plant-care");
}
