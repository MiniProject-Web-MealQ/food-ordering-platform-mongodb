import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { DataList } from "@/features/admin/components/data-list";
import { FilterRow, SearchField } from "@/features/admin/components/fields";
import { formatBaht, formatDateTime } from "@/features/admin/format";
import { WALLET_TX_LABEL } from "@/features/admin/labels";
import { byId, walletOf } from "@/features/admin/stats";
import { actions, useAdmin } from "@/features/admin/store";
import { StatCard } from "@/features/merchant/components/stat-card";
import { MerchantDialog } from "@/features/merchant/components/merchant-dialog";
import { fieldClass, pageClass, panelClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const MONTH = 30 * 24 * 60 * 60 * 1000;

function signed(amount) {
  return `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${formatBaht(Math.abs(amount))}`;
}

function AdjustForm({ balance, onAdjust }) {
  const [direction, setDirection] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!value || value < 1) return setError("กรอกจำนวนเงินตั้งแต่ 1 บาท");
    if (direction === "remove" && value > balance) return setError(`หักได้ไม่เกินยอดคงเหลือ ${formatBaht(balance)}`);
    if (reason.trim().length < 5) return setError("ใส่เหตุผลอย่างน้อย 5 ตัวอักษร");
    const signature = `${direction}:${value}:${reason.trim()}`;
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    const result = await onAdjust(direction === "add" ? value : -value, reason.trim(), request.current.key);
    setBusy(false);
    if (!result.ok) { setError(result.error?.message || "ปรับยอดไม่สำเร็จ"); return; }
    request.current = null;
    setAmount("");
    setReason("");
    setError("");
  }

  return (
    <form onSubmit={submit} noValidate className={cx(panelClass, "space-y-4")}>
      <h3 className="font-bold text-ink">ปรับยอดด้วยมือ</h3>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">เพิ่มหรือหักเงิน</legend>
        {[
          { value: "add", label: "เพิ่มเงิน" },
          { value: "remove", label: "หักเงิน" },
        ].map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cream px-3 py-2.5 text-sm font-semibold text-ink has-checked:bg-forest has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-ink">
            <input type="radio" name="adjust-direction" value={o.value} checked={direction === o.value} onChange={() => setDirection(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </fieldset>
      <TextField
        id="adjust-amount"
        label="จำนวนเงิน"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        trailing={<span className="pr-4 text-sm font-medium text-ink-soft">บาท</span>}
      />
      <div className="space-y-2">
        <label htmlFor="adjust-reason" className="block text-sm font-semibold text-ink">
          เหตุผล (บังคับ)
        </label>
        <textarea id="adjust-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น คืนเงินจากออเดอร์ MQ3021 ที่ร้านยกเลิก" className={cx(fieldClass, "resize-y")} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="cocoa" size="md" fullWidth disabled={busy}>
        บันทึกการปรับยอด
      </Button>
    </form>
  );
}

function WalletDialog({ user, state, onClose, onAdjust }) {
  const txs = state.wallet_transactions.filter((t) => t.user_id === user._id);
  const balance = walletOf(state, user._id);
  return (
    <MerchantDialog eyebrow="Wallet" title={user.name} subtitle={user.email} onClose={onClose}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-3">
          <StatCard label="ยอดคงเหลือ" value={formatBaht(balance)} highlight />
          <DataList
            label="ประวัติรายการ Wallet"
            rows={txs}
            pageSize={15}
            empty="ยังไม่มีรายการ"
            columns={[
              { key: "time", header: "เวลา", primary: true, render: (t) => formatDateTime(t.created_at) },
              { key: "type", header: "ประเภท", render: (t) => WALLET_TX_LABEL[t.type] },
              {
                key: "desc",
                header: "รายละเอียด",
                render: (t) => (
                  <span>
                    {t.description}
                    {t.by && <span className="block text-xs text-ink-soft">โดย {byId(state.users, t.by)?.name ?? "ผู้ดูแล"}</span>}
                  </span>
                ),
              },
              { key: "amount", header: "จำนวน", className: "text-right tabular-nums", render: (t) => <span className={t.amount < 0 ? "text-danger" : "text-brand-ink"}>{signed(t.amount)}</span> },
              { key: "after", header: "คงเหลือ", className: "text-right tabular-nums", render: (t) => formatBaht(t.balance_after) },
            ]}
          />
        </div>
        <div className="lg:sticky lg:top-0">
          <AdjustForm balance={balance} onAdjust={onAdjust} />
        </div>
      </div>
    </MerchantDialog>
  );
}

function Wallets() {
  usePageTitle("Wallet และการเงิน");
  const { state, dispatch } = useAdmin();
  const now = useNow();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const openId = searchParams.get("user");
  const openUser = openId ? byId(state.users, openId) : null;

  const customers = state.users.filter((u) => u.role === "customer");
  const lastTx = new Map();
  const txCount = new Map();
  for (const t of state.wallet_transactions) {
    if (!lastTx.has(t.user_id)) lastTx.set(t.user_id, t.created_at);
    txCount.set(t.user_id, (txCount.get(t.user_id) ?? 0) + 1);
  }
  const recent = state.wallet_transactions.filter((t) => t.created_at >= now - MONTH);
  const total = state.wallets.reduce((s, w) => s + w.balance, 0);
  const refunds = recent.filter((t) => t.type === "refund").reduce((s, t) => s + t.amount, 0);
  const adjusts = recent.filter((t) => t.type === "adjust").length;

  const q = query.trim().toLowerCase();
  const rows = customers
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .sort((a, b) => walletOf(state, b._id) - walletOf(state, a._id));

  function open(userId) {
    setSearchParams({ user: userId }, { preventScrollReset: true });
  }

  function close() {
    setSearchParams({}, { replace: true, preventScrollReset: true });
  }

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="Wallet และการเงิน" subtitle="ยอดเงินในกระเป๋า MealQ ของลูกค้า กดชื่อเพื่อดูรายการและปรับยอด" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <StatCard label="ยอดรวมใน Wallet ทั้งระบบ" value={formatBaht(total)} highlight />
        <StatCard label="คืนเงินเข้า Wallet" value={formatBaht(refunds)} hint="30 วันล่าสุด" />
        <StatCard label="ปรับยอดโดยผู้ดูแล" value={`${adjusts} ครั้ง`} hint="30 วันล่าสุด" />
      </div>
      <p role="status" className={notice ? "rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink" : "sr-only"}>
        {notice}
      </p>
      <FilterRow>
        <SearchField id="wallet-search" label="ค้นหาลูกค้า" value={query} onChange={setQuery} placeholder="ค้นหาชื่อหรืออีเมล" />
      </FilterRow>
      <DataList
        label="Wallet ของลูกค้า"
        rows={rows}
        empty="ไม่พบลูกค้า"
        columns={[
          {
            key: "name",
            header: "ลูกค้า",
            primary: true,
            render: (u) => (
              <div className="min-w-0">
                <button type="button" onClick={() => open(u._id)} className={cx("rounded text-left font-semibold text-brand-ink underline-offset-4 hover:underline", focusRing)}>
                  {u.name}
                </button>
                <p className="truncate text-xs font-normal text-ink-soft">{u.email}</p>
              </div>
            ),
          },
          { key: "balance", header: "ยอดคงเหลือ", className: "text-right tabular-nums font-semibold", render: (u) => formatBaht(walletOf(state, u._id)) },
          { key: "count", header: "จำนวนรายการ", className: "text-right tabular-nums", render: (u) => txCount.get(u._id) ?? 0 },
          { key: "last", header: "รายการล่าสุด", render: (u) => formatDateTime(lastTx.get(u._id)) },
          {
            key: "profile",
            header: "บัญชี",
            render: (u) => (
              <Link to={`/admin/users/${u._id}`} className={cx(textLinkClass, "text-sm")}>
                ดูบัญชี
              </Link>
            ),
          },
        ]}
      />
      {openId && !openUser && (
        <Alert tone="error" title="ไม่พบลูกค้าที่เลือก">
          ลิงก์อาจไม่ถูกต้อง
        </Alert>
      )}
      {openUser && (
        <WalletDialog
          user={openUser}
          state={state}
          onClose={close}
          onAdjust={async (amount, reason, key) => {
            const result = await dispatch(actions.adjustWallet(openUser._id, amount, reason, key));
            if (!result.ok) return result;
            setNotice(`ปรับยอด Wallet ของ ${openUser.name} ${signed(amount)} แล้ว`);
            return result;
          }}
        />
      )}
    </div>
  );
}

export default Wallets;
