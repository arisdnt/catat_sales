import { AdminGuard } from '@/components/layout/admin-guard'

export default function PengeluaranLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  )
}