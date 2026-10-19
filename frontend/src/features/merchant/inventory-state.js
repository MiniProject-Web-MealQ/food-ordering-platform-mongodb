const idOf = (value) => typeof value === "string" ? value : value?.toString?.() || "";
const ingredientId = (recipe) => idOf(recipe?.ingredient_id ?? recipe?.ingredientId);

export function unitNeedsReview(unit) {
  return typeof unit === "string" && /^[+-]?\d+(?:[.,]\d+)?$/.test(unit.trim());
}

/** References are joined by ingredient ID, never by a similar ingredient name. */
export function inventoryGuide(ingredients = [], menus = []) {
  const rows = Array.isArray(ingredients) ? ingredients : [];
  const dishes = Array.isArray(menus) ? menus : [];
  const usage = new Map();
  for (const menu of dishes) {
    for (const recipe of Array.isArray(menu.ingredients) ? menu.ingredients : []) {
      const id = ingredientId(recipe);
      if (!id) continue;
      const entries = usage.get(id) || [];
      entries.push({ menuId: menu.id ?? menu._id, name: menu.name, quantity: recipe.quantity, unit: recipe.unit });
      usage.set(id, entries);
    }
  }
  return {
    ingredients: rows.map((row) => ({ ...row, linkedMenus: usage.get(idOf(row.id ?? row._id)) || [], unitNeedsReview: unitNeedsReview(row.unit) })),
    menusWithoutRecipes: dishes.filter((menu) => !Array.isArray(menu.ingredients) || menu.ingredients.length === 0),
  };
}

export function recipeAvailability(rows, ingredients) {
  const stock = new Map((Array.isArray(ingredients) ? ingredients : []).map((row) => [idOf(row.id ?? row._id), row]));
  return (Array.isArray(rows) ? rows : []).flatMap((row, index) => {
    const id = ingredientId(row);
    if (!id) return [];
    const ingredient = stock.get(id);
    if (!ingredient) return [{ index, reason: "missing" }];
    if (ingredient.isActive === false) return [{ index, reason: "inactive" }];
    if (ingredient.unit !== row.unit) return [{ index, reason: "unit" }];
    return [];
  });
}

export function validateRecipeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "กำหนดส่วนผสมอย่างน้อย 1 รายการก่อนบันทึกเมนู";
  if (rows.length > 100) return "สูตรหนึ่งเมนูมีส่วนผสมได้ไม่เกิน 100 รายการ";
  const seen = new Set();
  for (const row of rows) {
    const id = ingredientId(row);
    if (!/^[a-f0-9]{24}$/i.test(id)) return "เลือกวัตถุดิบให้ครบทุกแถว";
    if (seen.has(id.toLowerCase())) return "วัตถุดิบในสูตรต้องไม่ซ้ำกัน ให้รวมปริมาณไว้ในแถวเดียว";
    seen.add(id.toLowerCase());
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity < 0.000001 || quantity > 1000000) return "ปริมาณต่อจานต้องอยู่ระหว่าง 0.000001–1,000,000";
    if (typeof row.unit !== "string" || !row.unit.trim() || row.unit.length > 40) return "เลือกหน่วยของวัตถุดิบให้ถูกต้อง";
  }
  return "";
}

/** A refresh requested while loading supersedes that snapshot and runs next.
 * There is one in-flight read; disposed or superseded responses never publish.
 */
export function createInventoryRefresh({ load, onSuccess, onError, onPending = () => {} }) {
  let disposed = false;
  let revision = 0;
  let queued = false;
  let request = null;
  let controller = null;
  async function drain() {
    let succeeded = false;
    if (!disposed) onPending(true);
    try {
      while (queued && !disposed) {
        queued = false;
        const expected = revision;
        controller = new AbortController();
        try {
          const result = await load(controller.signal);
          if (!disposed && expected === revision) { onSuccess(result); succeeded = true; }
        } catch (error) {
          if (!disposed && expected === revision) { onError(error); succeeded = false; }
        }
      }
      return succeeded;
    } finally {
      controller = null;
      if (!disposed) onPending(false);
    }
  }
  return {
    refresh() {
      if (disposed) return Promise.resolve(false);
      revision++;
      queued = true;
      if (!request) request = Promise.resolve().then(drain).finally(() => { request = null; });
      return request;
    },
    dispose() { disposed = true; queued = false; controller?.abort(); },
  };
}

export async function loadInventoryCatalogue(request, { includeMenus = false, signal } = {}) {
  const paths = includeMenus ? ["/merchant/inventory", "/merchant/menu"] : ["/merchant/inventory"];
  const results = await Promise.all(paths.map((path) => request(path, { method: "GET", signal })));
  const failed = results.find((result) => !result?.ok);
  if (failed) throw new Error(failed.error?.message || "โหลดข้อมูลสต็อกไม่สำเร็จ กรุณาลองอีกครั้ง");
  const ingredients = results[0].data?.ingredients;
  const menus = includeMenus ? results[1].data?.menus : [];
  if (!Array.isArray(ingredients) || !Array.isArray(menus)) throw new Error("ข้อมูลสต็อกยังไม่พร้อม กรุณาลองอีกครั้ง");
  return { ingredients, menus };
}
