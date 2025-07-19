'use client'

import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { SidebarProvider, useSidebar } from '@/components/providers/sidebar-provider'
import { ModernSidebar } from '@/components/shared/modern-sidebar'
import { AuthGuard } from '@/components/layout/auth-guard'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className={cn(
        "overflow-x-hidden transition-all duration-300",
        isCollapsed ? "ml-16" : "ml-72"
      )}>
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AuthGuard>
          <SidebarProvider>
            <DashboardContent>{children}</DashboardContent>
            <Toaster />
          </SidebarProvider>
        </AuthGuard>
      </AuthProvider>
    </QueryProvider>
  )
}