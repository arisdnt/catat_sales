'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { 
  Home, 
  CreditCard, 
  Banknote, 
  Store, 
  LogOut,
  Menu,
  X,
  Truck,
  ShoppingCart,
  Users,
  Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { DateTimeDisplay } from '../shared/datetime-display'

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
        title: 'Pembayaran',
        href: '/dashboard/penagihan',
        icon: CreditCard,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      {
        title: 'Pengiriman',
        href: '/dashboard/pengiriman',
        icon: Truck,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Pengeluaran',
        href: '/dashboard/pengeluaran',
        icon: Receipt,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
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
]

export function ModernSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { toast } = useToast()
  const { isCollapsed, toggleCollapsed } = useSidebar()

  const handleLogout = async () => {
    try {
      await signOut()
      toast({
        title: 'Berhasil',
        description: 'Logout berhasil',
      })
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Gagal logout',
        variant: 'destructive',
      })
    }
  }

  // Flatten menu items for tree view
  const flatMenuItems = menuItems.reduce((acc: any[], item) => {
    acc.push({ ...item, level: 0 })
    if (item.submenu) {
      item.submenu.forEach(subItem => {
        acc.push({ ...subItem, level: 1, parent: item.title })
      })
    }
    return acc
  }, [])

  return (
    <div className={cn(
      "fixed left-0 top-0 h-screen bg-white border-r border-gray-300 transition-all duration-300 flex flex-col z-40",
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
                  Tera Cendani
                </h1>
                <p className="text-xs text-gray-500">Tim Babat Alas</p>
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

      {/* Date and Time Display */}
      <DateTimeDisplay isCollapsed={isCollapsed} />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {flatMenuItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const _isParent = item.level === 0 && !item.href

          if (item.href) {
            return (
              <Link
                key={`${item.title}-${index}`}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all group relative",
                  item.level === 1 && "ml-6",
                  isActive
                    ? item.level === 0
                      ? `${item.bgColor} ${item.iconColor} shadow-sm`
                      : `${item.bgColor} ${item.color} shadow-sm`
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {/* Tree lines for submenu items */}
                 {item.level === 1 && !isCollapsed && (
                   <>
                     {/* Vertical line connecting to parent */}
                     <div className="absolute left-6 top-0 w-px h-4 bg-gray-300 -translate-x-3" />
                     {/* Horizontal line to item */}
                     <div className="absolute left-6 top-4 w-3 h-px bg-gray-300 -translate-x-3" />
                     {/* Vertical line continuing down if not last item */}
                     {index < flatMenuItems.length - 1 && flatMenuItems[index + 1]?.level === 1 && flatMenuItems[index + 1]?.parent === item.parent && (
                       <div className="absolute left-6 top-4 w-px h-6 bg-gray-300 -translate-x-3" />
                     )}
                   </>
                 )}
                
                <div className={cn(
                  "flex items-center justify-center rounded-lg mr-3 transition-all",
                  item.level === 0 ? "w-8 h-8" : "w-6 h-6",
                  isActive 
                    ? item.level === 0
                      ? `${item.color} text-white shadow-sm`
                      : `${item.bgColor} ${item.color}`
                    : 'text-gray-400 group-hover:text-gray-600'
                )}>
                  <Icon className={cn(item.level === 0 ? "w-4 h-4" : "w-3 h-3")} />
                </div>
                {!isCollapsed && (
                  <span className="flex-1">{item.title}</span>
                )}
              </Link>
            )
          } else {
            return (
              <div
                key={`${item.title}-${index}`}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  'text-gray-600'
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all",
                  'text-gray-400'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <span className="flex-1">{item.title}</span>
                )}
              </div>
            )
          }
        })}
      </nav>

      {/* Footer */}
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
              </div>
            </div>
          )}

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