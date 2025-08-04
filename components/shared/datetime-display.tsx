'use client'

import { useState, useEffect } from 'react'
import { INDONESIA_TIMEZONE } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DateTimeDisplayProps {
  isCollapsed?: boolean
}

export function DateTimeDisplay({ isCollapsed = false }: DateTimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: INDONESIA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: INDONESIA_TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: INDONESIA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(date)
  }

  if (isCollapsed) {
    return (
      <div className="px-2 py-1 border-b border-gray-200 bg-white">
        <div className="text-left pl-2">
          <div className="text-xs text-gray-600">
            {formatShortDate(currentTime)}
          </div>
          <div className="text-xs font-mono font-semibold text-gray-900">
            {formatTime(currentTime)} WIB
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 border-b border-gray-200 bg-white">
      <div className="text-left pl-2">
        <div className="text-sm font-medium text-gray-900">
          {formatDate(currentTime)}
        </div>
        <div className="text-lg font-mono font-bold text-gray-900">
          {formatTime(currentTime)} WIB
        </div>
      </div>
    </div>
  )
}