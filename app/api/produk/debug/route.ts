import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(_request: NextRequest) {
  try {
    console.log('Debug produk API called')
    
    try {
      // Test basic produk query
      const { data: basicData, error: basicError } = await supabaseAdmin
        .from('produk')
        .select('*')
        .limit(5)
      
      console.log('Basic produk query result:', { data: basicData, error: basicError })
      
      // Test count query
      const { count, error: countError } = await supabaseAdmin
        .from('produk')
        .select('*', { count: 'exact', head: true })
      
      console.log('Count query result:', { count, error: countError })
      
      // Test with filter
      const { data: activeData, error: activeError } = await supabaseAdmin
        .from('produk')
        .select('*')
        .eq('status_produk', true)
        .limit(5)
      
      console.log('Active produk query result:', { data: activeData, error: activeError })
      
      // Test detail tables
      const { data: shipmentData, error: shipmentError } = await supabaseAdmin
        .from('detail_pengiriman')
        .select('*')
        .limit(5)
      
      console.log('Detail pengiriman query result:', { data: shipmentData, error: shipmentError })
      
      const { data: billingData, error: billingError } = await supabaseAdmin
        .from('detail_penagihan')
        .select('*')
        .limit(5)
      
      console.log('Detail penagihan query result:', { data: billingData, error: billingError })
      
      return createSuccessResponse({
        basic_produk: {
          data: basicData,
          error: basicError?.message
        },
        count_check: {
          count,
          error: countError?.message
        },
        active_produk: {
          data: activeData,
          error: activeError?.message
        },
        detail_pengiriman: {
          data: shipmentData,
          error: shipmentError?.message
        },
        detail_penagihan: {
          data: billingData,
          error: billingError?.message
        }
      })
      
    } catch (error) {
      console.error('Debug API error:', error)
      return createSuccessResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Debug API failed'
      })
    }
  } catch (outerError) {
    console.error('Outer debug API error:', outerError)
    return NextResponse.json({
      error: outerError instanceof Error ? outerError.message : 'Unknown outer error',
      success: false
    })
  }
}