import { useState } from "react";
import { formatOrderCode } from "@/features/customer/format";
import { useNavigate, useParams } from "react-router";
import { StarIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { currentStatus, getOrderRestaurant } from "@/features/customer/catalog";
import { submitReview } from "@/features/customer/api";
import { PageHeader } from "@/features/customer/components/page-header";
import { useCustomer } from "@/features/customer/store";
import { chipClasses } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import NotFoundPage from "@/pages/not-found";

const RATING_LABELS = ["", "แย่มาก", "ไม่ค่อยดี", "พอใช้", "ดี", "ยอดเยี่ยม — ขอบคุณ!"];
const TAGS = ["อร่อย", "รอไม่นาน", "คุ้มราคา", "ปริมาณเยอะ", "แพ็กมาดี"];

function StarInput({ value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">ให้คะแนน</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer rounded-full p-1 has-focus-visible:outline-2 has-focus-visible:outline-ink">
            <input
              type="radio"
              name="rating"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <span className="sr-only">{star} ดาว</span>
            <StarIcon
              filled={star <= value}
              strokeWidth={1.5}
              className={cx("size-11 transition-colors", star <= value ? "text-amber" : "text-ink-soft/40")}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Review() {
  const { id } = useParams();
  usePageTitle("รีวิวออเดอร์");
  const navigate = useNavigate();
  const { state, dispatch } = useCustomer();
  const order = state.orders.find((o) => o.id === id);
  const [rating, setRating] = useState(order?.review?.rating ?? 0);
  const [tags, setTags] = useState(order?.review?.tags ?? []);
  const [text, setText] = useState(order?.review?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!order) return <NotFoundPage />;

  const restaurant = getOrderRestaurant(order);
  const canReview = currentStatus(order) === "PICKED_UP";

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (rating === 0 || saving || !canReview) return;
    setSaving(true);
    const result = await submitReview(order.id, { rating, tags, text: text.trim() });
    if (result.ok) {
      dispatch({ type: "order/upsert", order: result.data.order });
      navigate("/customer/orders", { replace: true });
    } else { setError(result.error?.message || "บันทึกรีวิวไม่สำเร็จ"); setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6 lg:px-8 lg:pb-16">
      <PageHeader
        title="อาหารเป็นอย่างไร?"
        subtitle={`${formatOrderCode(order.id)} · ${restaurant.name} · ${order.items.map((i) => i.name).join(", ")}`}
        fallback="/customer/orders"
      />

      <main className="flex-1 space-y-6 pb-8 lg:space-y-8 lg:rounded-4xl lg:bg-cream/60 lg:p-8">
        <div>
          <StarInput value={rating} onChange={setRating} />
          <p aria-live="polite" className="mt-1 min-h-6 font-semibold text-brand-ink">
            {RATING_LABELS[rating]}
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-3 font-bold text-ink">แท็กที่ตรงที่สุด</legend>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(tag)}
                  className={chipClasses({ selected: on, tone: "light" })}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="review-text" className="sr-only">
            เขียนรีวิว
          </label>
          <textarea
            id="review-text"
            rows={4}
            maxLength={500}
            placeholder="เขียนรีวิว (ไม่บังคับ)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-none rounded-3xl border-2 border-haze bg-cream px-5 py-4 text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="text-danger">{error}</p>}
        {!canReview && <p role="status" className="text-ink-soft">รีวิวได้หลังจากรับอาหารแล้ว</p>}
        <button type="submit" disabled={rating === 0 || saving || !canReview} className={buttonClasses({ variant: "cocoa", fullWidth: true })}>
          {saving ? "กำลังบันทึก…" : rating === 0 ? "เลือกจำนวนดาวก่อนส่ง" : "ส่งรีวิว"}
        </button>
      </main>
    </form>
  );
}

export default Review;
