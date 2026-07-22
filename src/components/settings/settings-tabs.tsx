'use client'

import Link from 'next/link'

const TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'plan', label: 'Plano' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'templates', label: 'Templates' },
]

interface SettingsTabsProps {
  activeTab: string
  children: Record<string, React.ReactNode>
}

export function SettingsTabs({ activeTab, children }: SettingsTabsProps) {
  return (
    <div>
      <div className="mb-6 flex border-b border-gray-200">
        {TABS.map(tab => (
          <Link
            key={tab.key}
            href={`/dashboard/settings?tab=${tab.key}`}
            className="mr-1 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              borderColor: activeTab === tab.key ? '#378ADD' : 'transparent',
              color: activeTab === tab.key ? '#378ADD' : '#6b7280',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div>{children[activeTab]}</div>
    </div>
  )
}
