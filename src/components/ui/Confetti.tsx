'use client'

import { useEffect, useRef } from 'react'

interface ConfettiProps {
  trigger: boolean
}

export function Confetti({ trigger }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!trigger || firedRef.current) return
    firedRef.current = true

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#C9A961', '#B8944F', '#F4E4C1', '#22C55E', '#0A0A0F']
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      r: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * 360,
      vrot: -6 + Math.random() * 12,
    }))

    let frame = 0
    const maxFrames = 150
    let animationId: number

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vrot
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6)
        ctx.restore()
      })
      frame++
      if (frame < maxFrames) {
        animationId = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    draw()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [trigger])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[200]"
    />
  )
}
