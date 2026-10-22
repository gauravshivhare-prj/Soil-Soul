import HeroSection from "@/components/ui/HeroSection";
import TrustBar from "@/components/ui/TrustBar";
import ShopByCategory from "@/components/store/ShopByCategory";
import FeaturedProducts from "@/components/store/FeaturedProducts";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TrustBar />
      <ShopByCategory />
      <FeaturedProducts />
    </main>
  );
}
