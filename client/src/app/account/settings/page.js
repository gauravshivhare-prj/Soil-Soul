import { SectionTitle } from "@/components/ui/PageHeader";
import AccountSettings from "@/features/account/AccountSettings";
import { getUser } from "@/services/account";

export const metadata = { title: "Account Settings | Soil & Soul" };

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">Account Settings</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Update your profile, password and preferences.</p>
      </div>
      <AccountSettings user={getUser()} />
    </div>
  );
}
