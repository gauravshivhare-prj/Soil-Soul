import { notFound } from "next/navigation";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { getProduct, getProductReviews, getProducts, getRelatedProducts, getReviewSummary } from "@/services/catalog";
import { FREE_SHIPPING_THRESHOLD } from "@/data/commerce";
import { formatPrice, formatNumber } from "@/lib/format";
import { Breadcrumbs, PageContainer, SectionTitle } from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Stars from "@/components/ui/Stars";
import Badge from "@/components/ui/Badge";
import ProductGallery from "@/components/store/ProductGallery";
import ProductPurchase from "@/components/store/ProductPurchase";
import ProductTabs from "@/components/store/ProductTabs";
import ProductCard from "@/components/store/ProductCard";
import { ReviewList, ReviewSummary } from "@/components/store/ProductReviews";

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found | Soil & Soul" };
  return { title: `${product.name} | Soil & Soul`, description: product.summary };
}

const PROMISES = [
  { icon: "sprout", title: "Healthy & Thriving", text: "Fresh, well-nurtured products" },
  { icon: "box", title: "Safe Packaging", text: "Arrives in perfect condition" },
  { icon: "leaf", title: "Easy Care", text: "Care guide with every order" },
  { icon: "truck", title: "Fast Delivery", text: "3–5 days across India" },
];

const SPEC_ICONS = ["ruler", "box", "sprout", "paw"];

function DetailsPanel({ product }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:gap-10">
      <div>
        <p className="m-0 text-sm leading-relaxed text-body">{product.description}</p>
        <ul className="list-none m-0 mt-4 p-0 space-y-2">
          {product.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2.5 text-sm text-body">
              <span className="text-forest"><Icon name="check-circle" size={17} /></span>
              {h}
            </li>
          ))}
        </ul>
      </div>
      <dl className="m-0 grid gap-3 md:border-l md:border-line md:pl-8">
        {product.specs.map(([label, value], i) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-50 text-forest flex-shrink-0">
              <Icon name={SPEC_ICONS[i % SPEC_ICONS.length]} size={15} />
            </span>
            <dt className="w-28 flex-shrink-0 text-muted">{label}</dt>
            <dd className="m-0 text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CarePanel({ product }) {
  return (
    <ul className="list-none m-0 p-0 grid gap-3 sm:grid-cols-2">
      {product.care.map((c) => (
        <li key={c.title} className="rounded-xl bg-cream border border-line p-4">
          <p className="m-0 text-sm font-semibold text-ink">{c.title}</p>
          <p className="m-0 mt-1 text-sm text-body">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

function SpecsPanel({ product }) {
  return (
    <table className="w-full max-w-xl text-sm border-collapse">
      <tbody>
        {[["Category", product.category.name], ...product.specs].map(([label, value]) => (
          <tr key={label} className="border-b border-line last:border-0">
            <th scope="row" className="py-2.5 pr-6 text-left font-normal text-muted w-44">{label}</th>
            <td className="py-2.5 text-ink">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShippingPanel() {
  return (
    <ul className="list-none m-0 p-0 space-y-3 text-sm text-body max-w-2xl">
      <li className="flex gap-2.5"><Icon name="truck" size={18} className="text-forest flex-shrink-0 mt-px" />Free shipping on orders above {formatPrice(FREE_SHIPPING_THRESHOLD)}. A flat fee applies to smaller orders.</li>
      <li className="flex gap-2.5"><Icon name="clock" size={18} className="text-forest flex-shrink-0 mt-px" />Orders are usually dispatched within 1–2 business days and delivered in 3–5 days.</li>
      <li className="flex gap-2.5"><Icon name="refresh" size={18} className="text-forest flex-shrink-0 mt-px" />Plants damaged in transit are replaced free — share a photo within 48 hours of delivery.</li>
      <li className="flex gap-2.5"><Icon name="shield" size={18} className="text-forest flex-shrink-0 mt-px" />Unopened non-plant items can be returned within 7 days.</li>
    </ul>
  );
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const summary = getReviewSummary(product);
  const related = getRelatedProducts(slug, 6);
  const tabs = [
    { id: "details", label: "Product Details", content: <DetailsPanel product={product} /> },
    { id: "care", label: product.categorySlug === "live-plants" ? "Care Guide" : "Usage & Care", content: <CarePanel product={product} /> },
    { id: "specs", label: "Specifications", content: <SpecsPanel product={product} /> },
    { id: "shipping", label: "Shipping & Returns", content: <ShippingPanel /> },
    { id: "reviews", label: `Reviews (${product.reviewCount})`, content: <ReviewList reviews={getProductReviews(slug)} /> },
  ];

  return (
    <main className="pb-12 lg:pb-16">
      <PageContainer className="pt-5 sm:pt-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: product.category.shortName, href: `/shop/${product.categorySlug}` },
            { label: product.name },
          ]}
        />

        {/* ── Top: gallery · purchase · promises ── */}
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_1fr_300px] lg:gap-8">
          <div className="min-w-0">
            <ProductGallery product={product} />
          </div>

          <div className="min-w-0">
            <Badge>{product.category.shortName}</Badge>
            <h1 className={`${brandSerif.className} m-0 mt-2.5 text-[1.75rem] sm:text-[2.1rem] leading-tight font-bold text-heading`}>
              {product.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <Stars rating={product.rating} count={product.reviewCount} size={15} />
              <span aria-hidden="true">|</span>
              <span>{formatNumber(product.soldCount)}+ sold</span>
            </div>
            <p className="m-0 mt-4 text-sm leading-relaxed text-body">{product.description}</p>
            <div className="mt-5">
              <ProductPurchase product={product} />
            </div>
          </div>

          <aside className="min-w-0 lg:col-span-2 xl:col-span-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 content-start">
            <Card as="ul" className="list-none m-0 grid gap-4">
              {PROMISES.map((p) => (
                <li key={p.title} className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-11 h-11 rounded-full bg-sage-50 text-forest flex-shrink-0">
                    <Icon name={p.icon} size={20} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{p.title}</span>
                    <span className="block text-xs text-muted">{p.text}</span>
                  </span>
                </li>
              ))}
            </Card>
            <div className="rounded-2xl border border-line-sage bg-sage-50 p-5">
              <p className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="message" size={18} className="text-forest" />
                Need help choosing?
              </p>
              <p className="m-0 mt-1.5 text-sm text-muted">Our plant experts can help with care tips and recommendations.</p>
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-forest/70 bg-white text-sm font-medium text-heading no-underline hover:bg-forest hover:text-cream"
              >
                Ask a Question
              </Link>
            </div>
          </aside>
        </div>

        {/* ── Info tabs · review summary ── */}
        <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_380px]">
          <Card padded={false} className="min-w-0 px-4 sm:px-6 pb-6">
            <ProductTabs tabs={tabs} />
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle className="!text-[1.2rem]">Customer Reviews</SectionTitle>
            </div>
            <ReviewSummary summary={summary} />
          </Card>
        </div>

        {/* ── Related ── */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12">
            <div className="flex items-end justify-between mb-4">
              <SectionTitle id="related-heading">You May Also Like</SectionTitle>
              <Link href={`/shop/${product.categorySlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest no-underline hover:text-forest-dark">
                View All <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <ul role="list" className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} imageAspect="aspect-[25/18]" sizes="(min-width: 1280px) 16vw, (min-width: 768px) 30vw, 50vw" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageContainer>
    </main>
  );
}
