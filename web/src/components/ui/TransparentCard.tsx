import { ReactNode } from 'react'
import clsx from 'clsx'

interface TransparentCardProps {
  children: ReactNode
  className?: string
  overflowVisible?: boolean
  style?: React.CSSProperties
}

export function TransparentCard({ children, className, overflowVisible = false, style }: TransparentCardProps) {
  return (
    <div
      className={clsx(
        'dark relative border rounded-lg p-6 bg-gray-300/20',
        overflowVisible ? 'overflow-visible' : 'overflow-hidden',
        className
      )}
    // style={{
    //   boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)',
    //   borderColor: 'rgba(255, 255, 255, 0.2)',
    //   ...style
    // }}
    >
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
    </div>
  )
}
