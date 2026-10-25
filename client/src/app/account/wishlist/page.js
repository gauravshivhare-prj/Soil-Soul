import { SectionTitle } from "@/components/ui/PageHeader";
import WishlistView from "@/features/account/WishlistView";

export const metadata = { title: "Wishlist | Soil & Soul" };
// Rendered only after the client-side account session check (RequireAuth in the account layout),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function WishlistPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">Wishlist</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Products you&rsquo;ve saved for later.</p>
      </div>
      <WishlistView />
    </div>
  );
}
