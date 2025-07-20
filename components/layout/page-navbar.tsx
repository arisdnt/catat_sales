'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PageNavbarProps {
  title: string
  subtitle?: string
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'outline'
  }
  actions?: ReactNode
  className?: string
  variant?: 'solid' | 'transparent'
}

export function PageNavbar({ 
  title, 
  subtitle, 
  badge, 
  actions, 
  className,
  variant = 'solid'
}: PageNavbarProps) {
  return (
    <div className={cn(
      "sticky top-0 z-50 border-b backdrop-blur-sm transition-all duration-300",
      variant === 'solid' 
        ? "bg-white/95 border-gray-200 shadow-sm" 
        : "bg-transparent border-transparent hover:bg-white/80 hover:border-gray-200 hover:shadow-sm",
      className
    )}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-8 py-4">
        {/* Title Section */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {badge && (
                <Badge 
                  variant={badge.variant || 'default'}
                  className="px-2 py-1 text-xs"
                >
                  {badge.text}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions Section */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}