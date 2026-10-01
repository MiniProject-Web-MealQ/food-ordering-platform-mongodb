import { Download } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { BarChart } from "@/features/admin/components/bar-chart";
import { DataList } from "@/features/admin/components/data-list";
import { FilterRow, SelectField } from "@/features/admin/components/fields";
import { downloadCsv } from "@/features/admin/csv";
import { formatBaht, formatDay, formatMonth, formatPercent, toDateInput } from "@/features/admin/format";
import { dailySeries, hourlyCounts, menuRanking, monthlySeries, startOfDay, startOfMonth, storeRanking } from "@/features/admin/stats";
import { useAdmin } from "@/features/admin/store";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const DAY = 24 * 60 * 60 * 1000;
const longDate = new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short" });

const PERIODS = [
  { value: "7", label: "7 วันล่าสุด" },
  { value: "14", label: "14 วันล่าสุด" },
  { value: "30", label: "30 วันล่าสุด" },
  { value: "month", label: "เดือนนี้" },
];

function CsvButton({ onClick, label }) {
  return (
    <Button variant="cocoa-outline" size="sm" onClick={onClick}>
      <Download aria-hidden="true" className="size-4" />
      CSV<span className="sr-only"> {label}</span>
    </Button>
  );
}

function Section({ id, title, action, children }) {
  return (
    <section aria-labelledby={id} className={cx(panelClass, "space-y-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-bold text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Reports() {
  usePageTitle("รายงาน");
  const { state } = useAdmin();
  const now = useNow();
  const [period, setPeriod] = useState("7");

  const today = startOfDay(now);
  const days = period === "month" ? Math.round((today - startOfMonth(now)) / DAY) + 1 : Number(period);
  const from = today - (days - 1) * DAY;
  const periodLabel = PERIODS.find((p) => p.value === period).label;
  const stamp = toDateInput(now);

  const daily = dailySeries(state, now, days);
  const monthly = monthlySeries(state, now, 3);
  const stores = storeRanking(state, from);
  const menus = menuRanking(state, from).slice(0, 10);
  const hours = hourlyCounts(state, from);
  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = daily.reduce((s, d) => s + d.orders, 0);

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="รายงาน" subtitle={`${periodLabel} · ยอดขาย ${formatBaht(totalRevenue)} จาก ${totalOrders.toLocaleString("th-TH")} ออเดอร์`} />
      <FilterRow>
        <SelectField id="report-period" label="ช่วงเวลา" value={period} onChange={setPeriod} options={PERIODS} />
      </FilterRow>

      <Section
        id="daily-title"
        title="ยอดขายรายวัน"
        action={
          <CsvButton
            label="ยอดขายรายวัน"
            onClick={() =>
              downloadCsv(`mealq-daily-${stamp}.csv`, [
                { header: "วันที่", value: (d) => toDateInput(d.date) },
                { header: "จำนวนออเดอร์", value: (d) => d.orders },
                { header: "ยอดขาย (บาท)", value: (d) => d.revenue },
              ], daily)
            }
          />
        }
      >
        <BarChart
          title={`ยอดขาย (${periodLabel})`}
          valueHeader="ยอดขาย"
          formatValue={formatBaht}
          // ช่วงยาวมีแท่งเยอะ: ป้ายแกนใช้แค่วันที่ ส่วนชื่อวันเต็มอยู่ใน tooltip และตาราง
          data={daily.map((d) => ({
            key: d.date,
            label: days > 10 ? String(new Date(d.date).getDate()) : formatDay(d.date),
            longLabel: longDate.format(d.date),
            value: d.revenue,
          }))}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Section
          id="monthly-title"
          title="ยอดขายรายเดือน"
          action={
            <CsvButton
              label="ยอดขายรายเดือน"
              onClick={() =>
                downloadCsv(`mealq-monthly-${stamp}.csv`, [
                  { header: "เดือน", value: (m) => toDateInput(m.date).slice(0, 7) },
                  { header: "จำนวนออเดอร์", value: (m) => m.orders },
                  { header: "ยอดขาย (บาท)", value: (m) => m.revenue },
                ], monthly)
              }
            />
          }
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">ยอดขาย 3 เดือนล่าสุด</caption>
            <thead className="text-xs text-ink-soft">
              <tr>
                <th scope="col" className="py-2 font-semibold">
                  เดือน
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  ออเดอร์
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  ยอดขาย
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-haze">
              {monthly.map((m) => (
                <tr key={m.date}>
                  <td className="py-2 text-ink">{formatMonth(m.date)}</td>
                  <td className="py-2 text-right text-ink tabular-nums">{m.orders.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right font-semibold text-ink tabular-nums">{formatBaht(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-soft">ข้อมูลจำลองมีย้อนหลัง 30 วัน เดือนก่อน ๆ จึงมียอดไม่ครบเดือน</p>
        </Section>

        <Section
          id="hourly-title"
          title="ช่วงเวลาที่คนสั่งเยอะ"
          action={
            <CsvButton
              label="ช่วงเวลาที่คนสั่ง"
              onClick={() =>
                downloadCsv(`mealq-hourly-${stamp}.csv`, [
                  { header: "ชั่วโมง", value: (h) => `${String(h.hour).padStart(2, "0")}:00` },
                  { header: "จำนวนออเดอร์", value: (h) => h.orders },
                ], hours)
              }
            />
          }
        >
          <BarChart
            title={`จำนวนออเดอร์ตามชั่วโมง (${periodLabel})`}
            valueHeader="ออเดอร์"
            formatValue={(v) => v.toLocaleString("th-TH")}
            data={hours.map((h) => ({ key: h.hour, label: String(h.hour), longLabel: `${String(h.hour).padStart(2, "0")}:00–${String(h.hour).padStart(2, "0")}:59 น.`, value: h.orders }))}
          />
        </Section>
      </div>

      <Section
        id="stores-title"
        title={`ยอดขายแยกตามร้าน (${periodLabel})`}
        action={
          <CsvButton
            label="ยอดขายแยกตามร้าน"
            onClick={() =>
              downloadCsv(`mealq-stores-${stamp}.csv`, [
                { header: "ร้าน", value: (r) => r.store?.name ?? r.storeId },
                { header: "ออเดอร์", value: (r) => r.orders },
                { header: "ยกเลิก", value: (r) => r.cancelled },
                { header: "อัตรายกเลิก (%)", value: (r) => Math.round(r.cancelRate * 100) },
                { header: "ยอดขาย (บาท)", value: (r) => r.revenue },
              ], stores)
            }
          />
        }
      >
        <DataList
          label="ยอดขายแยกตามร้าน"
          rows={stores}
          rowKey={(r) => r.storeId}
          empty="ไม่มีออเดอร์ในช่วงนี้"
          columns={[
            {
              key: "store",
              header: "ร้าน",
              primary: true,
              render: (r) => (
                <Link to={`/admin/stores/${r.storeId}`} className={textLinkClass}>
                  {r.store?.name ?? r.storeId}
                </Link>
              ),
            },
            { key: "orders", header: "ออเดอร์", className: "text-right tabular-nums", render: (r) => r.orders },
            { key: "cancelled", header: "ยกเลิก", className: "text-right tabular-nums", render: (r) => r.cancelled },
            {
              key: "rate",
              header: "อัตรายกเลิก",
              className: "text-right tabular-nums",
              render: (r) => <span className={r.cancelRate >= 0.15 ? "font-semibold text-danger" : undefined}>{formatPercent(r.cancelRate)}</span>,
            },
            { key: "revenue", header: "ยอดขาย", className: "text-right tabular-nums font-semibold", render: (r) => formatBaht(r.revenue) },
          ]}
        />
      </Section>

      <Section
        id="menus-title"
        title={`10 เมนูขายดี (${periodLabel})`}
        action={
          <CsvButton
            label="เมนูขายดี"
            onClick={() =>
              downloadCsv(`mealq-menus-${stamp}.csv`, [
                { header: "เมนู", value: (m) => m.name },
                { header: "ร้าน", value: (m) => m.store?.name ?? m.storeId },
                { header: "จำนวนที่ขาย", value: (m) => m.quantity },
                { header: "ยอดขาย (บาท)", value: (m) => m.revenue },
              ], menus)
            }
          />
        }
      >
        <DataList
          label="เมนูขายดี"
          rows={menus}
          rowKey={(m) => m.menuId}
          empty="ไม่มียอดขายในช่วงนี้"
          columns={[
            { key: "name", header: "เมนู", primary: true, render: (m) => m.name },
            { key: "store", header: "ร้าน", render: (m) => m.store?.name ?? "–" },
            { key: "qty", header: "จำนวนที่ขาย", className: "text-right tabular-nums", render: (m) => `${m.quantity} ที่` },
            { key: "revenue", header: "ยอดขาย", className: "text-right tabular-nums font-semibold", render: (m) => formatBaht(m.revenue) },
          ]}
        />
      </Section>
    </div>
  );
}

export default Reports;
