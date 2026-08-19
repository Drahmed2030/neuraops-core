'use client'

import { useState, useCallback } from 'react'

export interface TrialFormData {
  type: string | null
  storeName: string
  phoneCode: string
  phone: string
  city: string
  channel: string
  topics: string[]
  hours: string
  fileUploaded: boolean
}

const initialData: TrialFormData = {
  type: null,
  storeName: '',
  phoneCode: '+966',
  phone: '',
  city: '',
  channel: '',
  topics: [],
  hours: '',
  fileUploaded: false,
}

export function useTrialWizard() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<TrialFormData>(initialData)
  const [activationDone, setActivationDone] = useState(false)

  const totalSteps = 4

  const goNext = useCallback(() => setStep(s => Math.min(s + 1, totalSteps)), [])
  const goBack = useCallback(() => setStep(s => Math.max(s - 1, 1)), [])
  const goToStep = useCallback((n: number) => setStep(n), [])

  const updateData = useCallback((patch: Partial<TrialFormData>) => {
    setData(prev => ({ ...prev, ...patch }))
  }, [])

  const toggleTopic = useCallback((tag: string) => {
    setData(prev => ({
      ...prev,
      topics: prev.topics.includes(tag)
        ? prev.topics.filter(t => t !== tag)
        : [...prev.topics, tag],
    }))
  }, [])

  const canProceedStep1 = data.type !== null
  const canProceedStep2 = data.storeName.trim().length > 1 && data.phone.trim().length >= 8

  const demoSlug = (data.storeName || 'demo-store')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'demo'

  return {
    step,
    totalSteps,
    data,
    activationDone,
    setActivationDone,
    goNext,
    goBack,
    goToStep,
    updateData,
    toggleTopic,
    canProceedStep1,
    canProceedStep2,
    demoSlug,
  }
}
