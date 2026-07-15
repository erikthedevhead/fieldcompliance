import { AuthGuard } from '@/components/shell/auth-guard'
import { Topbar } from '@/components/shell/topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-canvas">
        <Topbar />
        <main className="mx-auto max-w-[1200px] px-6 py-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
