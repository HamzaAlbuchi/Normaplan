interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-md border border-border bg-card ${className}`}>{children}</div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border bg-white px-[18px] py-3.5">
      <div>
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-[1.2px] text-ink">{title}</h3>
        {description && (
          <p className="mt-0.5 font-mono text-[9px] text-ink2">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-[18px] py-4 ${className}`}>{children}</div>;
}
