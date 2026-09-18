import { Link } from "react-router";
import { focusRing } from "@/components/ui/styles";

export function AuthHeader({ title, description, back, leading }) {
  return (
    <header className="space-y-2">
      {back && (
        <Link
          to={back.href}
          className={`mb-6 inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-brand-ink hover:underline ${focusRing}`}
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      )}
      {leading}
      <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h1>
      {description && <p className="text-muted">{description}</p>}
    </header>
  );
}
