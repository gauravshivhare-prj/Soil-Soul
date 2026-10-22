import { SectionTitle } from "@/components/ui/PageHeader";
import AddressBook from "@/features/account/AddressBook";
import { getAddresses } from "@/services/account";

export const metadata = { title: "Addresses | Soil & Soul" };

export default function AddressesPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">Addresses</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Manage your delivery addresses.</p>
      </div>
      <AddressBook initialAddresses={getAddresses()} />
    </div>
  );
}
