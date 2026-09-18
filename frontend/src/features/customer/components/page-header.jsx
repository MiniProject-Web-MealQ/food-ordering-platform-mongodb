import { useNavigate } from "react-router";
import { ArrowLeftIcon } from "@/components/icons";
import { focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";

/** Callers place PageHeader inside their page container, so it has no side padding of its own. */
/** Back arrow falls back to `fallback` when the page was opened directly (no history to go back to). */
export function BackButton({ fallback, className, label = "ย้อนกลับ" }) {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cx(
        "grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-haze",
        focusRing,
        className,
      )}
    >
      <ArrowLeftIcon className="size-6" />
    </button>
  );
}

export function PageHeader({ title, subtitle, fallback, action }) {
  return (
    <header className="flex items-start gap-2 pt-5 pb-3 lg:pt-8 lg:pb-6">
      {fallback && <BackButton fallback={fallback} className="-ml-1" />}
      <div className="min-w-0 flex-1 pt-1">
        <h1 className="text-2xl leading-tight font-bold text-ink lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
