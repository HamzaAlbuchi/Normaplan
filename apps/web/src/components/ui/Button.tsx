import { forwardRef, cloneElement, isValidElement } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center font-sans font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50 rounded-sm tracking-wide";
const variants: Record<Variant, string> = {
  primary:
    "bg-amber text-white hover:opacity-90 active:opacity-100 border border-transparent",
  secondary: "border border-border2 bg-card text-ink hover:bg-bg2",
  ghost: "border border-border2 bg-transparent text-ink hover:border-ink2",
  danger: "border border-red bg-red-soft text-red hover:bg-red-soft/80",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px]",
  md: "h-9 px-4 text-[11px]",
  lg: "h-10 px-5 text-[11px]",
};

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", asChild, children, ...props }, ref) => {
    const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
    if (asChild && isValidElement(children)) {
      return cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: [classes, (children as React.ReactElement).props.className].filter(Boolean).join(" "),
      });
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
