import { NextResponse } from 'next/server';
import { getFilterOptions } from '@/lib/queries/produk';

export async function GET() {
  try {
    const options = await getFilterOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.error('Error in GET /api/produk/filter-options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}