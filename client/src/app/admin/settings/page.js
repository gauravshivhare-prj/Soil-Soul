import { AdminHeader } from "@/components/admin/AdminParts";
import StoreSettings from "@/features/admin/StoreSettings";
import { getAdminSettings } from "@/services/admin";

export const metadata = { title: "Settings | Admin | Soil & Soul" };

export default function AdminSettingsPage() {
  // Form inputs work with strings.
  const initial = Object.fromEntries(Object.entries(getAdminSettings()).map(([k, v]) => [k, String(v)]));
  return (
    <div>
      <AdminHeader title="Settings" subtitle="Store information, shipping and inventory rules." />
      <StoreSettings initial={initial} />
    </div>
  );
}
