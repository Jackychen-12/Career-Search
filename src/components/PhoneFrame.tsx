import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div className="phone-content">
        {children}
      </div>
    </div>
  )
}
