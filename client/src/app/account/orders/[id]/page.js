import AccountOrderDetail from "@/features/account/AccountOrderDetail";

// Rendered only after the client-side account session check (RequireAuth in the account layout),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

// Static title: reading `params` in generateMetadata() blocks metadata prefetching
// ("URL data in generateMetadata"); the page itself shows the order number.
export const metadata = { title: "Order Details | Soil & Soul" };

export default async function AccountOrderPage({ params }) {
  const { id } = await params;
  return <AccountOrderDetail orderId={id} />;
}
