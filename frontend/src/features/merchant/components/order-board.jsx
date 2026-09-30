import { useState } from "react";
import { SegmentedTabs } from "@/features/customer/components/segmented-tabs";
import { cx } from "@/lib/cx";
import { BOARD_COLUMNS } from "../status";
import { OrderCard } from "./order-card";

/**
 * Queue board. lg+: all four status columns side by side.
 * Below lg: one column at a time, picked with tabs that show each column's count.
 */
export function OrderBoard({ entries, now, onAdvance }) {
  const [tab, setTab] = useState(BOARD_COLUMNS[0].id);

  const columns = BOARD_COLUMNS.map((column) => {
    const inColumn = entries.filter(({ order }) => column.statuses.includes(order.status));
    // Finished orders read newest first; everything still in progress oldest first.
    return { ...column, entries: column.id === "done" ? inColumn.toReversed() : inColumn };
  });

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <SegmentedTabs
          idPrefix="board"
          label="สถานะออเดอร์"
          value={tab}
          onChange={setTab}
          tabs={columns.map((column) => ({
            value: column.id,
            label: (
              <span className="flex items-center justify-center gap-1.5">
                {column.label}
                <span className="rounded-full bg-cocoa/10 px-1.5 text-xs text-cocoa">{column.entries.length}</span>
              </span>
            ),
          }))}
        />
      </div>

      <div
        id="board-panel"
        role="tabpanel"
        aria-labelledby={`board-${tab}`}
        className="lg:grid lg:grid-cols-4 lg:items-start lg:gap-3 xl:gap-4"
      >
        {columns.map((column) => (
          <section
            key={column.id}
            aria-labelledby={`board-column-${column.id}`}
            className={cx("lg:rounded-3xl lg:bg-haze/60 lg:p-3", column.id !== tab && "max-lg:hidden")}
          >
            <h2
              id={`board-column-${column.id}`}
              className="mb-3 hidden items-center justify-between px-1 font-bold text-ink lg:flex"
            >
              {column.label}
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-cocoa">{column.entries.length}</span>
            </h2>
            {column.entries.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {column.entries.map(({ order, queue }) => (
                  <li key={order._id}>
                    <OrderCard order={order} queue={queue} now={now} onAdvance={onAdvance} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-3xl border-2 border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
                {column.empty}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
