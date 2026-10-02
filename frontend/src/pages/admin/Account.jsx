import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { RoleBadge } from "@/features/admin/components/badges";
import { PasswordChecklist } from "@/features/admin/components/password-checklist";
import { formatDate } from "@/features/admin/format";
import { DEMO_ADMIN_PASSWORD } from "@/features/admin/mock-data";
import { validateNewPassword } from "@/features/admin/password";
import { byId } from "@/features/admin/stats";
import { actions, useAdmin } from "@/features/admin/store";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const FIELD_IDS = { current: "account-current-password", password: "account-new-password", confirm: "account-confirm-password" };

function ChangePasswordForm({ user, firstTime, onChanged }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);

  // MOCK: ตรวจรหัสเดิมกับข้อมูลจำลอง ระบบจริงให้ backend ตรวจ
  const savedPassword = user.password ?? DEMO_ADMIN_PASSWORD;
  const errors = validateNewPassword(password, confirm);
  if (!current) errors.current = "กรอกรหัสผ่านปัจจุบัน";
  else if (current !== savedPassword) errors.current = "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  if (!errors.password && password === current) errors.password = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  const shown = submitted ? errors : {};

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    const first = Object.keys(FIELD_IDS).find((field) => errors[field]);
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    onChanged(password);
    setCurrent("");
    setPassword("");
    setConfirm("");
    setSubmitted(false);
    setDone(true);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {done && <Alert tone="success" title="เปลี่ยนรหัสผ่านแล้ว" />}
      <PasswordField
        id={FIELD_IDS.current}
        label={firstTime ? "รหัสผ่านที่ได้รับ" : "รหัสผ่านปัจจุบัน"}
        autoComplete="current-password"
        value={current}
        error={shown.current}
        onChange={(e) => {
          setCurrent(e.target.value);
          setDone(false);
        }}
      />
      <div className="space-y-2">
        <PasswordField
          id={FIELD_IDS.password}
          label="รหัสผ่านใหม่"
          autoComplete="new-password"
          value={password}
          error={shown.password}
          aria-describedby="account-password-rules"
          onChange={(e) => {
            setPassword(e.target.value);
            setDone(false);
          }}
        />
        <PasswordChecklist id="account-password-rules" password={password} />
      </div>
      <PasswordField
        id={FIELD_IDS.confirm}
        label="ยืนยันรหัสผ่านใหม่"
        autoComplete="new-password"
        value={confirm}
        error={shown.confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          setDone(false);
        }}
      />
      <Button type="submit" variant="cocoa" className="w-full sm:w-auto">
        {firstTime ? "ตั้งรหัสผ่านและเริ่มใช้งาน" : "เปลี่ยนรหัสผ่าน"}
      </Button>
    </form>
  );
}

function Account() {
  usePageTitle("บัญชีของฉัน");
  const navigate = useNavigate();
  const { state, dispatch } = useAdmin();
  const user = byId(state.users, state.session.user_id);
  const firstTime = Boolean(state.session.must_change_password);

  if (!user) {
    return (
      <div className={pageClass}>
        <PageHeader title="บัญชีของฉัน" />
        <p className={cx(panelClass, "text-ink-soft")}>ไม่พบบัญชีนี้ในระบบ ลองออกจากระบบแล้วเข้าใหม่</p>
      </div>
    );
  }

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="บัญชีของฉัน" subtitle={user.email} />

      {firstTime && (
        <Alert tone="error" title="ตั้งรหัสผ่านของคุณเองก่อนเริ่มใช้งาน">
          บัญชีนี้ถูกสร้างโดยผู้ดูแลคนอื่น รหัสผ่านที่ได้รับใช้ได้ครั้งเดียว ต้องเปลี่ยนเป็นรหัสที่มีแค่คุณรู้
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section aria-labelledby="me-title" className={cx(panelClass, "space-y-3")}>
          <h2 id="me-title" className="text-lg font-bold text-ink">
            ข้อมูลบัญชี
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-ink-soft">ชื่อ</dt>
              <dd className="text-ink">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">อีเมล</dt>
              <dd className="break-all text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">ประเภท</dt>
              <dd>
                <RoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">สร้างบัญชีเมื่อ</dt>
              <dd className="text-ink">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </section>

        {/* บนมือถือให้ฟอร์มรหัสผ่านขึ้นก่อน เพราะเป็นสิ่งที่ต้องทำในหน้านี้ */}
        <section aria-labelledby="password-title" className={cx(panelClass, "space-y-4 max-lg:order-first")}>
          <h2 id="password-title" className="text-lg font-bold text-ink">
            {firstTime ? "ตั้งรหัสผ่านใหม่" : "เปลี่ยนรหัสผ่าน"}
          </h2>
          <ChangePasswordForm
            user={user}
            firstTime={firstTime}
            onChanged={(password) => {
              dispatch(actions.changePassword(user._id, password));
              if (firstTime) navigate("/admin", { replace: true });
            }}
          />
        </section>
      </div>
    </div>
  );
}

export default Account;
