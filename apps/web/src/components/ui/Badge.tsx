type BadgeVariant = "default" | "critical" | "warning" | "success" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  critical: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
  info: "bg-blue-100 text-blue-800",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
