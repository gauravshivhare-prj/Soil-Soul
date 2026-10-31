import { redirect } from "next/navigation";

export const metadata = { title: "Gardening Essentials | Soil & Soul" };

export default function Page() {
  redirect("/shop/tools");
}
