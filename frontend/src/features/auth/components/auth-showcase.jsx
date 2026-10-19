import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, BellRing, Check, Pause, Play, Sparkles, UtensilsCrossed } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CatalogImage } from "@/features/customer/components/catalog-image";
import "./auth-showcase.css";

const DISHES = [
  { id: "basil", name: "กะเพราหมูไข่ดาว", label: "อาหารไทย", mood: "จัดจ้าน จานโปรด", image: "/catalogue/20261019-v2/khao-hom/basil-pork-egg.webp?v=20261019-v2-r2", accent: "orange" },
  { id: "sushi", name: "เซ็ตแซลมอนซูชิ", label: "อาหารญี่ปุ่น", mood: "มื้อเล็ก ความสุขใหญ่", image: "/catalogue/20261019-v2/sora-japanese/salmon-sushi-set.webp?v=20261019-v2-r2", accent: "peach" },
  { id: "mango", name: "ข้าวเหนียวมะม่วง", label: "ของหวาน", mood: "เติมหวานให้วันดี ๆ", image: "/catalogue/20261019-v2/sweet-cloud/mango-sticky-rice.webp?v=20261019-v2-r2", accent: "yellow" },
];

/** Food imagery is illustrative; this panel never invents a live order or queue. */
export function AuthShowcase() {
  const [selected, setSelected] = useState(0);
  const [motionStopped, setMotionStopped] = useState(false);
  const panel = useRef(null);
  const frame = useRef(null);
  const parallaxAllowed = useRef(false);
  const buttons = useRef([]);
  const figureId = useId();
  const dish = DISHES[selected];

  useEffect(() => {
    const element = panel.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let visible = true;
    const update = () => {
      const paused = document.hidden || !visible || motion.matches || motionStopped;
      element.dataset.motionPaused = String(paused);
      parallaxAllowed.current = !paused && pointer.matches;
      if (!parallaxAllowed.current) {
        element.style.setProperty("--auth-pointer-x", "0");
        element.style.setProperty("--auth-pointer-y", "0");
      }
    };
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }) : null;
    observer?.observe(element);
    motion.addEventListener("change", update);
    pointer.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", update);
      pointer.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [motionStopped]);

  function move(event) {
    if (!parallaxAllowed.current || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      panel.current?.style.setProperty("--auth-pointer-x", x.toFixed(3));
      panel.current?.style.setProperty("--auth-pointer-y", y.toFixed(3));
      frame.current = null;
    });
  }

  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    panel.current?.style.setProperty("--auth-pointer-x", "0");
    panel.current?.style.setProperty("--auth-pointer-y", "0");
  }

  function selectWithKeys(event, index) {
    const target = { ArrowRight: (index + 1) % DISHES.length, ArrowLeft: (index + DISHES.length - 1) % DISHES.length, Home: 0, End: DISHES.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setSelected(target);
    buttons.current[target]?.focus();
  }

  return (
    <aside className="mealq-auth-showcase" ref={panel} data-accent={dish.accent} data-reduce-motion={motionStopped} aria-label="รู้จัก MealQ ผ่านเมนูอาหาร">
      <div className="mealq-auth-showcase__wash" aria-hidden="true" />
      <header className="mealq-auth-showcase__top">
        <Logo />
        <span className="mealq-auth-showcase__edition">GOOD FOOD.<br />GOOD DAY.</span>
      </header>
      <div className="mealq-auth-showcase__content">
        <div className="mealq-auth-showcase__intro">
          <p className="mealq-auth-showcase__eyebrow"><span aria-hidden="true" /> มื้ออร่อย เริ่มที่นี่</p>
          <h2>วันดี ๆ<br />เริ่มด้วย<span>ของอร่อย</span><Sparkles aria-hidden="true" /></h2>
          <p className="mealq-auth-showcase__description">เลือกร้านที่ชอบ สั่งเมนูที่ใช่<br />ให้ MealQ ช่วยดูแลมื้อถัดไปของคุณ</p>
        </div>
        <div className="mealq-auth-showcase__stage" onPointerMove={move} onPointerLeave={reset}>
          <span className="mealq-auth-showcase__orbit mealq-auth-showcase__orbit--one" aria-hidden="true" />
          <span className="mealq-auth-showcase__orbit mealq-auth-showcase__orbit--two" aria-hidden="true" />
          <span className="mealq-auth-showcase__word" aria-hidden="true">อร่อย!</span>
          <div className="mealq-auth-showcase__photo-motion">
            <figure id={figureId} className="mealq-auth-showcase__photo" key={dish.id}>
              <CatalogImage src={dish.image} label={dish.name} loading="lazy" className="mealq-auth-showcase__image" />
              <figcaption className="mealq-auth-showcase__caption" aria-live="polite" aria-atomic="true"><span>{dish.label}</span><strong>{dish.name}</strong></figcaption>
            </figure>
          </div>
          <div className="mealq-auth-showcase__float mealq-auth-showcase__float--love" aria-hidden="true">
            <span className="mealq-auth-showcase__float-icon"><UtensilsCrossed /></span>
            <span>มื้อโปรดของคุณ<strong>เลือกความอร่อยได้เลย</strong></span><Check />
          </div>
          <div className="mealq-auth-showcase__float mealq-auth-showcase__float--mood" aria-hidden="true"><Sparkles /><span>{dish.mood}</span></div>
          <span className="mealq-auth-showcase__spark mealq-auth-showcase__spark--one" aria-hidden="true">✳</span>
          <span className="mealq-auth-showcase__spark mealq-auth-showcase__spark--two" aria-hidden="true">✦</span>
          <span className="mealq-auth-showcase__dot" aria-hidden="true" />
        </div>
        <div className="mealq-auth-showcase__choices">
          <div className="mealq-auth-showcase__choose-label"><span>วันนี้อยากกินอะไร?</span><span>ลองเลือกเมนู <ArrowUpRight aria-hidden="true" /></span></div>
          <div className="mealq-auth-showcase__dish-list" role="group" aria-label="เลือกรูปตัวอย่างเมนู">
            {DISHES.map((item, index) => (
              <button key={item.id} type="button" className="mealq-auth-showcase__dish" aria-label={`ดูภาพ${item.name}`} aria-pressed={index === selected} aria-controls={figureId} onClick={() => setSelected(index)} onKeyDown={(event) => selectWithKeys(event, index)} ref={(element) => { buttons.current[index] = element; }}>
                <img src={item.image} alt="" loading="lazy" width="33" height="33" className="mealq-auth-showcase__dish-image" />
                <span>{item.label}</span><span className="mealq-auth-showcase__dish-check" aria-hidden="true"><Check /></span>
              </button>
            ))}
          </div>
          <p className="mealq-auth-showcase__sample">ภาพตัวอย่างเมนูบน MealQ</p>
        </div>
      </div>
      <footer className="mealq-auth-showcase__footer">
        <p><BellRing aria-hidden="true" /> แจ้งเตือนเมื่ออาหารพร้อมรับ</p>
        <p>PromptPay และ Wallet ในโหมด Demo</p>
        <div><span>© 2026 MealQ</span><button type="button" className="mealq-auth-showcase__motion" aria-pressed={motionStopped} onClick={() => setMotionStopped((stopped) => !stopped)}>{motionStopped ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{motionStopped ? "เปิดภาพเคลื่อนไหว" : "หยุดภาพเคลื่อนไหว"}</button></div>
      </footer>
    </aside>
  );
}
