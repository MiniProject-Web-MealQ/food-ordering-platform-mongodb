import { Faq } from "@/features/landing/components/faq";
import { Hero } from "@/features/landing/components/hero";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { PopularRestaurants } from "@/features/landing/components/popular-restaurants";
import { QueuePortal } from "@/features/landing/components/queue-portal";
import { RandomFoodCta } from "@/features/landing/components/random-food-cta";
import { SiteFooter } from "@/features/landing/components/site-footer";
import { SiteHeader } from "@/features/landing/components/site-header";
import { usePageTitle } from "@/lib/use-page-title";
import { usePublicCatalogue } from "@/features/landing/use-public-catalogue";

export default function HomePage() {
  usePageTitle();
  const catalogue = usePublicCatalogue();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">
        <Hero catalogueState={catalogue} />
        <QueuePortal />
        <HowItWorks />
        <PopularRestaurants catalogueState={catalogue} />
        <RandomFoodCta />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
