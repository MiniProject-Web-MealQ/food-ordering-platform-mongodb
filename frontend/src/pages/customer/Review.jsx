import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { PlusIcon, StarIcon, XIcon } from "@/components/icons";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { getRestaurant } from "@/features/customer/catalog";
import { PageHeader } from "@/features/customer/components/page-header";
import { useCustomer } from "@/features/customer/store";
import { chipClasses } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import NotFoundPage from "@/pages/not-found";

const RATING_LABELS = ["", "แย่มาก", "ไม่ค่อยดี", "พอใช้", "ดี", "ยอดเยี่ยม — ขอบคุณ!"];
const TAGS = ["อร่อย", "รอไม่นาน", "คุ้มราคา", "ปริมาณเยอะ", "แพ็กมาดี"];
const MAX_PHOTOS = 3;

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
              className={cx("size-11 transition-colors", star <= value ? "text-amber" : "text-muted/40")}
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
  // { url } previews. URLs are revoked on removal; the few left at unmount are freed with the page.
  const [photos, setPhotos] = useState([]);

  if (!order) return <NotFoundPage />;

  const restaurant = getRestaurant(order.restaurantId);

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (rating === 0) return;
    // MOCK: photos stay on this device until the review API accepts uploads.
    dispatch({ type: "order/review", orderId: order.id, review: { rating, tags, text: text.trim() } });
    navigate("/customer/orders", { replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6 lg:px-8 lg:pb-16">
      <PageHeader
        title="อาหารเป็นอย่างไร?"
        subtitle={`#${order.id} · ${restaurant.name} · ${order.items.map((i) => i.name).join(", ")}`}
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

        <div className="space-y-3">
          <p id="review-photos" className="font-bold text-ink">
            รูปอาหาร <span className="font-normal text-muted">(ไม่บังคับ · สูงสุด {MAX_PHOTOS} รูป)</span>
          </p>
          <ul aria-labelledby="review-photos" className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <li key={photo.url} className="relative">
                <img src={photo.url} alt={`รูปที่ ${index + 1}`} className="size-20 rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo.url);
                    setPhotos((prev) => prev.filter((p) => p !== photo));
                  }}
                  aria-label={`ลบรูปที่ ${index + 1}`}
                  className={`absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-forest text-white ${focusRing}`}
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            ))}
            {photos.length < MAX_PHOTOS && (
              <li>
                <label className="grid size-20 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-leaf bg-cream text-muted hover:bg-haze has-focus-visible:outline-2 has-focus-visible:outline-ink">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const room = MAX_PHOTOS - photos.length;
                      const picked = [...e.target.files].slice(0, room).map((file) => ({
                        url: URL.createObjectURL(file),
                      }));
                      setPhotos((prev) => [...prev, ...picked]);
                      e.target.value = "";
                    }}
                  />
                  <PlusIcon className="size-6" />
                  <span className="sr-only">เพิ่มรูป</span>
                </label>
              </li>
            )}
          </ul>
        </div>

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
            className="w-full resize-none rounded-3xl border-2 border-haze bg-cream px-5 py-4 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none"
          />
        </div>

        <button type="submit" disabled={rating === 0} className={buttonClasses({ variant: "primary", fullWidth: true })}>
          {rating === 0 ? "เลือกจำนวนดาวก่อนส่ง" : "ส่งรีวิว"}
        </button>
      </main>
    </form>
  );
}

export default Review;
