import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_STEPS } from "../src/features/demo/walkthrough-data.js";
import { INITIAL_PLAYBACK, playbackProgress, playbackReducer } from "../src/features/demo/playback.js";

test("playback waits for play and resumes the same position after pause", () => {
  assert.equal(playbackReducer(INITIAL_PLAYBACK, { type: "tick", deltaMs: 2000 }), INITIAL_PLAYBACK);
  let state = playbackReducer(INITIAL_PLAYBACK, { type: "play" });
  state = playbackReducer(state, { type: "tick", deltaMs: 1700 });
  state = playbackReducer(state, { type: "pause" });
  state = playbackReducer(state, { type: "tick", deltaMs: 60000 });
  assert.equal(state.elapsedMs, 1700);
  state = playbackReducer(state, { type: "play" });
  state = playbackReducer(state, { type: "tick", deltaMs: 300 });
  assert.equal(state.elapsedMs, 2000);
});

test("speed changes preserve position and carry time into the next scene", () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: "play" });
  state = playbackReducer(state, { type: "tick", deltaMs: DEMO_STEPS[0].durationMs - 500 });
  const before = state.elapsedMs;
  state = playbackReducer(state, { type: "speed", speed: 2 });
  assert.equal(state.elapsedMs, before);
  state = playbackReducer(state, { type: "tick", deltaMs: 400 });
  assert.equal(state.index, 1);
  assert.equal(state.elapsedMs, 300);
});

test("a long tick finishes once without looping or indexing beyond the lesson", () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: "play" });
  state = playbackReducer(state, { type: "tick", deltaMs: 1000000 });
  assert.equal(state.index, DEMO_STEPS.length - 1);
  assert.equal(state.playing, false);
  assert.equal(state.finished, true);
  assert.equal(playbackProgress(state), 100);
  assert.equal(playbackReducer(state, { type: "tick", deltaMs: 10000 }), state);
  state = playbackReducer(state, { type: "play" });
  assert.equal(state.index, 0);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.playing, true);
});

test("seeking pauses to let the viewer read and rejects invalid destinations", () => {
  const playing = playbackReducer(INITIAL_PLAYBACK, { type: "play" });
  for (const index of [-1, DEMO_STEPS.length, 1.5, NaN, Infinity, "2"]) {
    assert.equal(playbackReducer(playing, { type: "seek", index }), playing);
  }
  const state = playbackReducer(playing, { type: "seek", index: 4 });
  assert.equal(state.index, 4);
  assert.equal(state.playing, false);
  assert.equal(state.elapsedMs, 0);
  assert.ok(playbackProgress(state) > 0 && playbackProgress(state) < 100);
});

test("restart preserves chosen speed and ignores invalid clock/speed inputs", () => {
  let state = playbackReducer(INITIAL_PLAYBACK, { type: "speed", speed: 1.5 });
  state = playbackReducer(state, { type: "seek", index: 3 });
  state = playbackReducer(state, { type: "play" });
  for (const deltaMs of [NaN, Infinity, -1, 0]) assert.equal(playbackReducer(state, { type: "tick", deltaMs }), state);
  for (const speed of [0, -2, Infinity, 3]) assert.equal(playbackReducer(state, { type: "speed", speed }), state);
  state = playbackReducer(state, { type: "restart" });
  assert.deepEqual(state, { ...INITIAL_PLAYBACK, speed: 1.5 });
});
