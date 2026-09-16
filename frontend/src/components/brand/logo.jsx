import { Link } from "react-router";
import { focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";

export function LogoMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-apricot font-bold text-white",
        className,
      )}
    >
      Q
    </span>
  );
}

export function Logo() {
  return (
    <Link to="/" className={cx("inline-flex items-center gap-3 rounded-full", focusRing)}>
      <LogoMark className="size-10 text-lg" />
      <span className="text-2xl font-semibold text-ink">MealQ</span>
    </Link>
  );
}
