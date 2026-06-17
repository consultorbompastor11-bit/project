import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

type Variant = "default" | "positive" | "negative";

const valueColor: Record<Variant, string> = {
  default: "text-slate-900",
  positive: "text-[#16a34a]",
  negative: "text-[#dc2626]",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  variant?: Variant;
  hint?: string;
  children?: ReactNode;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  hint,
  children,
}: KpiCardProps) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[#64748b]">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`mt-3 text-2xl font-bold tracking-tight ${valueColor[variant]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[#64748b]">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
