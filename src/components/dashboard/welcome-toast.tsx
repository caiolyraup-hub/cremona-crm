'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function WelcomeToast() {
  const router = useRouter()

  useEffect(() => {
    toast.success('Bem-vindo ao Cremona!', {
      description: 'Seu workspace está configurado e pronto para usar.',
      duration: 5000,
    })
    // Remove the ?welcome=1 param without a hard reload
    router.replace('/dashboard')
  }, [router])

  return null
}
