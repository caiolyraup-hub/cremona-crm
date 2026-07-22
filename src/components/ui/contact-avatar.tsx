import { getInitials, getAvatarColor } from '@/lib/formatters'

type AvatarSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-8 w-8 text-[13px]',
  lg: 'h-12 w-12 text-[18px]',
}

interface ContactAvatarProps {
  name: string
  size?: AvatarSize
  className?: string
}

export function ContactAvatar({ name, size = 'md', className = '' }: ContactAvatarProps) {
  const colors = getAvatarColor(name)
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[size]} ${colors.bg} ${colors.text} ${className}`}
    >
      {getInitials(name)}
    </div>
  )
}
