import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import BotanicalSprig from "@/components/ui/BotanicalSprig";
import { PageTitle } from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import AccountStats from "@/features/account/AccountStats";
import OrderRow from "@/features/account/OrderRow";
import { getAddresses, getOrders, getPaymentMethods, getUser } from "@/services/account";
import { formatAddress, formatDate } from "@/lib/format";

function EditLink({ href, label }) {
  return (
    <Link href={href} className={buttonClass({ variant: "outline", size: "sm" })}>
      <Icon name="edit" size={14} /> {label}
    </Link>
  );
}

export default function AccountDashboard() {
  const user = getUser();
  const orders = getOrders();
  const addresses = getAddresses();
  const payments = getPaymentMethods();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-sand via-[#f6f1e6] to-sage-50 px-5 py-6 sm:px-7 sm:py-8">
        <BotanicalSprig className="hidden md:block right-[3%] -bottom-[30%] h-[170%] opacity-60" flip rotate={-14} eager />
        <div className="relative">
          <PageTitle>My Account</PageTitle>
          <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-body max-w-lg">
            Manage your orders, addresses, wishlist and account settings — all in one place.
          </p>
        </div>
      </section>

      <AccountStats orderCount={orders.length} addressCount={addresses.length} />

      <div className="grid gap-5 2xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader
            title="Recent Orders"
            action={<Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest no-underline hover:underline">View All Orders <Icon name="arrow-right" size={14} /></Link>}
          />
          <ul className="list-none m-0 p-0 divide-y divide-line">
            {orders.map((o) => <OrderRow key={o.id} order={o} />)}
          </ul>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-1 content-start">
          <Card>
            <CardHeader title="Profile Information" action={<EditLink href="/account/settings" label="Edit" />} />
            <dl className="m-0 grid gap-2.5 text-sm">
              {[
                ["user", "Name", user.name],
                ["mail", "Email", user.email],
                ["phone", "Phone", user.phone],
                ["calendar", "Joined", `Joined on ${formatDate(user.memberSince)}`],
              ].map(([icon, label, value]) => (
                <div key={label} className="flex items-center gap-3">
                  <dt className="text-muted"><Icon name={icon} size={17} /><span className="sr-only">{label}</span></dt>
                  <dd className="m-0 text-ink truncate">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Default Address" action={<EditLink href="/account/addresses" label="Edit" />} />
            {defaultAddress ? (
              <div className="flex gap-3 text-sm">
                <Icon name="pin" size={18} className="text-muted flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="m-0 font-semibold text-ink">{defaultAddress.name}</p>
                  <p className="m-0 mt-0.5 text-muted">{formatAddress(defaultAddress)}</p>
                  <p className="m-0 mt-0.5 text-muted">{defaultAddress.phone}</p>
                </div>
                <Badge className="self-start">Default</Badge>
              </div>
            ) : (
              <p className="m-0 text-sm text-muted">No saved address yet.</p>
            )}
          </Card>

          <Card className="md:col-span-2 2xl:col-span-1">
            <CardHeader title="Payment Methods" action={<Link href="/account/payments" className={buttonClass({ variant: "outline", size: "sm" })}>Manage</Link>} />
            <ul className="list-none m-0 p-0 divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-sand text-forest flex-shrink-0">
                    {p.type === "upi" ? <span className="text-xs font-black italic">UPI</span> : <Icon name="card" size={20} />}
                  </span>
                  <span className="flex-1 min-w-0 text-sm">
                    <span className="block font-semibold text-ink">{p.name}</span>
                    <span className="block text-xs text-muted">{p.detail}</span>
                  </span>
                  {p.isDefault && <Badge>Default</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
