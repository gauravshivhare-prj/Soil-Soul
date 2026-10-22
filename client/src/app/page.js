import HeroSection from "@/components/ui/HeroSection";
import TrustBar from "@/components/ui/TrustBar";
import ShopByCategory from "@/components/store/ShopByCategory";
import FeaturedProducts from "@/components/store/FeaturedProducts";
import PromoBanner from "@/components/store/PromoBanner";
import FindYourPlant from "@/components/store/FindYourPlant";
import NaturalCare from "@/components/store/NaturalCare";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TrustBar />
      <ShopByCategory />
      <FeaturedProducts />
      <PromoBanner />
      <FindYourPlant />
      <NaturalCare />
    </main>
  );
}
