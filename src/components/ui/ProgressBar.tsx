interface ProgressBarProps {
  percentage: number;
}

export function corProgresso(percentage: number): string {
  if (percentage >= 90) return '#16a34a';
  if (percentage >= 70) return '#d97706';
  return '#dc2626';
}

export function ProgressBar({ percentage }: ProgressBarProps) {
  const color = corProgresso(percentage);
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold" style={{ color }}>
        {clampedPercentage.toFixed(0)}%
      </span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedPercentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
