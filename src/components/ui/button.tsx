import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "btn-royal border border-transparent text-white",
  secondary:
    "border border-(--color-border-input) bg-(--color-surface) text-(--color-body) hover:bg-(--tint) hover:border-(--color-link)",
  danger:
    "border border-(--color-red) bg-(--color-red) text-(--color-on-fill) hover:bg-(--color-red-ink) hover:border-(--color-red-ink)",
};

const sizeClasses: Record<Size, string> = {
  // One control scale app-wide: 40px (md) and 34px (sm) — the same as inputs and the patient actions.
  md: "h-10 px-4 text-[14px]",
  sm: "h-[34px] px-3 text-[13px]",
};

export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--radius-md) font-(family-name:--font-ui) font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:border-(--color-line) disabled:bg-(--color-surface-sunken) disabled:text-(--color-faint) disabled:hover:bg-(--color-surface-sunken) ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
