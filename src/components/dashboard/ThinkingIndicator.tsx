'use client'

/**
 * Replaces the plain "thinking..." text with a pulsing NeuraOps brand mark
 * mark — same brand identity, no jarring English/loading-spinner
 * feel for the customer.
 */
export function ThinkingIndicator() {
  return (
    <div className="self-end flex items-center gap-2 px-1">
      <div className="relative w-5 h-5">
        <span className="absolute inset-0 rounded-md bg-brand-primary animate-ping opacity-40" />
        <span className="relative flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary text-[10px] font-black text-ink-950 font-sans">
          N
        </span>
      </div>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/60 animate-bounce" />
      </div>
    </div>
  )
}
