import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { textLinkClass } from "@/components/ui/styles";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { RoleBadge, UserStatusBadge } from "@/features/admin/components/badges";
import { DataList } from "@/features/admin/components/data-list";
import { PasswordChecklist } from "@/features/admin/components/password-checklist";
import { FilterRow, SearchField, SelectField } from "@/features/admin/components/fields";
import { formatDate } from "@/features/admin/format";
import { ROLE_LABEL, USER_STATUS_LABEL } from "@/features/admin/labels";
import { validateNewPassword } from "@/features/admin/password";
import { actions, useAdmin } from "@/features/admin/store";
import { MerchantDialog } from "@/features/merchant/components/merchant-dialog";
import { pageClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function AddAdminDialog({ users, onAdd, onClose }) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);

  const errors = {};
  if (!values.name.trim()) errors.name = "กรอกชื่อ";
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = "อีเมลไม่ถูกต้อง";
  else if (users.some((u) => u.email.toLowerCase() === values.email.trim().toLowerCase())) errors.email = "อีเมลนี้มีบัญชีอยู่แล้ว";
  if (values.phone && !/^0\d{8,9}$/.test(values.phone.replace(/[\s-]/g, ""))) errors.phone = "เบอร์โทรไม่ถูกต้อง";
  Object.assign(errors, validateNewPassword(values.password, values.confirm));
  const shown = submitted ? errors : {};

  function set(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    onAdd({ name: values.name.trim(), email: values.email.trim().toLowerCase(), phone: values.phone.trim(), password: values.password });
  }

  return (
    <MerchantDialog eyebrow="ผู้ใช้" title="เพิ่มผู้ดูแลระบบ" subtitle="บัญชีผู้ดูแลสร้างได้จากหน้านี้เท่านั้น ไม่มีปุ่มสมัครเอง" onClose={onClose}>
      <form onSubmit={submit} noValidate className="mx-auto max-w-lg space-y-4 rounded-3xl bg-white p-5 ring-1 ring-haze">
        {submitted && Object.keys(errors).length > 0 && <Alert tone="error" title="ยังเพิ่มไม่ได้ ตรวจช่องที่ผิด" />}
        <TextField id="new-admin-name" label="ชื่อ" value={values.name} error={shown.name} onChange={set("name")} required />
        <TextField id="new-admin-email" label="อีเมล" type="email" value={values.email} error={shown.email} onChange={set("email")} required />
        <TextField id="new-admin-phone" label="เบอร์โทร (ไม่บังคับ)" type="tel" value={values.phone} error={shown.phone} onChange={set("phone")} />
        <div className="space-y-2">
          <PasswordField
            id="new-admin-password"
            label="รหัสผ่านเริ่มต้น"
            autoComplete="new-password"
            value={values.password}
            error={shown.password}
            aria-describedby="new-admin-password-rules"
            onChange={set("password")}
            required
          />
          <PasswordChecklist id="new-admin-password-rules" password={values.password} />
        </div>
        <PasswordField
          id="new-admin-confirm"
          label="ยืนยันรหัสผ่าน"
          autoComplete="new-password"
          value={values.confirm}
          error={shown.confirm}
          onChange={set("confirm")}
          required
        />
        <p className="rounded-2xl bg-cream px-3 py-2 text-xs text-ink-soft">
          ส่งรหัสนี้ให้ผู้ดูแลคนใหม่ทางช่องทางที่ปลอดภัย เมื่อเขา login ครั้งแรก ระบบจะบังคับให้เปลี่ยนเป็นรหัสของตัวเอง
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="cocoa" size="md">
            เพิ่มผู้ดูแล
          </Button>
          <Button variant="cocoa-outline" size="md" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </MerchantDialog>
  );
}

function Users() {
  usePageTitle("จัดการผู้ใช้");
  const { state, dispatch } = useAdmin();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");

  const q = query.trim().toLowerCase();
  const rows = state.users
    .filter((u) => (role === "all" || u.role === role) && (status === "all" || u.status === status))
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? "").replace(/-/g, "").includes(q.replace(/-/g, "")))
    .sort((a, b) => b.created_at - a.created_at);

  const columns = [
    {
      key: "name",
      header: "ชื่อ",
      primary: true,
      render: (u) => (
        <div className="min-w-0">
          <Link to={`/admin/users/${u._id}`} className={textLinkClass}>
            {u.name}
          </Link>
          {u._id === state.session.user_id && <span className="ml-1 text-xs text-ink-soft">(คุณ)</span>}
          <p className="truncate text-xs font-normal text-ink-soft">{u.email}</p>
        </div>
      ),
    },
    { key: "phone", header: "เบอร์", className: "tabular-nums", render: (u) => u.phone || "–" },
    { key: "role", header: "ประเภท", render: (u) => <RoleBadge role={u.role} /> },
    { key: "created", header: "วันที่สมัคร", render: (u) => formatDate(u.created_at) },
    { key: "status", header: "สถานะ", render: (u) => <UserStatusBadge status={u.status} /> },
  ];

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title="ผู้ใช้"
        subtitle={`ทั้งหมด ${state.users.length} บัญชี`}
        action={
          <Button variant="cocoa" size="sm" className="mt-1" onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" className="size-4" />
            <span className="max-sm:sr-only">เพิ่มผู้ดูแลระบบ</span>
          </Button>
        }
      />
      <p role="status" className={notice ? "rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink" : "sr-only"}>
        {notice}
      </p>
      <FilterRow>
        <SearchField id="user-search" label="ค้นหาผู้ใช้" value={query} onChange={setQuery} placeholder="ค้นหาชื่อ อีเมล หรือเบอร์" />
        <SelectField
          id="user-role"
          label="ประเภท"
          value={role}
          onChange={setRole}
          options={[{ value: "all", label: "ทุกประเภท" }, ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))]}
        />
        <SelectField
          id="user-status"
          label="สถานะ"
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "ทุกสถานะ" }, ...Object.entries(USER_STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
        />
      </FilterRow>
      <DataList label="รายการผู้ใช้" columns={columns} rows={rows} empty="ไม่พบผู้ใช้ที่ตรงกับตัวกรอง" />

      {adding && (
        <AddAdminDialog
          users={state.users}
          onClose={() => setAdding(false)}
          onAdd={(fields) => {
            dispatch(actions.addAdmin(fields));
            setAdding(false);
            setNotice(`เพิ่มผู้ดูแลระบบ “${fields.name}” แล้ว`);
          }}
        />
      )}
    </div>
  );
}

export default Users;
