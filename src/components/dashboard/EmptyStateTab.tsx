'use client'

interface Props {
  icon: string
  title: string
  emptyText: string
}

export function EmptyStateTab({ icon, title, emptyText }: Props) {
  return (
    <div>
      <h1 className="text-[22px] font-extrabold mb-5">
        {icon} {title}
      </h1>
      <div className="rounded-2xl p-10 border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-center text-[13.5px] text-ink-950/45 dark:text-paper-50/45">
        {emptyText}
      </div>
    </div>
  )
}
