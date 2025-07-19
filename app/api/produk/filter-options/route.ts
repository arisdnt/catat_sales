import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Produk filter options API called')
    
    try {
      // Get all filter options and summary statistics
      const [
        statusResult,
        priorityResult,
        priceRangeResult,
        summaryResult
      ] = await Promise.all([
        // Status options
        supabaseAdmin
          .from('produk')
          .select('status_produk')
          .order('status_produk'),
          
        // Priority options  
        supabaseAdmin
          .from('produk')
          .select('is_priority, priority_order')
          .order('is_priority', { ascending: false }),
          
        // Price range data
        supabaseAdmin
          .from('produk')
          .select('harga_satuan')
          .eq('status_produk', true)
          .order('harga_satuan'),
          
        // Summary statistics using materialized view for better performance
        supabaseAdmin
          .from('mv_produk_aggregates')
          .select('*')
          .single()
      ])
      
      // Process status options
      const statusCounts = new Map()
      statusResult.data?.forEach((item: any) => {
        const status = item.status_produk
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
      })
      
      const statusOptions = [
        { 
          value: 'true', 
          label: 'Aktif', 
          count: statusCounts.get(true) || 0 
        },
        { 
          value: 'false', 
          label: 'Non-aktif', 
          count: statusCounts.get(false) || 0 
        }
      ]
      
      // Process priority options
      const priorityCounts = new Map()
      priorityResult.data?.forEach((item: any) => {
        const priority = item.is_priority
        priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1)
      })
      
      const priorityOptions = [
        { 
          value: 'true', 
          label: 'Prioritas', 
          count: priorityCounts.get(true) || 0 
        },
        { 
          value: 'false', 
          label: 'Standar', 
          count: priorityCounts.get(false) || 0 
        }
      ]
      
      // Process price range
      const prices = priceRangeResult.data?.map((item: any) => item.harga_satuan) || []
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
      const avgPrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
      
      // Create price range suggestions
      const priceRanges = []
      if (maxPrice > 0) {
        const ranges = [
          { min: 0, max: 10000, label: 'Di bawah Rp 10.000' },
          { min: 10000, max: 50000, label: 'Rp 10.000 - Rp 50.000' },
          { min: 50000, max: 100000, label: 'Rp 50.000 - Rp 100.000' },
          { min: 100000, max: 500000, label: 'Rp 100.000 - Rp 500.000' },
          { min: 500000, max: Number.MAX_SAFE_INTEGER, label: 'Di atas Rp 500.000' }
        ]
        
        ranges.forEach(range => {
          const count = prices.filter(price => price >= range.min && price < range.max).length
          if (count > 0) {
            priceRanges.push({
              value: `${range.min}-${range.max === Number.MAX_SAFE_INTEGER ? '' : range.max}`,
              label: range.label,
              count
            })
          }
        })
      }
      
      // Use aggregated statistics from materialized view
      const aggregateStats = summaryResult.data || {
        total_products: 0,
        active_products: 0,
        inactive_products: 0,
        priority_products: 0,
        standard_products: 0,
        today_products: 0,
        this_week_products: 0,
        min_price: 0,
        max_price: 0,
        avg_price: 0,
        total_shipped: 0,
        total_sold: 0,
        total_returned: 0,
        total_paid: 0,
        total_stock: 0,
        total_value: 0
      }
      
      // Use aggregated statistics directly from materialized view
      
      const summary = {
        total_products: aggregateStats.total_products || 0,
        active_products: aggregateStats.active_products || 0,
        inactive_products: aggregateStats.inactive_products || 0,
        priority_products: aggregateStats.priority_products || 0,
        standard_products: aggregateStats.standard_products || 0,
        today_products: aggregateStats.today_products || 0,
        this_week_products: aggregateStats.this_week_products || 0,
        min_price: minPrice,
        max_price: maxPrice,
        avg_price: Math.round(avgPrice),
        total_shipped: aggregateStats.total_shipped || 0,
        total_sold: aggregateStats.total_sold || 0,
        total_returned: aggregateStats.total_returned || 0,
        total_paid: aggregateStats.total_paid || 0,
        total_stock: aggregateStats.total_stock || 0,
        total_value: aggregateStats.total_value || 0
      }
      
      const response = {
        status_produk: statusOptions,
        is_priority: priorityOptions,
        price_ranges: priceRanges,
        price_stats: {
          min: minPrice,
          max: maxPrice,
          avg: Math.round(avgPrice)
        },
        summary
      }
      
      console.log('Filter options response:', {
        statusCount: statusOptions.length,
        priorityCount: priorityOptions.length,
        priceRangesCount: priceRanges.length,
        summary
      })
      
      return createSuccessResponse(response)
      
    } catch (error) {
      console.error('Filter options error:', error)
      
      // Return fallback data structure
      return createSuccessResponse({
        status_produk: [
          { value: 'true', label: 'Aktif', count: 0 },
          { value: 'false', label: 'Non-aktif', count: 0 }
        ],
        is_priority: [
          { value: 'true', label: 'Prioritas', count: 0 },
          { value: 'false', label: 'Standar', count: 0 }
        ],
        price_ranges: [],
        price_stats: {
          min: 0,
          max: 0,
          avg: 0
        },
        summary: {
          total_products: 0,
          active_products: 0,
          inactive_products: 0,
          priority_products: 0,
          standard_products: 0,
          today_products: 0,
          this_week_products: 0,
          min_price: 0,
          max_price: 0,
          avg_price: 0,
          total_shipped: 0,
          total_sold: 0,
          total_returned: 0,
          total_paid: 0,
          total_stock: 0,
          total_value: 0
        }
      })
    }
  })
}