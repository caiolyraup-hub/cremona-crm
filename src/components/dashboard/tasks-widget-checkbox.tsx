'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { completeTaskAction } from '@/app/(dashboard)/dashboard/tasks/actions'

interface TasksWidgetCheckboxProps {
  taskId: string
  workspaceId: string
}

export function TasksWidgetCheckbox({ taskId, workspaceId }: TasksWidgetCheckboxProps) {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (done) return
    setDone(true)
    startTransition(async () => {
      const result = await completeTaskAction(taskId, workspaceId)
      if (result.error) {
        toast.error(result.error)
        setDone(false)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all disabled:opacity-50 ${
        done ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-[#378ADD]'
      }`}
    >
      {done && <Check size={9} className="text-white" strokeWidth={3} />}
    </button>
  )
}
