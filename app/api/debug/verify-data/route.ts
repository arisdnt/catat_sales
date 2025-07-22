import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Starting database verification...');
    
    const results: any = {};

    // 1. SELECT * FROM produk LIMIT 10
    console.log('Fetching products...');
    const { data: produk, error: produkError } = await supabaseAdmin
      .from('produk')
      .select('*')
      .limit(10);
    
    if (produkError) {
      console.error('Error fetching produk:', produkError);
      results.produk = { error: produkError.message };
    } else {
      results.produk = { count: produk?.length || 0, data: produk };
    }

    // 2. SELECT * FROM detail_pengiriman LIMIT 10
    console.log('Fetching detail_pengiriman...');
    const { data: detailPengiriman, error: pengirimanError } = await supabaseAdmin
      .from('detail_pengiriman')
      .select('*')
      .limit(10);
    
    if (pengirimanError) {
      console.error('Error fetching detail_pengiriman:', pengirimanError);
      results.detail_pengiriman = { error: pengirimanError.message };
    } else {
      results.detail_pengiriman = { count: detailPengiriman?.length || 0, data: detailPengiriman };
    }

    // 3. SELECT * FROM detail_penagihan LIMIT 10
    console.log('Fetching detail_penagihan...');
    const { data: detailPenagihan, error: penagihanError } = await supabaseAdmin
      .from('detail_penagihan')
      .select('*')
      .limit(10);
    
    if (penagihanError) {
      console.error('Error fetching detail_penagihan:', penagihanError);
      results.detail_penagihan = { error: penagihanError.message };
    } else {
      results.detail_penagihan = { count: detailPenagihan?.length || 0, data: detailPenagihan };
    }

    // 4. Aggregated shipments by product using RPC
    console.log('Fetching aggregated shipments...');
    const { data: shipmentAgg, error: shipmentAggError } = await supabaseAdmin
      .rpc('get_shipment_aggregation');
    
    if (shipmentAggError) {
      console.error('Error with shipment aggregation RPC, trying direct query...');
      // Fallback to direct query if RPC doesn't exist
      const { data: shipmentAggDirect, error: shipmentAggDirectError } = await supabaseAdmin
        .from('detail_pengiriman')
        .select('id_produk')
        .then(async () => {
          // Use raw SQL query via RPC
          const { data, error } = await supabaseAdmin
            .rpc('execute_sql', { 
              query: 'SELECT dp.id_produk, COUNT(*) as count, SUM(dp.jumlah_kirim) as total_kirim FROM detail_pengiriman dp GROUP BY dp.id_produk ORDER BY dp.id_produk LIMIT 20' 
            });
          return { data, error };
        });
      
      if (shipmentAggDirectError) {
        results.shipment_aggregation = { error: shipmentAggDirectError.message };
      } else {
        results.shipment_aggregation = { count: shipmentAggDirect?.length || 0, data: shipmentAggDirect };
      }
    } else {
      results.shipment_aggregation = { count: shipmentAgg?.length || 0, data: shipmentAgg };
    }

    // 5. Aggregated billings by product using RPC
    console.log('Fetching aggregated billings...');
    const { data: billingAgg, error: billingAggError } = await supabaseAdmin
      .rpc('get_billing_aggregation');
    
    if (billingAggError) {
      console.error('Error with billing aggregation RPC, trying direct query...');
      // Fallback to direct query if RPC doesn't exist
      const { data: billingAggDirect, error: billingAggDirectError } = await supabaseAdmin
        .from('detail_penagihan')
        .select('id_produk')
        .then(async () => {
          // Use raw SQL query via RPC
          const { data, error } = await supabaseAdmin
            .rpc('execute_sql', { 
              query: 'SELECT dp.id_produk, COUNT(*) as count, SUM(dp.jumlah_terjual) as total_terjual, SUM(dp.jumlah_kembali) as total_kembali FROM detail_penagihan dp GROUP BY dp.id_produk ORDER BY dp.id_produk LIMIT 20' 
            });
          return { data, error };
        });
      
      if (billingAggDirectError) {
        results.billing_aggregation = { error: billingAggDirectError.message };
      } else {
        results.billing_aggregation = { count: billingAggDirect?.length || 0, data: billingAggDirect };
      }
    } else {
      results.billing_aggregation = { count: billingAgg?.length || 0, data: billingAgg };
    }

    // Additional check: Count total records in each table
    console.log('Getting total counts...');
    
    const { count: produkCount } = await supabaseAdmin
      .from('produk')
      .select('*', { count: 'exact', head: true });
    
    const { count: pengirimanCount } = await supabaseAdmin
      .from('detail_pengiriman')
      .select('*', { count: 'exact', head: true });
    
    const { count: penagihanCount } = await supabaseAdmin
      .from('detail_penagihan')
      .select('*', { count: 'exact', head: true });

    results.total_counts = {
      produk: produkCount,
      detail_pengiriman: pengirimanCount,
      detail_penagihan: penagihanCount
    };

    console.log('Database verification completed');
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Database verification failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}