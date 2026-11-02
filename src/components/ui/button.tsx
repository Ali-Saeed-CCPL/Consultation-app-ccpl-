import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-(--color-sky-300) bg-(--color-primary) text-(--color-ink) hover:bg-(--color-primary-hover)",
  secondary:
    "border border-(--color-border-input) bg-(--color-surface) text-(--color-body) hover:bg-(--tint) hover:border-(--color-link)",
  danger:
    "border border-(--color-red) bg-(--color-red) text-(--color-on-fill) hover:bg-(--color-red-ink) hover:border-(--color-red-ink)",
};

const sizeClasses: Record<Size, string> = {
  md: "px-4 py-[9.5px] text-[14px]",
  sm: "px-3 py-[6.5px] text-[12.5px]",
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
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-(--radius-md) font-(family-name:--font-ui) font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:border-(--color-line) disabled:bg-(--color-surface-sunken) disabled:text-(--color-faint) disabled:hover:bg-(--color-surface-sunken) ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
