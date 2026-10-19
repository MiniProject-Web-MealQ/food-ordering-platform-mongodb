import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Dice5, History, Pause, Play, RotateCcw, SlidersHorizontal, Sparkles, Store, Volume2, VolumeX } from "lucide-react";
import { CatalogImage } from "@/features/customer/components/catalog-image";
import { RandomStage } from "@/features/customer/components/random-stage";
import { RandomAtmosphere } from "@/features/customer/components/random-atmosphere";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { MENU_ITEMS, getMenuItem, getRestaurant, isOrderable } from "@/features/customer/catalog";
import { formatBaht } from "@/features/customer/format";
import { CUISINES } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { chooseRandomCandidate, filterRandomCandidates, getRandomBudgetMax, getRecentMenuIds, sampleRandomCandidates } from "@/features/customer/random-food";
import { DEFAULT_RANDOM_FILTERS as DEFAULT_FILTERS, readRandomPreferences, writeRandomPreferences } from "@/features/customer/random-preferences";
import { useRandomAudio } from "@/features/customer/use-random-audio";
import { usePageTitle } from "@/lib/use-page-title";
import "@/features/customer/random-experience.css";

const CUISINE_IDS = CUISINES.map((cuisine) => cuisine.id);
const CUISINE_SYMBOLS = { all: "✦", thai: "🍜", japanese: "🍣", korean: "🍲", fastfood: "🍔", drink: "🥤", dessert: "🍰" };
const menuId = (item) => item?.id || item?.backendId;
const menuPath = (item) => `/customer/restaurants/${item.restaurantId}/menu/${menuId(item)}`;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function RandomFood() {
  usePageTitle("สุ่มอาหาร · ค้นพบจานโปรด");
  const { state } = useCustomer();
  const budgetMax = getRandomBudgetMax(MENU_ITEMS);
  const [initialPreferences] = useState(() => readRandomPreferences({ cuisineIds: CUISINE_IDS, maxBudget: budgetMax }));
  const [filters, setFilters] = useState(initialPreferences.filters);
  const [phase, setPhase] = useState("idle");
  const [previewId, setPreviewId] = useState(null);
  const [resultId, setResultId] = useState(null);
  const [drawId, setDrawId] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [history, setHistory] = useState([]);
  const [reelIds, setReelIds] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [notice, setNotice] = useState("");
  const [motionEnabled, setMotionEnabled] = useState(initialPreferences.motionEnabled);
  const [soundEnabled, setSoundEnabled] = useState(initialPreferences.soundEnabled);
  const [preferencesSaved, setPreferencesSaved] = useState(null);
  const [orbitIds, setOrbitIds] = useState(() => {
    const pool = filterRandomCandidates(MENU_ITEMS, getRestaurant, { ...initialPreferences.filters, noRepeat: Boolean(state.user) && initialPreferences.filters.noRepeat }, getRecentMenuIds(state.orders));
    return sampleRandomCandidates(pool, pool.length).map(menuId);
  });
  const reducedMotion = useReducedMotion();
  const allowMotion = motionEnabled && !reducedMotion;
  const { start: startAudio, tick: tickAudio, finish: finishAudio, stop: stopAudio } = useRandomAudio(soundEnabled);
  const timers = useRef([]);
  const busy = useRef(false);
  const run = useRef(0);
  const finishNow = useRef(null);
  const orders = useRef(state.orders);
  const motion = useRef(allowMotion);

  useEffect(() => { orders.current = state.orders; }, [state.orders]);
  useEffect(() => {
    motion.current = allowMotion;
    if (!allowMotion) finishNow.current?.();
  }, [allowMotion]);
  useEffect(() => () => {
    run.current += 1;
    timers.current.forEach(clearTimeout);
    finishNow.current = null;
    stopAudio();
  }, [stopAudio]);

  // The provider refreshes catalogue arrays in place. Recompute on each render.
  const effectiveFilters = { ...filters, noRepeat: Boolean(state.user) && filters.noRepeat };
  const recent = getRecentMenuIds(state.orders);
  const candidates = filterRandomCandidates(MENU_ITEMS, getRestaurant, effectiveFilters, recent);
  const cuisinePool = filterRandomCandidates(MENU_ITEMS, getRestaurant, { ...effectiveFilters, cuisine: "all" }, recent);
  const previousResult = resultId ? getMenuItem(resultId) : null;
  const result = previousResult && getRestaurant(previousResult.restaurantId) ? previousResult : null;
  const stagePhase = phase === "result" && !result ? "empty" : phase;
  const stageItem = phase === "result" ? result : phase === "spinning" ? getMenuItem(previewId) : candidates[Math.floor(candidates.length / 3)] || null;
  const spinning = phase === "spinning";
  const candidateIds = new Set(candidates.map(menuId));
  const rankedOrbit = orbitIds.map(getMenuItem).filter((item) => item && candidateIds.has(menuId(item)));
  const rankedIds = new Set(rankedOrbit.map(menuId));
  // Resolve saved ordering against fresh catalogue objects, filling gaps after live removals.
  const orbitItems = [...rankedOrbit, ...candidates.filter((item) => !rankedIds.has(menuId(item)))]
    .filter((item) => menuId(item) !== menuId(stageItem)).slice(0, 5);
  const historyItems = history.map(getMenuItem).filter((item) => item && getRestaurant(item.restaurantId));
  const showEmpty = phase === "empty" || (phase === "result" && !result);

  function savePreferences(nextFilters, nextMotion = motionEnabled, nextSound = soundEnabled) {
    setPreferencesSaved(writeRandomPreferences({ filters: nextFilters, motionEnabled: nextMotion, soundEnabled: nextSound }, { cuisineIds: CUISINE_IDS, maxBudget: budgetMax }));
  }

  function applyFilters(nextFilters) {
    if (busy.current) return;
    setFilters(nextFilters);
    const pool = filterRandomCandidates(MENU_ITEMS, getRestaurant, { ...nextFilters, noRepeat: Boolean(state.user) && nextFilters.noRepeat }, getRecentMenuIds(orders.current));
    setOrbitIds(sampleRandomCandidates(pool, pool.length).map(menuId));
    setPhase("idle");
    setNotice("");
    setAnnouncement("");
    savePreferences(nextFilters);
  }

  function setFilter(key, value) {
    applyFilters({ ...filters, [key]: value });
  }

  function resetFilters() {
    applyFilters(DEFAULT_FILTERS);
  }

  function spin() {
    if (busy.current) return;
    const activeFilters = { ...filters, noRepeat: Boolean(state.user) && filters.noRepeat };
    const pool = filterRandomCandidates(MENU_ITEMS, getRestaurant, activeFilters, getRecentMenuIds(orders.current));
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setNotice("");
    if (!pool.length) {
      setPhase("empty");
      setAnnouncement("ยังไม่มีเมนูที่ตรงเงื่อนไข ลองขยายงบหรือเลือกประเภทอาหารใหม่");
      return;
    }
    busy.current = true;
    const activeRun = ++run.current;
    const winner = chooseRandomCandidate(pool, resultId);
    // Bound image decoding without limiting the actual draw's eligible pool.
    const reel = [winner, ...sampleRandomCandidates(pool, 6, [menuId(winner)])];
    setReelIds(reel.map(menuId));
    setOrbitIds(sampleRandomCandidates(reel, reel.length).map(menuId));
    startAudio();
    const finish = () => {
      if (!busy.current || run.current !== activeRun) return;
      busy.current = false;
      finishNow.current = null;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      // Shops can close or update stock while the animation runs.
      const freshPool = filterRandomCandidates(MENU_ITEMS, getRestaurant, activeFilters, getRecentMenuIds(orders.current));
      const currentWinner = freshPool.find((item) => menuId(item) === menuId(winner)) || chooseRandomCandidate(freshPool, resultId);
      if (!currentWinner) {
        setPhase("empty");
        setOrbitIds([]);
        setNotice("ข้อมูลร้านหรือเมนูเพิ่งเปลี่ยน ลองปรับตัวเลือกแล้วสุ่มอีกครั้ง");
        setAnnouncement("ไม่มีเมนูที่ตรงเงื่อนไขแล้ว กรุณาลองใหม่");
        stopAudio();
        return;
      }
      const id = menuId(currentWinner);
      setPreviewId(id);
      setResultId(id);
      setOrbitIds(sampleRandomCandidates(freshPool, freshPool.length).map(menuId));
      setDrawId((value) => value + 1);
      setHistory((items) => [id, ...items.filter((value) => value !== id)].slice(0, 5));
      setPhase("result");
      if (motion.current) setBurstKey((value) => value + 1);
      setAnnouncement(`มื้อนี้ได้ ${currentWinner.name} จาก ${getRestaurant(currentWinner.restaurantId).name} ราคา ${formatBaht(currentWinner.price)}`);
      finishAudio();
    };
    finishNow.current = finish;
    if (!allowMotion) {
      finish();
      return;
    }
    setPhase("spinning");
    setPreviewId(menuId(reel[reel.length - 1]));
    setAnnouncement("กำลังสุ่มเมนูอาหาร คุณสามารถข้ามเอฟเฟกต์เพื่อดูผลได้");
    const delays = Array.from({ length: 20 }, (_, index) => 48 + index * index * 0.75);
    const total = delays.reduce((sum, delay) => sum + delay, 0);
    let elapsed = 0;
    delays.forEach((delay, index) => {
      elapsed += delay / total * 2650;
      timers.current.push(setTimeout(() => {
        if (!busy.current || run.current !== activeRun) return;
        setPreviewId(menuId(index === delays.length - 1 ? winner : reel[index % reel.length]));
        setOrbitIds(sampleRandomCandidates(reel, reel.length).map(menuId));
        tickAudio();
      }, elapsed));
    });
    timers.current.push(setTimeout(finish, 2950));
  }

  function toggleMotion() {
    const nextMotion = !motionEnabled;
    setMotionEnabled(nextMotion);
    savePreferences(filters, nextMotion);
    if (allowMotion && busy.current) {
      motion.current = false;
      finishNow.current?.();
    }
  }

  function toggleSound() {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    savePreferences(filters, motionEnabled, nextSound);
  }

  return (
    <div className="random-experience" data-motion={allowMotion ? "on" : "off"}>
      <div className="random-experience__aurora" aria-hidden="true" />
      <div className="random-experience__shell">
        <header className="random-experience__header">
          <div>
            <p className="random-experience__eyebrow"><span /> THE DELICIOUS UNKNOWN</p>
            <h1>มื้อนี้… <span>สุ่มให้ว้าว.</span><Sparkles aria-hidden="true" /></h1>
            <p className="random-experience__intro">พักคำถามว่า “กินอะไรดี” แล้วปล่อยให้จานอร่อยมาเซอร์ไพรส์คุณ</p>
          </div>
          <div className="random-experience__controls" aria-label="ตั้งค่าเอฟเฟกต์">
            <button type="button" aria-pressed={soundEnabled} onClick={toggleSound} title={soundEnabled ? "ปิดเสียง" : "เปิดเสียงตอนสุ่ม"}>{soundEnabled ? <Volume2 /> : <VolumeX />}<span>เสียง{soundEnabled ? "เปิด" : "ปิด"}</span></button>
            <button type="button" aria-pressed={motionEnabled && !reducedMotion} disabled={reducedMotion} onClick={toggleMotion} title={reducedMotion ? "กำลังใช้การลดการเคลื่อนไหวตามอุปกรณ์" : allowMotion ? "หยุดการเคลื่อนไหว" : "เปิดการเคลื่อนไหว"}>{allowMotion ? <Pause /> : <Play />}<span>{allowMotion ? "พักเอฟเฟกต์" : "ลดการเคลื่อนไหว"}</span></button>
          </div>
        </header>

        <div className="random-experience__layout">
          <div className="random-experience__main">
            <div className="random-experience__stage-wrap">
              <RandomStage item={stageItem} restaurant={getRestaurant(stageItem?.restaurantId)} orbitItems={orbitItems} phase={stagePhase} motionEnabled={allowMotion} drawId={drawId} candidateCount={candidates.length} />
              <RandomAtmosphere motionEnabled={allowMotion} burstKey={burstKey} />
            </div>
            <div className="random-experience__action-panel">
              <div className="random-experience__status"><span className={spinning ? "is-spinning" : ""} aria-hidden="true" /><span>{spinning ? "ความอร่อยกำลังเดินทางมาหาคุณ" : phase === "result" && result ? "ค้นพบแล้ว! จานนี้เป็นยังไงบ้าง?" : `${candidates.length} เมนูตรงใจ · สุ่มจากข้อมูลร้านจริง`}</span><span className="random-experience__step">{spinning ? "DRAWING" : phase === "result" && result ? "YOUR MATCH" : "READY TO DISCOVER"}</span></div>
              {phase === "result" && result ? (
                <div className="random-experience__result-actions">
                  <Link to={menuPath(result)} className="random-experience__spin"><span className="random-experience__button-icon"><ArrowUpRight /></span><span>ดูเมนูนี้<small>{isOrderable(result) ? "เลือกตัวเลือกอาหาร แล้วค่อยสั่งได้เลย" : result.soldOut ? "ขณะนี้เมนูหมด · เปิดดูรายละเอียดได้" : "ขณะนี้ร้านปิด · เปิดดูรายละเอียดได้"}</small></span><ArrowRight className="random-experience__button-arrow" /></Link>
                  <button type="button" onClick={spin} className="random-experience__respin"><RotateCcw />สุ่มอีกจาน</button>
                </div>
              ) : (
                <button type="button" onClick={spin} disabled={spinning} aria-busy={spinning} className="random-experience__spin"><span className="random-experience__button-icon"><Dice5 /></span><span>{spinning ? "กำลังสุ่มความอร่อย…" : "สุ่มมื้อที่ใช่ให้ฉัน"}<small>{spinning ? "อีกนิดเดียว ก็ได้เจอจานโปรดใหม่" : "หนึ่งคลิก อาจเจอของอร่อยที่ไม่เคยลอง"}</small></span><ArrowRight className="random-experience__button-arrow" /></button>
              )}
              <div className="random-experience__action-foot">
                {spinning ? <button type="button" onClick={() => finishNow.current?.()}>ข้ามเอฟเฟกต์ <ArrowRight /></button> : result && phase === "result" ? <Link to={`/customer/restaurants/${result.restaurantId}`}><Store />ดูร้าน {getRestaurant(result.restaurantId).name}<ArrowUpRight /></Link> : <span><Check />สุ่มอย่างเดียว ยังไม่มีการสั่งซื้อหรือหักเงิน</span>}
                <span>ราคาเริ่มต้น · ไม่รวมตัวเลือกและค่าบริการ</span>
              </div>
            </div>

            {showEmpty && <div className="random-experience__empty"><Sparkles /><div><h2>เพิ่มโอกาสเจอจานที่ใช่</h2><p>{notice || (phase === "result" ? "เมนูนี้ถูกนำออกจากร้านแล้ว ลองค้นหาจานใหม่ได้เลย" : "ตอนนี้ยังไม่มีเมนูตรงเงื่อนไข ลองเพิ่มงบ เปลี่ยนหมวด หรือพักตัวเลือกไม่ซ้ำ")}</p><button type="button" onClick={() => applyFilters({ ...DEFAULT_FILTERS, budget: budgetMax })}>ดูทุกหมวดในงบ {formatBaht(budgetMax)} <ArrowRight /></button><Link to="/customer/explore">เลือกดูร้านด้วยตัวเอง <ArrowUpRight /></Link></div></div>}

            {historyItems.length > 0 && <section className="random-experience__history" aria-labelledby="random-history-title"><div className="random-experience__section-heading"><h2 id="random-history-title"><History />ผลสุ่มรอบนี้</h2><span>เผื่อจานก่อนยังอยู่ในใจ</span></div><div className="random-experience__history-list">{historyItems.map((item, index) => <Link key={menuId(item)} to={menuPath(item)} className="random-experience__history-item"><span className="random-experience__history-number">0{index + 1}</span><CatalogImage src={item.image} label={item.name} compact className="random-experience__history-image" /><span><strong>{item.name}</strong><small>{getRestaurant(item.restaurantId).name}</small></span><b>{formatBaht(item.price)}</b><ArrowUpRight /></Link>)}</div></section>}
          </div>

          <aside className="random-experience__filters">
            <div className="random-experience__filter-heading"><span className="random-experience__filter-icon"><SlidersHorizontal /></span><div><p>MAKE IT YOURS</p><h2>ปรุงวงสุ่มให้ถูกใจ</h2></div><button type="button" disabled={spinning} onClick={resetFilters} aria-label="รีเซ็ตตัวกรอง" title="รีเซ็ตตัวกรอง"><RotateCcw /></button></div>
            <fieldset disabled={spinning}>
              <legend className="sr-only">เงื่อนไขการสุ่มอาหาร</legend>
              <div className="random-experience__filter-section"><div className="random-experience__label"><h3 id="random-cuisine-label">อยากกินแนวไหน</h3><span>01 / FLAVOUR</span></div><div className="random-experience__cuisines" role="group" aria-labelledby="random-cuisine-label">{[{ id: "all", label: "เซอร์ไพรส์ฉัน" }, ...CUISINES].map((cuisine) => { const count = cuisine.id === "all" ? cuisinePool.length : cuisinePool.filter((item) => item.cuisine === cuisine.id).length; return <button type="button" key={cuisine.id} aria-pressed={filters.cuisine === cuisine.id} onClick={() => setFilter("cuisine", cuisine.id)}><span aria-hidden="true">{CUISINE_SYMBOLS[cuisine.id]}</span><strong>{cuisine.label}</strong><small>{count}</small>{filters.cuisine === cuisine.id && <Check aria-hidden="true" />}</button>; })}</div></div>
              <div className="random-experience__filter-section"><div className="random-experience__label"><label htmlFor="random-budget">งบต่อจาน</label><span>02 / BUDGET</span></div><div className="random-experience__budget-value"><span>ไม่เกิน</span><strong>{formatBaht(filters.budget)}</strong><span>/ จาน</span></div><input id="random-budget" type="range" min="20" max={budgetMax} step="5" value={filters.budget} aria-valuetext={`ไม่เกิน ${filters.budget} บาทต่อจาน`} onChange={(event) => setFilter("budget", Number(event.target.value))} style={{ "--budget-progress": `${Math.max(0, Math.min(100, (filters.budget - 20) / (budgetMax - 20) * 100))}%` }} /><div className="random-experience__range-labels" aria-hidden="true"><span>฿20</span><span>{formatBaht(budgetMax)}</span></div><div className="random-experience__budget-presets">{[50, 80, 120, budgetMax].filter((value, index, values) => values.indexOf(value) === index).map((value) => <button type="button" key={value} aria-pressed={filters.budget === value} onClick={() => setFilter("budget", value)}>{value === budgetMax ? "ทุกช่วงราคา" : formatBaht(value)}</button>)}</div></div>
              <div className="random-experience__filter-section"><div className="random-experience__label"><h3>ใส่ใจอีกนิด</h3><span>03 / YOUR RULES</span></div><div className="random-experience__switches">{[["openOnly", "เฉพาะร้านที่เปิดอยู่", "พร้อมให้คุณเลือกสั่งต่อ"], ["hideSoldOut", "ซ่อนเมนูที่หมด", "เลือกจากจานที่ยังมีอยู่"], ["noRepeat", "ไม่ซ้ำที่สั่งใน 7 วัน", state.user ? "เว้นเมนูเก่า ลองรสชาติใหม่" : "เข้าสู่ระบบเพื่อใช้ประวัติการสั่งซื้อ"]].map(([key, label, description]) => <div key={key}><ToggleSwitch id={`random-${key}`} tone="light" label={label} checked={Boolean(effectiveFilters[key])} disabled={key === "noRepeat" && !state.user} onChange={(value) => setFilter(key, value)} /><p>{description}</p></div>)}</div></div>
            </fieldset>
            <div className="random-experience__pool"><div><Sparkles /><span>วงสุ่มของคุณ</span></div><strong>{candidates.length}<small>เมนู</small></strong><p>{candidates.length ? "ปรับตัวเลือกได้ตามใจ แล้วไปลุ้นจานต่อไปกัน" : "ลองขยายตัวเลือกอีกนิด เพื่อเจอเมนูเพิ่มเติม"}</p><p>{preferencesSaved === false ? "เบราว์เซอร์นี้ไม่อนุญาตให้จำค่า แต่ยังสุ่มได้ตามปกติ" : preferencesSaved ? "จำตัวเลือกไว้บนเบราว์เซอร์นี้แล้ว" : "เปลี่ยนตัวเลือกแล้ว ระบบจะจำไว้บนเบราว์เซอร์นี้"}</p><a href="#random-how-it-works">สุ่มอย่างไร <ChevronDown /></a></div>
          </aside>
        </div>

        <section id="random-how-it-works" className="random-experience__how" aria-label="วิธีใช้สุ่มอาหาร"><div><span>01</span><p><strong>เลือกอารมณ์มื้อนี้</strong>กำหนดประเภทอาหารและงบที่สบายใจ</p></div><div><span>02</span><p><strong>เปิดเซอร์ไพรส์จานโปรด</strong>สุ่มจากเมนูจริงที่ตรงเงื่อนไขของคุณ</p></div><div><span>03</span><p><strong>ถูกใจ แล้วค่อยสั่ง</strong>เปิดดูเมนู เลือกตัวเลือก แล้วชำระเงิน</p></div></section>
        <footer className="random-experience__footer"><span>MEALQ / A GOOD MEAL IS A GOOD MOOD.</span><span>ปล่อยให้มื้อนี้มีเรื่องเซอร์ไพรส์ <Sparkles /></span></footer>
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <div className="random-experience__preload" aria-hidden="true">{reelIds.map((id) => { const item = getMenuItem(id); return item?.image ? <img key={id} src={item.image} alt="" width="1" height="1" /> : null; })}</div>
    </div>
  );
}

export default RandomFood;
