import AccountDashboard from "@/features/account/AccountDashboard";

// Rendered only after the client-side account session check (RequireAuth in the account layout),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AccountPage() {
  return <AccountDashboard />;
}
