export function ProbabilityPill({
  side,
  value,
}: {
  side: "yes" | "no";
  value: number;
}) {
  return (
    <div className={`probability-pill probability-pill-${side}`}>
      <span className="probability-label">{side.toUpperCase()}</span>
      <strong>{Math.round(value * 100)}%</strong>
    </div>
  );
}
