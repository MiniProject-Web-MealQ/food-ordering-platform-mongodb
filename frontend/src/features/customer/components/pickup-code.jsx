const SIZE = 21;

function isFinder(x, y) {
  const inBox = (bx, by) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

function finderCell(x, y) {
  const lx = x >= SIZE - 7 ? x - (SIZE - 7) : x;
  const ly = y >= SIZE - 7 ? y - (SIZE - 7) : y;
  const ring = Math.max(Math.abs(lx - 3), Math.abs(ly - 3));
  return ring !== 2;
}

/**
 * MOCK: QR-looking pattern seeded by the pickup code. It is decorative and does not scan;
 * swap for a real QR encoder once the merchant scanner defines the payload.
 */
function cells(code) {
  let seed = [...code].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const filled = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const on = isFinder(x, y) ? finderCell(x, y) : next() > 0.5;
      if (on) filled.push([x, y]);
    }
  }
  return filled;
}

export function PickupCode({ code }) {
  return (
    <div className="text-center">
      <svg
        viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
        aria-hidden="true"
        className="mx-auto size-52 rounded-2xl bg-white p-2 text-forest"
        shapeRendering="crispEdges"
      >
        {cells(code).map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
        ))}
      </svg>
      <p className="mt-4 font-display text-5xl font-black tracking-[0.2em] text-forest">
        <span className="sr-only">รหัสรับอาหาร </span>
        {code}
      </p>
    </div>
  );
}
