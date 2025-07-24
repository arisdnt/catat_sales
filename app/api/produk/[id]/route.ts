import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateProduk, deleteProduk } from '@/lib/queries/produk';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Direct Supabase query instead of using apiClient
    const { data: product, error } = await supabase
      .from('produk')
      .select('*')
      .eq('id_produk', id)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in GET /api/produk/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nama_produk, harga_satuan, status_produk, is_priority, priority_order } = body;

    // Validasi
    if (nama_produk !== undefined && (typeof nama_produk !== 'string' || nama_produk.trim() === '')) {
      return NextResponse.json(
        { error: 'Nama produk harus diisi dengan benar' },
        { status: 400 }
      );
    }

    if (harga_satuan !== undefined && (typeof harga_satuan !== 'number' || harga_satuan <= 0)) {
      return NextResponse.json(
        { error: 'Harga satuan harus berupa angka positif' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (nama_produk !== undefined) updateData.nama_produk = nama_produk.trim();
    if (harga_satuan !== undefined) updateData.harga_satuan = harga_satuan;
    if (status_produk !== undefined) updateData.status_produk = Boolean(status_produk);
    if (is_priority !== undefined) updateData.is_priority = Boolean(is_priority);
    if (priority_order !== undefined) updateData.priority_order = Number(priority_order);

    const updatedProduct = await updateProduk(id, updateData);
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error in PUT /api/produk/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const deletedProduct = await deleteProduk(id);
    
    if (!deletedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (error) {
    console.error('Error in DELETE /api/produk/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}