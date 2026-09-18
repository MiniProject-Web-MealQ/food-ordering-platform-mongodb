import { Link } from "react-router";
import { buttonClasses } from "@/components/ui/styles";

const DISHES = [
  { emoji: "🍜", tone: "bg-mint", position: "top-0 left-8" },
  { emoji: "🍛", tone: "bg-leaf", position: "top-6 right-4" },
  { emoji: "🥗", tone: "bg-white", position: "bottom-0 left-0" },
  { emoji: "🧋", tone: "bg-mint", position: "right-28 bottom-2" },
];

export function RandomFoodCta() {
  return (
    <section
      id="random-food"
      aria-labelledby="random-food-title"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-5 py-6 sm:px-8 lg:py-20"
    >
      <div className="relative overflow-hidden rounded-4xl bg-brand px-7 py-8 sm:px-10 sm:py-10 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-center lg:rounded-[3rem] lg:px-16 lg:py-16">
        <div>
          <p className="text-sm font-bold tracking-[0.2em] text-ink/70">RANDOM FOOD</p>
          <h2 id="random-food-title" className="mt-2 text-3xl font-bold text-ink lg:text-5xl">
            วันนี้กินอะไรดี?
          </h2>
          <p className="mt-3 max-w-lg leading-relaxed text-ink/85 lg:mt-4 lg:text-lg">
            ตั้งงบ เลือกประเภท แล้วให้ MealQ สุ่มให้ — เฉพาะร้านที่เปิดและของยังไม่หมด
          </p>
          <Link
            to="/customer/random"
            className={`${buttonClasses({ variant: "dark" })} mt-6 lg:mt-8`}
          >
            <span aria-hidden="true">🎲</span>
            ลองสุ่มดู
          </Link>
        </div>

        <div aria-hidden="true" className="relative hidden h-64 lg:block">
          {DISHES.map((dish) => (
            <span
              key={dish.emoji}
              className={`absolute grid size-28 place-items-center rounded-full text-5xl shadow-float ${dish.tone} ${dish.position}`}
            >
              {dish.emoji}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
