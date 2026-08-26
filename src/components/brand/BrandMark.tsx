import Image from 'next/image'

interface BrandMarkProps {
  size?: number
  showName?: boolean
  showProduct?: boolean
  tagline?: string
}

export function BrandMark({
  size = 36,
  showName = true,
  showProduct = false,
  tagline,
}: BrandMarkProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5" dir="ltr">
      <Image
        src="/brand/neuraops-edge-n.png"
        alt={showName ? '' : 'NeuraOps'}
        width={size}
        height={size}
        className="flex-shrink-0 object-contain"
        priority
      />
      {showName ? (
        <span className="min-w-0">
          <span className="block truncate font-sans text-[15px] font-extrabold tracking-[-0.025em] text-brand-navy dark:text-white">
            Neura<span className="text-brand-primary dark:text-brand-azure">Ops</span>
          </span>
          {showProduct ? (
            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-ink/45 dark:text-white/45">
              LeadOps
            </span>
          ) : null}
          {tagline ? (
            <span className="block text-[10px] text-brand-ink/45 dark:text-white/45">
              {tagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
