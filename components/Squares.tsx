export function Squares({
  count,
  maxScale,
  perRow = 10,
}: {
  count: number;
  maxScale: number;
  perRow?: number;
}) {
  const filled = Number.isFinite(count)
    ? Math.max(0, Math.min(count, maxScale))
    : 0;

  const total = Math.max(0, maxScale);
  const rows = Math.ceil(total / perRow);

  return (
    <div className="squaresStack">
      {Array.from({ length: rows }).map((_, rowIdx) => {
        const start = rowIdx * perRow;
        const end = Math.min(start + perRow, total);
        const rowLength = end - start;

        return (
          <div className="squaresRow" key={rowIdx}>
            {Array.from({ length: rowLength }).map((__, i) => {
              const absoluteIndex = start + i + 1;
              const isFilled = absoluteIndex <= filled;

              return (
                <span
                  key={i}
                  className={`sq ${isFilled ? "sqFilled" : ""}`}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
