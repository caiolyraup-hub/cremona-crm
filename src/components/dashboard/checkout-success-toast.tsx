'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CheckoutSuccessToast() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      toast.success('Assinatura ativada com sucesso!', {
        description: 'Bem-vindo ao Cremona. Seu plano esta ativo.',
        duration: 6000,
      })
    }, 500)

    router.replace('/dashboard')
    return () => clearTimeout(timer)
  }, [router])

  return null
}
