import { useEffect, useRef } from "react";

const WARM_COLORS = ["255,194,103", "255,226,174", "232,155,98", "255,246,222"];
const BETWEEN_FRAMES = 1000 / 30;

function randomBetween(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

/** Decorative canvas only: it never participates in the food selection. */
export function RandomAtmosphere({ motionEnabled = true, burstKey = 0 }) {
  const canvasRef = useRef(null);
  const burstRef = useRef(null);
  const previousBurst = useRef(burstKey);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    let alive = true;
    let visible = true;
    let width = 0;
    let height = 0;
    let particles = [];
    let confetti = [];
    let frame = null;
    let previousTime = null;
    let atmosphereTime = 0;

    function canAnimate() {
      return alive && motionEnabled && !reducedMotion.matches && !document.hidden && visible && width > 0 && height > 0;
    }

    function paint() {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const x = particle.x * width;
        const y = particle.y * height;
        const opacity = particle.opacity * (0.8 + 0.2 * Math.sin(atmosphereTime * 0.45 + particle.phase));
        context.fillStyle = `rgba(${particle.color},${opacity})`;
        context.beginPath();
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
        if (particle.halo) {
          context.fillStyle = `rgba(${particle.color},${opacity * 0.07})`;
          context.beginPath();
          context.arc(x, y, particle.radius * 4, 0, Math.PI * 2);
          context.fill();
        }
      }
      for (const piece of confetti) {
        const opacity = Math.max(0, 1 - piece.age / piece.lifetime) * 0.75;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = `rgba(${piece.color},${opacity})`;
        context.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.65);
        context.restore();
      }
    }

    function animate(time) {
      frame = null;
      if (!canAnimate()) return;
      const elapsed = previousTime === null ? BETWEEN_FRAMES : time - previousTime;
      if (elapsed >= BETWEEN_FRAMES - 1) {
        previousTime = time;
        const delta = Math.min(elapsed / 1000, 0.05);
        atmosphereTime += delta;
        for (const particle of particles) {
          particle.x = (particle.x + particle.vx * delta + 1) % 1;
          particle.y = (particle.y + particle.vy * delta + 1) % 1;
        }
        for (const piece of confetti) {
          piece.age += delta;
          piece.x += piece.vx * delta;
          piece.y += piece.vy * delta;
          piece.vy += 42 * delta;
          piece.rotation += piece.turn * delta;
        }
        confetti = confetti.filter((piece) => piece.age < piece.lifetime);
        paint();
      }
      frame = window.requestAnimationFrame(animate);
    }

    function updateActivity() {
      if (canAnimate()) {
        if (frame === null) {
          previousTime = null;
          frame = window.requestAnimationFrame(animate);
        }
      } else {
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
        previousTime = null;
        confetti = [];
        // No hidden/background animation, and no delayed celebration on return.
        if (document.hidden || !visible) context.clearRect(0, 0, width, height);
        else paint();
      }
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(0, bounds.width);
      height = Math.max(0, bounds.height);
      const small = width < 680 || coarsePointer.matches;
      const lowPower = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
      const ratio = Math.min(window.devicePixelRatio || 1, small || lowPower ? 1.5 : 2, Math.sqrt(2_000_000 / Math.max(1, width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const cap = lowPower ? 18 : small ? 26 : 45;
      const desired = width > 0 && height > 0 ? Math.min(cap, Math.max(12, Math.round(width * height / 19000))) : 0;
      particles = Array.from({ length: desired }, (_, index) => ({
        x: Math.random(), y: Math.random(), radius: randomBetween(0.6, 1.7),
        vx: randomBetween(-0.004, 0.004), vy: randomBetween(-0.007, -0.002),
        color: WARM_COLORS[index % WARM_COLORS.length], opacity: randomBetween(0.18, 0.5),
        phase: randomBetween(0, Math.PI * 2), halo: index % 6 === 0,
      }));
      confetti = [];
      paint();
      updateActivity();
    }

    burstRef.current = () => {
      if (!canAnimate()) return;
      const small = width < 680 || coarsePointer.matches;
      const amount = small ? 34 : 60;
      confetti = Array.from({ length: amount }, (_, index) => {
        const angle = randomBetween(-Math.PI, 0);
        const speed = randomBetween(45, small ? 130 : 180);
        return {
          x: width * randomBetween(0.43, 0.57), y: height * 0.47,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 14,
          age: 0, lifetime: randomBetween(1.8, 2.7), size: randomBetween(2.1, 4.1),
          rotation: randomBetween(0, Math.PI * 2), turn: randomBetween(-2, 2),
          color: WARM_COLORS[index % WARM_COLORS.length],
        };
      });
    };

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    const intersection = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    }) : null;
    observer?.observe(canvas);
    intersection?.observe(canvas);
    reducedMotion.addEventListener("change", updateActivity);
    coarsePointer.addEventListener("change", resize);
    document.addEventListener("visibilitychange", updateActivity);
    window.addEventListener("resize", resize, { passive: true });
    resize();

    return () => {
      alive = false;
      burstRef.current = null;
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      intersection?.disconnect();
      reducedMotion.removeEventListener("change", updateActivity);
      coarsePointer.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", updateActivity);
      window.removeEventListener("resize", resize);
      context.clearRect(0, 0, width, height);
    };
  }, [motionEnabled]);

  useEffect(() => {
    const previous = previousBurst.current;
    previousBurst.current = burstKey;
    if (Number.isFinite(burstKey) && burstKey > 0 && burstKey > previous) burstRef.current?.();
  }, [burstKey]);

  return <canvas ref={canvasRef} aria-hidden="true" className="random-atmosphere" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
