import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: 'default' | 'elevated'
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
}

export function Card({
  elevation = 'default',
  title,
  description,
  footer,
  className = '',
  children,
  ...props
}: CardProps) {
  const elevationClass =
    elevation === 'elevated'
      ? 'shadow-card-light dark:shadow-card-dark'
      : 'shadow-none'

  return (
    <section
      className={`rounded-[20px] border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-6 ${elevationClass} ${className}`}
      {...props}
    >
      {(title || description) && (
        <header className="mb-4">
          {title && <h3 className="text-lg font-semibold text-ink-950 dark:text-paper-50">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm leading-6 text-ink-950/60 dark:text-paper-50/60">{description}</p>
          )}
        </header>
      )}

      {children}

      {footer && <footer className="mt-5 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">{footer}</footer>}
    </section>
  )
}
