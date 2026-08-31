'use client'

import * as React from 'react'

type InputState = 'default' | 'error'
type InputSize = 'm' | 'l'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  state?: InputState
  inputSize?: InputSize
  helperText?: string
  errorText?: string
}

const base = [
  'w-full rounded-xl border bg-black/[0.015] dark:bg-white/[0.025]',
  'text-ink-950 dark:text-paper-50 placeholder:text-ink-950/35 dark:placeholder:text-paper-50/35',
  'outline-none transition-colors',
  'focus-visible:border-brand-primary/70 focus-visible:ring-2 focus-visible:ring-brand-primary/15',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

const sizeClasses: Record<InputSize, string> = {
  m: 'min-h-11 px-3.5 py-3 text-sm',
  l: 'min-h-[52px] px-4 py-3.5 text-[15px]',
}

const stateClasses: Record<InputState, string> = {
  default: 'border-black/10 dark:border-white/10',
  error: 'border-red-500/60 focus-visible:border-red-500 focus-visible:ring-red-500/15',
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className = '',
    state = 'default',
    inputSize = 'm',
    helperText,
    errorText,
    'aria-describedby': ariaDescribedBy,
    id,
    ...props
  },
  ref,
) {
  const generatedId = React.useId()
  const inputId = id || generatedId
  const message = state === 'error' ? errorText : helperText
  const messageId = message ? `${inputId}-message` : undefined

  return (
    <div className="w-full">
      <input
        ref={ref}
        id={inputId}
        aria-invalid={state === 'error' ? true : undefined}
        aria-describedby={ariaDescribedBy || messageId}
        className={`${base} ${sizeClasses[inputSize]} ${stateClasses[state]} ${className}`.trim()}
        {...props}
      />
      {message ? (
        <p
          id={messageId}
          className={`mt-1.5 text-xs leading-5 ${state === 'error' ? 'text-red-500' : 'opacity-55'}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
})
