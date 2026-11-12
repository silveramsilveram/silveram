import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'outline-inverse' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Pill actions (see `.btn-pill` in utilities.css): fine outline, checkered underside that
 * compresses on hover and press. League Spartan, sentence case. States: default, hover,
 * focus-visible (global ring), pressed, disabled, busy (`aria-busy`).
 */
const variants: Record<Exclude<ButtonVariant, 'text'>, string> = {
  primary: '',
  secondary: 'btn-pill--secondary',
  inverse: 'btn-pill--inverse',
  'outline-inverse': 'btn-pill--outline-inverse',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'btn-pill--sm',
  md: '',
  lg: 'btn-pill--lg',
};

const textLink =
  'inline-flex min-h-11 items-center justify-center gap-2 border-0 bg-transparent px-0 text-[0.9375rem] font-semibold ' +
  'text-brand-primary underline underline-offset-4 decoration-accent-silver cursor-pointer ' +
  'transition-colors duration-[250ms] ease-in-out hover:decoration-brand-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/** Class string shared by <Button> and anchors styled as buttons. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = ''): string {
  if (variant === 'text') return `${textLink} ${className}`.trim();
  return `btn-pill ${variants[variant]} ${sizes[size]} ${className}`.replace(/\s+/g, ' ').trim();
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  ),
);

Button.displayName = 'Button';
export default Button;
