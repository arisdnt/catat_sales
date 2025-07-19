import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Types for filter options
interface FilterOption {
  label: string
  value: string
  count?: number
  description?: string
}

interface FilterOptionsResponse {
  status: FilterOption[]
  sales: FilterOption[]
  kabupaten: FilterOption[]
  kecamatan: FilterOption[]
  summary: {
    total_stores: number
    active_stores: number
    inactive_stores: number
    unique_kabupaten: number
    unique_kecamatan: number
    unique_sales: number
  }
}

// Validate Supabase session
async function validateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    throw new Error('Missing token')
  }

  // Create Supabase client and verify the token
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }
  
  return user
}

export async function GET(request: NextRequest) {
  console.log('=== FILTER OPTIONS API CALLED ===')
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    // Validate authentication
    try {
      const user = await validateRequest(request)
      console.log('Auth validation passed for user:', user.id)
    } catch (authError) {
      console.error('Auth validation failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized', details: authError instanceof Error ? authError.message : 'Authentication failed' },
        { status: 401 }
      )
    }

    const supabase = createClient()

    // Use the optimized filter options function with fallback
    let filterOptions, error
    
    console.log('Trying optimized RPC function: get_toko_filter_options')
    // Try optimized function first
    const optimizedResult = await supabase
      .rpc('get_toko_filter_options')
    
    console.log('Optimized RPC result:', { data: optimizedResult.data, error: optimizedResult.error })
    
    if (optimizedResult.error) {
      console.log('Optimized filter options not available, trying simple function...')
      // Fallback to simple function
      const simpleResult = await supabase
        .rpc('get_toko_filter_options_simple')
      
      console.log('Simple RPC result:', { data: simpleResult.data, error: simpleResult.error })
      
      filterOptions = simpleResult.data
      error = simpleResult.error
    } else {
      filterOptions = optimizedResult.data
      error = optimizedResult.error
    }

    if (error) {
      console.error('Filter options error:', error)
      console.log('Falling back to regular queries...')
      // Fallback to regular queries
      return await getFallbackFilterOptions(supabase)
    }

    // Transform and group filter options by type
    const groupedOptions: Partial<FilterOptionsResponse> = {
      status: [],
      sales: [],
      kabupaten: [],
      kecamatan: []
    }

    if (filterOptions) {
      filterOptions.forEach((option: any) => {
        const filterOption: FilterOption = {
          label: option.filter_label,
          value: option.filter_value,
          count: parseInt(option.filter_count || '0'),
          description: option.metadata?.description
        }

        switch (option.filter_type) {
          case 'status':
            groupedOptions.status!.push(filterOption)
            break
          case 'sales':
            groupedOptions.sales!.push(filterOption)
            break
          case 'kabupaten':
            groupedOptions.kabupaten!.push(filterOption)
            break
          case 'kecamatan':
            groupedOptions.kecamatan!.push(filterOption)
            break
        }
      })
    }

    // Sort options
    groupedOptions.status!.sort((a, b) => a.label.localeCompare(b.label))
    groupedOptions.sales!.sort((a, b) => a.label.localeCompare(b.label))
    groupedOptions.kabupaten!.sort((a, b) => a.label.localeCompare(b.label))
    groupedOptions.kecamatan!.sort((a, b) => a.label.localeCompare(b.label))

    // Calculate summary statistics
    const summary = {
      total_stores: groupedOptions.status!.reduce((sum, s) => sum + (s.count || 0), 0),
      active_stores: groupedOptions.status!.find(s => s.value === 'true')?.count || 0,
      inactive_stores: groupedOptions.status!.find(s => s.value === 'false')?.count || 0,
      unique_kabupaten: groupedOptions.kabupaten!.length,
      unique_kecamatan: groupedOptions.kecamatan!.length,
      unique_sales: groupedOptions.sales!.length
    }

    const response: FilterOptionsResponse = {
      status: groupedOptions.status!,
      sales: groupedOptions.sales!,
      kabupaten: groupedOptions.kabupaten!,
      kecamatan: groupedOptions.kecamatan!,
      summary
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Filter options API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Fallback function using regular queries
async function getFallbackFilterOptions(supabase: any) {
  console.log('=== USING FALLBACK FILTER OPTIONS ===')
  try {
    const filterOptions: Partial<FilterOptionsResponse> = {
      status: [],
      sales: [],
      kabupaten: [],
      kecamatan: []
    }

    // Get status options
    console.log('Fetching status data from toko table...')
    const { data: statusData, error: statusError } = await supabase
      .from('toko')
      .select('status_toko')
    
    console.log('Status data result:', { count: statusData?.length, error: statusError })

    if (statusData) {
      const statusCounts = statusData.reduce((acc: any, item: any) => {
        const status = item.status_toko ? 'true' : 'false'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})

      filterOptions.status = [
        {
          label: 'Aktif',
          value: 'true',
          count: statusCounts.true || 0
        },
        {
          label: 'Non-aktif',
          value: 'false',
          count: statusCounts.false || 0
        }
      ]
    }

    // Get sales options with proper error handling
    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select('id_sales, nama_sales')
        .eq('status_aktif', true)
        .order('nama_sales')

      const { data: tokoSalesCount } = await supabase
        .from('toko')
        .select('id_sales')

      if (salesData && tokoSalesCount) {
        const salesCounts = tokoSalesCount.reduce((acc: any, item: any) => {
          acc[item.id_sales] = (acc[item.id_sales] || 0) + 1
          return acc
        }, {})

        filterOptions.sales = salesData.map((sales: any) => ({
          label: sales.nama_sales,
          value: sales.id_sales.toString(),
          count: salesCounts[sales.id_sales] || 0
        }))
      }
    } catch (salesError) {
      console.warn('Failed to get sales data:', salesError)
      filterOptions.sales = []
    }

    // Get kabupaten options
    const { data: kabupatenData } = await supabase
      .from('toko')
      .select('kabupaten')
      .not('kabupaten', 'is', null)

    if (kabupatenData) {
      const kabupatenCounts = kabupatenData.reduce((acc: any, item: any) => {
        acc[item.kabupaten] = (acc[item.kabupaten] || 0) + 1
        return acc
      }, {})

      filterOptions.kabupaten = Object.entries(kabupatenCounts)
        .map(([kabupaten, count]) => ({
          label: kabupaten,
          value: kabupaten,
          count: count as number
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }

    // Get kecamatan options
    const { data: kecamatanData } = await supabase
      .from('toko')
      .select('kecamatan, kabupaten')
      .not('kecamatan', 'is', null)

    if (kecamatanData) {
      const kecamatanCounts = kecamatanData.reduce((acc: any, item: any) => {
        const key = `${item.kecamatan}, ${item.kabupaten}`
        acc[key] = {
          kecamatan: item.kecamatan,
          kabupaten: item.kabupaten,
          count: (acc[key]?.count || 0) + 1
        }
        return acc
      }, {})

      filterOptions.kecamatan = Object.values(kecamatanCounts)
        .map((item: any) => ({
          label: `${item.kecamatan}, ${item.kabupaten}`,
          value: item.kecamatan,
          count: item.count,
          description: item.kabupaten
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }

    // Calculate summary
    const summary = {
      total_stores: filterOptions.status!.reduce((sum, s) => sum + (s.count || 0), 0),
      active_stores: filterOptions.status!.find(s => s.value === 'true')?.count || 0,
      inactive_stores: filterOptions.status!.find(s => s.value === 'false')?.count || 0,
      unique_kabupaten: filterOptions.kabupaten!.length,
      unique_kecamatan: filterOptions.kecamatan!.length,
      unique_sales: filterOptions.sales!.length
    }

    const response: FilterOptionsResponse = {
      status: filterOptions.status!,
      sales: filterOptions.sales!,
      kabupaten: filterOptions.kabupaten!,
      kecamatan: filterOptions.kecamatan!,
      summary
    }

    console.log('Fallback response summary:', {
      statusCount: response.status.length,
      salesCount: response.sales.length,
      kabupatenCount: response.kabupaten.length,
      kecamatanCount: response.kecamatan.length,
      summary: response.summary
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Fallback filter options error:', error)
    throw error
  }
}