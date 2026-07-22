'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StepProgress } from '@/components/onboarding/step-progress'
import { StepBusiness } from '@/components/onboarding/step-business'
import { StepPipeline } from '@/components/onboarding/step-pipeline'
import { StepContacts } from '@/components/onboarding/step-contacts'
import { StepWhatsapp } from '@/components/onboarding/step-whatsapp'
import { StepComplete } from '@/components/onboarding/step-complete'
import { Toaster } from '@/components/ui/sonner'

interface Stage {
  id?: string
  name: string
  color: string
  position: number
}

interface OnboardingFlowProps {
  workspace: {
    id: string
    name: string
    business_name: string | null
    business_type: string | null
    logo_url: string | null
    whatsapp_phone_number_id: string | null
    whatsapp_business_account_id: string | null
    whatsapp_phone: string | null
    has_whatsapp_token: boolean
  }
  initialStages: Stage[]
  initialContactsCount: number
}

const TOTAL_STEPS = 5

export function OnboardingFlow({
  workspace,
  initialStages,
  initialContactsCount,
}: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [prevStep, setPrevStep] = useState(1)
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [businessName, setBusinessName] = useState(workspace.business_name ?? workspace.name)
  const [contactsCount, setContactsCount] = useState(initialContactsCount)
  const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(
    Boolean(
      workspace.whatsapp_phone_number_id &&
      workspace.whatsapp_phone &&
      workspace.has_whatsapp_token
    )
  )

  function goTo(next: number) {
    setPrevStep(step)
    setStep(next)
  }

  const direction = step > prevStep ? 1 : -1

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex h-14 items-center border-b border-gray-200 bg-white px-6">
        <span className="text-base font-bold tracking-tight text-[#1a2b4a]">Cremona</span>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <StepProgress currentStep={step} totalSteps={TOTAL_STEPS} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction > 0 ? 32 : -32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -32 : 32 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {step === 1 && (
              <StepBusiness
                workspace={workspace}
                onSaved={(nextBusinessName) => setBusinessName(nextBusinessName)}
                onNext={() => goTo(2)}
              />
            )}
            {step === 2 && (
              <StepPipeline
                stages={stages}
                onStagesChange={setStages}
                onNext={() => goTo(3)}
                onBack={() => goTo(1)}
              />
            )}
            {step === 3 && (
              <StepContacts
                onNext={(createdCount) => {
                  setContactsCount((prev) => prev + createdCount)
                  goTo(4)
                }}
                onBack={() => goTo(2)}
              />
            )}
            {step === 4 && (
              <StepWhatsapp
                workspace={workspace}
                onNext={(configured) => {
                  setIsWhatsAppConfigured(configured)
                  goTo(5)
                }}
                onBack={() => goTo(3)}
              />
            )}
            {step === 5 && (
              <StepComplete
                businessName={businessName}
                stageCount={stages.length}
                contactCount={contactsCount}
                isWhatsAppConfigured={isWhatsAppConfigured}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Toaster position="bottom-right" duration={3000} />
    </div>
  )
}
