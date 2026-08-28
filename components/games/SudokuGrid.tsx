interface SudokuGridProps {
  grid: number[][];
  gameName: string;
  sequence?: string;
}

export default function SudokuGrid({ grid, gameName, sequence }: SudokuGridProps) {
  const size = grid.length;
  // 6×6 mini sudoku boxes are 2 rows × 3 columns; default to 3×3 for others.
  const boxRows = size === 6 ? 2 : 3;
  const boxCols = size === 6 ? 3 : 3;

  return (
    <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6">
      <h4 className="mb-4 text-sm font-medium text-muted-foreground sm:text-base">
        Solution grid {sequence ? `${gameName} ${sequence}` : ""}
      </h4>
      <div
        className="mx-auto grid w-full max-w-[360px] overflow-hidden rounded-lg border-2 border-foreground bg-background sm:max-w-[420px]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        role="table"
        aria-label={`${gameName} solution grid`}
      >
        {grid.map((row, r) =>
          row.map((value, c) => {
            const thickTop = r % boxRows === 0;
            const thickLeft = c % boxCols === 0;
            return (
              <div
                key={`${r}-${c}`}
                role="cell"
                className={[
                  "flex aspect-square items-center justify-center font-display text-lg font-semibold text-foreground sm:text-xl",
                  "border-border border-t border-l",
                  thickTop ? "border-t-2 border-t-foreground" : "",
                  thickLeft ? "border-l-2 border-l-foreground" : "",
                  r === 0 ? "border-t-0" : "",
                  c === 0 ? "border-l-0" : "",
                ].join(" ")}
              >
                {value}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
