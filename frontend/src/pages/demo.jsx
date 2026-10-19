import { useEffect, useReducer, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, ShoppingBag, Store } from "lucide-react";
import { Link } from "react-router";
import { Logo } from "@/components/brand/logo";
import { DemoScreen } from "@/features/demo/demo-screen";
import { DEMO_STEPS } from "@/features/demo/walkthrough-data";
import { DEMO_SPEEDS, INITIAL_PLAYBACK, playbackProgress, playbackReducer } from "@/features/demo/playback";
import { usePageTitle } from "@/lib/use-page-title";
import "@/features/demo/demo-walkthrough.css";

const VIEWS = [{ id: "both", label: "ทั้งสองฝั่ง" }, { id: "customer", label: "ลูกค้า" }, { id: "merchant", label: "ร้านค้า" }];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function DemoPage() {
  usePageTitle("สาธิตการใช้งานตั้งแต่สั่งจนรับอาหาร");
  const [state, dispatch] = useReducer(playbackReducer, INITIAL_PLAYBACK);
  const [view, setView] = useState("both");
  const reducedMotion = useReducedMotion();
  const step = DEMO_STEPS[state.index];
  const progress = playbackProgress(state);
  const durationSeconds = Math.round(DEMO_STEPS.reduce((sum, entry) => sum + entry.durationMs, 0) / 1000);

  useEffect(() => {
    if (!state.playing) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", deltaMs: now - last });
      last = now;
    }, 100);
    return () => window.clearInterval(timer);
  }, [state.playing]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) dispatch({ type: "pause" }); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const seek = (index) => dispatch({ type: "seek", index });
  const playLabel = state.playing ? "หยุดชั่วคราว" : state.finished ? "เล่นอีกครั้ง" : state.index || state.elapsedMs ? "เล่นต่อ" : "เล่นการสาธิต";

  return (
    <div className="demo-walkthrough" data-playing={state.playing} data-reduced-motion={reducedMotion}>
      <header className="demo-site-header">
        <Logo />
        <Link to="/" className="demo-back-link"><ArrowLeft aria-hidden="true" size={16} />กลับหน้าแรก</Link>
      </header>
      <main className="demo-main">
        <section className="demo-intro" aria-labelledby="demo-title">
          <p className="demo-eyebrow"><span />ดู MealQ ทำงาน</p>
          <h1 id="demo-title">หนึ่งออเดอร์ <span>ตั้งแต่สั่งจนรับ</span></h1>
          <p className="demo-intro-copy">ดูวิธีใช้งานจริงทีละขั้นตอน ทั้งหน้าจอลูกค้าและร้านค้าไปพร้อมกัน</p>
          <div className="demo-intro-meta"><span className="demo-simulation-badge">ข้อมูลจำลอง</span><span>{DEMO_STEPS.length} ขั้นตอน · ประมาณ {Math.floor(durationSeconds / 60)} นาที {durationSeconds % 60} วินาที</span></div>
        </section>

        <section className="demo-player" aria-label="เครื่องเล่นสาธิตการใช้งาน">
          <div className="demo-player-topline">
            <span className="demo-lesson-label"><span className="demo-live-dot" />สั่งอาหารหนึ่งมื้อกับ MealQ</span>
            <span className="demo-step-count">{String(state.index + 1).padStart(2, "0")} <span>/ {String(DEMO_STEPS.length).padStart(2, "0")}</span></span>
          </div>

          <div className="demo-layout">
            <nav className="demo-chapters" aria-label="เลือกขั้นตอนการสาธิต">
              <p className="demo-chapter-heading">เส้นทางของออเดอร์</p>
              <ol>
                {DEMO_STEPS.map((entry, index) => <li key={entry.id}>
                  <button type="button" className={`demo-chapter ${index === state.index ? "is-current" : ""} ${index < state.index ? "is-past" : ""}`} aria-current={index === state.index ? "step" : undefined} onClick={() => seek(index)}>
                    <span className="demo-chapter-number" aria-hidden="true">{index < state.index ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span>
                    <span>{entry.title}</span>
                    {index === state.index && <ChevronRight size={15} aria-hidden="true" className="demo-chapter-arrow" />}
                  </button>
                </li>)}
              </ol>
            </nav>

            <div className="demo-story">
              <div className="demo-narration" aria-live="polite" aria-atomic="true">
                <p className={`demo-actor-tag is-${step.actor}`}>{step.actor === "customer" ? "ลูกค้าเป็นคนทำ" : step.actor === "merchant" ? "ร้านค้าเป็นคนทำ" : "ทั้งสองฝั่งเห็นพร้อมกัน"}</p>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </div>
              <div className="demo-view-switch" role="group" aria-label="เลือกมุมมอง">
                {VIEWS.map((entry) => <button key={entry.id} type="button" aria-pressed={view === entry.id} onClick={() => setView(entry.id)}>{entry.label}</button>)}
              </div>
              <div className={`demo-screens ${view !== "both" ? "is-single" : ""}`} key={`${step.id}-${view}`}>
                {(view === "both" || view === "customer") && <figure className={`demo-screen-frame demo-scene-entrance ${step.actor !== "merchant" ? "is-acting" : ""}`}>
                  <div className="demo-role-label"><ShoppingBag size={16} aria-hidden="true" /><span>ฝั่งลูกค้า</span><span className="demo-role-context">มือถือ</span></div>
                  <div aria-hidden="true"><DemoScreen audience="customer" view={step.customerView} stepId={step.id} playing={state.playing} reducedMotion={reducedMotion} /></div>
                  <figcaption>{step.customerCaption}</figcaption>
                </figure>}
                {(view === "both" || view === "merchant") && <figure className={`demo-screen-frame demo-scene-entrance ${step.actor !== "customer" ? "is-acting" : ""}`}>
                  <div className="demo-role-label"><Store size={16} aria-hidden="true" /><span>ฝั่งร้านค้า</span><span className="demo-role-context">กระดานคิว</span></div>
                  <div aria-hidden="true"><DemoScreen audience="merchant" view={step.merchantView} stepId={step.id} playing={state.playing} reducedMotion={reducedMotion} /></div>
                  <figcaption>{step.merchantCaption}</figcaption>
                </figure>}
              </div>
            </div>
          </div>

          <div className="demo-controls">
            <div className="demo-progress" role="progressbar" aria-label="ความคืบหน้าการสาธิต" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`ขั้นตอน ${state.index + 1} จาก ${DEMO_STEPS.length}: ${step.title}`}><span style={{ width: `${progress}%` }} /></div>
            <div className="demo-controls-row">
              <button type="button" className="demo-play-button" onClick={() => dispatch({ type: state.playing ? "pause" : "play" })}>{state.playing ? <Pause aria-hidden="true" size={19} /> : <Play aria-hidden="true" size={19} fill="currentColor" />}{playLabel}</button>
              <div className="demo-transport">
                <button type="button" className="demo-icon-button" aria-label="ขั้นตอนก่อนหน้า" disabled={state.index === 0} onClick={() => seek(state.index - 1)}><ChevronLeft aria-hidden="true" size={20} /></button>
                <button type="button" className="demo-icon-button" aria-label="ขั้นตอนถัดไป" disabled={state.index === DEMO_STEPS.length - 1} onClick={() => seek(state.index + 1)}><ChevronRight aria-hidden="true" size={20} /></button>
                <button type="button" className="demo-icon-button demo-restart" aria-label="เริ่มการสาธิตใหม่" onClick={() => dispatch({ type: "restart" })}><RotateCcw aria-hidden="true" size={17} /></button>
              </div>
              <label className="demo-speed-label">ความเร็ว<select aria-label="ความเร็วการสาธิต" value={state.speed} onChange={(event) => dispatch({ type: "speed", speed: Number(event.target.value) })}>{DEMO_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
            </div>
          </div>
        </section>

        <p className="demo-privacy-note">การสาธิตใช้ข้อมูลจำลอง ไม่มีการสร้างออเดอร์ ชำระเงิน หรือส่งแจ้งเตือนจริง{reducedMotion && " · ลดการเคลื่อนไหวตามการตั้งค่าอุปกรณ์แล้ว"}</p>
        <section className="demo-next" aria-labelledby="demo-next-title">
          <div><p className="demo-eyebrow">พร้อมลองด้วยตัวเอง?</p><h2 id="demo-next-title">มื้อต่อไป ให้ MealQ ช่วย</h2><p>ลูกค้าเลือกเมนูแล้วรอรับ ร้านค้าจัดการทุกคิวได้ในที่เดียว</p></div>
          <div className="demo-next-actions"><Link to="/customer/explore" className="demo-real-link">ลองสั่งอาหาร<ArrowRight size={18} aria-hidden="true" /></Link><Link to="/merchant/login" className="demo-merchant-link">เข้าสู่ระบบร้านค้า</Link></div>
        </section>
      </main>
      <footer className="demo-footer"><span>MealQ · สั่งก่อน ไม่ต้องต่อคิว</span><Link to="/help">ศูนย์ช่วยเหลือ</Link></footer>
    </div>
  );
}
