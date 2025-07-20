'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  CreditCard, 
  Banknote, 
  Store, 
  LogOut,
  Truck 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Pembayaran',
    href: '/dashboard/penagihan',
    icon: CreditCard,
  },
  {
    title: 'Pengiriman',
    href: '/dashboard/pengiriman',
    icon: Truck,
  },
  {
    title: 'Setoran',
    href: '/dashboard/setoran',
    icon: Banknote,
  },
  {
    title: 'Master Data',
    href: '/dashboard/master-data',
    icon: Store,
    submenu: [
      {
        title: 'Produk',
        href: '/dashboard/master-data/produk',
      },
      {
        title: 'Toko',
        href: '/dashboard/master-data/toko',
      },
      {
        title: 'Sales',
        href: '/dashboard/master-data/sales',
      }
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { toast } = useToast()

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

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">
          Sistem Penjualan
        </h1>
        <p className="text-sm text-gray-500">Titip Bayar</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.title}
              </Link>
              
              {item.submenu && isActive && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                        pathname === subItem.href
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  )
}