import { useNavigate } from "react-router";
import { PageHeader } from "@/features/customer/components/page-header";
import { MenuForm } from "@/features/merchant/components/menu-form";
import { emptyMenuValues } from "@/features/merchant/menu-form";
import { actions, useMerchant } from "@/features/merchant/store";
import { pageClass } from "@/features/merchant/styles";
import { usePageTitle } from "@/lib/use-page-title";

function AddMenu() {
  usePageTitle("เพิ่มเมนู");
  const navigate = useNavigate();
  const { state, dispatch } = useMerchant();

  function handleSubmit(fields) {
    dispatch(actions.addMenu(fields));
    navigate("/merchant/menu", { state: { notice: `เพิ่มเมนู “${fields.name}” แล้ว` } });
  }

  return (
    <div className={pageClass}>
      <PageHeader title="เพิ่มเมนู" subtitle="เมนูใหม่จะแสดงให้ลูกค้าเห็นทันทีที่บันทึก" fallback="/merchant/menu" />
      <MenuForm
        initialValues={emptyMenuValues()}
        menus={state.menus}
        submitLabel="บันทึกเมนู"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/merchant/menu")}
      />
    </div>
  );
}

export default AddMenu;
