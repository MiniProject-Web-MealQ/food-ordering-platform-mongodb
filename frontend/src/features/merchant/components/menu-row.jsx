import { Pencil } from "lucide-react";
import { Link } from "react-router";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { focusRing } from "@/components/ui/styles";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { cx } from "@/lib/cx";
import { categoryLabel } from "../constants";
import { formatBaht } from "../format";

export function MenuRow({ menu, busy = false, onToggle }) {
  return (
    <article
      aria-labelledby={`menu-${menu._id}-name`}
      aria-busy={busy}
      className={cx("grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-3xl bg-white p-3 ring-1 ring-haze", !menu.is_available && "bg-cream")}
    >
      {menu.image ? (
        <img src={menu.image} alt="" className={cx("size-16 rounded-2xl object-cover sm:row-span-2 sm:size-20", !menu.is_available && "opacity-50")} />
      ) : (
        <ImagePlaceholder compact label={menu.name} className={cx("size-16 rounded-2xl sm:row-span-2 sm:size-20", !menu.is_available && "opacity-50")} />
      )}

      <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 id={`menu-${menu._id}-name`} className="truncate font-semibold text-ink">
              {menu.name}
            </h3>
            <p className="truncate text-xs text-ink-soft">
              {categoryLabel(menu.category)} · ทำ ~{menu.cook_time} นาที · ขายแล้ว {menu.sold_quantity.toLocaleString("th-TH")}
            </p>
          </div>
          <Link
            to={`/merchant/menu?edit=${encodeURIComponent(menu._id)}`}
            state={{ fromList: true }}
            preventScrollReset
            aria-label={`แก้ไข ${menu.name}`}
            className={cx("-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-haze hover:text-ink", focusRing)}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Link>
      </div>

      <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:col-start-2">
        <p className="font-bold text-ink">{formatBaht(menu.price)}</p>
        <div className="flex items-center gap-2">
          {!menu.is_available && (
            <span className="rounded-full bg-haze px-2 py-0.5 text-xs font-semibold text-danger">หมด</span>
          )}
          <ToggleSwitch
            id={`menu-${menu._id}-available`}
            label={
              <span className="text-sm">
                <span className="sr-only">{menu.name} </span>มีขาย
              </span>
            }
            checked={menu.is_available}
            onChange={(checked) => {
              if (!busy) onToggle(menu, checked);
            }}
          />
        </div>
      </div>
    </article>
  );
}
