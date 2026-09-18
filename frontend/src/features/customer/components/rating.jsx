/** "★ 4.8 (642)" with a screen-reader friendly label. */
export function Rating({ value, count }) {
  return (
    <span>
      <span aria-hidden="true" className="text-amber">★ </span>
      <span className="sr-only">คะแนน </span>
      {value.toFixed(1)}
      {count !== undefined && (
        <>
          {" "}
          ({count.toLocaleString("th-TH")}
          <span className="sr-only"> รีวิว</span>)
        </>
      )}
    </span>
  );
}
