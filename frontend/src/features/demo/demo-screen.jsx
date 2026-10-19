import { useId } from "react";
import { ArrowLeft, ArrowRight, Bell, Check, CheckCheck, ChefHat, ChevronRight, Clock3, Flame, LockKeyhole, Minus, MousePointer2, Plus, ReceiptText, Search, ShieldCheck, ShoppingBag, Sparkles, Store, UserRound, UtensilsCrossed, Wallet } from "lucide-react";
import { DEMO_ORDER } from "./walkthrough-data.js";
import "./demo-screen.css";

const money = (value) => `฿${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

function FoodArt({ compact = false, steam = false }) {
  const id = useId().replaceAll(":", "");
  return <svg className={`demo-ui-food-art ${compact ? "is-compact" : ""} ${steam ? "has-steam" : ""}`} viewBox="0 0 240 158" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-rice`} x1="110" y1="57" x2="133" y2="118" gradientUnits="userSpaceOnUse"><stop stopColor="#fffdf4" /><stop offset="1" stopColor="#f1e1bd" /></linearGradient>
      <linearGradient id={`${id}-plate`} x1="120" y1="70" x2="120" y2="146" gradientUnits="userSpaceOnUse"><stop stopColor="#fffef9" /><stop offset="1" stopColor="#e9d5af" /></linearGradient>
    </defs>
    <ellipse cx="120" cy="92" rx="91" ry="59" fill="#ffedb9" />
    <ellipse cx="121" cy="137" rx="75" ry="10" fill="#9a5424" opacity=".1" />
    <path d="M32 95c2 33 36 51 88 51s86-18 88-51H32Z" fill={`url(#${id}-plate)`} />
    <ellipse cx="120" cy="95" rx="88" ry="36" fill="#fffdf7" stroke="#e9d9b9" strokeWidth="2" />
    <ellipse cx="120" cy="93" rx="72" ry="27" fill="#e9d5ad" />
    <path d="M67 102c-10-10-3-29 14-39 15-10 43-10 54 1 9 10 17 28 7 39-13 13-59 12-75-1Z" fill={`url(#${id}-rice)`} />
    <g stroke="#dbcaa4" strokeWidth="2" strokeLinecap="round" opacity=".65"><path d="m85 76 3 2m10-7 4 1m11 4 3-2m-33 13 4 1m13-6 3 1m15 9 4-1m-34 8 3 1m10 3 4-1m16-2 3 1" /></g>
    <path d="M126 75c11-13 39-11 48 0 8 10 11 24-1 29-16 10-43 6-48-5-5-9-6-17 1-24Z" fill="#a66a36" />
    <g fill="#ce9456"><ellipse cx="144" cy="77" rx="10" ry="6" transform="rotate(-18 144 77)" /><ellipse cx="167" cy="84" rx="9" ry="6" transform="rotate(15 167 84)" /><ellipse cx="143" cy="99" rx="10" ry="6" transform="rotate(9 143 99)" /><ellipse cx="161" cy="101" rx="8" ry="5" /><ellipse cx="128" cy="89" rx="6" ry="7" /></g>
    <g fill="#56854a"><path d="M132 72c-1-12 11-18 17-12-1 10-8 16-17 12Zm25 5c2-13 14-16 18-9-5 10-12 12-18 9Zm-7 18c-10-7-8-17 0-18 8 6 9 13 0 18Zm16 10c0-11 11-16 16-10-3 10-10 13-16 10Zm-39-5c-7-9-2-18 5-15 6 8 3 15-5 15Z" /><path d="m175 79 4-9m-39 33 2-11" stroke="#47743b" strokeWidth="3" strokeLinecap="round" /></g>
    <g fill="#c34e31"><path d="m139 81 3 2m23 9 3-2m-13 14 2-3" stroke="#c34e31" strokeWidth="3" strokeLinecap="round" /></g>
    <path d="M93 69c3-8 14-10 20-5 6-5 14-1 16 6 9 4 10 17 3 22-4 10-17 12-25 8-9 5-21-3-20-12-7-8-2-17 6-19Z" fill="#fffdf4" stroke="#e4cba2" strokeWidth="1.5" />
    <circle cx="111" cy="81" r="13" fill="#f6b329" /><circle cx="108" cy="77" r="4" fill="#ffd77b" opacity=".75" />
    <path d="m189 112 29-39" stroke="#b4aa96" strokeWidth="5" strokeLinecap="round" /><ellipse cx="222" cy="68" rx="8" ry="13" transform="rotate(33 222 68)" fill="#e1d9c8" />
    <g className="demo-ui-steam" stroke="#bc9064" strokeWidth="3" strokeLinecap="round"><path d="M95 42c-12-15 10-16 0-31" /><path d="M120 35c-10-14 9-15 0-28" /><path d="M145 43c-11-15 9-16 0-29" /></g>
    <g className="demo-ui-food-spark" fill="#de9a44"><path d="m41 52 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm157-18 2-4 1 4 4 2-4 1-1 4-2-4-4-1 4-2Z" /></g>
  </svg>;
}

function StatusPill({ children, tone = "warm", Icon = Check }) {
  return <span className={`demo-ui-status demo-ui-status--${tone}`}><Icon size={12} strokeWidth={2.5} />{children}</span>;
}

function Action({ children, Icon = ArrowRight, hot = false, quiet = false }) {
  return <div className="demo-ui-action-wrap">
    <div className={`demo-ui-action ${quiet ? "demo-ui-action--quiet" : ""} ${hot ? "demo-ui-hotspot" : ""}`}><span>{children}</span><Icon size={16} /></div>
    {hot && <span className="demo-ui-pointer" aria-hidden="true"><span className="demo-ui-pointer-ring" /><MousePointer2 size={27} fill="#fffdf7" stroke="#3b2a16" strokeWidth={1.8} /></span>}
  </div>;
}

function Progress({ stage = 0 }) {
  const labels = ["รับออเดอร์", "กำลังปรุง", "พร้อมรับ", "สำเร็จ"];
  return <div className="demo-ui-progress">{labels.map((label, index) => <div key={label} className={index <= stage ? "is-done" : ""}><span>{index < stage || stage === 3 ? <Check size={10} /> : index + 1}</span><small>{label}</small></div>)}</div>;
}

function MenuLine({ children, compact = false }) {
  return <div className={`demo-ui-menu-line ${compact ? "is-compact" : ""}`}>
    <div className="demo-ui-menu-thumbnail"><FoodArt compact /></div>
    <div className="demo-ui-menu-copy"><strong>{DEMO_ORDER.item}</strong><small>เผ็ดปกติ · ไข่ดาว</small>{children}</div>
    <span className="demo-ui-menu-price">{money(DEMO_ORDER.subtotal)}</span>
  </div>;
}

function Summary({ final = false }) {
  return <div className={`demo-ui-summary ${final ? "is-final" : ""}`}><div><span>ค่าอาหาร {DEMO_ORDER.quantity} รายการ</span><span>{money(DEMO_ORDER.subtotal)}</span></div><div><span>ค่าบริการ</span><span>{money(DEMO_ORDER.serviceFee)}</span></div><div className="demo-ui-summary-total"><strong>ยอดรวม</strong><strong>{money(DEMO_ORDER.total)}</strong></div></div>;
}

function QueueTicket({ ready = false, compact = false }) {
  return <div className={`demo-ui-ticket ${ready ? "is-ready" : ""} ${compact ? "is-compact" : ""}`}>
    <div><span className="demo-ui-eyebrow">คิวของคุณ</span><strong className="demo-ui-queue-number">{DEMO_ORDER.queue}</strong><small>{DEMO_ORDER.store}</small></div>
    <div className="demo-ui-ticket-dash" /><span className="demo-ui-ticket-side">{ready ? <Bell size={22} className="demo-ui-bell" /> : <Clock3 size={22} />}<small>{ready ? "พร้อมรับ" : "รับเองที่ร้าน"}</small></span>
  </div>;
}

function OrderStamp({ merchant = false }) {
  return <div className="demo-ui-order-stamp"><ReceiptText size={13} /><span>{DEMO_ORDER.number}</span><span className="demo-ui-order-stamp-end">{merchant ? DEMO_ORDER.customer : "1 รายการ"}</span></div>;
}

function Toast({ children, Icon = Bell }) {
  return <div className="demo-ui-toast"><span><Icon size={16} /></span><div><strong>MealQ</strong><small>{children}</small></div><span className="demo-ui-toast-now">ตอนนี้</span></div>;
}

function CustomerLogin() {
  return <div className="demo-ui-scene demo-ui-login">
    <div className="demo-ui-login-art"><FoodArt /><span className="demo-ui-login-spark"><Sparkles size={17} /></span></div>
    <h3>มื้อนี้ สั่งไว้ก่อน</h3><p className="demo-ui-description">อร่อยได้แบบไม่ต้องต่อคิว</p>
    <div className="demo-ui-fake-field"><UserRound size={14} /><span>min@mealq.demo</span></div>
    <div className="demo-ui-fake-field"><LockKeyhole size={14} /><span className="demo-ui-password">••••••••</span></div>
    <Action hot>เข้าสู่ระบบลูกค้า</Action>
    <div className="demo-ui-login-rule"><span />หรือ<span /></div>
    <div className="demo-ui-google"><strong>G</strong><span>เข้าสู่ระบบด้วย Google</span></div>
  </div>;
}

function CustomerDiscover() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">สวัสดี {DEMO_ORDER.customer}</span><h3>มื้อนี้กินอะไรดี?</h3></div><span className="demo-ui-bag"><ShoppingBag size={19} /></span></div>
    <div className="demo-ui-search"><Search size={15} /><span>ค้นหาร้านหรือเมนูโปรด</span></div>
    <div className="demo-ui-category-row"><span className="is-active">อาหารตามสั่ง</span><span>เส้น</span><span>เครื่องดื่ม</span></div>
    <div className="demo-ui-store-card"><div className="demo-ui-store-art"><FoodArt /><span className="demo-ui-store-tag"><Store size={11} />เปิดรับออเดอร์</span></div><div className="demo-ui-store-info"><strong>{DEMO_ORDER.store}</strong><span>อาหารทำสด · รับเองที่ร้าน</span><div className="demo-ui-star-row">★ 4.9 <span>· เมนูแนะนำ</span></div></div></div>
    <Action hot Icon={Plus}>เลือก{DEMO_ORDER.item}</Action>
  </div>;
}

function CustomerCustomize() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-title-line"><ArrowLeft size={15} /><span>เลือกความอร่อยของคุณ</span></div>
    <div className="demo-ui-dish-hero"><FoodArt /></div>
    <div className="demo-ui-heading-row demo-ui-dish-heading"><h3>{DEMO_ORDER.item}</h3><strong>{money(DEMO_ORDER.subtotal)}</strong></div>
    <div className="demo-ui-option-card"><strong>ระดับความเผ็ด</strong><div className="demo-ui-option-row"><span>ไม่เผ็ด</span><span className="is-selected"><Check size={10} />เผ็ดปกติ</span><span>เผ็ดมาก</span></div><div className="demo-ui-included"><span><Check size={11} />ไข่ดาว</span><small>รวมในราคาแล้ว</small></div></div>
    <div className="demo-ui-quantity-line"><span>จำนวน</span><div><Minus size={11} /><strong>{DEMO_ORDER.quantity}</strong><Plus size={11} /></div></div>
    <Action hot Icon={ShoppingBag}>เพิ่มลงตะกร้า · {money(DEMO_ORDER.subtotal)}</Action>
  </div>;
}

function CustomerCart() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">มื้อนี้ของคุณ</span><h3>ตะกร้าอาหาร</h3></div><span className="demo-ui-icon-tile"><ShoppingBag size={21} /></span></div>
    <div className="demo-ui-store-strip"><Store size={14} /><strong>{DEMO_ORDER.store}</strong><span>รับที่ร้าน</span></div>
    <div className="demo-ui-white-card"><MenuLine><span className="demo-ui-quantity-small"><Minus size={10} />{DEMO_ORDER.quantity}<Plus size={10} /></span></MenuLine></div>
    <div className="demo-ui-note"><ShieldCheck size={15} /><span>ราคาและตัวเลือกตรงตามที่เลือก</span></div>
    <Summary />
    <Action hot>ไปชำระเงิน</Action>
  </div>;
}

function CustomerCheckout() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">อีกนิดเดียวก็อิ่ม</span><h3>ชำระเงิน</h3></div><ShieldCheck size={23} className="demo-ui-warm-ink" /></div>
    <div className="demo-ui-wallet-card"><div className="demo-ui-wallet-top"><span><Wallet size={19} />MealQ Wallet</span><small>DEMO</small></div><p>ยอดคงเหลือหลังเติมเครดิตตัวอย่าง</p><strong className="demo-ui-wallet-amount">{money(DEMO_ORDER.walletTopup ?? 100)}</strong><div className="demo-ui-wallet-bottom"><span>ชำระ {money(DEMO_ORDER.total)}</span><span>หลังชำระเหลือ {money(DEMO_ORDER.walletAfterPayment ?? 30)}</span></div><span className="demo-ui-wallet-orbit" /></div>
    <div className="demo-ui-payment-method"><span className="demo-ui-radio-dot" /><span><strong>Wallet Demo</strong><small>จำลองการชำระเงินในตัวอย่างนี้</small></span><Check size={15} /></div>
    <Summary />
    <Action hot Icon={LockKeyhole}>ยืนยันชำระ {money(DEMO_ORDER.total)}</Action>
  </div>;
}

function CustomerWallet() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">เตรียมเครดิตก่อนสั่ง</span><h3>เติมเงินเข้า Wallet</h3></div><span className="demo-ui-icon-tile"><Wallet size={22} /></span></div>
    <div className="demo-ui-wallet-card"><div className="demo-ui-wallet-top"><span><Wallet size={19} />MealQ Wallet</span><small>DEMO</small></div><p>บัญชีใหม่เริ่มต้น</p><strong className="demo-ui-wallet-amount">฿0</strong><div className="demo-ui-wallet-bottom"><span>กดเพิ่มเครดิตได้เอง</span><span>ไม่ตัดเงินจริง</span></div><span className="demo-ui-wallet-orbit" /></div>
    <div className="demo-ui-topup-choice"><span>จำนวนเครดิตตัวอย่าง</span><strong>{money(DEMO_ORDER.walletTopup ?? 100)}</strong><Check size={17} /></div>
    <Action hot Icon={Plus}>เติมเงิน Demo {money(DEMO_ORDER.walletTopup ?? 100)}</Action>
    <div className="demo-ui-wallet-topup-result"><span className="demo-ui-topup-check"><CheckCheck size={18} /></span><div><strong>เติมเครดิตตัวอย่างแล้ว</strong><small>ยอดคงเหลือ {money(DEMO_ORDER.walletTopup ?? 100)} · พร้อมชำระ {money(DEMO_ORDER.total)}</small></div></div>
    <div className="demo-ui-subtle-note">เครดิตจำลอง ใช้เพื่อสาธิตขั้นตอนเท่านั้น</div>
  </div>;
}

function CustomerQueued({ stepId }) {
  const confirmed = stepId === "merchant-confirm";
  return <div className="demo-ui-scene">
    <Toast Icon={CheckCheck}>{confirmed ? "ร้านยืนยันออเดอร์แล้ว" : "ส่งออเดอร์ให้ร้านแล้ว"}</Toast>
    <div className="demo-ui-centered-heading"><StatusPill tone="green">ชำระแล้ว · Wallet Demo</StatusPill><h3>{confirmed ? "ร้านรับออเดอร์แล้ว" : "ได้คิวแล้ว!"}</h3><p className="demo-ui-description">{confirmed ? "รอร้านเริ่มเตรียมอาหาร" : "รอสักครู่ ร้านกำลังตรวจออเดอร์"}</p></div>
    <QueueTicket /><OrderStamp />
    <div className="demo-ui-white-card"><Progress /><div className="demo-ui-status-message"><Clock3 size={16} /><span>{confirmed ? "รอเริ่มทำอาหาร" : "รอร้านยืนยันออเดอร์"}</span><span className="demo-ui-waiting-dots"><i /><i /><i /></span></div></div>
    <div className="demo-ui-subtle-note">ดูสถานะได้จากหน้าออเดอร์นี้</div>
  </div>;
}

function CustomerPreparing() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-centered-heading"><StatusPill Icon={ChefHat}>กำลังปรุง</StatusPill><h3>ร้านเริ่มทำอาหารแล้ว</h3><p className="demo-ui-description">ครัวกำลังเตรียมมื้ออร่อยให้คุณ</p></div>
    <div className="demo-ui-cooking-art"><FoodArt steam /><span className="demo-ui-cooking-label"><Flame size={13} />ทำสดทีละจาน</span></div>
    <QueueTicket compact /><Progress stage={1} />
    <div className="demo-ui-note"><Bell size={15} /><span>อาหารพร้อมแล้วจะแจ้งให้ทราบ</span></div>
  </div>;
}

function PickupCode({ large = false }) {
  return <div className={`demo-ui-code-card ${large ? "is-large" : ""}`}><span className="demo-ui-eyebrow">รหัสรับอาหาร</span><div className="demo-ui-code-digits">{String(DEMO_ORDER.pickupCode).split("").map((digit, index) => <span key={index}>{digit}</span>)}</div><small>แสดงหรือแจ้งรหัสนี้ให้ร้านตรวจสอบ</small></div>;
}

function CustomerReady() {
  return <div className="demo-ui-scene">
    <Toast>อาหารพร้อมรับแล้ว!</Toast>
    <div className="demo-ui-ready-heading"><span className="demo-ui-ready-bell"><Bell className="demo-ui-bell" size={28} /></span><div><span className="demo-ui-eyebrow">มื้ออร่อยรออยู่</span><h3>ไปรับอาหารได้เลย</h3></div></div>
    <QueueTicket ready compact /><PickupCode /><Progress stage={2} />
    <Action hot Icon={ChevronRight}>แสดงรหัสให้ร้าน</Action>
  </div>;
}

function CustomerPickup() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-centered-heading"><StatusPill Icon={Store}>รับอาหารที่ร้าน</StatusPill><h3>ยื่นรหัสนี้ให้ร้านได้เลย</h3><p className="demo-ui-description">{DEMO_ORDER.store} · คิว {DEMO_ORDER.queue}</p></div>
    <PickupCode large /><MenuLine compact />
    <div className="demo-ui-verify-wait"><ShieldCheck size={23} /><div><strong>ให้ร้านตรวจรหัสก่อนส่งอาหาร</strong><small>ร้านจะยืนยันการรับและปิดออเดอร์ให้</small></div></div>
    <div className="demo-ui-subtle-note">สถานะจะอัปเดตหลังร้านตรวจรหัสและส่งอาหาร</div>
  </div>;
}

function Completed({ merchant = false }) {
  return <div className="demo-ui-scene demo-ui-completed">
    <div className="demo-ui-finish-mark"><CheckCheck size={38} /><span /><span /><span /><span /></div>
    <div className="demo-ui-centered-heading"><StatusPill tone="green">ออเดอร์สำเร็จ</StatusPill><h3>{merchant ? "ส่งมอบมื้ออร่อยแล้ว" : "รับอาหารเรียบร้อย"}</h3><p className="demo-ui-description">{merchant ? "ตรวจรหัสแล้ว ปิดออเดอร์ครบขั้นตอน" : "ขอบคุณที่สั่งอาหารผ่าน MealQ"}</p></div>
    <div className="demo-ui-receipt"><OrderStamp merchant={merchant} /><MenuLine compact /><Summary final /><div className="demo-ui-receipt-paid"><CheckCheck size={13} />ชำระด้วย Wallet Demo</div></div>
    <div className="demo-ui-finish-footer"><UtensilsCrossed size={14} /><span>{merchant ? "พร้อมรับออเดอร์ถัดไป" : "ขอให้เป็นมื้อที่อร่อยนะ"}</span></div>
  </div>;
}

function MerchantStats({ active = "waiting" }) {
  const current = active === "preparing" ? 1 : active === "ready" ? 2 : 0;
  return <div className="demo-ui-merchant-stats">{["ออเดอร์ใหม่", "กำลังทำ", "พร้อมรับ"].map((label, index) => <div className={active !== "waiting" && index === current ? "is-active" : ""} key={label}><span>{label}</span><strong>{active !== "waiting" && index === current ? "1" : "0"}</strong></div>)}</div>;
}

function MerchantWaiting() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">วันนี้ที่ร้าน</span><h3>{DEMO_ORDER.store}</h3></div><StatusPill tone="green" Icon={Store}>เปิดร้าน</StatusPill></div>
    <MerchantStats /><div className="demo-ui-empty-kitchen"><span className="demo-ui-empty-chef"><ChefHat size={45} /></span><h4>ครัวพร้อมแล้ว</h4><p>ออเดอร์จากลูกค้าจะเข้ามาที่นี่</p><span className="demo-ui-listening"><i />รอรับออเดอร์ใหม่</span></div>
    <div className="demo-ui-note"><Bell size={15} /><span>เมื่อมีออเดอร์ ระบบจะแจ้งเจ้าของร้าน</span></div>
  </div>;
}

function MerchantOrderCard({ status = "new" }) {
  return <div className={`demo-ui-kitchen-order ${status === "new" ? "is-new" : ""}`}>
    <div className="demo-ui-kitchen-order-top"><span>คิว <strong>{DEMO_ORDER.queue}</strong></span><StatusPill tone={status === "ready" ? "green" : "warm"} Icon={status === "preparing" ? Flame : status === "ready" ? Bell : Clock3}>{status === "new" ? "ออเดอร์ใหม่" : status === "confirmed" ? "ยืนยันแล้ว" : status === "preparing" ? "กำลังทำ" : "พร้อมรับ"}</StatusPill></div>
    <OrderStamp merchant /><MenuLine compact /><div className="demo-ui-kitchen-paid"><span><Wallet size={12} />Wallet Demo · ชำระแล้ว</span><strong>{money(DEMO_ORDER.total)}</strong></div>
  </div>;
}

function MerchantNew() {
  return <div className="demo-ui-scene">
    <Toast>มีออเดอร์ใหม่เข้าร้าน</Toast><MerchantStats active="new" /><MerchantOrderCard />
    <div className="demo-ui-note"><ShieldCheck size={15} /><span>ตรวจรายการ ตัวเลือก และยอดชำระ</span></div>
    <Action hot Icon={Check}>ยืนยันออเดอร์</Action>
  </div>;
}

function MerchantConfirmed() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">พร้อมเข้าครัว</span><h3>ยืนยันออเดอร์แล้ว</h3></div><span className="demo-ui-icon-tile is-green"><CheckCheck size={22} /></span></div>
    <MerchantStats active="confirmed" /><MerchantOrderCard status="confirmed" />
    <div className="demo-ui-kitchen-flow"><span className="is-current">ยืนยันแล้ว</span><ArrowRight size={13} /><span>กำลังทำ</span><ArrowRight size={13} /><span>พร้อมรับ</span></div>
    <Action hot Icon={ChefHat}>เริ่มทำอาหาร</Action>
  </div>;
}

function MerchantPreparing() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-heading-row"><div><span className="demo-ui-eyebrow">ออเดอร์กำลังเดินหน้า</span><h3>กำลังปรุงมื้ออร่อย</h3></div><Flame size={23} className="demo-ui-warm-ink" /></div>
    <MerchantStats active="preparing" /><div className="demo-ui-merchant-cooking"><FoodArt steam /><div><span>คิว {DEMO_ORDER.queue}</span><strong>{DEMO_ORDER.item}</strong><small>เผ็ดปกติ · ไข่ดาว · {DEMO_ORDER.quantity} จาน</small></div></div>
    <div className="demo-ui-note"><CheckCheck size={15} /><span>เช็กอาหารครบแล้ว จึงเรียกลูกค้ารับ</span></div>
    <Action hot Icon={Bell}>อาหารพร้อมรับ</Action>
  </div>;
}

function MerchantReady() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-ready-heading"><span className="demo-ui-ready-bell"><Bell className="demo-ui-bell" size={28} /></span><div><span className="demo-ui-eyebrow">แจ้งลูกค้าแล้ว</span><h3>รอลูกค้ามารับ</h3></div></div>
    <MerchantStats active="ready" /><MerchantOrderCard status="ready" />
    <div className="demo-ui-note is-green"><Bell size={15} /><span>ลูกค้าเห็นสถานะ “อาหารพร้อมรับ”</span></div>
    <Action hot Icon={ShieldCheck}>ตรวจรหัสรับอาหาร</Action>
  </div>;
}

function MerchantVerify() {
  return <div className="demo-ui-scene">
    <div className="demo-ui-centered-heading"><StatusPill Icon={ShieldCheck}>ตรวจสอบก่อนส่งมอบ</StatusPill><h3>รหัสจากลูกค้าตรงไหม?</h3><p className="demo-ui-description">คิว {DEMO_ORDER.queue} · {DEMO_ORDER.customer}</p></div>
    <div className="demo-ui-white-card demo-ui-merchant-code"><span className="demo-ui-eyebrow">กรอกรหัสรับอาหารจากลูกค้า</span><div className="demo-ui-code-digits">{String(DEMO_ORDER.pickupCode).split("").map((digit, index) => <span key={index} className={index === 3 ? "demo-ui-code-cursor" : ""}>{digit}</span>)}</div><div className="demo-ui-code-match"><ShieldCheck size={15} /><span>รหัสตรงกับออเดอร์นี้</span></div></div>
    <MenuLine compact /><div className="demo-ui-note"><LockKeyhole size={15} /><span>ปิดออเดอร์หลังตรวจรหัสและส่งอาหาร</span></div>
    <Action hot Icon={CheckCheck}>ยืนยันรับอาหารและปิดออเดอร์</Action>
  </div>;
}

const CUSTOMER_VIEWS = { login: CustomerLogin, discover: CustomerDiscover, customize: CustomerCustomize, cart: CustomerCart, wallet: CustomerWallet, checkout: CustomerCheckout, queued: CustomerQueued, preparing: CustomerPreparing, ready: CustomerReady, pickup: CustomerPickup, completed: Completed };
const MERCHANT_VIEWS = { waiting: MerchantWaiting, new: MerchantNew, "new-order": MerchantNew, confirmed: MerchantConfirmed, preparing: MerchantPreparing, ready: MerchantReady, verify: MerchantVerify, "verify-pickup": MerchantVerify, completed: Completed };

export function DemoScreen({ audience = "customer", view, stepId, playing = false, reducedMotion = false }) {
  const merchant = audience === "merchant";
  const Screen = (merchant ? MERCHANT_VIEWS : CUSTOMER_VIEWS)[view] || (merchant ? MerchantWaiting : CustomerLogin);
  return <div className="mealq-demo-device" data-audience={merchant ? "merchant" : "customer"} data-view={view} data-playing={playing ? "true" : "false"} data-reduced-motion={reducedMotion ? "true" : "false"} role="group" aria-label={`หน้าจอจำลองสำหรับ${merchant ? "ร้านค้า" : "ลูกค้า"}`}>
    <div className="demo-ui-window-bar" aria-hidden="true"><span className="demo-ui-window-dots"><i /><i /><i /></span><span>mealq.site/{merchant ? "merchant" : "customer"}</span><LockKeyhole size={10} /></div>
    <div className="demo-ui-app-bar"><div className="demo-ui-app-brand"><span>Q</span><div><strong>MealQ</strong><small>{merchant ? "สำหรับร้านค้า" : "สั่งก่อน ไม่ต้องต่อคิว"}</small></div></div><span className={`demo-ui-app-avatar ${merchant ? "is-merchant" : ""}`}>{merchant ? <Store size={18} /> : <UserRound size={18} />}</span></div>
    <div className="demo-ui-app-body" key={`${audience}-${stepId}-${view}`}><Screen merchant={merchant} stepId={stepId} /></div>
    <div className="demo-ui-screen-footer"><span><i />หน้าจอตัวอย่าง</span><span>{merchant ? "เจ้าของร้าน" : "ลูกค้า"} <ChevronRight size={10} /></span></div>
  </div>;
}
