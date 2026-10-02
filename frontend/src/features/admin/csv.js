/**
 * สร้างไฟล์ CSV แล้วให้เบราว์เซอร์ดาวน์โหลด ใส่ BOM ไว้หน้าไฟล์ Excel จะอ่านภาษาไทยได้ถูกต้อง
 * columns: [{ header, value: (row) => string | number }]
 */
export function downloadCsv(filename, columns, rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.map((c) => escape(c.header)).join(","), ...rows.map((row) => columns.map((c) => escape(c.value(row))).join(","))];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
