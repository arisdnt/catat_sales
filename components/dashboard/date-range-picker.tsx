'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock } from 'lucide-react'
import { getCurrentDateIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onDateRangeChange: (startDate: string, endDate: string) => void
}

export function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [tempStartDate, setTempStartDate] = useState(startDate)
  const [tempEndDate, setTempEndDate] = useState(endDate)

  const applyDateRange = () => {
    onDateRangeChange(tempStartDate, tempEndDate)
  }

  const setQuickRange = (days: number) => {
    // Get current date in Indonesia timezone
    const today = getCurrentDateIndonesia()
    const endDate = new Date(today)
    const startDate = new Date(today)
    startDate.setDate(endDate.getDate() - days + 1)
    
    // Format dates using Indonesia timezone
    const endDateStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: INDONESIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(endDate)
    
    const startDateStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: INDONESIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(startDate)
    
    setTempStartDate(startDateStr)
    setTempEndDate(endDateStr)
    onDateRangeChange(startDateStr, endDateStr)
  }

  const setCurrentMonth = () => {
    // Get current date in Indonesia timezone
    const today = new Date(getCurrentDateIndonesia())
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    // Format dates using Indonesia timezone
    const startDateStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: INDONESIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(start)
    
    const endDateStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: INDONESIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(end)
    
    setTempStartDate(startDateStr)
    setTempEndDate(endDateStr)
    onDateRangeChange(startDateStr, endDateStr)
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Filter Periode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Range Buttons and Date Inputs in one row */}
        <div className="flex flex-wrap items-end gap-2">
          {/* Quick Range Buttons */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(1)}
              className="text-xs h-8 px-2"
            >
              Hari Ini
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(7)}
              className="text-xs h-8 px-2"
            >
              7 Hari
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(30)}
              className="text-xs h-8 px-2"
            >
              30 Hari
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={setCurrentMonth}
              className="text-xs h-8 px-2"
            >
              Bulan Ini
            </Button>
          </div>

          {/* Custom Date Range - Compact */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1">
              <Label htmlFor="startDate" className="text-xs text-gray-600 whitespace-nowrap">
                Dari:
              </Label>
              <Input
                id="startDate"
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-32 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label htmlFor="endDate" className="text-xs text-gray-600 whitespace-nowrap">
                Sampai:
              </Label>
              <Input
                id="endDate"
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-32 h-8 text-xs"
              />
            </div>
            <Button 
              onClick={applyDateRange}
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={!tempStartDate || !tempEndDate}
            >
              <Clock className="h-3 w-3 mr-1" />
              Apply
            </Button>
          </div>
        </div>

        {/* Current Period Display - Compact */}
        <div className="text-xs text-muted-foreground bg-gray-50 px-3 py-2 rounded">
          <span className="font-medium">Periode: </span>
          <span>{new Date(startDate).toLocaleDateString('id-ID', { 
            timeZone: INDONESIA_TIMEZONE,
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })} - {new Date(endDate).toLocaleDateString('id-ID', { 
            timeZone: INDONESIA_TIMEZONE,
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}</span>
        </div>
      </CardContent>
    </Card>
  )
}