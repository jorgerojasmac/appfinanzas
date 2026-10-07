import type { ReactNode } from 'react'
import { EmptyState } from '../components/ui/Controls'
import { Screen } from '../components/ui/Screen'

export function Placeholder({ title, icon, message }: { title: string; icon: ReactNode; message: string }) {
  return (
    <Screen title={title}>
      <EmptyState icon={icon} title="Muy pronto" message={message} />
    </Screen>
  )
}
