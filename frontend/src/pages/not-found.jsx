import { Link } from "react-router";
import { buttonClasses } from "@/components/ui/styles";
import { usePageTitle } from "@/lib/use-page-title";

export default function NotFoundPage() {
  usePageTitle("ไม่พบหน้านี้");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <p className="text-6xl font-bold text-apricot">404</p>
      <h1 className="text-2xl font-bold text-ink">ไม่พบหน้านี้</h1>
      <Link to="/" className={`${buttonClasses()} mt-2`}>
        กลับหน้าแรก
      </Link>
    </main>
  );
}
