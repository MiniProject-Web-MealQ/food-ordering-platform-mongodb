import { Ban, CheckCircle2, KeyRound, UserCog } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { RoleBadge, StoreStatusBadge, UserStatusBadge } from "@/features/admin/components/badges";
import { DataList } from "@/features/admin/components/data-list";
import { SelectField } from "@/features/admin/components/fields";
import { ReasonDialog } from "@/features/admin/components/reason-dialog";
import { formatBaht, formatDate, formatDateTime } from "@/features/admin/format";
import { ACTIVITY_LABEL, ROLE_LABEL } from "@/features/admin/labels";
import { byId, walletOf } from "@/features/admin/stats";
import { actions, useAdmin } from "@/features/admin/store";
import { OrderStatusBadge } from "@/features/merchant/components/status-badge";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function UserDetail() {
  const { id } = useParams();
  const { state, dispatch } = useAdmin();
  const [dialog, setDialog] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [notice, setNotice] = useState("");
  const user = byId(state.users, id);
  usePageTitle(user ? user.name : "ไม่พบผู้ใช้");

  if (!user) {
    return (
      <div className={pageClass}>
        <PageHeader title="ไม่พบผู้ใช้" fallback="/admin/users" />
        <div className={cx(panelClass, "space-y-4 text-center")}>
          <p className="text-ink-soft">ไม่มีผู้ใช้ “{id}” ในระบบ</p>
          <Link to="/admin/users" className={buttonClasses({ variant: "cocoa", size: "md" })}>
            กลับไปรายการผู้ใช้
          </Link>
        </div>
      </div>
    );
  }

  const isSelf = user._id === state.session.user_id;
  const role = newRole || user.role;
  const orders = state.orders.filter((o) => o.customer_id === user._id);
  const ownedStores = state.stores.filter((s) => s.owner_id === user._id);
  const adminLog = state.activity.filter((a) => a.actor_id === user._id).slice(0, 8);

  function done(message) {
    setNotice(message);
    setDialog(null);
  }

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title={user.name}
        subtitle={`${user.email} · สมัครเมื่อ ${formatDate(user.created_at)}`}
        fallback="/admin/users"
        action={
          <div className="mt-1 flex flex-wrap justify-end gap-1.5">
            <RoleBadge role={user.role} />
            <UserStatusBadge status={user.status} />
          </div>
        }
      />
      <p role="status" className={notice ? "rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink" : "sr-only"}>
        {notice}
      </p>
      {user.status === "suspended" && user.status_note && (
        <Alert tone="error" title="เหตุผลที่ระงับ">
          {user.status_note}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <section aria-labelledby="profile-title" className={panelClass}>
            <h2 id="profile-title" className="mb-3 text-lg font-bold text-ink">
              ข้อมูลบัญชี
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-soft">อีเมล</dt>
                <dd className="break-all text-ink">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">เบอร์โทร</dt>
                <dd className="text-ink">{user.phone || "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">ประเภท</dt>
                <dd className="text-ink">{ROLE_LABEL[user.role]}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">วันที่สมัคร</dt>
                <dd className="text-ink">{formatDate(user.created_at)}</dd>
              </div>
            </dl>
          </section>

          {user.role === "customer" && (
            <section aria-labelledby="orders-title" className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="orders-title" className="text-lg font-bold text-ink">
                  ประวัติออเดอร์ ({orders.length})
                </h2>
                <p className="text-sm text-ink-soft">
                  ยอด Wallet <span className="font-bold text-ink">{formatBaht(walletOf(state, user._id))}</span> ·{" "}
                  <Link to={`/admin/wallets?user=${user._id}`} className={textLinkClass}>
                    ดูรายการ Wallet
                  </Link>
                </p>
              </div>
              <DataList
                label="ประวัติออเดอร์"
                rows={orders}
                empty="ยังไม่เคยสั่งอาหาร"
                pageSize={10}
                columns={[
                  {
                    key: "number",
                    header: "ออเดอร์",
                    primary: true,
                    render: (o) => (
                      <Link to={`/admin/orders/${o.order_number}`} className={textLinkClass}>
                        {o.order_number}
                      </Link>
                    ),
                  },
                  { key: "store", header: "ร้าน", render: (o) => byId(state.stores, o.store_id)?.name ?? "–" },
                  { key: "total", header: "ยอด", className: "text-right tabular-nums", render: (o) => formatBaht(o.total_price) },
                  { key: "status", header: "สถานะ", render: (o) => <OrderStatusBadge status={o.status} /> },
                  { key: "time", header: "เวลา", render: (o) => formatDateTime(o.order_date) },
                ]}
              />
            </section>
          )}

          {user.role === "merchant" && (
            <section aria-labelledby="stores-title" className={panelClass}>
              <h2 id="stores-title" className="mb-3 text-lg font-bold text-ink">
                ร้านที่เป็นเจ้าของ
              </h2>
              {ownedStores.length === 0 ? (
                <p className="text-sm text-ink-soft">ยังไม่มีร้าน</p>
              ) : (
                <ul className="divide-y divide-haze">
                  {ownedStores.map((s) => (
                    <li key={s._id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link to={`/admin/stores/${s._id}`} className={textLinkClass}>
                        {s.name}
                      </Link>
                      <StoreStatusBadge store={s} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {user.role === "admin" && (
            <section aria-labelledby="admin-log-title" className={panelClass}>
              <h2 id="admin-log-title" className="mb-3 text-lg font-bold text-ink">
                การทำงานล่าสุด
              </h2>
              {adminLog.length === 0 ? (
                <p className="text-sm text-ink-soft">ยังไม่มีบันทึก</p>
              ) : (
                <ul className="divide-y divide-haze text-sm">
                  {adminLog.map((a) => (
                    <li key={a._id} className="py-2">
                      <span className="font-semibold text-ink">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
                      <span className="text-ink-soft"> · {a.target_label} · {formatDateTime(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <section aria-labelledby="user-actions-title" className={cx(panelClass, "space-y-4 lg:sticky lg:top-6")}>
          <h2 id="user-actions-title" className="text-lg font-bold text-ink">
            จัดการบัญชี
          </h2>
          {isSelf && <p className="rounded-2xl bg-cream px-3 py-2 text-sm text-ink-soft">นี่คือบัญชีของคุณ ระงับหรือเปลี่ยนประเภทบัญชีตัวเองไม่ได้</p>}

          {user.status === "active" ? (
            <Button variant="danger-outline" size="md" fullWidth disabled={isSelf} onClick={() => setDialog("suspend")}>
              <Ban aria-hidden="true" className="size-4" />
              ระงับบัญชี
            </Button>
          ) : (
            <Button variant="cocoa" size="md" fullWidth disabled={isSelf} onClick={() => setDialog("activate")}>
              <CheckCircle2 aria-hidden="true" className="size-4" />
              ยกเลิกระงับ
            </Button>
          )}

          <div className="space-y-2 border-t border-haze pt-4">
            <SelectField
              id="user-new-role"
              label="ประเภทบัญชี"
              value={role}
              onChange={setNewRole}
              className="[&_select]:w-full"
              options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <Button variant="cocoa-outline" size="md" fullWidth disabled={isSelf || role === user.role} onClick={() => setDialog("role")}>
              <UserCog aria-hidden="true" className="size-4" />
              เปลี่ยนประเภทบัญชี
            </Button>
          </div>

          <div className="border-t border-haze pt-4">
            <Button
              variant="cocoa-outline"
              size="md"
              fullWidth
              disabled
            >
              <KeyRound aria-hidden="true" className="size-4" />
              ส่งลิงก์ตั้งรหัสผ่านใหม่ (ยังไม่มีบริการอีเมล)
            </Button>
          </div>
        </section>
      </div>

      {dialog === "suspend" && (
        <ReasonDialog
          title="ระงับบัญชี"
          subtitle={user.name}
          description="ผู้ใช้จะ login ไม่ได้จนกว่าจะยกเลิกระงับ"
          confirmLabel="ระงับบัญชี"
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const result = await dispatch(actions.setUserStatus(user._id, "suspended", reason));
            if (!result.ok) return result.error?.message || "บันทึกไม่สำเร็จ";
            done(`ระงับบัญชี “${user.name}” แล้ว`);
          }}
        />
      )}
      {dialog === "activate" && (
        <ReasonDialog
          title="ยกเลิกระงับบัญชี"
          subtitle={user.name}
          description="ผู้ใช้จะกลับมา login ได้ตามปกติ"
          confirmLabel="ยกเลิกระงับ"
          danger={false}
          requireReason={false}
          reasonLabel="หมายเหตุ"
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const result = await dispatch(actions.setUserStatus(user._id, "active", reason));
            if (!result.ok) return result.error?.message || "บันทึกไม่สำเร็จ";
            done(`ยกเลิกระงับ “${user.name}” แล้ว`);
          }}
        />
      )}
      {dialog === "role" && (
        <ReasonDialog
          title="เปลี่ยนประเภทบัญชี"
          subtitle={user.name}
          description={`จาก “${ROLE_LABEL[user.role]}” เป็น “${ROLE_LABEL[role]}” สิทธิ์การใช้งานจะเปลี่ยนทันที`}
          confirmLabel="เปลี่ยนประเภท"
          danger={role !== "admin"}
          requireReason={false}
          reasonLabel="หมายเหตุ"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const result = await dispatch(actions.setUserRole(user._id, role));
            if (!result.ok) return result.error?.message || "บันทึกไม่สำเร็จ";
            setNewRole("");
            done(`เปลี่ยน “${user.name}” เป็น${ROLE_LABEL[role]}แล้ว`);
          }}
        />
      )}
    </div>
  );
}

export default UserDetail;
