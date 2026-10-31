import { redirect } from "next/navigation";

export const metadata = { title: "Plants | Soil & Soul" };

export default function Page() {
  redirect("/shop/plants");
}
