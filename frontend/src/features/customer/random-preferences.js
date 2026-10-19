const STORAGE_KEY = "mealq.random.preferences.v1";
const VERSION = 1;

export const DEFAULT_RANDOM_FILTERS = Object.freeze({
  cuisine: "all",
  budget: 80,
  openOnly: true,
  hideSoldOut: true,
  noRepeat: false,
});

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const booleanOr = (value, fallback) => typeof value === "boolean" ? value : fallback;

function settings(options) {
  const { cuisineIds = [], maxBudget = 150 } = isRecord(options) ? options : {};
  const ceiling = Number.isFinite(maxBudget) ? Math.max(20, maxBudget) : 150;
  return {
    cuisines: new Set(["all", ...(Array.isArray(cuisineIds) ? cuisineIds.filter((id) => typeof id === "string" && id.length > 0) : [])]),
    maxBudget: Math.max(20, Math.floor(ceiling / 5) * 5),
  };
}

function normalize(preferences, options) {
  const value = isRecord(preferences) ? preferences : {};
  const filters = isRecord(value.filters) ? value.filters : {};
  const budget = Number.isFinite(filters.budget) ? filters.budget : DEFAULT_RANDOM_FILTERS.budget;
  return {
    filters: {
      cuisine: options.cuisines.has(filters.cuisine) ? filters.cuisine : DEFAULT_RANDOM_FILTERS.cuisine,
      budget: Math.max(20, Math.min(options.maxBudget, Math.round(budget / 5) * 5)),
      openOnly: booleanOr(filters.openOnly, DEFAULT_RANDOM_FILTERS.openOnly),
      hideSoldOut: booleanOr(filters.hideSoldOut, DEFAULT_RANDOM_FILTERS.hideSoldOut),
      noRepeat: booleanOr(filters.noRepeat, DEFAULT_RANDOM_FILTERS.noRepeat),
    },
    motionEnabled: booleanOr(value.motionEnabled, true),
    soundEnabled: booleanOr(value.soundEnabled, false),
  };
}

// Resolve the browser getter only inside the public functions' try blocks.
function storageFor(options) {
  const supplied = isRecord(options) ? options.storage : undefined;
  return supplied === undefined ? globalThis.localStorage : supplied;
}

export function readRandomPreferences(options = {}) {
  let fallback = normalize(null, settings({}));
  try {
    const normalizedSettings = settings(options);
    fallback = normalize(null, normalizedSettings);
    const storage = storageFor(options);
    if (typeof storage?.getItem !== "function") return fallback;
    const raw = storage.getItem(STORAGE_KEY);
    if (typeof raw !== "string") return fallback;
    const saved = JSON.parse(raw);
    if (!isRecord(saved) || saved.version !== VERSION) return fallback;
    return normalize(saved, normalizedSettings);
  } catch {
    return fallback;
  }
}

export function writeRandomPreferences(preferences, options = {}) {
  try {
    if (!isRecord(preferences)) return false;
    const normalized = normalize(preferences, settings(options));
    const storage = storageFor(options);
    if (typeof storage?.setItem !== "function") return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...normalized }));
    return true;
  } catch {
    return false;
  }
}
