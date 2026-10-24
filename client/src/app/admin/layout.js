import { Suspense } from "react";
import AdminRouteFrame from "@/components/admin/AdminRouteFrame";

export const metadata = {
  title: "Admin | Soil & Soul",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <AdminRouteFrame>{children}</AdminRouteFrame>
    </Suspense>
  );
}
