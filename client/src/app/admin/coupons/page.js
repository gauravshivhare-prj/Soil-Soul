import { AdminHeader } from "@/components/admin/AdminParts";
import CouponManager from "@/features/admin/CouponManager";
import { getAdminCoupons } from "@/services/admin";

export const metadata = { title: "Coupons & Offers | Admin | Soil & Soul" };

export default function AdminCouponsPage() {
  return (
    <div>
      <AdminHeader title="Coupons & Offers" subtitle="Create and manage discount codes." />
      <CouponManager initialCoupons={getAdminCoupons()} />
    </div>
  );
}
