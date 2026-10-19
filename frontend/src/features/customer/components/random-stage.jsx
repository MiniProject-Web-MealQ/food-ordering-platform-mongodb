import { useEffect, useRef } from "react";
import { ArrowUpRight, Check, Orbit, Sparkles, UtensilsCrossed } from "lucide-react";
import { CatalogImage } from "./catalog-image";
import { formatBaht } from "../format";
import "./random-stage.css";

const BURST = [
  [-145, -95, -30], [-90, -145, 32], [-40, -175, -8], [35, -170, 36], [100, -140, -35], [150, -85, 23],
  [-165, 12, 45], [-120, 85, -18], [-60, 125, 14], [70, 120, -29], [130, 75, 41], [170, 5, -18],
];

/** A visual stage only: parent owns drawing, filtering, final announcements and order actions. */
export function RandomStage({ item, restaurant, orbitItems = [], phase = "idle", motionEnabled = true, drawId = 0, candidateCount = 0 }) {
  const element = useRef(null);
  const frame = useRef(null);
  const parallaxAllowed = useRef(false);
  const food = phase === "empty" ? null : item;
  const store = food ? restaurant : null;
  const seen = new Set();
  const orbitMenu = orbitItems.filter((menu) => {
    if (!menu?.id || seen.has(menu.id)) return false;
    seen.add(menu.id);
    return true;
  }).slice(0, 5);
  const hasPrice = typeof food?.price === "number" && Number.isFinite(food.price) && food.price >= 0;
  const poolSize = Number.isFinite(candidateCount) && candidateCount > 0 ? Math.floor(candidateCount) : 0;

  useEffect(() => {
    const node = element.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let visible = true;
    const syncMotion = () => {
      const paused = !motionEnabled || reduced.matches || document.hidden || !visible;
      node.dataset.paused = String(paused);
      parallaxAllowed.current = !paused && pointer.matches;
      if (!parallaxAllowed.current) {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        node.style.setProperty("--random-pointer-x", "0");
        node.style.setProperty("--random-pointer-y", "0");
      }
    };
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    }, { threshold: 0.08 }) : null;
    observer?.observe(node);
    reduced.addEventListener("change", syncMotion);
    pointer.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    syncMotion();
    return () => {
      observer?.disconnect();
      reduced.removeEventListener("change", syncMotion);
      pointer.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [motionEnabled]);

  function move(event) {
    if (!parallaxAllowed.current || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.current?.style.setProperty("--random-pointer-x", x.toFixed(3));
      element.current?.style.setProperty("--random-pointer-y", y.toFixed(3));
      frame.current = null;
    });
  }

  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    element.current?.style.setProperty("--random-pointer-x", "0");
    element.current?.style.setProperty("--random-pointer-y", "0");
  }

  return (
    <section ref={element} className="random-stage" data-phase={phase} data-motion={motionEnabled ? "on" : "off"} onPointerMove={move} onPointerLeave={reset} aria-label="เวทีสุ่มเมนูอาหาร">
      <div className="random-stage__ambience" aria-hidden="true"><span /><span /><span /></div>
      <div className="random-stage__grain" aria-hidden="true" />
      <div className="random-stage__topline" aria-hidden="true"><span><Orbit /> A LITTLE FOOD MAGIC</span><span>MEALQ / DISCOVER</span></div>
      <div className="random-stage__visual">
        <div className="random-stage__beam random-stage__beam--left" aria-hidden="true" />
        <div className="random-stage__beam random-stage__beam--right" aria-hidden="true" />
        <div className="random-stage__floor" aria-hidden="true" />
        <div className="random-stage__ring random-stage__ring--outer" aria-hidden="true"><span /></div>
        <div className="random-stage__ring random-stage__ring--inner" aria-hidden="true"><span /></div>
        <div className="random-stage__orbit-menu" aria-hidden="true">
          {orbitMenu.map((menu, index) => (
            <div key={menu.id} className={`random-stage__satellite random-stage__satellite--${index + 1}`}>
              <div className="random-stage__satellite-float"><CatalogImage src={menu.image} label={menu.name} compact className="random-stage__satellite-image" /></div>
            </div>
          ))}
        </div>
        <div className="random-stage__plate-hover">
          <div className="random-stage__plate-tilt">
            <div className="random-stage__plate-shadow" aria-hidden="true" />
            <div className="random-stage__plate">
              <span className="random-stage__plate-rim" aria-hidden="true" />
              {food ? (
                <div className="random-stage__food-frame" key={`${drawId}-${food.id}-${phase === "result" ? "winner" : "preview"}`}>
                  <CatalogImage src={food.image} label={food.name} loading="eager" className="random-stage__food-image" />
                </div>
              ) : (
                <div className="random-stage__aperture" aria-hidden="true"><div /><span><UtensilsCrossed /></span><div /></div>
              )}
              <span className="random-stage__plate-sheen" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="random-stage__star random-stage__star--one" aria-hidden="true">✧</div>
        <div className="random-stage__star random-stage__star--two" aria-hidden="true">✦</div>
        <div className="random-stage__star random-stage__star--three" aria-hidden="true">+</div>
        <div className="random-stage__orbit-label" aria-hidden="true"><span />{phase === "spinning" ? "FINDING YOUR FLAVOUR" : phase === "result" ? "A DELICIOUS MATCH" : "LET THE UNIVERSE CHOOSE"}</div>
        {phase === "result" && food && (
          <div className="random-stage__winner" key={`winner-${drawId}`} aria-hidden="true"><span><Check /></span>มื้อนี้… จานนี้เลย!</div>
        )}
        {phase === "result" && food && (
          <div className="random-stage__burst" key={`burst-${drawId}`} aria-hidden="true">{BURST.map(([x, y, rotate], index) => <i key={index} style={{ "--burst-x": `${x}px`, "--burst-y": `${y}px`, "--burst-rotate": `${rotate}deg`, "--burst-delay": `${index * 18}ms` }} />)}</div>
        )}
      </div>
      <div className="random-stage__copy">
        <p className="random-stage__eyebrow"><Sparkles aria-hidden="true" />{phase === "empty" ? "ลองเปลี่ยนตัวเลือกด้านล่าง" : phase === "spinning" ? "กำลังค้นหามื้อที่ใช่ให้คุณ" : phase === "result" ? "ความอร่อยที่สุ่มมาให้คุณ" : poolSize ? `${poolSize} เมนู พร้อมให้คุณค้นพบ` : "มื้อต่อไป ให้ความอร่อยพาไป"}</p>
        <h2 className="random-stage__name">{food?.name || (phase === "empty" ? "ยังไม่มีเมนูในวงสุ่มนี้" : "จักรวาลนี้ มีแต่ของอร่อย")}</h2>
        <div className="random-stage__details">
          {store ? <span className="random-stage__store">{store.logo && <CatalogImage src={store.logo} label="" compact className="random-stage__store-logo" />}<span>{store.name}</span></span> : <span>{phase === "empty" ? "ขยายหมวดหรือช่วงราคา แล้วลองค้นหามื้อใหม่" : "เลือกรสนิยมของคุณ แล้วออกตามหาจานโปรด"}</span>}
          {hasPrice && <><span className="random-stage__detail-dot" aria-hidden="true" /><span className="random-stage__price">{formatBaht(food.price)}</span></>}
        </div>
      </div>
      <div className="random-stage__bottomline" aria-hidden="true"><span>GOOD FOOD. GREAT SURPRISES.</span><span><ArrowUpRight /> YOUR NEXT FAVOURITE</span></div>
    </section>
  );
}
