import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-helpers'

export async function GET(_request: NextRequest) {
  try {
    console.log('Test produk API called')
    
    // Test basic materialized view query
    const { data: mvData, error: mvError } = await supabaseAdmin
      .from('mv_produk_with_stats')
      .select('*')
      .limit(5)
    
    console.log('Materialized view query result:', { data: mvData, error: mvError })
    
    // Test aggregates
    const { data: aggregateData, error: aggregateError } = await supabaseAdmin
      .from('mv_produk_aggregates')
      .select('*')
      .single()
    
    console.log('Aggregates query result:', { data: aggregateData, error: aggregateError })
    
    return NextResponse.json({
      success: true,
      mv_produk_with_stats: {
        data: mvData,
        error: mvError?.message
      },
      mv_produk_aggregates: {
        data: aggregateData,
        error: aggregateError?.message
      }
    })
    
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    })
  }
}