'use client'

import { useUI } from '@/lib/ui-context'

const AGENT_ICONS = ['📦', '↩️', '🏷️', '🍽️', '📍', '🧭']

export function AgentsSection() {
  const { t } = useUI()

  const agents = [
    { name: t.agent1Name, desc: t.agent1Desc },
    { name: t.agent2Name, desc: t.agent2Desc },
    { name: t.agent3Name, desc: t.agent3Desc },
    { name: t.agent4Name, desc: t.agent4Desc },
    { name: t.agent5Name, desc: t.agent5Desc },
    { name: t.agent6Name, desc: t.agent6Desc },
  ]

  return (
    <section className="px-5 py-20 sm:px-10 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <div className="text-[12px] font-bold tracking-[0.15em] uppercase mb-4 text-gold font-sans">
            {t.agentsEyebrow}
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-4 leading-tight">
            {t.agentsTitle}
          </h2>
          <p className="text-[16px] leading-relaxed text-ink-950/60 dark:text-paper-50/60">
            {t.agentsSub}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent, i) => (
            <div
              key={i}
              className="relative p-8 rounded-[18px] border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 hover:-translate-y-1.5 hover:border-gold hover:shadow-gold-glow transition-all cursor-default"
            >
              <div className="absolute top-7 right-7 text-[13px] font-bold text-gold/60 font-sans">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="w-[52px] h-[52px] rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center text-2xl mb-5">
                {AGENT_ICONS[i]}
              </div>
              <div className="text-[19px] font-bold mb-2.5">{agent.name}</div>
              <div className="text-[14px] leading-relaxed text-ink-950/60 dark:text-paper-50/60">
                {agent.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
