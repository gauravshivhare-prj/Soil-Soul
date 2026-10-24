/**
 * NotAvailable — honest placeholder for admin sections that have no API yet,
 * so no sample data is shown as if it were real.
 */

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { AdminHeader } from "@/components/admin/AdminParts";

export default function NotAvailable({ title, icon, description }) {
  return (
    <div>
      <AdminHeader title={title} />
      <Card>
        <EmptyState icon={icon} title="Not available yet" description={description} action={<Button href="/admin" variant="outline">Back to Dashboard</Button>} className="!py-12" />
      </Card>
    </div>
  );
}
