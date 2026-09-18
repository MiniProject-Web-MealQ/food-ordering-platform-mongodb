import { useEffect, useState } from "react";
import GlyphPortal from "@/components/ui/glyph-portal";

const WORD = "MealQ";
const FALLBACK_FACE = 'Georgia, "Times New Roman", serif';

// Palette tokens from src/index.css (AGENTS.md §32). Text on brand/alert stays ink.
const PORTAL_THEME = {
  "--gp-paper": "#fff",
  "--gp-ink": "var(--color-ink)",
  "--gp-field": "var(--color-brand)",
  "--gp-foreground": "var(--color-ink)",
};

const REASONS = [
  { title: "รู้เวลารอจริง", description: "เห็นคิวก่อนหน้าและเวลาเตรียมอาหาร ก่อนตัดสินใจสั่ง" },
  {
    title: "ไม่ต้องยืนหน้าร้าน",
    description: "สั่งและจ่ายจากที่นั่ง แล้วเดินไปรับตอนแจ้งเตือนดัง",
  },
  {
    title: "ร้านจัดคิวง่ายขึ้น",
    description: "ออเดอร์เรียงเข้าครัวเป็นระเบียบ ลดความวุ่นวายช่วงพีค",
  },
];

/**
 * GlyphPortal measures the glyph once per mount, so the face must be loaded first.
 * Reads the self-hosted family from --font-fraunces and falls back to a serif after 1.6s.
 */
function useLoadedDisplayFace() {
  const [face, setFace] = useState(null);

  useEffect(() => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      setFace(value);
    };
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-fraunces")
      .trim();
    if (!family) {
      const immediate = window.setTimeout(() => finish(FALLBACK_FACE), 0);
      return () => clearTimeout(immediate);
    }
    const timeout = window.setTimeout(() => finish(FALLBACK_FACE), 1600);
    document.fonts.load(`900 100px ${family}`, WORD).then(
      () => finish(`${family}, ${FALLBACK_FACE}`),
      () => finish(FALLBACK_FACE),
    );
    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, []);

  return face;
}

/** Scroll-driven brand moment: the camera flies into the "Q" of MealQ and opens onto why MealQ exists. */
export function QueuePortal() {
  const face = useLoadedDisplayFace();

  if (!face) {
    // Reserve the opening frame's height so the page doesn't jump when the portal mounts.
    return <div aria-hidden="true" className="h-svh bg-white" />;
  }

  return (
    <div data-mealq-portal>
      <GlyphPortal
        word={WORD}
        focusChar="Q"
        interactive={false}
        fontFamily={face}
        fontWeight={900}
        scrollLength={2.4}
        enterLabel="ทำไมต้อง MealQ"
        style={PORTAL_THEME}
        background={
          <div className="absolute inset-0" style={{ transform: "scale(var(--gp-field-scale,1))" }}>
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=2000&q=80"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-brand/85" />
          </div>
        }
        front={
          <>
            <p className="absolute inset-x-6 bottom-[calc(100%-var(--gp-word-top,35%)+28px)] text-center text-xs font-bold tracking-[0.25em] text-ink-soft sm:text-sm">
              ORDER FAST · SKIP THE QUEUE
            </p>
            <p className="absolute inset-x-6 top-[calc(var(--gp-word-bottom,50%)+24px)] text-center text-base text-ink-soft sm:text-lg">
              เลื่อนลงเพื่อเข้าไปในคิวที่ไม่ต้องยืนรอ
            </p>
          </>
        }
      >
        <div className="mx-auto w-full max-w-7xl py-8">
          <p className="text-sm font-bold tracking-[0.2em] text-ink/70">WHY MEALQ</p>
          <h2 className="mt-3 max-w-3xl text-4xl leading-tight font-bold text-ink text-balance lg:text-6xl">
            เวลาพักของคุณ ไม่ควรหมดไปกับการยืนต่อคิว
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3 lg:mt-14 lg:gap-12">
            {REASONS.map((reason, index) => (
              <li key={reason.title} className="border-t-2 border-ink/20 pt-5">
                <p className="text-sm font-bold text-ink/70 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink lg:text-2xl">{reason.title}</h3>
                <p className="mt-2 leading-relaxed font-medium text-ink lg:text-lg">
                  {reason.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </GlyphPortal>
    </div>
  );
}
