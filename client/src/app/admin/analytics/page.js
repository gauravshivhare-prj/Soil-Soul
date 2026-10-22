import Card, { CardHeader } from "@/components/ui/Card";
import { AdminHeader, StatCard } from "@/components/admin/AdminParts";
import { BarChart, DonutChart } from "@/components/admin/Charts";
import { getCategoryBreakdown, getSalesLast30Days } from "@/services/admin";
import { getProducts } from "@/services/catalog";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Analytics | Admin | Soil & Soul" };

const COLORS = ["#24452a", "#9fbf8c", "#ecd9b0", "#d9c9a3", "#e07a5f", "#c6d6b3"];
const DEMO_ORDER_COUNT = 412; // sample order volume for the 30-day period

export default function AdminAnalyticsPage() {
  const daily = getSalesLast30Days();
  const total = daily.reduce((a, b) => a + b, 0);
  // Last 28 days grouped into four weeks, oldest first.
  const recent = daily.slice(-28);
  const weeks = [0, 1, 2, 3].map((w) => ({ label: `Week ${w + 1}`, sales: recent.slice(w * 7, w * 7 + 7).reduce((a, b) => a + b, 0) }));
  const products = getProducts();
  const bestSellers = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 5);

  return (
    <div>
      <AdminHeader title="Analytics" subtitle="Sample performance data for the last 30 days." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon="cart" label="Revenue (30 days)" value={formatPrice(total)} change={14} />
        <StatCard icon="box" label="Avg. order value" value={formatPrice(Math.round(total / DEMO_ORDER_COUNT))} tone="gold" />
        <StatCard icon="users" label="Returning customers" value="38%" change={5} />
        <StatCard icon="chart" label="Conversion rate" value="2.9%" tone="gold" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="min-w-0">
          <CardHeader title="Weekly Revenue" />
          <BarChart data={weeks} valueKey="sales" labelKey="label" formatValue={formatPrice} label="Weekly revenue, last 4 weeks" />
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Products by Category" />
          <DonutChart
            centerValue={products.length}
            centerLabel="Products"
            segments={getCategoryBreakdown().map((c, i) => ({ label: c.name, value: c.count, color: COLORS[i % COLORS.length] }))}
          />
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader title="Best Sellers" />
        <ol className="m-0 pl-5 grid gap-2 text-sm">
          {bestSellers.map((p) => (
            <li key={p.id} className="text-ink">
              <span className="font-medium">{p.name}</span> <span className="text-muted">— {p.soldCount}+ sold</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
