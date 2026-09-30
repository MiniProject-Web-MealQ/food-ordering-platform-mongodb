import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { buttonClasses } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { chipClasses } from "@/features/customer/styles";
import { DeleteMenu } from "@/features/merchant/components/delete-menu";
import { MenuForm } from "@/features/merchant/components/menu-form";
import { MenuRow } from "@/features/merchant/components/menu-row";
import { MerchantDialog } from "@/features/merchant/components/merchant-dialog";
import { emptyMenuValues, menuToValues } from "@/features/merchant/menu-form";
import { categoryLabel } from "@/features/merchant/constants";
import { useMerchant } from "@/features/merchant/store";
import { useMerchantActions } from "@/features/merchant/use-merchant-actions";
import { fieldClass, pageClass, panelClass } from "@/features/merchant/styles";
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

/**
 * Add/edit form in a pop-up over the menu list. Which one is open lives in the URL
 * (?new=1 or ?edit=<menu _id>), so the list keeps its filters and deep links still work.
 */
function MenuEditorDialog({ mode, menuId, onClose, onDone }) {
  const { state } = useMerchant();
  const actions = useMerchantActions();
  const menu = mode === "edit" ? state.menus.find((m) => m._id === menuId) : null;

  if (mode === "edit" && !menu) {
    return (
      <MerchantDialog eyebrow="จัดการเมนู" title="ไม่พบเมนู" onClose={onClose}>
        <div className={cx(panelClass, "space-y-4 text-center")}>
          <p className="text-ink-soft">เมนูนี้อาจถูกลบไปแล้ว</p>
          <button type="button" onClick={onClose} className={buttonClasses({ variant: "cocoa", size: "md" })}>
            กลับไปหน้าเมนู
          </button>
        </div>
      </MerchantDialog>
    );
  }

  if (mode === "new") {
    return (
      <MerchantDialog
        eyebrow="จัดการเมนู"
        title="เพิ่มเมนู"
        subtitle="เมนูใหม่จะแสดงให้ลูกค้าเห็นทันทีที่บันทึก"
        onClose={onClose}
      >
        <MenuForm
          initialValues={emptyMenuValues()}
          menus={state.menus}
          submitLabel="บันทึกเมนู"
          onCancel={onClose}
          onSubmit={async (fields) => {
            const result = await actions.addMenu(fields);
            if (result.ok) onDone(`เพิ่มเมนู “${fields.name}” แล้ว`);
            return result;
          }}
        />
      </MerchantDialog>
    );
  }

  return (
    <MerchantDialog eyebrow="จัดการเมนู" title="แก้ไขเมนู" subtitle={menu.name} onClose={onClose}>
      <MenuForm
        key={menu._id}
        initialValues={menuToValues(menu)}
        menus={state.menus}
        editingId={menu._id}
        submitLabel="บันทึกการแก้ไข"
        onCancel={onClose}
        onSubmit={async (fields) => {
          const result = await actions.updateMenu(menu._id, fields);
          if (result.ok) onDone(`บันทึก “${fields.name}” แล้ว`);
          return result;
        }}
      />
      <DeleteMenu
        menu={menu}
        onDelete={async () => {
          const result = await actions.removeMenu(menu._id);
          if (result.ok) onDone(`ลบ “${menu.name}” แล้ว`);
          return result;
        }}
      />
    </MerchantDialog>
  );
}

function Menu() {
  const { state } = useMerchant();
  const { setMenuAvailable } = useMerchantActions();
  const [busyId, setBusyId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  const [notice, setNotice] = useState(null);

  const editId = searchParams.get("edit");
  const dialogMode = searchParams.has("new") ? "new" : editId ? "edit" : null;
  usePageTitle(dialogMode === "new" ? "เพิ่มเมนู" : dialogMode === "edit" ? "แก้ไขเมนู" : "จัดการเมนู");

  function closeDialog() {
    // Opened from this list: step back so the browser Back button does not reopen it.
    if (location.state?.fromList) navigate(-1);
    else setSearchParams({}, { replace: true, preventScrollReset: true });
  }

  function finishDialog(message) {
    setNotice({ text: message });
    closeDialog();
  }

  const menus = state.menus.toSorted(
    (a, b) => categoryLabel(a.category).localeCompare(categoryLabel(b.category), "th") || a.name.localeCompare(b.name, "th"),
  );
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

  async function toggle(menu, isAvailable) {
    setBusyId(menu._id);
    const result = await setMenuAvailable(menu, isAvailable);
    setBusyId(null);
    if (!result.ok) {
      setNotice({ text: `เปลี่ยนสถานะ “${menu.name}” ไม่สำเร็จ: ${result.error.message}`, error: true });
      return;
    }
    setNotice({ text: isAvailable ? `เปิดขาย “${menu.name}” แล้ว` : `ปิดขาย “${menu.name}” แล้ว ลูกค้าจะเห็นว่าหมด` });
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
          <Link
            to="/merchant/menu?new=1"
            state={{ fromList: true }}
            preventScrollReset
            className={cx(buttonClasses({ variant: "cocoa", size: "sm" }), "mt-1")}
          >
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
            ...categories.map((c) => ({ value: c, label: categoryLabel(c), count: menus.filter((m) => m.category === c).length })),
          ]}
        />
        <ChipGroup label="กรองตามสถานะ" value={availability} onChange={setAvailability} options={AVAILABILITY} />
      </div>

      <p
        role="status"
        className={cx(
          "text-sm",
          !notice && "sr-only",
          notice && (notice.error ? "rounded-2xl bg-alert/10 px-4 py-2 font-medium text-danger" : "rounded-2xl bg-mint px-4 py-2 font-medium text-ink"),
        )}
      >
        {notice?.text}
      </p>

      {shown.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((menu) => (
            <li key={menu._id}>
              <MenuRow menu={menu} busy={busyId === menu._id} onToggle={toggle} />
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
            <Link
              to="/merchant/menu?new=1"
              state={{ fromList: true }}
              preventScrollReset
              className={buttonClasses({ variant: "cocoa", size: "sm" })}
            >
              เพิ่มเมนู
            </Link>
          )}
        </div>
      )}

      {dialogMode && (
        <MenuEditorDialog
          key={`${dialogMode}-${editId ?? ""}`}
          mode={dialogMode}
          menuId={editId}
          onClose={closeDialog}
          onDone={finishDialog}
        />
      )}
    </div>
  );
}

export default Menu;
