import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/Badge";
import ProductImage from "@/components/ui/ProductImage";
import { buttonClass } from "@/components/ui/Button";
import { AdminHeader, Avatar, DataTable, StatCard } from "@/components/admin/AdminParts";
import { BarChart, DonutChart } from "@/components/admin/Charts";
import { getAdminOrders, getDashboard, getLowStockProducts } from "@/services/admin";
import { formatDate, formatNumber, formatPrice, pluralize } from "@/lib/format";
import { adminOrderHref, adminProductHref } from "@/lib/routes";

const STATUS_COLORS = { delivered: "#24452a", shipped: "#b9c9a6", processing: "#ecd9b0", cancelled: "#e07a5f" };
const CATEGORY_COLORS = ["#24452a", "#9fbf8c", "#ecd9b0", "#d9c9a3", "#e07a5f", "#c6d6b3"];

const QUICK_ACTIONS = [
  { icon: "sprout", title: "Manage Products", text: "Add, edit or remove products from your store.", href: "/admin/products" },
  { icon: "grid", title: "Manage Categories", text: "Organise your products with categories.", href: "/admin/categories" },
  { icon: "users", title: "View Customers", text: "See customer details and order history.", href: "/admin/customers" },
  { icon: "settings", title: "Store Settings", text: "Update store information, shipping and more.", href: "/admin/settings" },
];

function ViewAll({ href, children }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest no-underline hover:underline whitespace-nowrap">
      {children} <Icon name="arrow-right" size={14} />
    </Link>
  );
}

export default function AdminDashboard() {
  const d = getDashboard();
  const orders = getAdminOrders().slice(0, 5);
  const lowStock = getLowStockProducts().slice(0, 5);
  const statusTotal = Object.values(d.orderStatus).reduce((a, b) => a + b, 0);

  return (
    <div>
      <AdminHeader
        title="Welcome Back, Admin"
        subtitle="Here's what's happening with your store today."
        actions={
          <span className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-line bg-white text-sm text-ink">
            <Icon name="calendar" size={16} className="text-muted" /> {d.range}
          </span>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon="box" label="Total Orders" value={formatNumber(d.metrics.orders.value)} change={d.metrics.orders.change} note={d.metrics.orders.note} />
        <StatCard icon="cart" label="Total Sales" value={formatPrice(d.metrics.sales.value)} change={d.metrics.sales.change} note={d.metrics.sales.note} tone="gold" />
        <StatCard icon="users" label="Total Customers" value={formatNumber(d.metrics.customers.value)} change={d.metrics.customers.change} note={d.metrics.customers.note} />
        <StatCard icon="sprout" label="Products" value={d.metrics.products.value} change={d.metrics.products.change} note={d.metrics.products.note} tone="gold" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr_1fr]">
        <Card className="min-w-0">
          <CardHeader title="Sales Overview" action={<span className="text-xs text-muted">Last 7 days</span>} />
          <BarChart data={d.sales} valueKey="sales" labelKey="day" formatValue={formatPrice} label="Daily sales, last 7 days" />
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Orders Status" />
          <DonutChart
            centerValue={statusTotal}
            centerLabel="Orders"
            segments={Object.entries(d.orderStatus).map(([k, v]) => ({ label: k[0].toUpperCase() + k.slice(1), value: v, color: STATUS_COLORS[k] }))}
          />
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Top Categories" />
          <DonutChart
            centerValue={d.productCount}
            centerLabel="Products"
            segments={d.categories.map((c, i) => ({ label: c.name, value: c.count, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
          />
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-[1.6fr_1fr]">
        <Card className="min-w-0">
          <CardHeader title="Recent Orders" action={<ViewAll href="/admin/orders">View All Orders</ViewAll>} />
          <DataTable caption="Recent orders" head={["#", "Customer", "Items", "Amount", "Status", "Date", "Action"]}>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-medium text-ink whitespace-nowrap">#{o.id}</td>
                <td><span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={o.customer.name} />{o.customer.name}</span></td>
                <td className="text-muted whitespace-nowrap">{pluralize(o.itemCount, "item")}</td>
                <td className="font-medium text-ink">{formatPrice(o.total)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="text-muted whitespace-nowrap">{formatDate(o.date)}</td>
                <td><Link href={adminOrderHref(o.id)} className={buttonClass({ variant: "outline", size: "sm" })}>View<span className="sr-only"> order {o.id}</span></Link></td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Low Stock Products" action={<ViewAll href="/admin/products">View All</ViewAll>} />
          <ul className="list-none m-0 p-0 divide-y divide-line">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <ProductImage image={p.image} className="w-11 h-11 flex-shrink-0" rounded="rounded-lg" sizes="44px" />
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm font-medium text-ink truncate">{p.name}</p>
                  <p className="m-0 text-xs text-muted">{p.category.shortName}</p>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${p.stock === 0 ? "bg-[#fdecea] text-danger" : "bg-[#fdecea] text-[#c0392b]"}`}>
                  {p.stock === 0 ? "Out" : `${p.stock} left`}
                </span>
                <Link href={adminProductHref(p.slug)} className={buttonClass({ variant: "outline", size: "sm" })}>Edit<span className="sr-only"> {p.name}</span></Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ul className="list-none m-0 p-0 mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <li key={a.title}>
            <Link href={a.href} className="group flex items-center gap-3.5 h-full rounded-2xl border border-line bg-white p-4 no-underline shadow-[0_1px_3px_rgba(36,69,42,0.05)] hover:border-forest/40">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-sage-50 text-forest flex-shrink-0"><Icon name={a.icon} size={22} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink">{a.title}</span>
                <span className="block text-xs text-muted">{a.text}</span>
              </span>
              <Icon name="arrow-right" size={17} className="text-muted group-hover:text-forest" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
