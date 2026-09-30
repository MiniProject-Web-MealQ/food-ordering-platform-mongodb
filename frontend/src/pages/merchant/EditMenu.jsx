import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { buttonClasses } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { MenuForm } from "@/features/merchant/components/menu-form";
import { menuToValues } from "@/features/merchant/menu-form";
import { useMerchant } from "@/features/merchant/store";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function DeleteMenu({ menu, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-labelledby="delete-menu-title" className={cx(panelClass, "mt-4 space-y-3 lg:mt-6")}>
      <h2 id="delete-menu-title" className="font-bold text-ink">
        ลบเมนู
      </h2>
      <p className="text-sm text-ink-soft">
        ถ้าแค่ของหมดชั่วคราว ให้ปิดสวิตช์ “มีขาย” แทน ลบแล้วลูกค้าจะไม่เห็นเมนูนี้อีก และกู้คืนไม่ได้
      </p>
      {confirming ? (
        <div role="group" aria-label={`ยืนยันลบ ${menu.name}`} className="flex flex-wrap gap-2">
          <button type="button" onClick={onDelete} className={buttonClasses({ variant: "danger-outline", size: "md" })}>
            ยืนยันลบ “{menu.name}”
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={buttonClasses({ variant: "cocoa-outline", size: "md" })}>
            ไม่ลบ
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={buttonClasses({ variant: "danger-outline", size: "md" })}>
          ลบเมนูนี้
        </button>
      )}
    </section>
  );
}

function EditMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useMerchant();
  const menu = state.menus.find((m) => m._id === id);
  usePageTitle(menu ? `แก้ไข ${menu.name}` : "ไม่พบเมนู");

  if (!menu) {
    return (
      <div className={pageClass}>
        <PageHeader title="ไม่พบเมนู" fallback="/merchant/menu" />
        <div className={cx(panelClass, "space-y-4 text-center")}>
          <p className="text-ink-soft">เมนูนี้อาจถูกลบไปแล้ว</p>
          <Link to="/merchant/menu" className={buttonClasses({ variant: "cocoa", size: "md" })}>
            กลับไปหน้าเมนู
          </Link>
        </div>
      </div>
    );
  }

  function handleSubmit(fields) {
    dispatch({ type: "menu/update", menuId: menu._id, changes: fields });
    navigate("/merchant/menu", { state: { notice: `บันทึก “${fields.name}” แล้ว` } });
  }

  function handleDelete() {
    dispatch({ type: "menu/remove", menuId: menu._id });
    navigate("/merchant/menu", { replace: true, state: { notice: `ลบ “${menu.name}” แล้ว` } });
  }

  return (
    <div className={pageClass}>
      <PageHeader title="แก้ไขเมนู" subtitle={menu.name} fallback="/merchant/menu" />
      <MenuForm
        key={menu._id}
        initialValues={menuToValues(menu)}
        menus={state.menus}
        editingId={menu._id}
        submitLabel="บันทึกการแก้ไข"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/merchant/menu")}
      />
      <DeleteMenu menu={menu} onDelete={handleDelete} />
    </div>
  );
}

export default EditMenu;
