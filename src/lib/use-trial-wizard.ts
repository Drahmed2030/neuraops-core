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

  // Real store identity, set once /api/trial/create-store succeeds.
  // Until then, storeSlug is null and no backend calls that need a
  // real store should be made.
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [creatingStore, setCreatingStore] = useState(false)
  const [createStoreError, setCreateStoreError] = useState<string | null>(null)

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

  /**
   * Called when the customer completes step 2 (store info) and moves
   * to step 3. This is what actually creates the store record in
   * Supabase and starts the 14-day signup window. Real network call,
   * real failure handling — if it fails, we surface the error and
   * do NOT let the wizard silently proceed as if it worked.
   */
  const createStore = useCallback(async (): Promise<boolean> => {
    setCreatingStore(true)
    setCreateStoreError(null)
    try {
      const res = await fetch('/api/trial/create-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          storeName: data.storeName.trim(),
          phone: data.phone.trim(),
          phoneCode: data.phoneCode,
          city: data.city,
          channel: data.channel,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.storeId) {
        setCreateStoreError(result.error || 'حدث خطأ أثناء إنشاء حسابك. حاول مرة أخرى.')
        return false
      }

      setStoreId(result.storeId)
      setStoreSlug(result.slug)
      return true
    } catch {
      setCreateStoreError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.')
      return false
    } finally {
      setCreatingStore(false)
    }
  }, [data])

  const demoSlug = storeSlug || 'demo'

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
    storeSlug,
    storeId,
    creatingStore,
    createStoreError,
    createStore,
  }
}
