import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const withStats = searchParams.get('withStats') === 'true'

    if (id) {
      if (withStats) {
        // Get specific product with detailed stats using direct queries
        const { data: productData, error: productError } = await supabase
          .from('produk')
          .select('*')
          .eq('id_produk', id)
          .single()

        if (productError) {
          console.error('Error fetching product data:', productError)
          return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
        }

        // Get shipment stats
        const { data: shipmentStats } = await supabase
          .from('detail_pengiriman')
          .select('jumlah_kirim, id_pengiriman')
          .eq('id_produk', id)

        // Get billing stats
        const { data: billingStats } = await supabase
          .from('detail_penagihan')
          .select('jumlah_terjual, jumlah_kembali, id_penagihan')
          .eq('id_produk', id)

        // Calculate aggregated statistics
        const totalTerkirim = shipmentStats?.reduce((sum, item) => sum + item.jumlah_kirim, 0) || 0
        const totalTerjual = billingStats?.reduce((sum, item) => sum + item.jumlah_terjual, 0) || 0
        const totalKembali = billingStats?.reduce((sum, item) => sum + item.jumlah_kembali, 0) || 0
        const totalTerbayar = totalTerjual - totalKembali
        const sisaStok = totalTerkirim - totalTerjual
        const shipmentCount = new Set(shipmentStats?.map(s => s.id_pengiriman) || []).size
        const billingCount = new Set(billingStats?.map(b => b.id_penagihan) || []).size
        const totalRevenue = totalTerbayar * productData.harga_satuan

        const result = {
          ...productData,
          total_terkirim: totalTerkirim,
          total_terjual: totalTerjual,
          total_kembali: totalKembali,
          total_terbayar: totalTerbayar,
          sisa_stok: sisaStok,
          shipment_count: shipmentCount,
          billing_count: billingCount,
          total_revenue: totalRevenue
        }

        return NextResponse.json(result)
      } else {
        // Get basic product aggregates
        const { data: products, error: productsError } = await supabase
          .from('produk')
          .select('*')
          .eq('id_produk', id)
          .single()

        if (productsError) {
          console.error('Error fetching product data:', productsError)
          return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
        }

        return NextResponse.json(products)
      }
    } else {
      if (withStats) {
        // Get all products with stats - this would be expensive, so we'll get basic data
        // and calculate stats on-demand for performance
        const { data, error } = await supabase
          .from('produk')
          .select('*')
          .order('priority_order, nama_produk')

        if (error) {
          console.error('Error fetching products:', error)
          return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
        }

        return NextResponse.json(data)
      } else {
        // Get basic product aggregates
        const { data: products, error: productsError } = await supabase
          .from('produk')
          .select('*', { count: 'exact' })

        if (productsError) {
          console.error('Error fetching products:', productsError)
          return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
        }

        // Calculate basic aggregates
        const totalProducts = products?.length || 0
        const activeProducts = products?.filter(p => p.status_produk)?.length || 0
        const inactiveProducts = totalProducts - activeProducts
        const priorityProducts = products?.filter(p => p.is_priority)?.length || 0
        const nonPriorityProducts = totalProducts - priorityProducts
        const avgPrice = products?.length > 0 ? 
          products.reduce((sum, p) => sum + p.harga_satuan, 0) / products.length : 0
        const minPrice = products?.length > 0 ? 
          Math.min(...products.map(p => p.harga_satuan)) : 0
        const maxPrice = products?.length > 0 ? 
          Math.max(...products.map(p => p.harga_satuan)) : 0

        const aggregates = {
          id: 1,
          total_products: totalProducts,
          active_products: activeProducts,
          inactive_products: inactiveProducts,
          priority_products: priorityProducts,
          non_priority_products: nonPriorityProducts,
          avg_price: avgPrice,
          min_price: minPrice,
          max_price: maxPrice
        }

        return NextResponse.json(aggregates)
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}