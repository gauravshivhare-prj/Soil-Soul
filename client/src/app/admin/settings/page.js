import NotAvailable from "@/components/admin/NotAvailable";

export const metadata = { title: "Settings | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminSettingsPage() {
  return <NotAvailable title="Settings" icon="settings" description="Store settings (contact details, shipping and returns policies) haven't been decided yet and can't be edited here." />;
}
