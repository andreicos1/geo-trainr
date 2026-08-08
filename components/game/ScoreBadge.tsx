interface ScoreBadgeProps {
  label: string;
  value: string;
  accentClassName?: string;
}

export default function ScoreBadge({ label, value, accentClassName = "text-sky-400" }: ScoreBadgeProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-2xl font-bold ${accentClassName}`}>{value}</span>
    </div>
  );
}
