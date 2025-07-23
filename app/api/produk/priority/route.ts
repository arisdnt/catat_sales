import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    // Get priority products directly from database without RPC
    const { data: products, error } = await supabaseAdmin
      .from('produk')
      .select('*')
      .eq('is_priority', true)
      .eq('status_produk', true)
      .order('priority_order', { ascending: true })
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
    console.error('Error in GET /api/produk/priority:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch priority products',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_produk, is_priority, priority_order } = body;

    if (!id_produk || typeof id_produk !== 'number') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid product ID' 
        },
        { status: 400 }
      );
    }

    // This would need a separate updateProdukPriority function in queries/produk.ts
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Priority update functionality not yet implemented'
    });
  } catch (error) {
    console.error('Error in PUT /api/produk/priority:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update product priority',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}