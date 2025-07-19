import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

// Types for search suggestions
interface SearchSuggestion {
  type: string
  value: string
  label: string
  metadata?: Record<string, any>
}

interface SuggestionResponse {
  suggestions: SearchSuggestion[]
  loading: boolean
}

// Validate and extract user from JWT
async function validateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    throw new Error('Missing token')
  }

  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.sub) {
      throw new Error('Invalid token')
    }
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    await validateRequest(request)

    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('q') || ''
    const maxResults = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || '5')))

    // Return empty suggestions for very short queries
    if (query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        loading: false
      })
    }

    // Use the optimized search suggestions function with fallback
    let suggestions, error
    
    // Try optimized function first
    const optimizedResult = await supabase
      .rpc('get_toko_search_suggestions', {
        search_term: query,
        max_results: maxResults
      })
    
    if (optimizedResult.error) {
      console.log('Optimized suggestions not available, trying simple function...')
      // Fallback to simple function
      const simpleResult = await supabase
        .rpc('get_toko_search_suggestions_simple', {
          search_term: query,
          max_results: maxResults
        })
      
      suggestions = simpleResult.data
      error = simpleResult.error
    } else {
      suggestions = optimizedResult.data
      error = optimizedResult.error
    }

    if (error) {
      console.error('Search suggestions error:', error)
      // Fallback to basic suggestions
      return await getFallbackSuggestions(supabase, query, maxResults)
    }

    // Transform suggestions to match expected format
    const transformedSuggestions: SearchSuggestion[] = (suggestions || []).map((row: any) => ({
      type: row.suggestion_type,
      value: row.suggestion_value,
      label: row.suggestion_label,
      metadata: row.metadata || {}
    }))

    return NextResponse.json({
      suggestions: transformedSuggestions,
      loading: false
    })

  } catch (error) {
    console.error('Search suggestions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Fallback function using regular queries
async function getFallbackSuggestions(supabase: any, query: string, maxResults: number) {
  try {
    const suggestions: SearchSuggestion[] = []

    // Get toko name suggestions
    const { data: tokoSuggestions } = await supabase
      .from('toko')
      .select('id_toko, nama_toko, kecamatan, kabupaten')
      .ilike('nama_toko', `%${query}%`)
      .limit(maxResults)
      .order('nama_toko')

    if (tokoSuggestions) {
      suggestions.push(...tokoSuggestions.map((toko: any) => ({
        type: 'toko',
        value: toko.nama_toko,
        label: toko.nama_toko,
        metadata: {
          id_toko: toko.id_toko,
          kecamatan: toko.kecamatan,
          kabupaten: toko.kabupaten
        }
      })))
    }

    // Get kabupaten suggestions
    const { data: kabupatenSuggestions } = await supabase
      .from('toko')
      .select('kabupaten')
      .ilike('kabupaten', `%${query}%`)
      .not('kabupaten', 'is', null)
      .limit(maxResults)
      .order('kabupaten')

    if (kabupatenSuggestions) {
      const uniqueKabupaten = [...new Set(kabupatenSuggestions.map((k: any) => k.kabupaten))]
      suggestions.push(...uniqueKabupaten.slice(0, maxResults).map((kabupaten: unknown) => ({
        type: 'kabupaten',
        value: kabupaten as string,
        label: kabupaten as string,
        metadata: {}
      })))
    }

    // Get kecamatan suggestions
    const { data: kecamatanSuggestions } = await supabase
      .from('toko')
      .select('kecamatan, kabupaten')
      .ilike('kecamatan', `%${query}%`)
      .not('kecamatan', 'is', null)
      .limit(maxResults)
      .order('kecamatan')

    if (kecamatanSuggestions) {
      suggestions.push(...kecamatanSuggestions.slice(0, maxResults).map((item: any) => ({
        type: 'kecamatan',
        value: item.kecamatan,
        label: `${item.kecamatan}, ${item.kabupaten}`,
        metadata: {
          kabupaten: item.kabupaten
        }
      })))
    }

    // Get sales suggestions
    const { data: salesSuggestions } = await supabase
      .from('sales')
      .select('id_sales, nama_sales')
      .ilike('nama_sales', `%${query}%`)
      .limit(maxResults)
      .order('nama_sales')

    if (salesSuggestions) {
      suggestions.push(...salesSuggestions.map((sales: any) => ({
        type: 'sales',
        value: sales.nama_sales,
        label: sales.nama_sales,
        metadata: {
          id_sales: sales.id_sales
        }
      })))
    }

    // Limit total suggestions and remove duplicates
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, array) => 
        array.findIndex(s => s.value === suggestion.value && s.type === suggestion.type) === index
      )
      .slice(0, maxResults * 2) // Allow more total suggestions across types

    return NextResponse.json({
      suggestions: uniqueSuggestions,
      loading: false
    })

  } catch (error) {
    console.error('Fallback suggestions error:', error)
    return NextResponse.json({
      suggestions: [],
      loading: false
    })
  }
}