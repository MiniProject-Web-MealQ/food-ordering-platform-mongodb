import { getRestaurant } from "./catalog";
import { formatBaht } from "./format";

const DAY = 24 * 60 * 60 * 1000;

const PERIODS = {
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY,
};

/** Fields for <FilterBar> on the order history: restaurant, review state and period. */
export function orderFilterFields(orders) {
  const restaurants = [...new Set(orders.map((o) => o.restaurantId))]
    .map(getRestaurant)
    .filter(Boolean);

  return [
    {
      id: "restaurant",
      label: "ร้าน",
      operators: [
        { value: "is", label: "คือ" },
        { value: "is_any", label: "เป็นหนึ่งใน", multi: true },
        { value: "is_not", label: "ไม่ใช่" },
      ],
      options: restaurants.map((r) => ({ value: r.id, label: r.name })),
    },
    {
      id: "review",
      label: "รีวิว",
      operators: [{ value: "is", label: "คือ" }],
      options: [
        { value: "reviewed", label: "รีวิวแล้ว" },
        { value: "pending", label: "ยังไม่ได้รีวิว" },
      ],
    },
    {
      id: "period",
      label: "ช่วงเวลา",
      operators: [{ value: "is", label: "คือ" }],
      options: [
        { value: "7d", label: "7 วันล่าสุด" },
        { value: "30d", label: "30 วันล่าสุด" },
        { value: "90d", label: "90 วันล่าสุด" },
      ],
    },
    {
      id: "total",
      label: "ยอดชำระ",
      operators: [{ value: "is", label: "คือ" }],
      options: [
        { value: "lt100", label: `ไม่เกิน ${formatBaht(100)}` },
        { value: "100to200", label: `${formatBaht(100)}–${formatBaht(200)}` },
        { value: "gt200", label: `มากกว่า ${formatBaht(200)}` },
      ],
    },
  ];
}

function orderValue(order, fieldId) {
  switch (fieldId) {
    case "restaurant":
      return order.restaurantId;
    case "review":
      return order.review ? "reviewed" : "pending";
    case "period": {
      const age = Date.now() - order.statusTimes.PLACED;
      return Object.keys(PERIODS).find((id) => age <= PERIODS[id]) ?? null;
    }
    case "total":
      return order.total <= 100 ? "lt100" : order.total <= 200 ? "100to200" : "gt200";
    default:
      return null;
  }
}

/** A filter with no value selected yet does not narrow anything down. */
export function matchesFilters(order, filters) {
  return filters.every((filter) => {
    if (filter.values.length === 0) return true;
    const value = orderValue(order, filter.field);
    const hit = value !== null && filter.values.includes(value);
    return filter.operator === "is_not" ? !hit : hit;
  });
}
