'use client'

import { useCallback, useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/formatters'

export interface UseCurrencyInputResult {
  amountDigits: string
  amountValue: number
  displayValue: string
  handleAmountChange: (raw: string) => void
  reset: () => void
  setFromDecimal: (decimal: number) => void
}

export function useCurrencyInput(initialCents = ''): UseCurrencyInputResult {
  const [amountDigits, setAmountDigits] = useState(initialCents)

  const amountValue = useMemo(
    () => (amountDigits ? Number(amountDigits) / 100 : 0),
    [amountDigits]
  )

  const displayValue = amountDigits ? formatCurrency(amountValue) : ''

  const handleAmountChange = useCallback((raw: string) => {
    setAmountDigits(raw.replace(/\D/g, ''))
  }, [])

  const reset = useCallback(() => {
    setAmountDigits('')
  }, [])

  const setFromDecimal = useCallback((decimal: number) => {
    setAmountDigits(String(Math.round(decimal * 100)))
  }, [])

  return { amountDigits, amountValue, displayValue, handleAmountChange, reset, setFromDecimal }
}
