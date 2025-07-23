import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    // Get non-priority products directly from database without RPC
    const { data: products, error } = await supabaseAdmin
      .from('produk')
      .select('*')
      .eq('is_priority', false)
      .eq('status_produk', true)
      .order('nama_produk', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform to match expected format
    const transformedProducts = products?.map(product => ({
      id_produk: product.id_produk,
      nama_produk: product.nama_produk,
      harga_satuan: product.harga_satuan,
      status_produk: product.status_produk,
      is_priority: product.is_priority,
      priority_order: product.priority_order,
      dibuat_pada: product.dibuat_pada,
      diperbarui_pada: product.diperbarui_pada,
      // Default stats for compatibility
      total_terjual: 0,
      total_kirim: 0,
      total_revenue: 0,
      sisa_stok_estimated: 0
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedProducts
    });
  } catch (error) {
    console.error('Error in GET /api/produk/non-priority:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch non-priority products',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}