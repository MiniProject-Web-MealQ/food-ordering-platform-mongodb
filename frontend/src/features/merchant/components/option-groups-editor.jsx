import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { chipClasses } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { formatBaht } from "../format";
import { copyGroup, emptyGroup, emptyOption, OPTION_LIMITS, OPTION_PRESETS, optionFieldId } from "../option-groups";
import { fieldClass, panelClass } from "../styles";

const smallField = cx(fieldClass, "h-11 rounded-full py-0");
const iconButton = cx("grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-haze hover:text-ink disabled:opacity-30", focusRing);

function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="px-1 text-xs font-medium text-danger">
      {message}
    </p>
  );
}

/** สรุปแบบที่ลูกค้าเห็นในหน้าเลือกเมนู */
function CustomerPreview({ group }) {
  const shown = group.options.filter((o) => o.is_available && o.label.trim());
  const rule = group.multiple
    ? `เลือกได้หลายอย่าง${group.max.trim() ? ` (สูงสุด ${group.max})` : ""}${group.required ? " · จำเป็น" : " · ไม่บังคับ"}`
    : `เลือก 1 อย่าง${group.required ? " · จำเป็น" : " · ไม่บังคับ"}`;
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-xs text-ink-soft ring-1 ring-haze">
      <p>
        <span className="font-semibold text-ink">ลูกค้าเห็น:</span> {group.label.trim() || "(ยังไม่ตั้งชื่อกลุ่ม)"} · {rule}
      </p>
      {shown.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-1.5">
          {shown.map((o) => (
            <span key={o.id} className="rounded-full bg-cream px-2 py-0.5 text-ink">
              {o.label.trim()}
              {Number(o.price) > 0 && ` +${formatBaht(Number(o.price))}`}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function OptionRow({ g, o, option, group, count, errors, onChange, onMove, onRemove }) {
  const labelId = optionFieldId.optionLabel(g, o);
  const priceId = optionFieldId.optionPrice(g, o);
  const name = option.label.trim() || `ตัวเลือกที่ ${o + 1}`;
  return (
    <li className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-haze">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={labelId} className="sr-only">
            ชื่อตัวเลือกที่ {o + 1} ในกลุ่ม {group.label || g + 1}
          </label>
          <input
            id={labelId}
            value={option.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="เช่น เผ็ดน้อย / เพิ่มหมู"
            aria-invalid={Boolean(errors[labelId]) || undefined}
            aria-describedby={errors[labelId] ? `${labelId}-error` : undefined}
            className={smallField}
          />
          <FieldError id={`${labelId}-error`} message={errors[labelId]} />
        </div>
        <button type="button" onClick={() => onMove(-1)} disabled={o === 0} aria-label={`เลื่อน ${name} ขึ้น`} className={iconButton}>
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={o === count - 1} aria-label={`เลื่อน ${name} ลง`} className={iconButton}>
          <ArrowDown aria-hidden="true" className="size-4" />
        </button>
        <button type="button" onClick={onRemove} aria-label={`ลบ ${name}`} className={cx(iconButton, "hover:text-danger")}>
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label htmlFor={priceId} className="text-xs font-semibold text-ink-soft">
              ราคาเพิ่ม
            </label>
            <div className="relative w-28">
              <input
                id={priceId}
                inputMode="numeric"
                value={option.price}
                onChange={(e) => onChange({ price: e.target.value.replace(/\D/g, "") })}
                aria-invalid={Boolean(errors[priceId]) || undefined}
                aria-describedby={errors[priceId] ? `${priceId}-error` : undefined}
                className={cx(smallField, "pr-10")}
              />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-ink-soft">
                บาท
              </span>
            </div>
          </div>
          <FieldError id={`${priceId}-error`} message={errors[priceId]} />
        </div>
        {!group.multiple && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name={`og-${g}-default`}
              checked={option.default}
              onChange={() => onChange({ default: true }, true)}
              className="size-4 accent-cocoa"
            />
            ค่าเริ่มต้น<span className="sr-only"> ของ {name}</span>
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={option.is_available}
            onChange={(e) => onChange({ is_available: e.target.checked })}
            className="size-4 accent-cocoa"
          />
          มีขาย<span className="sr-only"> ({name})</span>
        </label>
      </div>
    </li>
  );
}

function GroupCard({ g, group, count, errors, onChange, onMove, onRemove }) {
  const labelId = optionFieldId.groupLabel(g);
  const maxId = optionFieldId.groupMax(g);
  const addId = optionFieldId.groupOptions(g);
  const name = group.label.trim() || `กลุ่มที่ ${g + 1}`;

  function setOption(o, changes, exclusiveDefault = false) {
    onChange({
      options: group.options.map((option, i) => {
        if (i === o) return { ...option, ...changes };
        return exclusiveDefault ? { ...option, default: false } : option;
      }),
    });
  }

  return (
    <li className="space-y-3 rounded-3xl bg-cream p-3 ring-1 ring-haze sm:p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={labelId} className="block text-xs font-semibold text-ink-soft">
            ชื่อกลุ่ม
          </label>
          <input
            id={labelId}
            value={group.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="เช่น ระดับความเผ็ด"
            aria-invalid={Boolean(errors[labelId]) || undefined}
            aria-describedby={errors[labelId] ? `${labelId}-error` : undefined}
            className={smallField}
          />
          <FieldError id={`${labelId}-error`} message={errors[labelId]} />
        </div>
        <div className="flex pt-5">
          <button type="button" onClick={() => onMove(-1)} disabled={g === 0} aria-label={`เลื่อนกลุ่ม ${name} ขึ้น`} className={iconButton}>
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={g === count - 1} aria-label={`เลื่อนกลุ่ม ${name} ลง`} className={iconButton}>
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={onRemove} aria-label={`ลบกลุ่ม ${name}`} className={cx(iconButton, "hover:text-danger")}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">ลูกค้าเลือกได้กี่อย่างในกลุ่ม {name}</legend>
          {[
            { multiple: false, label: "เลือก 1 อย่าง" },
            { multiple: true, label: "เลือกได้หลายอย่าง" },
          ].map((t) => (
            // relative: ให้ input sr-only อยู่ในปุ่มนี้ ไม่งั้นตอน focus เบราว์เซอร์จะเลื่อน <dialog> ทั้งกล่องจนหน้าว่าง
            <label
              key={String(t.multiple)}
              className="relative flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-haze has-checked:bg-forest has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-ink"
            >
              <input
                type="radio"
                name={`og-${g}-type`}
                checked={group.multiple === t.multiple}
                onChange={() => onChange({ multiple: t.multiple })}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </fieldset>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={group.required} onChange={(e) => onChange({ required: e.target.checked })} className="size-4 accent-cocoa" />
          ลูกค้าต้องเลือก
        </label>
        {group.multiple && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor={maxId} className="text-xs font-semibold text-ink-soft">
                เลือกได้สูงสุด
              </label>
              <input
                id={maxId}
                inputMode="numeric"
                value={group.max}
                placeholder="ไม่จำกัด"
                onChange={(e) => onChange({ max: e.target.value.replace(/\D/g, "") })}
                aria-invalid={Boolean(errors[maxId]) || undefined}
                aria-describedby={errors[maxId] ? `${maxId}-error` : undefined}
                className={cx(smallField, "w-28")}
              />
            </div>
            <FieldError id={`${maxId}-error`} message={errors[maxId]} />
          </div>
        )}
      </div>

      <ul aria-label={`ตัวเลือกในกลุ่ม ${name}`} className="space-y-2">
        {group.options.map((option, o) => (
          <OptionRow
            key={option.id}
            g={g}
            o={o}
            option={option}
            group={group}
            count={group.options.length}
            errors={errors}
            onChange={(changes, exclusiveDefault) => setOption(o, changes, exclusiveDefault)}
            onMove={(delta) => onChange({ options: move(group.options, o, delta) })}
            onRemove={() => onChange({ options: group.options.filter((_, i) => i !== o) })}
          />
        ))}
      </ul>
      <div className="space-y-1">
        <button
          id={addId}
          type="button"
          onClick={() => onChange({ options: [...group.options, emptyOption()] })}
          disabled={group.options.length >= OPTION_LIMITS.options}
          aria-describedby={errors[addId] ? `${addId}-error` : undefined}
          className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}
        >
          <Plus aria-hidden="true" className="size-4" />
          เพิ่มตัวเลือก<span className="sr-only">ในกลุ่ม {name}</span>
        </button>
        <FieldError id={`${addId}-error`} message={errors[addId]} />
      </div>

      <CustomerPreview group={group} />
    </li>
  );
}

/**
 * ตัวเลือกเสริมของเมนู (ระดับความเผ็ด ความหวาน เลือกเส้น เพิ่มพิเศษ ฯลฯ) ใช้ใน pop-up เพิ่ม/แก้ไขเมนู
 * groups = ค่าในฟอร์ม (ดู groupToValue) · errors = { [fieldId]: ข้อความ } แสดงเฉพาะเมื่อ showErrors
 */
export function OptionGroupsEditor({ groups, onChange, errors, showErrors, menus, editingId }) {
  const [copyFrom, setCopyFrom] = useState("");
  const shown = showErrors ? errors : {};
  const full = groups.length >= OPTION_LIMITS.groups;
  const labels = new Set(groups.map((g) => g.label.trim()));
  const copySources = menus.filter((m) => m._id !== editingId && m.option_groups?.length);

  function update(g, changes) {
    onChange(groups.map((group, i) => (i === g ? { ...group, ...changes } : group)));
  }

  function addGroups(sourceGroups) {
    const next = [...groups];
    for (const group of sourceGroups) {
      if (next.length >= OPTION_LIMITS.groups) break;
      if (next.some((g) => g.label.trim() === group.label.trim())) continue;
      next.push(copyGroup(group, next));
    }
    onChange(next);
  }

  return (
    <section aria-labelledby="menu-options-title" className={cx(panelClass, "space-y-4")}>
      <div>
        <h2 id="menu-options-title" className="text-lg font-bold text-ink">
          ตัวเลือกเสริม <span className="text-sm font-normal text-ink-soft">(ไม่บังคับ)</span>
        </h2>
        <p className="text-sm text-ink-soft">
          เช่น ระดับความเผ็ด ความหวาน เลือกเส้น เพิ่มพิเศษ · เมนูที่ไม่ต้องเลือกอะไร (เช่น น้ำเปล่า) ไม่ต้องเพิ่ม
        </p>
      </div>

      <div role="group" aria-label="เพิ่มชุดตัวเลือกสำเร็จรูป" className="flex flex-wrap gap-2">
        {OPTION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => addGroups([preset])}
            disabled={full || labels.has(preset.label)}
            className={cx(chipClasses(), "h-9 px-3 disabled:cursor-not-allowed disabled:opacity-40")}
          >
            <Plus aria-hidden="true" className="size-4" />
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange([...groups, emptyGroup()])}
          disabled={full}
          className={cx(chipClasses({ tone: "highlight" }), "h-9 px-3 disabled:cursor-not-allowed disabled:opacity-40")}
        >
          <Plus aria-hidden="true" className="size-4" />
          สร้างกลุ่มเอง
        </button>
      </div>

      {copySources.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="menu-options-copy" className="block text-xs font-semibold text-ink-soft">
              คัดลอกตัวเลือกจากเมนูอื่น
            </label>
            <select id="menu-options-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={fieldClass}>
              <option value="">เลือกเมนู</option>
              {copySources.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.option_groups.map((g) => g.label).join(", ")})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!copyFrom || full}
            onClick={() => {
              addGroups(copySources.find((m) => m._id === copyFrom)?.option_groups ?? []);
              setCopyFrom("");
            }}
            className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}
          >
            <Copy aria-hidden="true" className="size-4" />
            คัดลอก
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-line px-4 py-5 text-center text-sm text-ink-soft">
          ยังไม่มีตัวเลือกเสริม ลูกค้าจะสั่งเมนูนี้ได้ทันทีโดยไม่ต้องเลือกอะไร
        </p>
      ) : (
        <ul aria-label="กลุ่มตัวเลือกเสริม" className="space-y-3">
          {groups.map((group, g) => (
            <GroupCard
              key={group.id}
              g={g}
              group={group}
              count={groups.length}
              errors={shown}
              onChange={(changes) => update(g, changes)}
              onMove={(delta) => onChange(move(groups, g, delta))}
              onRemove={() => onChange(groups.filter((_, i) => i !== g))}
            />
          ))}
        </ul>
      )}
      {full && <p className="text-xs text-ink-soft">เพิ่มได้สูงสุด {OPTION_LIMITS.groups} กลุ่มต่อเมนู</p>}
    </section>
  );
}
