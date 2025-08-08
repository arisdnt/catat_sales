import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getCurrentDateIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date_range = searchParams.get('date_range') || 'today'
    
    const supabase = createClient()
    const today = new Date() // Use standard Date object for calculations
    
    // Build query for pengeluaran_operasional
    let query = supabase
      .from('pengeluaran_operasional')
      .select('jumlah')
    
    // Apply date range filter
    switch (date_range) {
      case 'today':
        const todayStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(today)
        query = query
          .gte('tanggal_pengeluaran', `${todayStr}T00:00:00.000Z`)
          .lt('tanggal_pengeluaran', `${todayStr}T23:59:59.999Z`)
        break
      case 'week':
        // From Monday of current week to Sunday of current week (Indonesia timezone)
        const currentDay = today.getDay()
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // Sunday is 0, Monday is 1
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        
        const mondayStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(monday)
        const sundayStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(sunday)
        
        query = query
          .gte('tanggal_pengeluaran', `${mondayStr}T00:00:00.000Z`)
          .lte('tanggal_pengeluaran', `${sundayStr}T23:59:59.999Z`)
        break
      case 'month':
      case 'current_month':
        // From 1st of current month to end of current month (exclusive)
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()
        const startDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
        const endDateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`
        query = query
          .gte('tanggal_pengeluaran', `${startDateStr}T00:00:00.000Z`)
          .lt('tanggal_pengeluaran', `${endDateStr}T00:00:00.000Z`)
        break
      case 'last_month':
        // From 1st of last month to last day of last month (Indonesia timezone)
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
        const lastMonthStartStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(lastMonthStart)
        const lastMonthEndStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(lastMonthEnd)
        query = query
          .gte('tanggal_pengeluaran', `${lastMonthStartStr}T00:00:00.000Z`)
          .lte('tanggal_pengeluaran', `${lastMonthEndStr}T23:59:59.999Z`)
        break
      default:
        // Default to today if invalid date_range
        const defaultTodayStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(today)
        query = query
          .gte('tanggal_pengeluaran', `${defaultTodayStr}T00:00:00.000Z`)
          .lt('tanggal_pengeluaran', `${defaultTodayStr}T23:59:59.999Z`)
        break
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching pengeluaran stats:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch pengeluaran stats',
          details: error.message 
        }, 
        { status: 500 }
      )
    }
    
    // Calculate total pengeluaran
    const totalPengeluaran = data?.reduce((sum, item) => sum + Number(item.jumlah), 0) || 0
    
    return NextResponse.json({
      success: true,
      data: {
        total_pengeluaran: totalPengeluaran,
        date_range: date_range
      }
    })
  } catch (error: any) {
    console.error('Unexpected error in pengeluaran stats API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }, 
      { status: 500 }
    )
  }
}