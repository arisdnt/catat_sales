import { NextRequest, NextResponse } from 'next/server';
import { searchProduk, countProduk, createProduk, getProdukStats } from '@/lib/queries/produk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getProdukStats();
      return NextResponse.json(stats);
    }

    const search = searchParams.get('search') || '';
    const status = (searchParams.get('status') as 'aktif' | 'non-aktif' | 'semua') || 'semua';
    const priority = (searchParams.get('priority') as 'priority' | 'non-priority' | 'semua') || 'semua';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const [products, totalCount] = await Promise.all([
      searchProduk({ search, status, priority, limit, offset }),
      countProduk({ search, status, priority })
    ]);

    return NextResponse.json({
      data: products,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/produk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { nama_produk, harga_satuan, is_priority, priority_order } = body;

    if (!nama_produk || typeof nama_produk !== 'string' || nama_produk.trim() === '') {
      return NextResponse.json(
        { error: 'Nama produk harus diisi' },
        { status: 400 }
      );
    }

    if (!harga_satuan || typeof harga_satuan !== 'number' || harga_satuan <= 0) {
      return NextResponse.json(
        { error: 'Harga satuan harus berupa angka positif' },
        { status: 400 }
      );
    }

    const newProduct = await createProduk({
      nama_produk: nama_produk.trim(),
      harga_satuan,
      is_priority: Boolean(is_priority),
      priority_order: Number(priority_order) || 0
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/produk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}