import { DEMO_STEPS } from "./walkthrough-data.js";

export const DEMO_SPEEDS = [0.75, 1, 1.5, 2];
export const INITIAL_PLAYBACK = { index: 0, elapsedMs: 0, playing: false, finished: false, speed: 1 };

export function playbackProgress(state) {
  const total = DEMO_STEPS.reduce((sum, step) => sum + step.durationMs, 0);
  const elapsed = DEMO_STEPS.slice(0, state.index).reduce((sum, step) => sum + step.durationMs, 0) + state.elapsedMs;
  return total ? Math.min(100, Math.max(0, elapsed / total * 100)) : 0;
}

export function playbackReducer(state, action) {
  switch (action.type) {
    case "play":
      return state.finished ? { ...INITIAL_PLAYBACK, speed: state.speed, playing: true } : { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "restart":
      return { ...INITIAL_PLAYBACK, speed: state.speed };
    case "seek": {
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= DEMO_STEPS.length) return state;
      return { ...state, index: action.index, elapsedMs: 0, playing: false, finished: false };
    }
    case "speed":
      return DEMO_SPEEDS.includes(action.speed) ? { ...state, speed: action.speed } : state;
    case "tick": {
      if (!state.playing || !Number.isFinite(action.deltaMs) || action.deltaMs <= 0) return state;
      let index = state.index;
      let elapsedMs = state.elapsedMs + action.deltaMs * state.speed;
      while (elapsedMs >= DEMO_STEPS[index].durationMs) {
        if (index === DEMO_STEPS.length - 1) return { ...state, index, elapsedMs: DEMO_STEPS[index].durationMs, playing: false, finished: true };
        elapsedMs -= DEMO_STEPS[index].durationMs;
        index++;
      }
      return { ...state, index, elapsedMs };
    }
    default:
      return state;
  }
}
