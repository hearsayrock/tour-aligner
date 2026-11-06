import type { ComponentPropsWithRef } from 'react'

export function ProfilePagePaneEditor({ className = '', ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      {...props}
      tabIndex={-1}
      role="region"
      className={'absolute inset-x-0 top-0 z-40 max-h-[70dvh] min-h-[300px] overflow-y-auto rounded-[30px] bg-white text-[#252525] shadow-xl ' + className}
    />
  )
}
