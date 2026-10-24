import AccountOrderDetail from "@/features/account/AccountOrderDetail";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Order #${id} | Soil & Soul` };
}

export default async function AccountOrderPage({ params }) {
  const { id } = await params;
  return <AccountOrderDetail orderId={id} />;
}
