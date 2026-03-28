type BadgeVariant = "default" | "critical" | "warning" | "success" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-bg2 text-ink2",
  critical: "bg-red-soft text-red",
  warning: "bg-amber-soft text-amber-ink",
  success: "bg-green-soft text-green",
  info: "bg-blue-soft text-blue",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[8px] font-normal uppercase leading-tight tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
