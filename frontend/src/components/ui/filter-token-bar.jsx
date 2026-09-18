import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";

/**
 * Token-style filter bar: each filter is a field · operator · value pill whose parts open
 * their own listbox. Converted from the TypeScript original to JSX and restyled with the
 * MealQ tokens; the props and behaviour are unchanged.
 *
 * fields:  [{ id, label, icon?, operators: [{ value, label, multi? }], options?, loadOptions? }]
 * value:   [{ id, field, operator, values: string[] }]
 * onChange(filters)
 */

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f_${Math.random().toString(36).slice(2, 9)}`;

const springy = { type: "spring", stiffness: 560, damping: 34, mass: 0.7 };

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70";

function fieldById(fields, id) {
  return fields.find((f) => f.id === id);
}

function operatorByValue(field, value) {
  return field?.operators.find((o) => o.value === value);
}

function summarize(options, values, placeholder) {
  if (!values.length) return { text: placeholder, empty: true, glyphs: [] };
  const find = (v) => options?.find((o) => o.value === v);
  const label = (v) => find(v)?.label ?? v;

  const glyphs = values
    .map((v) => find(v)?.glyph)
    .filter(Boolean)
    .slice(0, 3);
  if (values.length === 1) return { text: label(values[0]), empty: false, glyphs };
  if (values.length <= 3) return { text: values.map(label).join(", "), empty: false, glyphs };
  return { text: `${label(values[0])} +${values.length - 1}`, empty: false, glyphs };
}

function Popover({ anchorKey, onClose, children, labelledBy }) {
  const ref = React.useRef(null);
  const anchorRef = React.useRef(null);
  const reduce = useReducedMotion();
  const [pos, setPos] = React.useState(null);

  // Hand focus back to the segment that opened the popover.
  React.useEffect(
    () => () => document.querySelector(`[data-fb-anchor="${anchorKey}"]`)?.focus(),
    [anchorKey],
  );

  React.useLayoutEffect(() => {
    const anchor = document.querySelector(`[data-fb-anchor="${anchorKey}"]`);
    anchorRef.current = anchor;
    if (!anchor) return;
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const a = anchor.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const gap = 6;
      let left = Math.max(8, Math.min(a.left, window.innerWidth - w - 8));
      let top = a.bottom + gap;
      if (top + h > window.innerHeight - 8) top = a.top - gap - h;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorKey]);

  React.useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchorRef.current?.contains(e.target))
        onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      aria-labelledby={labelledBy}
      initial={reduce ? false : { opacity: 0, y: -3, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 60 }}
      className="min-w-52 max-w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-card"
    >
      {children}
    </motion.div>,
    document.body,
  );
}

function SearchList({
  items,
  multi,
  loading,
  error,
  searchable = true,
  placeholder = "ค้นหา…",
  onQuery,
  onPick,
  onRetry,
  labelId,
}) {
  const [q, setQ] = React.useState("");
  const [activeState, setActive] = React.useState(0);
  const listId = React.useId();
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    if (onQuery) return items;
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => i.label.toLowerCase().includes(needle));
  }, [items, q, onQuery]);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  // Clamped here rather than in an effect, so a shrinking list cannot leave the index out of range.
  const active = Math.min(activeState, Math.max(0, filtered.length - 1));

  React.useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);


  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) onPick(item.value);
    }
  };

  return (
    <div>
      {searchable && (
        <div className="border-b border-line p-1.5">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            aria-labelledby={labelId}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              onQuery?.(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent px-2 py-1 text-sm text-ink outline-none placeholder:text-ink-soft/70"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-multiselectable={multi || undefined}
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className="max-h-60 overflow-y-auto p-1"
      >
        {loading && (
          <li className="flex items-center gap-2 px-2 py-3 text-sm text-ink-soft">
            <Spinner /> กำลังโหลดตัวเลือก…
          </li>
        )}

        {error && !loading && (
          <li className="px-2 py-2.5 text-sm">
            <p className="text-ink">โหลดตัวเลือกไม่สำเร็จ</p>
            <button
              type="button"
              onClick={onRetry}
              className={cx(
                "mt-1 rounded px-1.5 py-0.5 text-sm font-semibold text-brand-ink underline underline-offset-4",
                focusRing,
              )}
            >
              ลองอีกครั้ง
            </button>
          </li>
        )}

        {!loading && !error && filtered.length === 0 && (
          <li className="px-2 py-3 text-sm text-ink-soft">ไม่พบตัวเลือก</li>
        )}

        {!loading &&
          !error &&
          filtered.map((item, i) => {
            const isActive = i === active;
            return (
              <li
                key={item.value}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={multi ? Boolean(item.selected) : isActive}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(item.value)}
                className={cx(
                  "flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-ink",
                  isActive && "bg-mint",
                )}
              >
                {multi && (
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      item.selected ? "border-brand bg-brand text-white" : "border-line",
                    )}
                  >
                    {item.selected && <CheckIcon />}
                  </span>
                )}
                {item.glyph && (
                  <span className="shrink-0" aria-hidden="true">
                    {item.glyph}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
                {!multi && item.selected && (
                  <span className="ml-auto text-brand">
                    <CheckIcon />
                  </span>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function Segment({ part, children, onOpen, registerRef, tabIndex, ariaLabel, anchorKey, onFocus, muted, active, flash }) {
  return (
    <button
      type="button"
      ref={registerRef}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={active}
      data-fb-anchor={anchorKey}
      data-fb-item=""
      onFocus={onFocus}
      onClick={onOpen}
      data-flash={flash ? "" : undefined}
      className={cx(
        "relative flex items-center gap-1.5 px-3 py-1.5 text-sm leading-snug whitespace-nowrap transition-colors active:scale-[0.98]",
        "focus-visible:ring-inset",
        focusRing,
        muted ? "text-ink-soft" : "text-ink",
        active ? "bg-haze" : "hover:bg-haze",
        part === "field" && "rounded-l-full pl-4 font-semibold",
        "data-[flash]:animate-[fb-flash_620ms_ease-out]",
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  fields,
  value,
  onChange,
  addLabel = "ตัวกรอง",
  emptyLabel = "เพิ่มตัวกรอง",
  valuePlaceholder = "เลือก…",
  clearLabel = "ล้างทั้งหมด",
  disabled,
  className,
  "aria-label": ariaLabel = "ตัวกรอง",
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(null);
  const [flashId, setFlashId] = React.useState(null);

  const toolbarRef = React.useRef(null);
  const [focusIdx, setFocusIdx] = React.useState(0);
  const [asyncState, setAsyncState] = React.useState({});

  // One toolbar stop per segment, plus the remove button and the trailing add button.
  const itemMeta = [];
  value.forEach((f) => {
    itemMeta.push({ filterId: f.id, kind: "field" });
    itemMeta.push({ filterId: f.id, kind: "operator" });
    itemMeta.push({ filterId: f.id, kind: "value" });
    itemMeta.push({ filterId: f.id, kind: "remove" });
  });
  itemMeta.push({ kind: "add" });

  // Clamped while rendering; removing the last filter must not leave the roving index past the end.
  const focusIndex = Math.min(focusIdx, itemMeta.length - 1);

  const focusItem = (idx) => {
    const clamped = Math.max(0, Math.min(idx, itemMeta.length - 1));
    setFocusIdx(clamped);
    toolbarRef.current?.querySelectorAll("[data-fb-item]")[clamped]?.focus();
  };

  const removeFilter = (filterId, atIdx) => {
    onChange(value.filter((f) => f.id !== filterId));
    setOpen(null);
    const target = Math.max(0, (atIdx ?? focusIndex) - 1);
    requestAnimationFrame(() => focusItem(target));
  };

  const onToolbarKeyDown = (e) => {
    if (open) return;
    const last = itemMeta.length - 1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusItem(focusIndex >= last ? 0 : focusIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusItem(focusIndex <= 0 ? last : focusIndex - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(last);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      const meta = itemMeta[focusIndex];
      if (meta?.filterId) {
        e.preventDefault();
        removeFilter(meta.filterId, focusIndex);
      }
    }
  };

  const addFilter = (fieldId) => {
    const field = fieldById(fields, fieldId);
    if (!field) return;

    const filter = { id: uid(), field: fieldId, operator: field.operators[0]?.value ?? "is", values: [] };
    onChange([...value, filter]);
    openValues(filter.id, fieldId);
  };

  const changeField = (filterId, fieldId) => {
    const field = fieldById(fields, fieldId);
    onChange(
      value.map((f) =>
        f.id === filterId
          ? { ...f, field: fieldId, operator: field?.operators[0]?.value ?? f.operator, values: [] }
          : f,
      ),
    );
    openValues(filterId, fieldId);
  };

  const changeOperator = (filterId, opValue) => {
    const filter = value.find((f) => f.id === filterId);
    const nextOp = operatorByValue(fieldById(fields, filter?.field ?? ""), opValue);
    onChange(
      value.map((f) =>
        f.id === filterId
          ? { ...f, operator: opValue, values: nextOp?.multi ? f.values : f.values.slice(0, 1) }
          : f,
      ),
    );
    setOpen(null);
  };

  const toggleValue = (filterId, optionValue, multi) => {
    onChange(
      value.map((f) => {
        if (f.id !== filterId) return f;
        if (!multi) return { ...f, values: [optionValue] };
        const has = f.values.includes(optionValue);
        return {
          ...f,
          values: has ? f.values.filter((v) => v !== optionValue) : [...f.values, optionValue],
        };
      }),
    );
    setFlashId(filterId);
    window.setTimeout(() => setFlashId((c) => (c === filterId ? null : c)), 640);
    if (!multi) setOpen(null);
  };

  const clearAll = () => {
    onChange([]);
    setOpen(null);
    requestAnimationFrame(() => focusItem(0));
  };

  const ensureOptions = React.useCallback((field, query = "") => {
    if (!field.loadOptions) return;
    setAsyncState((s) => ({
      ...s,
      [field.id]: { loading: true, error: false, options: s[field.id]?.options ?? [] },
    }));
    field
      .loadOptions(query)
      .then((options) =>
        setAsyncState((s) => ({ ...s, [field.id]: { loading: false, error: false, options } })),
      )
      .catch(() =>
        setAsyncState((s) => ({ ...s, [field.id]: { loading: false, error: true, options: [] } })),
      );
  }, []);

  /** Opens the value list and fetches its options the first time they are needed. */
  const openValues = (filterId, fieldId) => {
    setOpen({ kind: "value", filterId });
    const field = fieldById(fields, fieldId);
    if (field?.loadOptions && !asyncState[field.id]?.options.length) ensureOptions(field);
  };

  // Each focusable gets the next toolbar stop; the DOM order is the tab order.
  let itemIndex = 0;
  const nextItem = () => {
    const idx = itemIndex++;
    return { idx, tabIndex: idx === focusIndex ? 0 : -1, onFocus: () => setFocusIdx(idx) };
  };

  const anchorKey = !open ? null : open.kind === "add" ? "add" : `${open.filterId}:${open.kind}`;

  const openPopoverContent = () => {
    if (!open) return null;

    if (open.kind === "add" || open.kind === "field") {
      const items = fields.map((f) => ({ value: f.id, label: f.label, glyph: f.icon }));
      return (
        <SearchList
          key={anchorKey}
          labelId="fb-field-label"
          items={items}
          multi={false}
          searchable={items.length > 6}
          onPick={(v) => (open.kind === "add" ? addFilter(v) : changeField(open.filterId, v))}
        />
      );
    }

    const filter = value.find((f) => f.id === open.filterId);
    const field = fieldById(fields, filter?.field ?? "");
    if (!filter || !field) return null;

    if (open.kind === "operator") {
      const items = field.operators.map((o) => ({
        value: o.value,
        label: o.label,
        selected: o.value === filter.operator,
      }));
      return (
        <SearchList
          key={anchorKey}
          labelId="fb-op-label"
          items={items}
          multi={false}
          searchable={items.length > 6}
          onPick={(v) => changeOperator(filter.id, v)}
        />
      );
    }

    const op = operatorByValue(field, filter.operator);
    const multi = Boolean(op?.multi);
    const asyncOptions = field.loadOptions ? asyncState[field.id] : undefined;
    const source = field.loadOptions ? (asyncOptions?.options ?? []) : (field.options ?? []);
    const items = source.map((o) => ({
      value: o.value,
      label: o.label,
      glyph: o.glyph,
      selected: filter.values.includes(o.value),
    }));
    return (
      <SearchList
        key={anchorKey}
        labelId="fb-value-label"
        items={items}
        multi={multi}
        searchable={Boolean(field.loadOptions) || items.length > 6}
        loading={asyncOptions?.loading}
        error={asyncOptions?.error}
        onQuery={field.loadOptions ? (q) => ensureOptions(field, q) : undefined}
        onRetry={() => ensureOptions(field)}
        onPick={(v) => toggleValue(filter.id, v, multi)}
      />
    );
  };

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      ref={toolbarRef}
      onKeyDown={onToolbarKeyDown}
      className={cx("flex flex-wrap items-center gap-2", disabled && "pointer-events-none opacity-50", className)}
    >
      <style>{`
@keyframes fb-flash {
  0% { background-color: color-mix(in oklab, var(--color-brand) 22%, transparent); }
  100% { background-color: transparent; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes fb-flash { 0%, 100% { background-color: transparent; } }
}
`}</style>

      <AnimatePresence initial={false} mode="popLayout">
        {value.map((filter) => {
          const field = fieldById(fields, filter.field);
          const op = operatorByValue(field, filter.operator);
          const summary = summarize(
            field?.loadOptions ? asyncState[field.id]?.options : field?.options,
            filter.values,
            valuePlaceholder,
          );
          const fieldItem = nextItem();
          const opItem = nextItem();
          const valueItem = nextItem();
          const removeItem = nextItem();

          return (
            <motion.div
              key={filter.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={springy}
              className="flex items-stretch overflow-hidden rounded-full bg-cream ring-1 ring-line"
            >
              <Segment
                part="field"
                tabIndex={fieldItem.tabIndex}
                onFocus={fieldItem.onFocus}
                anchorKey={`${filter.id}:field`}
                active={open?.kind === "field" && open.filterId === filter.id}
                ariaLabel={`ตัวกรอง ${field?.label ?? filter.field} · เปลี่ยนหัวข้อ`}
                onOpen={() => setOpen({ kind: "field", filterId: filter.id })}
              >
                {field?.icon && (
                  <span className="text-ink-soft" aria-hidden="true">
                    {field.icon}
                  </span>
                )}
                {field?.label ?? filter.field}
              </Segment>

              <span aria-hidden="true" className="w-px self-stretch bg-line" />

              <Segment
                part="operator"
                tabIndex={opItem.tabIndex}
                onFocus={opItem.onFocus}
                anchorKey={`${filter.id}:operator`}
                muted
                active={open?.kind === "operator" && open.filterId === filter.id}
                ariaLabel={`เงื่อนไข ${op?.label ?? filter.operator} · เปลี่ยนเงื่อนไข`}
                onOpen={() => setOpen({ kind: "operator", filterId: filter.id })}
              >
                {op?.label ?? filter.operator}
              </Segment>

              <span aria-hidden="true" className="w-px self-stretch bg-line" />

              <Segment
                part="value"
                tabIndex={valueItem.tabIndex}
                onFocus={valueItem.onFocus}
                anchorKey={`${filter.id}:value`}
                muted={summary.empty}
                active={open?.kind === "value" && open.filterId === filter.id}
                flash={flashId === filter.id}
                ariaLabel={`ค่า ${summary.empty ? "ยังไม่ได้เลือก" : summary.text} · เปลี่ยนค่า`}
                onOpen={() => openValues(filter.id, filter.field)}
              >
                {!summary.empty && summary.glyphs.length > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
                    {summary.glyphs.map((g, i) => (
                      <span key={i} className="flex items-center">
                        {g}
                      </span>
                    ))}
                  </span>
                )}
                <span className={cx("max-w-48 truncate", summary.empty ? "text-ink-soft" : "font-semibold text-ink")}>
                  {summary.text}
                </span>
              </Segment>

              <button
                type="button"
                tabIndex={removeItem.tabIndex}
                onFocus={removeItem.onFocus}
                data-fb-item=""
                onClick={() => removeFilter(filter.id, removeItem.idx)}
                aria-label={`ลบตัวกรอง ${field?.label ?? filter.field}`}
                className={cx(
                  "flex items-center rounded-r-full pr-3 pl-2 text-ink-soft transition-colors hover:bg-haze hover:text-ink active:scale-[0.98]",
                  "focus-visible:ring-inset",
                  focusRing,
                )}
              >
                <CloseIcon />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {(() => {
        const addItem = nextItem();
        const isEmpty = value.length === 0;
        return (
          <button
            type="button"
            tabIndex={addItem.tabIndex}
            onFocus={addItem.onFocus}
            data-fb-anchor="add"
            data-fb-item=""
            aria-label={isEmpty ? emptyLabel : addLabel}
            aria-haspopup="listbox"
            aria-expanded={open?.kind === "add"}
            onClick={() => setOpen({ kind: "add" })}
            className={cx(
              "flex items-center gap-1.5 rounded-full border-2 border-dashed border-line px-3.5 py-2 text-sm leading-none font-semibold text-ink-soft transition-colors",
              "hover:border-brand/40 hover:bg-mint hover:text-brand-ink active:scale-[0.98]",
              focusRing,
            )}
          >
            <PlusIcon />
            {isEmpty ? emptyLabel : addLabel}
          </button>
        );
      })()}

      {value.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className={cx(
            "rounded-full px-3 py-2 text-sm leading-none text-ink-soft transition-colors hover:bg-haze hover:text-ink",
            focusRing,
          )}
        >
          {clearLabel}
        </button>
      )}

      {open && anchorKey && (
        <Popover anchorKey={anchorKey} onClose={() => setOpen(null)}>
          {openPopoverContent()}
        </Popover>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.2l2.2 2.3L9.5 3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default FilterBar;
