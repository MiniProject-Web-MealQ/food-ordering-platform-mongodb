import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { buttonClasses } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { chipClasses } from "@/features/customer/styles";
import { MenuRow } from "@/features/merchant/components/menu-row";
import { useMerchant } from "@/features/merchant/store";
import { fieldClass, pageClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const ALL = "all";

const AVAILABILITY = [
  { value: ALL, label: "ทุกสถานะ" },
  { value: "available", label: "มีขาย" },
  { value: "sold-out", label: "หมด" },
];

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={chipClasses({ selected: value === option.value })}
        >
          {option.label}
          {option.count !== undefined && <span className="text-xs opacity-75">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Menu() {
  usePageTitle("จัดการเมนู");
  const { state, dispatch } = useMerchant();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  // Add/Edit/Delete pages come back here with a confirmation message in the location state.
  const [notice, setNotice] = useState(() => location.state?.notice ?? "");

  const menus = state.menus.toSorted((a, b) => a.category.localeCompare(b.category, "th") || a.name.localeCompare(b.name, "th"));
  const categories = [...new Set(menus.map((m) => m.category))];
  // A category that was renamed or emptied away falls back to "all" instead of showing nothing.
  const activeCategory = categories.includes(category) ? category : ALL;
  const soldOutCount = menus.filter((m) => !m.is_available).length;

  const q = query.trim().toLowerCase();
  const shown = menus.filter(
    (m) =>
      (activeCategory === ALL || m.category === activeCategory) &&
      (availability === ALL || m.is_available === (availability === "available")) &&
      (!q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)),
  );

  function toggle(menu, isAvailable) {
    dispatch({ type: "menu/setAvailable", menuId: menu._id, isAvailable });
    setNotice(isAvailable ? `เปิดขาย “${menu.name}” แล้ว` : `ปิดขาย “${menu.name}” แล้ว ลูกค้าจะเห็นว่าหมด`);
  }

  function clearFilters() {
    setQuery("");
    setCategory(ALL);
    setAvailability(ALL);
  }

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title="เมนูของร้าน"
        subtitle={`ทั้งหมด ${menus.length} เมนู · หมด ${soldOutCount} เมนู`}
        action={
          <Link to="/merchant/menu/new" className={cx(buttonClasses({ variant: "cocoa", size: "sm" }), "mt-1")}>
            <Plus aria-hidden="true" className="size-4" />
            เพิ่มเมนู
          </Link>
        }
      />

      <div className="space-y-3">
        <div className="relative lg:max-w-md">
          <label htmlFor="menu-search" className="sr-only">
            ค้นหาเมนู
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            id="menu-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อเมนู"
            className={cx(fieldClass, "rounded-full pl-12")}
          />
        </div>
        <ChipGroup
          label="กรองตามหมวดหมู่"
          value={activeCategory}
          onChange={setCategory}
          options={[
            { value: ALL, label: "ทุกหมวด", count: menus.length },
            ...categories.map((c) => ({ value: c, label: c, count: menus.filter((m) => m.category === c).length })),
          ]}
        />
        <ChipGroup label="กรองตามสถานะ" value={availability} onChange={setAvailability} options={AVAILABILITY} />
      </div>

      <p role="status" className={cx("text-sm", notice ? "rounded-2xl bg-mint px-4 py-2 font-medium text-ink" : "sr-only")}>
        {notice}
      </p>

      {shown.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((menu) => (
            <li key={menu._id}>
              <MenuRow menu={menu} onToggle={toggle} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 rounded-3xl bg-white px-5 py-8 text-center ring-1 ring-haze">
          <p className="text-sm text-ink-soft">{menus.length > 0 ? "ไม่มีเมนูที่ตรงกับตัวกรอง" : "ยังไม่มีเมนู เริ่มเพิ่มเมนูแรกของร้านได้เลย"}</p>
          {menus.length > 0 ? (
            <button type="button" onClick={clearFilters} className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}>
              ล้างตัวกรอง
            </button>
          ) : (
            <Link to="/merchant/menu/new" className={buttonClasses({ variant: "cocoa", size: "sm" })}>
              เพิ่มเมนู
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default Menu;
