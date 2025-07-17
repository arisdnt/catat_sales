'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { 
  Home, 
  Package, 
  CreditCard, 
  Banknote, 
  FileText, 
  Users, 
  Store, 
  ShoppingCart,
  LogOut,
  Menu,
  X,
  ChevronDown,
  BarChart3,
  Settings,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    color: 'bg-gradient-to-r from-blue-500 to-blue-600',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Transaksi',
    icon: CreditCard,
    color: 'bg-gradient-to-r from-purple-500 to-purple-600',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    submenu: [
      {
        title: 'Pengiriman',
        href: '/dashboard/pengiriman',
        icon: Package,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      {
        title: 'Penagihan',
        href: '/dashboard/penagihan',
        icon: CreditCard,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      {
        title: 'Setoran',
        href: '/dashboard/setoran',
        icon: Banknote,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    ]
  },
  {
    title: 'Master Data',
    icon: Store,
    color: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    submenu: [
      {
        title: 'Produk',
        href: '/dashboard/master-data/produk',
        icon: ShoppingCart,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50'
      },
      {
        title: 'Toko',
        href: '/dashboard/master-data/toko',
        icon: Store,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      },
      {
        title: 'Sales',
        href: '/dashboard/master-data/sales',
        icon: Users,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50'
      }
    ]
  },
  {
    title: 'Laporan',
    icon: BarChart3,
    color: 'bg-gradient-to-r from-orange-500 to-orange-600',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    submenu: [
      {
        title: 'Rekonsiliasi',
        href: '/dashboard/laporan/rekonsiliasi',
        icon: FileText,
        color: 'text-violet-600',
        bgColor: 'bg-violet-50'
      }
    ]
  }
]

export function ModernSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { toast } = useToast()
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const handleLogout = async () => {
    try {
      await signOut()
      toast({
        title: 'Berhasil',
        description: 'Logout berhasil',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal logout',
        variant: 'destructive',
      })
    }
  }

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  return (
    <div className={cn(
      "fixed left-0 top-0 h-screen bg-white border-r border-gray-100 transition-all duration-300 flex flex-col shadow-lg z-40",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Sales System
                </h1>
                <p className="text-xs text-gray-500">Titip Bayar</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className="text-gray-400 hover:text-gray-600"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
                          (item.submenu && item.submenu.some(sub => pathname.startsWith(sub.href)))
          const isExpanded = expandedItems.includes(item.title)

          return (
            <div key={item.title}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all group",
                    isActive
                      ? `${item.bgColor} ${item.iconColor} shadow-sm`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all",
                    isActive 
                      ? `${item.color} text-white shadow-sm` 
                      : 'text-gray-400 group-hover:text-gray-600'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1">{item.title}</span>
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => toggleExpanded(item.title)}
                  className={cn(
                    "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all group",
                    isActive
                      ? `${item.bgColor} ${item.iconColor} shadow-sm`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all",
                    isActive 
                      ? `${item.color} text-white shadow-sm` 
                      : 'text-gray-400 group-hover:text-gray-600'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        isExpanded ? "rotate-180" : ""
                      )} />
                    </>
                  )}
                </button>
              )}

              {item.submenu && isExpanded && !isCollapsed && (
                <div className="ml-6 mt-2 space-y-1">
                  {item.submenu.map((subItem) => {
                    const SubIcon = subItem.icon
                    const isSubActive = pathname === subItem.href

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm rounded-lg transition-all group",
                          isSubActive
                            ? `${subItem.bgColor} ${subItem.color} font-medium shadow-sm`
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-md mr-3 transition-all",
                          isSubActive 
                            ? `${subItem.bgColor} ${subItem.color}` 
                            : 'text-gray-400 group-hover:text-gray-600'
                        )}>
                          <SubIcon className="w-3 h-3" />
                        </div>
                        {subItem.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">System Administrator</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  )
}