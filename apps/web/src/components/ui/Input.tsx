import { forwardRef } from "react";

const base =
  "w-full rounded-sm border border-border2 bg-card px-3 font-sans text-sm text-ink placeholder-ink3 transition-colors focus:border-ink2 focus:outline-none disabled:bg-bg2 disabled:text-ink3";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block font-sans text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={`${base} h-9 ${className}`} {...props} />
        {error && <p className="mt-1.5 font-mono text-sm text-red">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
