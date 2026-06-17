type StatusType =
  | 'REALIZADO'
  | 'PLANEJADO'
  | 'CANCELADO'
  | 'PAID'
  | 'OVERDUE'
  | 'PENDING'
  | 'CANCELLED'
  | 'PARTIAL'
  | 'FAILED';

type Tone = "green" | "red" | "amber" | "purple" | "blue" | "gray";

const toneStyles: Record<Tone, string> = {
  green: "bg-green-100 text-green-700 ring-green-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  purple: "bg-purple-100 text-purple-700 ring-purple-200",
  blue: "bg-blue-100 text-blue-700 ring-blue-200",
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
};

const statusConfig: Record<StatusType, { label: string; tone: Tone }> = {
  REALIZADO: { label: 'Realizado', tone: 'green' },
  PLANEJADO: { label: 'Planejado', tone: 'amber' },
  CANCELADO: { label: 'Cancelado', tone: 'gray' },
  PAID: { label: 'Pago', tone: 'green' },
  OVERDUE: { label: 'Vencido', tone: 'red' },
  PENDING: { label: 'Pendente', tone: 'amber' },
  CANCELLED: { label: 'Cancelado', tone: 'gray' },
  PARTIAL: { label: 'Parcial', tone: 'amber' },
  FAILED: { label: 'Falhou', tone: 'red' },
};

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneStyles[config.tone]}`}
    >
      {config.label}
    </span>
  );
}
