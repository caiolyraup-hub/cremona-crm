'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { TaskItem } from './task-item'
import type { TaskWithContact } from '@/types/app'

interface TaskListProps {
  tasks: TaskWithContact[]
  title?: string
  titleClassName?: string
  emptyMessage: string
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: TaskWithContact) => void
}

export function TaskList({
  tasks,
  title,
  titleClassName = '',
  emptyMessage,
  onComplete,
  onDelete,
  onEdit,
}: TaskListProps) {
  return (
    <div>
      {title && (
        <div className={`flex items-center gap-2 border-b border-gray-200 px-3 py-2 ${titleClassName}`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </span>
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
            {tasks.length}
          </span>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="px-3 py-5 text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <AnimatePresence initial={false}>
          {tasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
            >
              <TaskItem
                task={task}
                onComplete={onComplete}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
