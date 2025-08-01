'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { AnalyticsKPICards } from '@/components/dashboard/analytics-kpi-cards'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { PerformanceCharts } from '@/components/dashboard/performance-charts'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'

export default function DashboardPage() {
  // Default to last 7 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6) // 7 days ago (including today)
    return date.toISOString().split('T')[0]
  })
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Analytics
            </h1>
          </div>
          <p className="text-gray-600">
            Monitoring performa penjualan dan analisis bisnis real-time
          </p>
        </div>

        <div className="space-y-6">
          {/* Date Range Filter */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />

          {/* KPI Cards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Statistik Utama
              </h2>
            </div>
            <AnalyticsKPICards startDate={startDate} endDate={endDate} />
          </div>

          {/* Performance Charts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Analisis Performa
              </h2>
            </div>
            <PerformanceCharts startDate={startDate} endDate={endDate} />
          </div>

          {/* Recent Transactions */}
          <div>
            <RecentTransactions startDate={startDate} endDate={endDate} />
          </div>
        </div>
      </div>
    </div>
  )
}