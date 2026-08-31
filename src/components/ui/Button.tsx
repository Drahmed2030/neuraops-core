import * as React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'm' | 'l'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const baseClasses = [
  'inline-flex items-center justify-center gap-2',
  'rounded-xl font-bold',
  'transition-colors duration-200',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  'disabled:pointer-events-none disabled:opacity-45',
].join(' ')

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-white hover:bg-brand-azure',
  secondary:
    'border border-black/10 bg-white text-ink-950 hover:border-brand-primary dark:border-white/10 dark:bg-ink-800 dark:text-paper-50',
  ghost:
    'bg-transparent text-ink-950 hover:bg-black/5 dark:text-paper-50 dark:hover:bg-white/10',
}

const sizeClasses: Record<ButtonSize, string> = {
  m: 'min-h-11 px-4 py-2.5 text-sm',
  l: 'min-h-[52px] px-5 py-3 text-[15px]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'm',
      fullWidth = false,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const widthClass = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim()}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
