--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.0

-- Started on 2025-07-25 14:24:52

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 13 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4069 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 419 (class 1255 OID 17985)
-- Name: count_sales_optimized(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.count_sales_optimized(search_term text DEFAULT ''::text, filter_status text DEFAULT NULL::text, filter_telepon_exists text DEFAULT NULL::text, filter_date_from text DEFAULT NULL::text, filter_date_to text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    result_count integer;
    query_text text;
    where_conditions text[] DEFAULT '{}';
BEGIN
    -- Build WHERE conditions (same logic as search function)
    IF search_term IS NOT NULL AND search_term != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('(mv.nama_sales ILIKE %L OR mv.nomor_telepon ILIKE %L)', 
                   '%' || search_term || '%', '%' || search_term || '%')
        ];
    END IF;
    
    IF filter_status IS NOT NULL AND filter_status != '' AND filter_status != 'all' THEN
        where_conditions := where_conditions || ARRAY[
            format('mv.status_aktif = %L', filter_status::boolean)
        ];
    END IF;
    
    IF filter_telepon_exists IS NOT NULL AND filter_telepon_exists != '' AND filter_telepon_exists != 'all' THEN
        IF filter_telepon_exists = 'true' THEN
            where_conditions := where_conditions || ARRAY['mv.nomor_telepon IS NOT NULL'];
        ELSE
            where_conditions := where_conditions || ARRAY['mv.nomor_telepon IS NULL'];
        END IF;
    END IF;
    
    IF filter_date_from IS NOT NULL AND filter_date_from != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('mv.dibuat_pada >= %L::date', filter_date_from)
        ];
    END IF;
    
    IF filter_date_to IS NOT NULL AND filter_date_to != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('mv.dibuat_pada <= %L::date + interval ''1 day''', filter_date_to)
        ];
    END IF;
    
    -- Build and execute count query
    query_text := format('
        SELECT COUNT(*)::integer
        FROM mv_sales_aggregates mv
        %s',
        CASE 
            WHEN array_length(where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(where_conditions, ' AND ')
            ELSE ''
        END
    );
    
    EXECUTE query_text INTO result_count;
    RETURN COALESCE(result_count, 0);
END;
$$;


ALTER FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) OWNER TO postgres;

--
-- TOC entry 500 (class 1255 OID 18163)
-- Name: get_setoran_filter_options(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_setoran_filter_options() RETURNS json
    LANGUAGE sql STABLE
    AS $$
  WITH summary_data AS (
    SELECT 
      COUNT(*) as total_setoran,
      COUNT(DISTINCT penerima_setoran) as unique_penerima,
      COALESCE(SUM(total_setoran), 0) as total_amount,
      COALESCE(AVG(total_setoran), 0) as avg_amount,
      COALESCE(MIN(total_setoran), 0) as min_amount,
      COALESCE(MAX(total_setoran), 0) as max_amount
    FROM setoran
  ),
  penerima_data AS (
    SELECT 
      penerima_setoran,
      COUNT(*) as count
    FROM setoran 
    WHERE penerima_setoran IS NOT NULL
    GROUP BY penerima_setoran
    ORDER BY count DESC
    LIMIT 20
  )
  SELECT json_build_object(
    'penerima', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'value', penerima_setoran,
          'label', penerima_setoran,
          'count', count
        )
      ), '[]'::json)
      FROM penerima_data
    ),
    'summary', (
      SELECT json_build_object(
        'total_setoran', total_setoran,
        'total_amount', total_amount,
        'avg_amount', avg_amount,
        'min_amount', min_amount,
        'max_amount', max_amount,
        'unique_penerima', unique_penerima,
        'today_setoran', 0,
        'today_amount', 0,
        'this_week_setoran', 0,
        'this_week_amount', 0,
        'this_month_setoran', 0,
        'this_month_amount', 0
      )
      FROM summary_data
    )
  );
$$;


ALTER FUNCTION public.get_setoran_filter_options() OWNER TO postgres;

--
-- TOC entry 509 (class 1255 OID 17584)
-- Name: get_toko_filter_options_simple(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_toko_filter_options_simple() RETURNS TABLE(filter_type text, filter_value text, filter_label text, filter_count bigint, metadata json)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    (
        -- Status options
        SELECT 
            'status'::TEXT,
            status_toko::TEXT,
            CASE WHEN status_toko THEN 'Aktif' ELSE 'Non-aktif' END::TEXT,
            COUNT(*),
            '{}'::JSON
        FROM toko
        GROUP BY status_toko
    )
    UNION ALL
    (
        -- Sales options
        SELECT 
            'sales'::TEXT,
            s.id_sales::TEXT,
            s.nama_sales::TEXT,
            COUNT(t.id_toko),
            json_build_object('sales_id', s.id_sales)
        FROM sales s
        LEFT JOIN toko t ON s.id_sales = t.id_sales
        GROUP BY s.id_sales, s.nama_sales
        ORDER BY s.nama_sales
    )
    UNION ALL
    (
        -- Kabupaten options
        SELECT DISTINCT
            'kabupaten'::TEXT,
            kabupaten::TEXT,
            kabupaten::TEXT,
            COUNT(*),
            '{}'::JSON
        FROM toko
        WHERE kabupaten IS NOT NULL
        GROUP BY kabupaten
        ORDER BY kabupaten
    )
    UNION ALL
    (
        -- Kecamatan options
        SELECT DISTINCT
            'kecamatan'::TEXT,
            kecamatan::TEXT,
            (kecamatan || ', ' || kabupaten)::TEXT,
            COUNT(*),
            json_build_object('kabupaten', kabupaten)
        FROM toko
        WHERE kecamatan IS NOT NULL
        GROUP BY kecamatan, kabupaten
        ORDER BY kecamatan
    );
END;
$$;


ALTER FUNCTION public.get_toko_filter_options_simple() OWNER TO postgres;

--
-- TOC entry 534 (class 1255 OID 17583)
-- Name: get_toko_search_suggestions_simple(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer DEFAULT 5) RETURNS TABLE(suggestion_type text, suggestion_value text, suggestion_label text, metadata json)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    (
        -- Toko name suggestions
        SELECT 
            'toko'::TEXT,
            t.nama_toko::TEXT,
            t.nama_toko::TEXT,
            json_build_object(
                'id_toko', t.id_toko,
                'kecamatan', t.kecamatan,
                'kabupaten', t.kabupaten
            )
        FROM toko t
        WHERE t.nama_toko ILIKE '%' || search_term || '%'
        ORDER BY t.nama_toko
        LIMIT max_results
    )
    UNION ALL
    (
        -- Kabupaten suggestions
        SELECT DISTINCT
            'kabupaten'::TEXT,
            t.kabupaten::TEXT,
            t.kabupaten::TEXT,
            json_build_object('count', COUNT(*))
        FROM toko t
        WHERE t.kabupaten ILIKE '%' || search_term || '%'
        GROUP BY t.kabupaten
        ORDER BY t.kabupaten
        LIMIT max_results
    )
    UNION ALL
    (
        -- Kecamatan suggestions
        SELECT DISTINCT
            'kecamatan'::TEXT,
            t.kecamatan::TEXT,
            (t.kecamatan || ', ' || t.kabupaten)::TEXT,
            json_build_object('kabupaten', t.kabupaten, 'count', COUNT(*))
        FROM toko t
        WHERE t.kecamatan ILIKE '%' || search_term || '%'
        GROUP BY t.kecamatan, t.kabupaten
        ORDER BY t.kecamatan
        LIMIT max_results
    )
    UNION ALL
    (
        -- Sales suggestions
        SELECT 
            'sales'::TEXT,
            s.nama_sales::TEXT,
            s.nama_sales::TEXT,
            json_build_object('id_sales', s.id_sales)
        FROM sales s
        WHERE s.nama_sales ILIKE '%' || search_term || '%'
        ORDER BY s.nama_sales
        LIMIT max_results
    );
END;
$$;


ALTER FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) OWNER TO postgres;

--
-- TOC entry 427 (class 1255 OID 22880)
-- Name: refresh_penagihan_materialized_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_penagihan_materialized_views() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- This function is called by triggers when penagihan records change
    -- Since we don't have materialized views anymore, this is just a placeholder
    -- In the future, if materialized views are added, refresh them here
    
    -- Example of what this function might do:
    -- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_penagihan_summary;
    -- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_penagihan_stats;
    
    -- For now, just return without doing anything
    RETURN;
END;
$$;


ALTER FUNCTION public.refresh_penagihan_materialized_views() OWNER TO postgres;

--
-- TOC entry 4075 (class 0 OID 0)
-- Dependencies: 427
-- Name: FUNCTION refresh_penagihan_materialized_views(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.refresh_penagihan_materialized_views() IS 'Placeholder function to refresh penagihan-related materialized views. Currently does nothing as no materialized views exist.';


--
-- TOC entry 468 (class 1255 OID 22598)
-- Name: rpc_count_products(text, boolean, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rpc_count_products(search_term text DEFAULT ''::text, filter_status boolean DEFAULT NULL::boolean, filter_priority boolean DEFAULT NULL::boolean) RETURNS integer
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    where_conditions text[] := '{}';
    query_text text;
    result_count integer;
BEGIN
    -- Build search conditions (same as search function)
    IF search_term IS NOT NULL AND trim(search_term) != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('(nama_produk ILIKE %L OR id_produk::text = %L)', 
                   '%' || search_term || '%', search_term)
        ];
    END IF;
    
    IF filter_status IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[
            format('status_produk = %L', filter_status)
        ];
    END IF;
    
    IF filter_priority IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[
            format('is_priority = %L', filter_priority)
        ];
    END IF;
    
    query_text := format('SELECT COUNT(*) FROM produk %s',
        CASE 
            WHEN array_length(where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(where_conditions, ' AND ')
            ELSE ''
        END
    );
    
    EXECUTE query_text INTO result_count;
    RETURN COALESCE(result_count, 0);
END;
$$;


ALTER FUNCTION public.rpc_count_products(search_term text, filter_status boolean, filter_priority boolean) OWNER TO postgres;

--
-- TOC entry 4077 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION rpc_count_products(search_term text, filter_status boolean, filter_priority boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.rpc_count_products(search_term text, filter_status boolean, filter_priority boolean) IS 'Counts products matching the given filters for pagination';


--
-- TOC entry 458 (class 1255 OID 22597)
-- Name: rpc_get_product_by_id(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rpc_get_product_by_id(product_id integer) RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'product', json_build_object(
            'id_produk', p.id_produk,
            'nama_produk', p.nama_produk,
            'harga_satuan', p.harga_satuan,
            'status_produk', p.status_produk,
            'is_priority', p.is_priority,
            'priority_order', p.priority_order,
            'dibuat_pada', p.dibuat_pada,
            'diperbarui_pada', p.diperbarui_pada
        ),
        'statistics', json_build_object(
            'total_shipped', COALESCE(shipped.total, 0),
            'total_sold', COALESCE(sold.total, 0),
            'total_returned', COALESCE(returned.total, 0),
            'total_remaining', COALESCE(shipped.total, 0) - COALESCE(sold.total, 0) - COALESCE(returned.total, 0),
            'total_revenue', COALESCE(sold.total * p.harga_satuan, 0),
            'conversion_rate', CASE 
                WHEN COALESCE(shipped.total, 0) > 0 
                THEN ROUND((COALESCE(sold.total, 0)::numeric / shipped.total) * 100, 2)
                ELSE 0 
            END
        ),
        'recent_shipments', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'tanggal_kirim', pg.tanggal_kirim,
                    'jumlah_kirim', dp.jumlah_kirim,
                    'toko', t.nama_toko,
                    'sales', s.nama_sales
                ) ORDER BY pg.tanggal_kirim DESC
            ), '[]'::json)
            FROM detail_pengiriman dp
            INNER JOIN pengiriman pg ON dp.id_pengiriman = pg.id_pengiriman
            INNER JOIN toko t ON pg.id_toko = t.id_toko
            INNER JOIN sales s ON t.id_sales = s.id_sales
            WHERE dp.id_produk = p.id_produk
            LIMIT 10
        ),
        'recent_sales', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'dibuat_pada', nb.dibuat_pada,
                    'jumlah_terjual', dnb.jumlah_terjual,
                    'jumlah_kembali', dnb.jumlah_kembali,
                    'toko', t.nama_toko,
                    'sales', s.nama_sales,
                    'revenue', dnb.jumlah_terjual * p.harga_satuan
                ) ORDER BY nb.dibuat_pada DESC
            ), '[]'::json)
            FROM detail_penagihan dnb
            INNER JOIN penagihan nb ON dnb.id_penagihan = nb.id_penagihan
            INNER JOIN toko t ON nb.id_toko = t.id_toko
            INNER JOIN sales s ON t.id_sales = s.id_sales
            WHERE dnb.id_produk = p.id_produk
            LIMIT 10
        )
    ) INTO result
    FROM produk p
    LEFT JOIN (
        SELECT id_produk, SUM(jumlah_kirim) as total
        FROM detail_pengiriman
        WHERE id_produk = product_id
        GROUP BY id_produk
    ) shipped ON p.id_produk = shipped.id_produk
    LEFT JOIN (
        SELECT id_produk, SUM(jumlah_terjual) as total
        FROM detail_penagihan
        WHERE id_produk = product_id
        GROUP BY id_produk
    ) sold ON p.id_produk = sold.id_produk
    LEFT JOIN (
        SELECT id_produk, SUM(jumlah_kembali) as total
        FROM detail_penagihan
        WHERE id_produk = product_id
        GROUP BY id_produk
    ) returned ON p.id_produk = returned.id_produk
    WHERE p.id_produk = product_id;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.rpc_get_product_by_id(product_id integer) OWNER TO postgres;

--
-- TOC entry 4079 (class 0 OID 0)
-- Dependencies: 458
-- Name: FUNCTION rpc_get_product_by_id(product_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.rpc_get_product_by_id(product_id integer) IS 'Returns detailed product information with statistics and recent activity';


--
-- TOC entry 525 (class 1255 OID 22594)
-- Name: rpc_get_product_statistics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rpc_get_product_statistics() RETURNS json
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_products', (SELECT COUNT(*) FROM produk),
        'active_products', (SELECT COUNT(*) FROM produk WHERE status_produk = true),
        'inactive_products', (SELECT COUNT(*) FROM produk WHERE status_produk = false),
        'priority_products', (SELECT COUNT(*) FROM produk WHERE is_priority = true),
        'total_value', (
            SELECT COALESCE(SUM(harga_satuan), 0)
            FROM produk 
            WHERE status_produk = true
        ),
        'total_shipped', (
            SELECT COALESCE(SUM(dp.jumlah_kirim), 0)
            FROM detail_pengiriman dp
            INNER JOIN produk p ON dp.id_produk = p.id_produk
            WHERE p.status_produk = true
        ),
        'total_sold', (
            SELECT COALESCE(SUM(dnb.jumlah_terjual), 0)
            FROM detail_penagihan dnb
            INNER JOIN produk p ON dnb.id_produk = p.id_produk
            WHERE p.status_produk = true
        ),
        'total_returned', (
            SELECT COALESCE(SUM(dnb.jumlah_kembali), 0)
            FROM detail_penagihan dnb
            INNER JOIN produk p ON dnb.id_produk = p.id_produk
            WHERE p.status_produk = true
        ),
        'total_remaining', (
            SELECT COALESCE(
                (
                    SELECT SUM(dp.jumlah_kirim)
                    FROM detail_pengiriman dp
                    INNER JOIN produk p ON dp.id_produk = p.id_produk
                    WHERE p.status_produk = true
                ) - (
                    SELECT SUM(dnb.jumlah_terjual + dnb.jumlah_kembali)
                    FROM detail_penagihan dnb
                    INNER JOIN produk p ON dnb.id_produk = p.id_produk
                    WHERE p.status_produk = true
                ), 0
            )
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(dnb.jumlah_terjual * p.harga_satuan), 0)
            FROM detail_penagihan dnb
            INNER JOIN produk p ON dnb.id_produk = p.id_produk
            WHERE p.status_produk = true
        ),
        'conversion_rate', (
            WITH stats AS (
                SELECT 
                    COALESCE(SUM(dp.jumlah_kirim), 0) as total_shipped,
                    COALESCE(SUM(dnb.jumlah_terjual), 0) as total_sold
                FROM produk p
                LEFT JOIN detail_pengiriman dp ON p.id_produk = dp.id_produk
                LEFT JOIN detail_penagihan dnb ON p.id_produk = dnb.id_produk
                WHERE p.status_produk = true
            )
            SELECT 
                CASE 
                    WHEN total_shipped > 0 THEN ROUND((total_sold::numeric / total_shipped) * 100, 2)
                    ELSE 0
                END
            FROM stats
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.rpc_get_product_statistics() OWNER TO postgres;

--
-- TOC entry 4081 (class 0 OID 0)
-- Dependencies: 525
-- Name: FUNCTION rpc_get_product_statistics(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.rpc_get_product_statistics() IS 'Returns comprehensive product statistics including totals, shipped, sold, remaining stock, and conversion rates';


--
-- TOC entry 501 (class 1255 OID 22603)
-- Name: rpc_refresh_product_cache(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rpc_refresh_product_cache() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- This function can be expanded to refresh materialized views
    -- or clear any cached data when product statistics change
    
    -- For now, it's a placeholder that always returns true
    -- indicating that data is fresh
    
    RETURN true;
END;
$$;


ALTER FUNCTION public.rpc_refresh_product_cache() OWNER TO postgres;

--
-- TOC entry 4083 (class 0 OID 0)
-- Dependencies: 501
-- Name: FUNCTION rpc_refresh_product_cache(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.rpc_refresh_product_cache() IS 'Refreshes any cached product data to ensure consistency';


--
-- TOC entry 454 (class 1255 OID 22595)
-- Name: rpc_search_products(text, boolean, boolean, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rpc_search_products(search_term text DEFAULT ''::text, filter_status boolean DEFAULT NULL::boolean, filter_priority boolean DEFAULT NULL::boolean, sort_column text DEFAULT 'nama_produk'::text, sort_direction text DEFAULT 'asc'::text, page_limit integer DEFAULT 20, page_offset integer DEFAULT 0) RETURNS TABLE(id_produk integer, nama_produk character varying, harga_satuan numeric, status_produk boolean, is_priority boolean, priority_order integer, dibuat_pada timestamp without time zone, diperbarui_pada timestamp without time zone, total_shipped bigint, total_sold bigint, total_returned bigint, total_remaining bigint, total_revenue numeric, conversion_rate numeric, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    where_conditions text[] := '{}';
    query_text text;
    sort_clause text;
BEGIN
    -- Build search conditions
    IF search_term IS NOT NULL AND trim(search_term) != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('(p.nama_produk ILIKE %L OR p.id_produk::text = %L)', 
                   '%' || search_term || '%', search_term)
        ];
    END IF;
    
    IF filter_status IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[
            format('p.status_produk = %L', filter_status)
        ];
    END IF;
    
    IF filter_priority IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[
            format('p.is_priority = %L', filter_priority)
        ];
    END IF;
    
    -- Build sort clause
    IF sort_column = 'nama_produk' THEN
        sort_clause := format('p.nama_produk %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'harga_satuan' THEN
        sort_clause := format('p.harga_satuan %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'total_shipped' THEN
        sort_clause := format('stats.total_shipped %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'total_sold' THEN
        sort_clause := format('stats.total_sold %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'total_remaining' THEN
        sort_clause := format('stats.total_remaining %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSE
        sort_clause := 'p.nama_produk ASC';
    END IF;
    
    -- Build main query
    query_text := format('
        WITH product_stats AS (
            SELECT 
                p.id_produk,
                p.nama_produk,
                p.harga_satuan,
                p.status_produk,
                p.is_priority,
                p.priority_order,
                p.dibuat_pada,
                p.diperbarui_pada,
                COALESCE(SUM(dp.jumlah_kirim), 0) as total_shipped,
                COALESCE(SUM(dnb.jumlah_terjual), 0) as total_sold,
                COALESCE(SUM(dnb.jumlah_kembali), 0) as total_returned,
                COALESCE(SUM(dp.jumlah_kirim), 0) - COALESCE(SUM(dnb.jumlah_terjual + dnb.jumlah_kembali), 0) as total_remaining,
                COALESCE(SUM(dnb.jumlah_terjual * p.harga_satuan), 0) as total_revenue,
                CASE 
                    WHEN COALESCE(SUM(dp.jumlah_kirim), 0) > 0 
                    THEN ROUND((COALESCE(SUM(dnb.jumlah_terjual), 0)::numeric / SUM(dp.jumlah_kirim)) * 100, 2)
                    ELSE 0 
                END as conversion_rate,
                COUNT(*) OVER() as total_count
            FROM produk p
            LEFT JOIN detail_pengiriman dp ON p.id_produk = dp.id_produk
            LEFT JOIN detail_penagihan dnb ON p.id_produk = dnb.id_produk
            %s
            GROUP BY p.id_produk, p.nama_produk, p.harga_satuan, p.status_produk, 
                     p.is_priority, p.priority_order, p.dibuat_pada, p.diperbarui_pada
        )
        SELECT 
            stats.id_produk,
            stats.nama_produk,
            stats.harga_satuan,
            stats.status_produk,
            stats.is_priority,
            stats.priority_order,
            stats.dibuat_pada,
            stats.diperbarui_pada,
            stats.total_shipped,
            stats.total_sold,
            stats.total_returned,
            stats.total_remaining,
            stats.total_revenue,
            stats.conversion_rate,
            stats.total_count
        FROM product_stats stats
        ORDER BY %s
        LIMIT %s OFFSET %s',
        CASE 
            WHEN array_length(where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(where_conditions, ' AND ')
            ELSE ''
        END,
        sort_clause,
        page_limit,
        page_offset
    );
    
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION public.rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer) OWNER TO postgres;

--
-- TOC entry 4085 (class 0 OID 0)
-- Dependencies: 454
-- Name: FUNCTION rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer) IS 'Searches products with pagination and detailed statistics per product';


--
-- TOC entry 515 (class 1255 OID 17807)
-- Name: search_penagihan_optimized(text, integer, integer, text, text, text, text, text, text, boolean, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_penagihan_optimized(search_query text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, sort_column text DEFAULT 'dibuat_pada'::text, sort_direction text DEFAULT 'desc'::text, sales_filter text DEFAULT NULL::text, kabupaten_filter text DEFAULT NULL::text, kecamatan_filter text DEFAULT NULL::text, metode_pembayaran_filter text DEFAULT NULL::text, ada_potongan_filter boolean DEFAULT NULL::boolean, date_from_filter text DEFAULT NULL::text, date_to_filter text DEFAULT NULL::text) RETURNS TABLE(id_penagihan integer, total_uang_diterima numeric, metode_pembayaran text, ada_potongan boolean, dibuat_pada timestamp with time zone, diperbarui_pada timestamp with time zone, toko_data json, detail_penagihan_data json, potongan_penagihan_data json, total_count bigint)
    LANGUAGE plpgsql
    AS $_$
DECLARE
    query_text text;
    sort_clause text;
    where_conditions text[];
    final_query text;
BEGIN
    -- Build WHERE conditions
    where_conditions := ARRAY['p.id_penagihan IS NOT NULL'];
    
    -- Search condition
    IF search_query IS NOT NULL AND LENGTH(TRIM(search_query)) > 0 THEN
        IF search_query ~ '^\d+$' THEN
            -- Numeric search - search by penagihan ID
            where_conditions := where_conditions || ARRAY[format('p.id_penagihan = %s', search_query)];
        ELSE
            -- Text search - search in toko name and sales name
            where_conditions := where_conditions || ARRAY[format(
                '(t.nama_toko ILIKE ''%%%s%%'' OR s.nama_sales ILIKE ''%%%s%%'')', 
                search_query, search_query
            )];
        END IF;
    END IF;
    
    -- Sales filter
    IF sales_filter IS NOT NULL AND LENGTH(TRIM(sales_filter)) > 0 THEN
        where_conditions := where_conditions || ARRAY[format('s.id_sales = %s', sales_filter)];
    END IF;
    
    -- Kabupaten filter
    IF kabupaten_filter IS NOT NULL AND LENGTH(TRIM(kabupaten_filter)) > 0 THEN
        where_conditions := where_conditions || ARRAY[format('t.kabupaten = ''%s''', kabupaten_filter)];
    END IF;
    
    -- Kecamatan filter
    IF kecamatan_filter IS NOT NULL AND LENGTH(TRIM(kecamatan_filter)) > 0 THEN
        where_conditions := where_conditions || ARRAY[format('t.kecamatan = ''%s''', kecamatan_filter)];
    END IF;
    
    -- Payment method filter
    IF metode_pembayaran_filter IS NOT NULL AND LENGTH(TRIM(metode_pembayaran_filter)) > 0 THEN
        where_conditions := where_conditions || ARRAY[format('p.metode_pembayaran = ''%s''', metode_pembayaran_filter)];
    END IF;
    
    -- Deduction filter
    IF ada_potongan_filter IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[format('p.ada_potongan = %s', ada_potongan_filter)];
    END IF;
    
    -- Date from filter
    IF date_from_filter IS NOT NULL AND LENGTH(TRIM(date_from_filter)) > 0 THEN
        where_conditions := where_conditions || ARRAY[format('p.dibuat_pada >= ''%s''::timestamp', date_from_filter)];
    END IF;
    
    -- Date to filter
    IF date_to_filter IS NOT NULL AND LENGTH(TRIM(date_to_filter)) > 0 THEN
        where_conditions := where_conditions || ARRAY[format('p.dibuat_pada <= ''%s 23:59:59''::timestamp', date_to_filter)];
    END IF;
    
    -- Build sort clause
    IF sort_column = 'toko_name' THEN
        sort_clause := 't.nama_toko';
    ELSIF sort_column = 'sales_name' THEN
        sort_clause := 's.nama_sales';
    ELSIF sort_column = 'kabupaten' THEN
        sort_clause := 't.kabupaten';
    ELSIF sort_column = 'kecamatan' THEN
        sort_clause := 't.kecamatan';
    ELSE
        sort_clause := 'p.' || sort_column;
    END IF;
    
    IF sort_direction = 'asc' THEN
        sort_clause := sort_clause || ' ASC';
    ELSE
        sort_clause := sort_clause || ' DESC';
    END IF;
    
    -- Build final query
    final_query := format('
        WITH filtered_data AS (
            SELECT 
                p.id_penagihan,
                p.total_uang_diterima,
                p.metode_pembayaran,
                p.ada_potongan,
                p.dibuat_pada,
                p.diperbarui_pada,
                json_build_object(
                    ''id_toko'', t.id_toko,
                    ''nama_toko'', t.nama_toko,
                    ''kecamatan'', t.kecamatan,
                    ''kabupaten'', t.kabupaten,
                    ''link_gmaps'', t.link_gmaps,
                    ''sales'', json_build_object(
                        ''id_sales'', s.id_sales,
                        ''nama_sales'', s.nama_sales,
                        ''nomor_telepon'', s.nomor_telepon
                    )
                ) as toko_data,
                COUNT(*) OVER() as total_count
            FROM penagihan p
            INNER JOIN toko t ON p.id_toko = t.id_toko
            INNER JOIN sales s ON t.id_sales = s.id_sales
            WHERE %s
            ORDER BY %s
            LIMIT %s OFFSET %s
        ),
        penagihan_with_details AS (
            SELECT 
                fd.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            ''id_detail_tagih'', dp.id_detail_tagih,
                            ''jumlah_terjual'', dp.jumlah_terjual,
                            ''jumlah_kembali'', dp.jumlah_kembali,
                            ''produk'', json_build_object(
                                ''id_produk'', pr.id_produk,
                                ''nama_produk'', pr.nama_produk,
                                ''harga_satuan'', pr.harga_satuan
                            )
                        )
                    ) FILTER (WHERE dp.id_detail_tagih IS NOT NULL),
                    ''[]''::json
                ) as detail_penagihan_data
            FROM filtered_data fd
            LEFT JOIN detail_penagihan dp ON fd.id_penagihan = dp.id_penagihan
            LEFT JOIN produk pr ON dp.id_produk = pr.id_produk
            GROUP BY fd.id_penagihan, fd.total_uang_diterima, fd.metode_pembayaran, 
                     fd.ada_potongan, fd.dibuat_pada, fd.diperbarui_pada, 
                     fd.toko_data, fd.total_count
        )
        SELECT 
            pwd.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        ''id_potongan'', pot.id_potongan,
                        ''jumlah_potongan'', pot.jumlah_potongan,
                        ''alasan'', pot.alasan
                    )
                ) FILTER (WHERE pot.id_potongan IS NOT NULL),
                ''[]''::json
            ) as potongan_penagihan_data
        FROM penagihan_with_details pwd
        LEFT JOIN potongan_penagihan pot ON pwd.id_penagihan = pot.id_penagihan
        GROUP BY pwd.id_penagihan, pwd.total_uang_diterima, pwd.metode_pembayaran,
                 pwd.ada_potongan, pwd.dibuat_pada, pwd.diperbarui_pada,
                 pwd.toko_data, pwd.detail_penagihan_data, pwd.total_count
        ORDER BY %s',
        array_to_string(where_conditions, ' AND '),
        sort_clause,
        p_limit,
        p_offset,
        sort_clause
    );
    
    -- Execute and return results
    RETURN QUERY EXECUTE final_query;
END;
$_$;


ALTER FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) OWNER TO postgres;

--
-- TOC entry 536 (class 1255 OID 17634)
-- Name: search_pengiriman_optimized(text, integer, text, text, date, date, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_pengiriman_optimized(search_term text DEFAULT ''::text, filter_sales integer DEFAULT NULL::integer, filter_kabupaten text DEFAULT ''::text, filter_kecamatan text DEFAULT ''::text, filter_date_from date DEFAULT NULL::date, filter_date_to date DEFAULT NULL::date, sort_by text DEFAULT 'tanggal_kirim'::text, sort_order text DEFAULT 'desc'::text, page_size integer DEFAULT 20, page_number integer DEFAULT 1) RETURNS TABLE(id_pengiriman integer, tanggal_kirim date, dibuat_pada timestamp without time zone, diperbarui_pada timestamp without time zone, id_toko integer, nama_toko character varying, kecamatan character varying, kabupaten character varying, link_gmaps text, id_sales integer, nama_sales character varying, nomor_telepon character varying, total_quantity bigint, detail_pengiriman json, total_count bigint)
    LANGUAGE plpgsql
    AS $_$
DECLARE
    query_text text;
    where_conditions text[];
    sort_clause text;
    offset_val integer;
BEGIN
    -- Calculate offset
    offset_val := (page_number - 1) * page_size;
    
    -- Build where conditions
    where_conditions := ARRAY[]::text[];
    
    -- Search condition
    IF search_term IS NOT NULL AND trim(search_term) != '' THEN
        -- Check if search term is numeric (likely pengiriman ID)
        IF search_term ~ '^\d+$' THEN
            where_conditions := array_append(where_conditions, 
                format('(id_pengiriman = %s OR search_vector @@ plainto_tsquery(''indonesian'', %L))', 
                    search_term, search_term));
        ELSE
            where_conditions := array_append(where_conditions, 
                format('search_vector @@ plainto_tsquery(''indonesian'', %L)', search_term));
        END IF;
    END IF;
    
    -- Sales filter
    IF filter_sales IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            format('id_sales = %s', filter_sales));
    END IF;
    
    -- Kabupaten filter
    IF filter_kabupaten IS NOT NULL AND trim(filter_kabupaten) != '' THEN
        where_conditions := array_append(where_conditions, 
            format('kabupaten = %L', filter_kabupaten));
    END IF;
    
    -- Kecamatan filter
    IF filter_kecamatan IS NOT NULL AND trim(filter_kecamatan) != '' THEN
        where_conditions := array_append(where_conditions, 
            format('kecamatan = %L', filter_kecamatan));
    END IF;
    
    -- Date range filters
    IF filter_date_from IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            format('tanggal_kirim >= %L', filter_date_from));
    END IF;
    
    IF filter_date_to IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            format('tanggal_kirim <= %L', filter_date_to));
    END IF;
    
    -- Build sort clause
    sort_clause := format('%I %s', sort_by, 
        CASE WHEN upper(sort_order) = 'DESC' THEN 'DESC' ELSE 'ASC' END);
    
    -- Build final query
    query_text := format('
        SELECT 
            mv.id_pengiriman,
            mv.tanggal_kirim,
            mv.dibuat_pada,
            mv.diperbarui_pada,
            mv.id_toko,
            mv.nama_toko,
            mv.kecamatan,
            mv.kabupaten,
            mv.link_gmaps,
            mv.id_sales,
            mv.nama_sales,
            mv.nomor_telepon,
            mv.total_quantity,
            mv.detail_pengiriman,
            COUNT(*) OVER() as total_count
        FROM mv_pengiriman_aggregates mv
        %s
        ORDER BY %s
        LIMIT %s OFFSET %s',
        CASE 
            WHEN array_length(where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(where_conditions, ' AND ')
            ELSE ''
        END,
        sort_clause,
        page_size,
        offset_val
    );
    
    -- Execute query
    RETURN QUERY EXECUTE query_text;
END;
$_$;


ALTER FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) OWNER TO postgres;

--
-- TOC entry 443 (class 1255 OID 17636)
-- Name: search_pengiriman_simple(text, integer, text, text, date, date, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_pengiriman_simple(search_term text DEFAULT ''::text, filter_sales integer DEFAULT NULL::integer, filter_kabupaten text DEFAULT ''::text, filter_kecamatan text DEFAULT ''::text, filter_date_from date DEFAULT NULL::date, filter_date_to date DEFAULT NULL::date, sort_by text DEFAULT 'tanggal_kirim'::text, sort_order text DEFAULT 'desc'::text, page_size integer DEFAULT 20, page_number integer DEFAULT 1) RETURNS TABLE(id_pengiriman integer, tanggal_kirim date, dibuat_pada timestamp without time zone, diperbarui_pada timestamp without time zone, id_toko integer, nama_toko character varying, kecamatan character varying, kabupaten character varying, link_gmaps text, id_sales integer, nama_sales character varying, nomor_telepon character varying, total_quantity bigint, detail_pengiriman json, total_count bigint)
    LANGUAGE plpgsql
    AS $_$
DECLARE
    query_text text;
    where_conditions text[];
    sort_clause text;
    offset_val integer;
BEGIN
    -- Calculate offset
    offset_val := (page_number - 1) * page_size;
    
    -- Build where conditions
    where_conditions := ARRAY['t.status_toko = true', 's.status_aktif = true'];
    
    -- Search condition
    IF search_term IS NOT NULL AND trim(search_term) != '' THEN
        IF search_term ~ '^\d+$' THEN
            where_conditions := array_append(where_conditions, 
                format('(p.id_pengiriman = %s OR t.nama_toko ILIKE %L OR s.nama_sales ILIKE %L)', 
                    search_term, '%' || search_term || '%', '%' || search_term || '%'));
        ELSE
            where_conditions := array_append(where_conditions, 
                format('(t.nama_toko ILIKE %L OR s.nama_sales ILIKE %L OR t.kecamatan ILIKE %L OR t.kabupaten ILIKE %L)', 
                    '%' || search_term || '%', '%' || search_term || '%', 
                    '%' || search_term || '%', '%' || search_term || '%'));
        END IF;
    END IF;
    
    -- Sales filter
    IF filter_sales IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            format('s.id_sales = %s', filter_sales));
    END IF;
    
    -- Kabupaten filter
    IF filter_kabupaten IS NOT NULL AND trim(filter_kabupaten) != '' THEN
        where_conditions := array_append(where_conditions, 
            format('t.kabupaten = %L', filter_kabupaten));
    END IF;
    
    -- Kecamatan filter
    IF filter_kecamatan IS NOT NULL AND trim(filter_kecamatan) != '' THEN
        where_conditions := array_append(where_conditions, 
            format('t.kecamatan = %L', filter_kecamatan));
    END IF;
    
    -- Date range filters
    IF filter_date_from IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            format('p.tanggal_kirim >= %L', filter_date_from));
    END IF;
    
    IF filter_date_to IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            format('p.tanggal_kirim <= %L', filter_date_to));
    END IF;
    
    -- Build sort clause
    sort_clause := format('p.%I %s', sort_by, 
        CASE WHEN upper(sort_order) = 'DESC' THEN 'DESC' ELSE 'ASC' END);
    
    -- Build final query
    query_text := format('
        SELECT 
            p.id_pengiriman,
            p.tanggal_kirim,
            p.dibuat_pada,
            p.diperbarui_pada,
            t.id_toko,
            t.nama_toko,
            t.kecamatan,
            t.kabupaten,
            t.link_gmaps,
            s.id_sales,
            s.nama_sales,
            s.nomor_telepon,
            COALESCE(agg.total_quantity, 0) as total_quantity,
            COALESCE(agg.detail_pengiriman, ''[]''::json) as detail_pengiriman,
            COUNT(*) OVER() as total_count
        FROM pengiriman p
        JOIN toko t ON p.id_toko = t.id_toko
        JOIN sales s ON t.id_sales = s.id_sales
        LEFT JOIN (
            SELECT 
                dp.id_pengiriman,
                SUM(dp.jumlah_kirim) as total_quantity,
                json_agg(
                    json_build_object(
                        ''id_detail_kirim'', dp.id_detail_kirim,
                        ''id_produk'', dp.id_produk,
                        ''nama_produk'', pr.nama_produk,
                        ''jumlah_kirim'', dp.jumlah_kirim,
                        ''harga_satuan'', pr.harga_satuan
                    ) ORDER BY pr.nama_produk
                ) as detail_pengiriman
            FROM detail_pengiriman dp
            JOIN produk pr ON dp.id_produk = pr.id_produk
            GROUP BY dp.id_pengiriman
        ) agg ON p.id_pengiriman = agg.id_pengiriman
        WHERE %s
        ORDER BY %s
        LIMIT %s OFFSET %s',
        array_to_string(where_conditions, ' AND '),
        sort_clause,
        page_size,
        offset_val
    );
    
    -- Execute query
    RETURN QUERY EXECUTE query_text;
END;
$_$;


ALTER FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) OWNER TO postgres;

--
-- TOC entry 519 (class 1255 OID 17984)
-- Name: search_sales_optimized(text, integer, integer, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_sales_optimized(search_term text DEFAULT ''::text, page_offset integer DEFAULT 0, page_limit integer DEFAULT 20, sort_column text DEFAULT 'nama_sales'::text, sort_direction text DEFAULT 'asc'::text, filter_status text DEFAULT NULL::text, filter_telepon_exists text DEFAULT NULL::text, filter_date_from text DEFAULT NULL::text, filter_date_to text DEFAULT NULL::text) RETURNS TABLE(id_sales integer, nama_sales character varying, nomor_telepon character varying, status_aktif boolean, dibuat_pada timestamp without time zone, diperbarui_pada timestamp without time zone, stats jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
    query_text text;
    where_conditions text[] DEFAULT '{}';
    order_clause text;
BEGIN
    -- Build WHERE conditions
    IF search_term IS NOT NULL AND search_term != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('(mv.nama_sales ILIKE %L OR mv.nomor_telepon ILIKE %L)', 
                   '%' || search_term || '%', '%' || search_term || '%')
        ];
    END IF;
    
    IF filter_status IS NOT NULL AND filter_status != '' AND filter_status != 'all' THEN
        where_conditions := where_conditions || ARRAY[
            format('mv.status_aktif = %L', filter_status::boolean)
        ];
    END IF;
    
    IF filter_telepon_exists IS NOT NULL AND filter_telepon_exists != '' AND filter_telepon_exists != 'all' THEN
        IF filter_telepon_exists = 'true' THEN
            where_conditions := where_conditions || ARRAY['mv.nomor_telepon IS NOT NULL'];
        ELSE
            where_conditions := where_conditions || ARRAY['mv.nomor_telepon IS NULL'];
        END IF;
    END IF;
    
    IF filter_date_from IS NOT NULL AND filter_date_from != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('mv.dibuat_pada >= %L::date', filter_date_from)
        ];
    END IF;
    
    IF filter_date_to IS NOT NULL AND filter_date_to != '' THEN
        where_conditions := where_conditions || ARRAY[
            format('mv.dibuat_pada <= %L::date + interval ''1 day''', filter_date_to)
        ];
    END IF;
    
    -- Build ORDER BY clause
    IF sort_column = 'nama_sales' THEN
        order_clause := format('mv.nama_sales %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'nomor_telepon' THEN
        order_clause := format('mv.nomor_telepon %s NULLS LAST', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'status_aktif' THEN
        order_clause := format('mv.status_aktif %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSIF sort_column = 'dibuat_pada' THEN
        order_clause := format('mv.dibuat_pada %s', CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END);
    ELSE
        order_clause := 'mv.nama_sales ASC';
    END IF;
    
    -- Build complete query
    query_text := format('
        SELECT 
            mv.id_sales,
            mv.nama_sales,
            mv.nomor_telepon,
            mv.status_aktif,
            mv.dibuat_pada,
            mv.diperbarui_pada,
            jsonb_build_object(
                ''total_stores'', mv.total_stores,
                ''total_shipped_items'', mv.total_shipped_items,
                ''total_revenue'', mv.total_revenue
            ) as stats
        FROM mv_sales_aggregates mv
        %s
        ORDER BY %s
        LIMIT %s OFFSET %s',
        CASE 
            WHEN array_length(where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(where_conditions, ' AND ')
            ELSE ''
        END,
        order_clause,
        page_limit,
        page_offset
    );
    
    -- Execute and return
    RETURN QUERY EXECUTE query_text;
END;
$$;


ALTER FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) OWNER TO postgres;

--
-- TOC entry 422 (class 1255 OID 17582)
-- Name: search_toko_simple(text, boolean, integer, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_toko_simple(search_term text DEFAULT ''::text, filter_status boolean DEFAULT NULL::boolean, filter_sales integer DEFAULT NULL::integer, filter_kabupaten text DEFAULT ''::text, filter_kecamatan text DEFAULT ''::text, page_size integer DEFAULT 20, page_number integer DEFAULT 1) RETURNS TABLE(id_toko integer, nama_toko character varying, kecamatan character varying, kabupaten character varying, no_telepon character varying, link_gmaps text, id_sales integer, status_toko boolean, dibuat_pada timestamp without time zone, diperbarui_pada timestamp without time zone, barang_terkirim bigint, detail_barang_terkirim json[], barang_terbayar bigint, detail_barang_terbayar json[], sisa_stok bigint, detail_sisa_stok json[], total_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    offset_count INTEGER;
    total_rows BIGINT;
BEGIN
    offset_count := (page_number - 1) * page_size;
    
    -- Get total count first
    SELECT COUNT(*)
    INTO total_rows
    FROM toko t
    WHERE 
        (search_term = '' OR 
         t.nama_toko ILIKE '%' || search_term || '%' OR
         t.kecamatan ILIKE '%' || search_term || '%' OR
         t.kabupaten ILIKE '%' || search_term || '%' OR
         t.no_telepon ILIKE '%' || search_term || '%' OR
         to_tsvector('indonesian', t.nama_toko) @@ plainto_tsquery('indonesian', search_term))
        AND (filter_status IS NULL OR t.status_toko = filter_status)
        AND (filter_sales IS NULL OR t.id_sales = filter_sales)
        AND (filter_kabupaten = '' OR t.kabupaten = filter_kabupaten)
        AND (filter_kecamatan = '' OR t.kecamatan = filter_kecamatan);
    
    -- Return paginated results with simple aggregations
    RETURN QUERY
    SELECT 
        t.id_toko,
        t.nama_toko,
        t.kecamatan,
        t.kabupaten,
        t.no_telepon,
        t.link_gmaps,
        t.id_sales,
        t.status_toko,
        t.dibuat_pada,
        t.diperbarui_pada,
        -- Simple aggregations using correct column names
        COALESCE((
            SELECT SUM(dp.jumlah_kirim)::BIGINT
            FROM pengiriman pg
            JOIN detail_pengiriman dp ON pg.id_pengiriman = dp.id_pengiriman
            WHERE pg.id_toko = t.id_toko
        ), 0) as barang_terkirim,
        '{}' as detail_barang_terkirim,
        COALESCE((
            SELECT SUM(dnb.jumlah_terjual)::BIGINT
            FROM penagihan nb
            JOIN detail_penagihan dnb ON nb.id_penagihan = dnb.id_penagihan
            WHERE nb.id_toko = t.id_toko
        ), 0) as barang_terbayar,
        '{}' as detail_barang_terbayar,
        COALESCE((
            SELECT SUM(dp.jumlah_kirim)::BIGINT - SUM(dnb.jumlah_terjual + dnb.jumlah_kembali)::BIGINT
            FROM pengiriman pg
            JOIN detail_pengiriman dp ON pg.id_pengiriman = dp.id_pengiriman
            LEFT JOIN penagihan nb ON nb.id_toko = pg.id_toko
            LEFT JOIN detail_penagihan dnb ON nb.id_penagihan = dnb.id_penagihan
            WHERE pg.id_toko = t.id_toko
        ), 0) as sisa_stok,
        '{}' as detail_sisa_stok,
        total_rows
    FROM toko t
    WHERE 
        (search_term = '' OR 
         t.nama_toko ILIKE '%' || search_term || '%' OR
         t.kecamatan ILIKE '%' || search_term || '%' OR
         t.kabupaten ILIKE '%' || search_term || '%' OR
         t.no_telepon ILIKE '%' || search_term || '%' OR
         to_tsvector('indonesian', t.nama_toko) @@ plainto_tsquery('indonesian', search_term))
        AND (filter_status IS NULL OR t.status_toko = filter_status)
        AND (filter_sales IS NULL OR t.id_sales = filter_sales)
        AND (filter_kabupaten = '' OR t.kabupaten = filter_kabupaten)
        AND (filter_kecamatan = '' OR t.kecamatan = filter_kecamatan)
    ORDER BY 
        CASE 
            WHEN search_term != '' THEN ts_rank_cd(to_tsvector('indonesian', t.nama_toko), plainto_tsquery('indonesian', search_term))
            ELSE 0
        END DESC,
        t.nama_toko ASC
    LIMIT page_size
    OFFSET offset_count;
END;
$$;


ALTER FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) OWNER TO postgres;

--
-- TOC entry 437 (class 1255 OID 17810)
-- Name: trigger_refresh_penagihan_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_penagihan_views() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refresh materialized views asynchronously
    PERFORM refresh_penagihan_materialized_views();
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.trigger_refresh_penagihan_views() OWNER TO postgres;

--
-- TOC entry 433 (class 1255 OID 17639)
-- Name: trigger_refresh_pengiriman_mv(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_pengiriman_mv() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Schedule refresh (you might want to use pg_cron or similar for production)
    PERFORM pg_notify('refresh_pengiriman_mv', 'refresh_needed');
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_refresh_pengiriman_mv() OWNER TO postgres;

--
-- TOC entry 466 (class 1255 OID 17909)
-- Name: trigger_refresh_produk_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_produk_views() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refresh materialized views asynchronously
    PERFORM refresh_produk_materialized_views();
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.trigger_refresh_produk_views() OWNER TO postgres;

--
-- TOC entry 470 (class 1255 OID 17987)
-- Name: trigger_refresh_sales_aggregates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_sales_aggregates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Since materialized views are no longer used, this function can be a no-op
    -- or we can use it for other aggregation logic if needed in the future
    -- For now, just return the appropriate value
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_refresh_sales_aggregates() OWNER TO postgres;

--
-- TOC entry 503 (class 1255 OID 17481)
-- Name: trigger_refresh_toko_aggregates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_toko_aggregates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Schedule refresh in background (use pg_notify for async processing)
  PERFORM pg_notify('refresh_toko_aggregates', '');
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_refresh_toko_aggregates() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 390 (class 1259 OID 17330)
-- Name: detail_penagihan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detail_penagihan (
    id_detail_tagih integer NOT NULL,
    id_penagihan integer NOT NULL,
    id_produk integer NOT NULL,
    jumlah_terjual integer NOT NULL,
    jumlah_kembali integer NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT detail_penagihan_jumlah_kembali_check CHECK ((jumlah_kembali >= 0)),
    CONSTRAINT detail_penagihan_jumlah_terjual_check CHECK ((jumlah_terjual >= 0))
);


ALTER TABLE public.detail_penagihan OWNER TO postgres;

--
-- TOC entry 391 (class 1259 OID 17337)
-- Name: detail_penagihan_id_detail_tagih_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detail_penagihan_id_detail_tagih_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detail_penagihan_id_detail_tagih_seq OWNER TO postgres;

--
-- TOC entry 4098 (class 0 OID 0)
-- Dependencies: 391
-- Name: detail_penagihan_id_detail_tagih_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detail_penagihan_id_detail_tagih_seq OWNED BY public.detail_penagihan.id_detail_tagih;


--
-- TOC entry 386 (class 1259 OID 17312)
-- Name: detail_pengiriman; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detail_pengiriman (
    id_detail_kirim integer NOT NULL,
    id_pengiriman integer NOT NULL,
    id_produk integer NOT NULL,
    jumlah_kirim integer NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT detail_pengiriman_jumlah_kirim_check CHECK ((jumlah_kirim > 0))
);


ALTER TABLE public.detail_pengiriman OWNER TO postgres;

--
-- TOC entry 387 (class 1259 OID 17318)
-- Name: detail_pengiriman_id_detail_kirim_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detail_pengiriman_id_detail_kirim_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detail_pengiriman_id_detail_kirim_seq OWNER TO postgres;

--
-- TOC entry 4101 (class 0 OID 0)
-- Dependencies: 387
-- Name: detail_pengiriman_id_detail_kirim_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detail_pengiriman_id_detail_kirim_seq OWNED BY public.detail_pengiriman.id_detail_kirim;


--
-- TOC entry 388 (class 1259 OID 17320)
-- Name: penagihan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penagihan (
    id_penagihan integer NOT NULL,
    id_toko integer NOT NULL,
    total_uang_diterima numeric(12,2) NOT NULL,
    metode_pembayaran character varying(20) NOT NULL,
    ada_potongan boolean DEFAULT false,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT penagihan_metode_pembayaran_check CHECK (((metode_pembayaran)::text = ANY (ARRAY[('Cash'::character varying)::text, ('Transfer'::character varying)::text]))),
    CONSTRAINT penagihan_total_uang_diterima_check CHECK ((total_uang_diterima >= (0)::numeric))
);


ALTER TABLE public.penagihan OWNER TO postgres;

--
-- TOC entry 389 (class 1259 OID 17328)
-- Name: penagihan_id_penagihan_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.penagihan_id_penagihan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.penagihan_id_penagihan_seq OWNER TO postgres;

--
-- TOC entry 4104 (class 0 OID 0)
-- Dependencies: 389
-- Name: penagihan_id_penagihan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.penagihan_id_penagihan_seq OWNED BY public.penagihan.id_penagihan;


--
-- TOC entry 384 (class 1259 OID 17305)
-- Name: pengiriman; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pengiriman (
    id_pengiriman integer NOT NULL,
    id_toko integer NOT NULL,
    tanggal_kirim date NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_autorestock boolean DEFAULT false
);


ALTER TABLE public.pengiriman OWNER TO postgres;

--
-- TOC entry 4106 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE pengiriman; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pengiriman IS 'Individual shipments table - no longer dependent on bulk_pengiriman';


--
-- TOC entry 4107 (class 0 OID 0)
-- Dependencies: 384
-- Name: COLUMN pengiriman.is_autorestock; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pengiriman.is_autorestock IS 'Identifies if this shipment is an automatic restock shipment created from billing';


--
-- TOC entry 385 (class 1259 OID 17310)
-- Name: pengiriman_id_pengiriman_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pengiriman_id_pengiriman_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pengiriman_id_pengiriman_seq OWNER TO postgres;

--
-- TOC entry 4109 (class 0 OID 0)
-- Dependencies: 385
-- Name: pengiriman_id_pengiriman_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pengiriman_id_pengiriman_seq OWNED BY public.pengiriman.id_pengiriman;


--
-- TOC entry 392 (class 1259 OID 17339)
-- Name: potongan_penagihan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.potongan_penagihan (
    id_potongan integer NOT NULL,
    id_penagihan integer NOT NULL,
    jumlah_potongan numeric(12,2) NOT NULL,
    alasan text,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT potongan_penagihan_jumlah_potongan_check CHECK ((jumlah_potongan >= (0)::numeric))
);


ALTER TABLE public.potongan_penagihan OWNER TO postgres;

--
-- TOC entry 393 (class 1259 OID 17347)
-- Name: potongan_penagihan_id_potongan_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.potongan_penagihan_id_potongan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.potongan_penagihan_id_potongan_seq OWNER TO postgres;

--
-- TOC entry 4112 (class 0 OID 0)
-- Dependencies: 393
-- Name: potongan_penagihan_id_potongan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.potongan_penagihan_id_potongan_seq OWNED BY public.potongan_penagihan.id_potongan;


--
-- TOC entry 380 (class 1259 OID 17276)
-- Name: produk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produk (
    id_produk integer NOT NULL,
    nama_produk character varying(255) NOT NULL,
    harga_satuan numeric(10,2) NOT NULL,
    status_produk boolean DEFAULT true,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_priority boolean DEFAULT false,
    priority_order integer DEFAULT 0
);


ALTER TABLE public.produk OWNER TO postgres;

--
-- TOC entry 381 (class 1259 OID 17284)
-- Name: produk_id_produk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.produk_id_produk_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.produk_id_produk_seq OWNER TO postgres;

--
-- TOC entry 4115 (class 0 OID 0)
-- Dependencies: 381
-- Name: produk_id_produk_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.produk_id_produk_seq OWNED BY public.produk.id_produk;


--
-- TOC entry 378 (class 1259 OID 17268)
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id_sales integer NOT NULL,
    nama_sales character varying(255) NOT NULL,
    nomor_telepon character varying(20),
    status_aktif boolean DEFAULT true,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- TOC entry 379 (class 1259 OID 17274)
-- Name: sales_id_sales_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_id_sales_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_id_sales_seq OWNER TO postgres;

--
-- TOC entry 4118 (class 0 OID 0)
-- Dependencies: 379
-- Name: sales_id_sales_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_sales_seq OWNED BY public.sales.id_sales;


--
-- TOC entry 394 (class 1259 OID 17349)
-- Name: setoran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setoran (
    id_setoran integer NOT NULL,
    total_setoran numeric(14,2) NOT NULL,
    penerima_setoran character varying(100) NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT setoran_total_setoran_check CHECK ((total_setoran >= (0)::numeric))
);


ALTER TABLE public.setoran OWNER TO postgres;

--
-- TOC entry 395 (class 1259 OID 17355)
-- Name: setoran_id_setoran_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.setoran_id_setoran_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.setoran_id_setoran_seq OWNER TO postgres;

--
-- TOC entry 4121 (class 0 OID 0)
-- Dependencies: 395
-- Name: setoran_id_setoran_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.setoran_id_setoran_seq OWNED BY public.setoran.id_setoran;


--
-- TOC entry 397 (class 1259 OID 17645)
-- Name: system_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_logs (
    id integer NOT NULL,
    log_type character varying(50) NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_logs OWNER TO postgres;

--
-- TOC entry 396 (class 1259 OID 17644)
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_logs_id_seq OWNER TO postgres;

--
-- TOC entry 4124 (class 0 OID 0)
-- Dependencies: 396
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- TOC entry 382 (class 1259 OID 17286)
-- Name: toko; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.toko (
    id_toko integer NOT NULL,
    id_sales integer NOT NULL,
    nama_toko character varying(255) NOT NULL,
    kecamatan character varying(100),
    kabupaten character varying(100),
    link_gmaps text,
    status_toko boolean DEFAULT true,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    no_telepon character varying(20)
);


ALTER TABLE public.toko OWNER TO postgres;

--
-- TOC entry 383 (class 1259 OID 17294)
-- Name: toko_id_toko_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.toko_id_toko_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.toko_id_toko_seq OWNER TO postgres;

--
-- TOC entry 4127 (class 0 OID 0)
-- Dependencies: 383
-- Name: toko_id_toko_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.toko_id_toko_seq OWNED BY public.toko.id_toko;


--
-- TOC entry 406 (class 1259 OID 24178)
-- Name: v_cash_flow_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_cash_flow_dashboard AS
 WITH daily_cash_summary AS (
         SELECT date(p.dibuat_pada) AS tanggal,
            sum(
                CASE
                    WHEN ((p.metode_pembayaran)::text = 'Cash'::text) THEN p.total_uang_diterima
                    ELSE (0)::numeric
                END) AS total_cash_payments,
            count(
                CASE
                    WHEN ((p.metode_pembayaran)::text = 'Cash'::text) THEN 1
                    ELSE NULL::integer
                END) AS jumlah_transaksi_cash,
            sum(
                CASE
                    WHEN ((p.metode_pembayaran)::text = 'Transfer'::text) THEN p.total_uang_diterima
                    ELSE (0)::numeric
                END) AS total_transfer_payments,
            count(
                CASE
                    WHEN ((p.metode_pembayaran)::text = 'Transfer'::text) THEN 1
                    ELSE NULL::integer
                END) AS jumlah_transaksi_transfer,
            sum(p.total_uang_diterima) AS total_all_payments,
            count(*) AS total_transaksi
           FROM public.penagihan p
          GROUP BY (date(p.dibuat_pada))
        ), daily_deposits AS (
         SELECT date(s.dibuat_pada) AS tanggal,
            sum(s.total_setoran) AS total_setoran,
            count(*) AS jumlah_setoran,
            string_agg(DISTINCT (s.penerima_setoran)::text, ', '::text) AS penerima_list
           FROM public.setoran s
          GROUP BY (date(s.dibuat_pada))
        ), all_dates AS (
         SELECT daily_cash_summary.tanggal
           FROM daily_cash_summary
        UNION
         SELECT daily_deposits.tanggal
           FROM daily_deposits
        ), daily_balances AS (
         SELECT d.tanggal,
            COALESCE(dcs.total_cash_payments, (0)::numeric) AS cash_masuk,
            COALESCE(dcs.jumlah_transaksi_cash, (0)::bigint) AS jumlah_transaksi_cash,
            COALESCE(dcs.total_transfer_payments, (0)::numeric) AS transfer_masuk,
            COALESCE(dcs.jumlah_transaksi_transfer, (0)::bigint) AS jumlah_transaksi_transfer,
            COALESCE(dcs.total_all_payments, (0)::numeric) AS total_pembayaran,
            COALESCE(dd.total_setoran, (0)::numeric) AS cash_keluar,
            COALESCE(dd.jumlah_setoran, (0)::bigint) AS jumlah_setoran,
            COALESCE(dd.penerima_list, ''::text) AS penerima_list,
            (COALESCE(dcs.total_cash_payments, (0)::numeric) - COALESCE(dd.total_setoran, (0)::numeric)) AS selisih_harian
           FROM ((all_dates d
             LEFT JOIN daily_cash_summary dcs ON ((d.tanggal = dcs.tanggal)))
             LEFT JOIN daily_deposits dd ON ((d.tanggal = dd.tanggal)))
        ), cumulative_balance AS (
         SELECT daily_balances.tanggal,
            daily_balances.cash_masuk,
            daily_balances.jumlah_transaksi_cash,
            daily_balances.transfer_masuk,
            daily_balances.jumlah_transaksi_transfer,
            daily_balances.total_pembayaran,
            daily_balances.cash_keluar,
            daily_balances.jumlah_setoran,
            daily_balances.penerima_list,
            daily_balances.selisih_harian,
            sum(daily_balances.selisih_harian) OVER (ORDER BY daily_balances.tanggal ROWS UNBOUNDED PRECEDING) AS cash_balance_kumulatif
           FROM daily_balances
        )
 SELECT tanggal AS tanggal_laporan,
    cash_masuk AS pembayaran_cash_hari_ini,
    jumlah_transaksi_cash,
    transfer_masuk AS pembayaran_transfer_hari_ini,
    jumlah_transaksi_transfer,
    total_pembayaran AS total_pembayaran_hari_ini,
    cash_keluar AS total_setoran_hari_ini,
    jumlah_setoran AS jumlah_setoran_hari_ini,
    penerima_list AS semua_penerima_hari_ini,
    selisih_harian,
    cash_balance_kumulatif,
        CASE
            WHEN ((selisih_harian = (0)::numeric) AND (cash_masuk > (0)::numeric)) THEN 'SESUAI'::text
            WHEN (selisih_harian > (0)::numeric) THEN 'KURANG_SETOR'::text
            WHEN (selisih_harian < (0)::numeric) THEN 'LEBIH_SETOR'::text
            ELSE 'TIDAK_ADA_TRANSAKSI_CASH'::text
        END AS status_setoran_harian,
        CASE
            WHEN ((cash_masuk > (0)::numeric) AND (cash_keluar = (0)::numeric)) THEN 'TIDAK_ADA_SETORAN'::text
            WHEN ((cash_masuk = (0)::numeric) AND (cash_keluar > (0)::numeric)) THEN 'HANYA_SETORAN'::text
            WHEN ((cash_masuk = (0)::numeric) AND (cash_keluar = (0)::numeric)) THEN 'TIDAK_ADA_AKTIVITAS'::text
            ELSE 'NORMAL'::text
        END AS status_arus_kas_harian
   FROM cumulative_balance cb
  ORDER BY tanggal DESC;


ALTER VIEW public.v_cash_flow_dashboard OWNER TO postgres;

--
-- TOC entry 415 (class 1259 OID 24628)
-- Name: v_chart_produk_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_chart_produk_performance AS
 SELECT pr.nama_produk,
    pr.harga_satuan,
    date(p.dibuat_pada) AS tanggal,
    date_part('month'::text, p.dibuat_pada) AS bulan,
    sum((dp.jumlah_terjual - dp.jumlah_kembali)) AS barang_terjual,
    sum((((dp.jumlah_terjual - dp.jumlah_kembali))::numeric * pr.harga_satuan)) AS nilai_penjualan,
    count(DISTINCT dp.id_penagihan) AS frekuensi_transaksi,
    avg((dp.jumlah_terjual - dp.jumlah_kembali)) AS rata_rata_per_transaksi,
    sum(dp.jumlah_kembali) AS total_retur
   FROM ((public.produk pr
     LEFT JOIN public.detail_penagihan dp ON ((pr.id_produk = dp.id_produk)))
     LEFT JOIN public.penagihan p ON ((dp.id_penagihan = p.id_penagihan)))
  WHERE ((p.id_penagihan IS NOT NULL) AND ((dp.jumlah_terjual - dp.jumlah_kembali) > 0))
  GROUP BY pr.nama_produk, pr.harga_satuan, (date(p.dibuat_pada)), (date_part('month'::text, p.dibuat_pada))
  ORDER BY (date(p.dibuat_pada)) DESC, (sum((dp.jumlah_terjual - dp.jumlah_kembali))) DESC;


ALTER VIEW public.v_chart_produk_performance OWNER TO postgres;

--
-- TOC entry 413 (class 1259 OID 24618)
-- Name: v_chart_sales_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_chart_sales_performance AS
 SELECT s.nama_sales,
    date(p.dibuat_pada) AS tanggal,
    date_part('month'::text, p.dibuat_pada) AS bulan,
    date_part('week'::text, p.dibuat_pada) AS minggu,
    sum(p.total_uang_diterima) AS total_pendapatan,
    count(p.id_penagihan) AS jumlah_transaksi,
    avg(p.total_uang_diterima) AS rata_rata_transaksi,
    sum(
        CASE
            WHEN ((p.metode_pembayaran)::text = 'Cash'::text) THEN p.total_uang_diterima
            ELSE (0)::numeric
        END) AS pendapatan_cash,
    sum(
        CASE
            WHEN ((p.metode_pembayaran)::text = 'Transfer'::text) THEN p.total_uang_diterima
            ELSE (0)::numeric
        END) AS pendapatan_transfer
   FROM ((public.sales s
     LEFT JOIN public.toko t ON ((s.id_sales = t.id_sales)))
     LEFT JOIN public.penagihan p ON ((t.id_toko = p.id_toko)))
  WHERE (p.id_penagihan IS NOT NULL)
  GROUP BY s.nama_sales, (date(p.dibuat_pada)), (date_part('month'::text, p.dibuat_pada)), (date_part('week'::text, p.dibuat_pada))
  ORDER BY (date(p.dibuat_pada)) DESC, (sum(p.total_uang_diterima)) DESC;


ALTER VIEW public.v_chart_sales_performance OWNER TO postgres;

--
-- TOC entry 414 (class 1259 OID 24623)
-- Name: v_chart_toko_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_chart_toko_performance AS
 SELECT t.nama_toko,
    t.kecamatan,
    t.kabupaten,
    s.nama_sales,
    date(p.dibuat_pada) AS tanggal,
    sum((dp.jumlah_terjual - dp.jumlah_kembali)) AS total_barang_terbayar,
    sum(p.total_uang_diterima) AS nominal_diterima,
    count(p.id_penagihan) AS jumlah_transaksi,
    avg(p.total_uang_diterima) AS rata_rata_transaksi_toko
   FROM (((public.toko t
     LEFT JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN public.penagihan p ON ((t.id_toko = p.id_toko)))
     LEFT JOIN public.detail_penagihan dp ON ((p.id_penagihan = dp.id_penagihan)))
  WHERE (p.id_penagihan IS NOT NULL)
  GROUP BY t.nama_toko, t.kecamatan, t.kabupaten, s.nama_sales, (date(p.dibuat_pada))
  ORDER BY (date(p.dibuat_pada)) DESC, (sum(p.total_uang_diterima)) DESC;


ALTER VIEW public.v_chart_toko_performance OWNER TO postgres;

--
-- TOC entry 416 (class 1259 OID 24633)
-- Name: v_chart_wilayah_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_chart_wilayah_performance AS
 SELECT t.kabupaten,
    t.kecamatan,
    count(DISTINCT t.id_toko) AS jumlah_toko,
    count(DISTINCT s.id_sales) AS jumlah_sales,
    date(p.dibuat_pada) AS tanggal,
    sum(p.total_uang_diterima) AS total_pendapatan_wilayah,
    sum((dp.jumlah_terjual - dp.jumlah_kembali)) AS total_barang_terjual_wilayah,
    count(p.id_penagihan) AS total_transaksi_wilayah,
    avg(p.total_uang_diterima) AS rata_rata_transaksi_wilayah,
    sum(
        CASE
            WHEN ((p.metode_pembayaran)::text = 'Cash'::text) THEN p.total_uang_diterima
            ELSE (0)::numeric
        END) AS pendapatan_cash_wilayah,
    sum(
        CASE
            WHEN ((p.metode_pembayaran)::text = 'Transfer'::text) THEN p.total_uang_diterima
            ELSE (0)::numeric
        END) AS pendapatan_transfer_wilayah
   FROM (((public.toko t
     LEFT JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN public.penagihan p ON ((t.id_toko = p.id_toko)))
     LEFT JOIN public.detail_penagihan dp ON ((p.id_penagihan = dp.id_penagihan)))
  WHERE ((p.id_penagihan IS NOT NULL) AND (t.kabupaten IS NOT NULL))
  GROUP BY t.kabupaten, t.kecamatan, (date(p.dibuat_pada))
  ORDER BY (date(p.dibuat_pada)) DESC, (sum(p.total_uang_diterima)) DESC;


ALTER VIEW public.v_chart_wilayah_performance OWNER TO postgres;

--
-- TOC entry 418 (class 1259 OID 24643)
-- Name: v_dashboard_all_transactions; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_dashboard_all_transactions AS
 SELECT p.id_penagihan,
    p.dibuat_pada AS waktu_transaksi,
    t.id_toko,
    t.nama_toko,
    t.kecamatan,
    t.kabupaten,
    s.id_sales,
    s.nama_sales,
    p.total_uang_diterima,
    p.metode_pembayaran,
    p.ada_potongan,
    count(dp.id_detail_tagih) AS jumlah_item_berbeda,
    sum(dp.jumlah_terjual) AS total_qty_terjual,
    sum(dp.jumlah_kembali) AS total_qty_kembali,
    sum((dp.jumlah_terjual - dp.jumlah_kembali)) AS net_qty_terjual,
    string_agg(DISTINCT (pr.nama_produk)::text, ', '::text ORDER BY (pr.nama_produk)::text) AS daftar_produk,
    ( SELECT pr_1.nama_produk
           FROM (public.detail_penagihan dp2
             JOIN public.produk pr_1 ON ((dp2.id_produk = pr_1.id_produk)))
          WHERE (dp2.id_penagihan = p.id_penagihan)
          ORDER BY dp2.jumlah_terjual DESC
         LIMIT 1) AS produk_utama,
    sum((((dp.jumlah_terjual - dp.jumlah_kembali))::numeric * pr.harga_satuan)) AS estimasi_nilai_barang,
    COALESCE(pot.total_potongan, (0)::numeric) AS total_potongan,
        CASE
            WHEN (p.dibuat_pada >= CURRENT_DATE) THEN 'HARI_INI'::text
            WHEN (p.dibuat_pada >= (CURRENT_DATE - '1 day'::interval)) THEN 'KEMARIN'::text
            WHEN (p.dibuat_pada >= date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone)) THEN 'MINGGU_INI'::text
            WHEN (p.dibuat_pada >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN 'BULAN_INI'::text
            ELSE 'LAMA'::text
        END AS kategori_waktu,
    concat('/transaksi/penagihan/', p.id_penagihan) AS link_detail_transaksi,
    concat('/toko/', t.id_toko) AS link_detail_toko,
    concat('/sales/', s.id_sales) AS link_detail_sales,
    'penagihan'::text AS transaction_type,
    EXTRACT(epoch FROM p.dibuat_pada) AS timestamp_unix,
    date(p.dibuat_pada) AS tanggal_transaksi,
    to_char(p.dibuat_pada, 'HH24:MI'::text) AS jam_transaksi,
    to_char(p.dibuat_pada, 'DD/MM/YYYY'::text) AS tanggal_formatted,
    to_char(p.dibuat_pada, 'DD Mon YYYY'::text) AS tanggal_formatted_long
   FROM (((((public.penagihan p
     LEFT JOIN public.toko t ON ((p.id_toko = t.id_toko)))
     LEFT JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN public.detail_penagihan dp ON ((p.id_penagihan = dp.id_penagihan)))
     LEFT JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
     LEFT JOIN ( SELECT potongan_penagihan.id_penagihan,
            sum(potongan_penagihan.jumlah_potongan) AS total_potongan
           FROM public.potongan_penagihan
          GROUP BY potongan_penagihan.id_penagihan) pot ON ((p.id_penagihan = pot.id_penagihan)))
  GROUP BY p.id_penagihan, p.dibuat_pada, p.total_uang_diterima, p.metode_pembayaran, p.ada_potongan, t.id_toko, t.nama_toko, t.kecamatan, t.kabupaten, s.id_sales, s.nama_sales, pot.total_potongan
  ORDER BY p.dibuat_pada DESC;


ALTER VIEW public.v_dashboard_all_transactions OWNER TO postgres;

--
-- TOC entry 412 (class 1259 OID 24613)
-- Name: v_dashboard_cards; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_dashboard_cards AS
 WITH date_filters AS (
         SELECT CURRENT_DATE AS today,
            date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) AS this_week_start,
            date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) AS this_month_start,
            (CURRENT_DATE - '7 days'::interval) AS last_7_days,
            (CURRENT_DATE - '14 days'::interval) AS last_14_days,
            (CURRENT_DATE - '30 days'::interval) AS last_30_days
        )
 SELECT 'SUMMARY'::text AS card_type,
    today,
    this_week_start,
    this_month_start,
    last_7_days,
    last_14_days,
    last_30_days,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan) AS total_sales_all_time,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (date(penagihan.dibuat_pada) >= df.this_month_start)) AS total_sales_this_month,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (date(penagihan.dibuat_pada) >= df.this_week_start)) AS total_sales_this_week,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (date(penagihan.dibuat_pada) = df.today)) AS total_sales_today,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (date(penagihan.dibuat_pada) >= df.last_7_days)) AS total_sales_last_7_days,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (date(penagihan.dibuat_pada) >= df.last_14_days)) AS total_sales_last_14_days,
    ( SELECT count(DISTINCT toko.id_toko) AS count
           FROM public.toko
          WHERE (toko.status_toko = true)) AS total_toko_aktif,
    ( SELECT count(DISTINCT p.id_toko) AS count
           FROM public.penagihan p
          WHERE (date(p.dibuat_pada) >= df.this_month_start)) AS total_toko_transaksi_this_month,
    ( SELECT count(DISTINCT p.id_toko) AS count
           FROM public.penagihan p
          WHERE (date(p.dibuat_pada) >= df.this_week_start)) AS total_toko_transaksi_this_week,
    ( SELECT count(DISTINCT p.id_toko) AS count
           FROM public.penagihan p
          WHERE (date(p.dibuat_pada) = df.today)) AS total_toko_transaksi_today,
    ( SELECT COALESCE(sum(dp.jumlah_kirim), (0)::bigint) AS "coalesce"
           FROM (public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))) AS total_barang_terkirim_all_time,
    ( SELECT COALESCE(sum(dp.jumlah_kirim), (0)::bigint) AS "coalesce"
           FROM (public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
          WHERE (p.tanggal_kirim >= df.this_month_start)) AS total_barang_terkirim_this_month,
    ( SELECT COALESCE(sum(dp.jumlah_kirim), (0)::bigint) AS "coalesce"
           FROM (public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
          WHERE (p.tanggal_kirim >= df.this_week_start)) AS total_barang_terkirim_this_week,
    ( SELECT COALESCE(sum(dp.jumlah_kirim), (0)::bigint) AS "coalesce"
           FROM (public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
          WHERE (p.tanggal_kirim = df.today)) AS total_barang_terkirim_today,
    ( SELECT COALESCE(sum(((dp.jumlah_kirim)::numeric * pr.harga_satuan)), (0)::numeric) AS "coalesce"
           FROM ((public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
             JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))) AS estimasi_nilai_terkirim_all_time,
    ( SELECT COALESCE(sum(((dp.jumlah_kirim)::numeric * pr.harga_satuan)), (0)::numeric) AS "coalesce"
           FROM ((public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
             JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
          WHERE (p.tanggal_kirim >= df.this_month_start)) AS estimasi_nilai_terkirim_this_month,
    ( SELECT COALESCE(sum((dp.jumlah_terjual - dp.jumlah_kembali)), (0)::bigint) AS "coalesce"
           FROM (public.detail_penagihan dp
             JOIN public.penagihan p ON ((dp.id_penagihan = p.id_penagihan)))) AS total_barang_terjual_all_time,
    ( SELECT COALESCE(sum((dp.jumlah_terjual - dp.jumlah_kembali)), (0)::bigint) AS "coalesce"
           FROM (public.detail_penagihan dp
             JOIN public.penagihan p ON ((dp.id_penagihan = p.id_penagihan)))
          WHERE (date(p.dibuat_pada) >= df.this_month_start)) AS total_barang_terjual_this_month,
    ( SELECT COALESCE(sum((dp.jumlah_terjual - dp.jumlah_kembali)), (0)::bigint) AS "coalesce"
           FROM (public.detail_penagihan dp
             JOIN public.penagihan p ON ((dp.id_penagihan = p.id_penagihan)))
          WHERE (date(p.dibuat_pada) >= df.this_week_start)) AS total_barang_terjual_this_week,
    ( SELECT COALESCE(sum((dp.jumlah_terjual - dp.jumlah_kembali)), (0)::bigint) AS "coalesce"
           FROM (public.detail_penagihan dp
             JOIN public.penagihan p ON ((dp.id_penagihan = p.id_penagihan)))
          WHERE (date(p.dibuat_pada) = df.today)) AS total_barang_terjual_today,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE ((penagihan.metode_pembayaran)::text = 'Cash'::text)) AS total_pendapatan_cash_all_time,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (((penagihan.metode_pembayaran)::text = 'Cash'::text) AND (date(penagihan.dibuat_pada) >= df.this_month_start))) AS total_pendapatan_cash_this_month,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE ((penagihan.metode_pembayaran)::text = 'Transfer'::text)) AS total_pendapatan_transfer_all_time,
    ( SELECT COALESCE(sum(penagihan.total_uang_diterima), (0)::numeric) AS "coalesce"
           FROM public.penagihan
          WHERE (((penagihan.metode_pembayaran)::text = 'Transfer'::text) AND (date(penagihan.dibuat_pada) >= df.this_month_start))) AS total_pendapatan_transfer_this_month,
    ( SELECT COALESCE(sum(setoran.total_setoran), (0)::numeric) AS "coalesce"
           FROM public.setoran) AS total_setoran_all_time,
    ( SELECT COALESCE(sum(setoran.total_setoran), (0)::numeric) AS "coalesce"
           FROM public.setoran
          WHERE (date(setoran.dibuat_pada) >= df.this_month_start)) AS total_setoran_this_month,
    ( SELECT COALESCE(sum(setoran.total_setoran), (0)::numeric) AS "coalesce"
           FROM public.setoran
          WHERE (date(setoran.dibuat_pada) >= df.this_week_start)) AS total_setoran_this_week,
    ( SELECT COALESCE(sum(setoran.total_setoran), (0)::numeric) AS "coalesce"
           FROM public.setoran
          WHERE (date(setoran.dibuat_pada) = df.today)) AS total_setoran_today
   FROM date_filters df;


ALTER VIEW public.v_dashboard_cards OWNER TO postgres;

--
-- TOC entry 417 (class 1259 OID 24638)
-- Name: v_dashboard_latest_transactions; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_dashboard_latest_transactions AS
 SELECT p.id_penagihan,
    p.dibuat_pada AS waktu_transaksi,
    t.nama_toko,
    t.kecamatan,
    t.kabupaten,
    s.nama_sales,
    p.total_uang_diterima,
    p.metode_pembayaran,
    p.ada_potongan,
    count(dp.id_detail_tagih) AS jumlah_item_berbeda,
    sum(dp.jumlah_terjual) AS total_qty_terjual,
    sum(dp.jumlah_kembali) AS total_qty_kembali,
    sum((dp.jumlah_terjual - dp.jumlah_kembali)) AS net_qty_terjual,
    ( SELECT pr_1.nama_produk
           FROM (public.detail_penagihan dp2
             JOIN public.produk pr_1 ON ((dp2.id_produk = pr_1.id_produk)))
          WHERE (dp2.id_penagihan = p.id_penagihan)
          ORDER BY dp2.jumlah_terjual DESC
         LIMIT 1) AS produk_utama,
    sum((((dp.jumlah_terjual - dp.jumlah_kembali))::numeric * pr.harga_satuan)) AS estimasi_nilai_barang,
    COALESCE(pot.total_potongan, (0)::numeric) AS total_potongan,
    pot.alasan_potongan,
        CASE
            WHEN (p.dibuat_pada >= CURRENT_DATE) THEN 'HARI_INI'::text
            WHEN (p.dibuat_pada >= (CURRENT_DATE - '1 day'::interval)) THEN 'KEMARIN'::text
            WHEN (p.dibuat_pada >= date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone)) THEN 'MINGGU_INI'::text
            WHEN (p.dibuat_pada >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN 'BULAN_INI'::text
            ELSE 'LAMA'::text
        END AS kategori_waktu,
    concat('/transaksi/penagihan/', p.id_penagihan) AS link_detail_transaksi,
    concat('/toko/', t.id_toko) AS link_detail_toko,
    concat('/sales/', s.id_sales) AS link_detail_sales,
    'penagihan'::text AS transaction_type,
    EXTRACT(epoch FROM p.dibuat_pada) AS timestamp_unix,
    to_char(p.dibuat_pada, 'HH24:MI'::text) AS jam_transaksi,
    to_char(p.dibuat_pada, 'DD/MM/YYYY'::text) AS tanggal_transaksi_formatted
   FROM (((((public.penagihan p
     LEFT JOIN public.toko t ON ((p.id_toko = t.id_toko)))
     LEFT JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN public.detail_penagihan dp ON ((p.id_penagihan = dp.id_penagihan)))
     LEFT JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
     LEFT JOIN ( SELECT potongan_penagihan.id_penagihan,
            sum(potongan_penagihan.jumlah_potongan) AS total_potongan,
            string_agg(potongan_penagihan.alasan, '; '::text) AS alasan_potongan
           FROM public.potongan_penagihan
          GROUP BY potongan_penagihan.id_penagihan) pot ON ((p.id_penagihan = pot.id_penagihan)))
  GROUP BY p.id_penagihan, p.dibuat_pada, p.total_uang_diterima, p.metode_pembayaran, p.ada_potongan, t.id_toko, t.nama_toko, t.kecamatan, t.kabupaten, s.id_sales, s.nama_sales, pot.total_potongan, pot.alasan_potongan
  ORDER BY p.dibuat_pada DESC
 LIMIT 10;


ALTER VIEW public.v_dashboard_latest_transactions OWNER TO postgres;

--
-- TOC entry 399 (class 1259 OID 22676)
-- Name: v_dashboard_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_dashboard_overview AS
 WITH summary_stats AS (
         SELECT count(DISTINCT
                CASE
                    WHEN (date(pg.dibuat_pada) = CURRENT_DATE) THEN pg.id_pengiriman
                    ELSE NULL::integer
                END) AS pengiriman_hari_ini,
            count(DISTINCT
                CASE
                    WHEN (date(pen.dibuat_pada) = CURRENT_DATE) THEN pen.id_penagihan
                    ELSE NULL::integer
                END) AS penagihan_hari_ini,
            COALESCE(sum(
                CASE
                    WHEN (date(pen.dibuat_pada) = CURRENT_DATE) THEN pen.total_uang_diterima
                    ELSE NULL::numeric
                END), (0)::numeric) AS pendapatan_hari_ini,
            COALESCE(sum(
                CASE
                    WHEN (date(s.dibuat_pada) = CURRENT_DATE) THEN s.total_setoran
                    ELSE NULL::numeric
                END), (0)::numeric) AS setoran_hari_ini,
            count(DISTINCT
                CASE
                    WHEN (date_trunc('month'::text, pg.dibuat_pada) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN pg.id_pengiriman
                    ELSE NULL::integer
                END) AS pengiriman_bulan_ini,
            count(DISTINCT
                CASE
                    WHEN (date_trunc('month'::text, pen.dibuat_pada) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN pen.id_penagihan
                    ELSE NULL::integer
                END) AS penagihan_bulan_ini,
            COALESCE(sum(
                CASE
                    WHEN (date_trunc('month'::text, pen.dibuat_pada) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN pen.total_uang_diterima
                    ELSE NULL::numeric
                END), (0)::numeric) AS pendapatan_bulan_ini,
            COALESCE(sum(
                CASE
                    WHEN (date_trunc('month'::text, s.dibuat_pada) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN s.total_setoran
                    ELSE NULL::numeric
                END), (0)::numeric) AS setoran_bulan_ini,
            count(DISTINCT pg.id_pengiriman) AS total_pengiriman,
            count(DISTINCT pen.id_penagihan) AS total_penagihan,
            COALESCE(sum(pen.total_uang_diterima), (0)::numeric) AS total_pendapatan,
            COALESCE(sum(s.total_setoran), (0)::numeric) AS total_setoran
           FROM ((public.pengiriman pg
             FULL JOIN public.penagihan pen ON ((1 = 1)))
             FULL JOIN public.setoran s ON ((1 = 1)))
        ), active_counts AS (
         SELECT count(*) AS total_sales_aktif
           FROM public.sales
          WHERE (sales.status_aktif = true)
        ), toko_counts AS (
         SELECT count(*) AS total_toko_aktif
           FROM public.toko
          WHERE (toko.status_toko = true)
        ), produk_counts AS (
         SELECT count(*) AS total_produk_aktif
           FROM public.produk
          WHERE (produk.status_produk = true)
        )
 SELECT CURRENT_DATE AS tanggal_dashboard,
    CURRENT_TIMESTAMP AS waktu_update,
    ss.pengiriman_hari_ini,
    ss.penagihan_hari_ini,
    ss.pendapatan_hari_ini,
    ss.setoran_hari_ini,
    (ss.pendapatan_hari_ini - ss.setoran_hari_ini) AS selisih_hari_ini,
    ss.pengiriman_bulan_ini,
    ss.penagihan_bulan_ini,
    ss.pendapatan_bulan_ini,
    ss.setoran_bulan_ini,
    (ss.pendapatan_bulan_ini - ss.setoran_bulan_ini) AS selisih_bulan_ini,
    ss.total_pengiriman,
    ss.total_penagihan,
    ss.total_pendapatan,
    ss.total_setoran,
    (ss.total_pendapatan - ss.total_setoran) AS selisih_keseluruhan,
    ac.total_sales_aktif,
    tc.total_toko_aktif,
    pc.total_produk_aktif
   FROM (((summary_stats ss
     CROSS JOIN active_counts ac)
     CROSS JOIN toko_counts tc)
     CROSS JOIN produk_counts pc);


ALTER VIEW public.v_dashboard_overview OWNER TO postgres;

--
-- TOC entry 401 (class 1259 OID 22685)
-- Name: v_kabupaten_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_kabupaten_options AS
 SELECT DISTINCT kabupaten
   FROM public.toko
  WHERE ((kabupaten IS NOT NULL) AND ((kabupaten)::text <> ''::text))
  ORDER BY kabupaten;


ALTER VIEW public.v_kabupaten_options OWNER TO postgres;

--
-- TOC entry 402 (class 1259 OID 22689)
-- Name: v_kecamatan_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_kecamatan_options AS
 SELECT DISTINCT kabupaten,
    kecamatan
   FROM public.toko
  WHERE ((kecamatan IS NOT NULL) AND ((kecamatan)::text <> ''::text) AND (kabupaten IS NOT NULL) AND ((kabupaten)::text <> ''::text))
  ORDER BY kabupaten, kecamatan;


ALTER VIEW public.v_kecamatan_options OWNER TO postgres;

--
-- TOC entry 398 (class 1259 OID 22661)
-- Name: v_master_produk; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_master_produk AS
 WITH data_terkirim AS (
         SELECT dp.id_produk,
            sum(dp.jumlah_kirim) AS total_dikirim
           FROM public.detail_pengiriman dp
          GROUP BY dp.id_produk
        ), data_penagihan AS (
         SELECT dp.id_produk,
            sum(dp.jumlah_terjual) AS total_terjual,
            sum(dp.jumlah_kembali) AS total_dikembalikan,
            sum(
                CASE
                    WHEN ((pen.metode_pembayaran)::text = 'Cash'::text) THEN ((dp.jumlah_terjual)::numeric * p_1.harga_satuan)
                    ELSE (0)::numeric
                END) AS total_dibayar_cash,
            sum(
                CASE
                    WHEN ((pen.metode_pembayaran)::text = 'Transfer'::text) THEN ((dp.jumlah_terjual)::numeric * p_1.harga_satuan)
                    ELSE (0)::numeric
                END) AS total_dibayar_transfer
           FROM ((public.detail_penagihan dp
             JOIN public.penagihan pen ON ((dp.id_penagihan = pen.id_penagihan)))
             JOIN public.produk p_1 ON ((dp.id_produk = p_1.id_produk)))
          GROUP BY dp.id_produk
        )
 SELECT p.id_produk,
    p.nama_produk,
    p.harga_satuan,
    p.status_produk,
    p.is_priority,
    p.priority_order,
    p.dibuat_pada,
    p.diperbarui_pada,
    COALESCE(dk.total_dikirim, (0)::bigint) AS total_dikirim,
    COALESCE(dpg.total_terjual, (0)::bigint) AS total_terjual,
    COALESCE(dpg.total_dikembalikan, (0)::bigint) AS total_dikembalikan,
    ((COALESCE(dk.total_dikirim, (0)::bigint) - COALESCE(dpg.total_terjual, (0)::bigint)) - COALESCE(dpg.total_dikembalikan, (0)::bigint)) AS stok_di_toko,
    COALESCE(dpg.total_dibayar_cash, (0)::numeric) AS total_dibayar_cash,
    COALESCE(dpg.total_dibayar_transfer, (0)::numeric) AS total_dibayar_transfer,
    (COALESCE(dpg.total_dibayar_cash, (0)::numeric) + COALESCE(dpg.total_dibayar_transfer, (0)::numeric)) AS total_dibayar,
    ((COALESCE(dk.total_dikirim, (0)::bigint))::numeric * p.harga_satuan) AS nilai_total_dikirim,
    ((COALESCE(dpg.total_terjual, (0)::bigint))::numeric * p.harga_satuan) AS nilai_total_terjual,
    ((COALESCE(dpg.total_dikembalikan, (0)::bigint))::numeric * p.harga_satuan) AS nilai_total_dikembalikan
   FROM ((public.produk p
     LEFT JOIN data_terkirim dk ON ((p.id_produk = dk.id_produk)))
     LEFT JOIN data_penagihan dpg ON ((p.id_produk = dpg.id_produk)))
  ORDER BY p.is_priority DESC, p.priority_order, p.nama_produk;


ALTER VIEW public.v_master_produk OWNER TO postgres;

--
-- TOC entry 409 (class 1259 OID 24494)
-- Name: v_master_sales; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_master_sales AS
 WITH sales_stores AS (
         SELECT toko.id_sales,
            count(toko.id_toko) AS total_stores
           FROM public.toko
          GROUP BY toko.id_sales
        ), shipped_by_product AS (
         SELECT t.id_sales,
            pr.nama_produk,
            sum(dp.jumlah_kirim) AS total_kirim
           FROM (((public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
             JOIN public.toko t ON ((p.id_toko = t.id_toko)))
             JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
          GROUP BY t.id_sales, pr.nama_produk
        ), sales_shipped AS (
         SELECT shipped_by_product.id_sales,
            sum(shipped_by_product.total_kirim) AS quantity_shipped,
            string_agg(((((shipped_by_product.nama_produk)::text || ' ['::text) || shipped_by_product.total_kirim) || ']'::text), ', '::text ORDER BY shipped_by_product.nama_produk) AS detail_shipped
           FROM shipped_by_product
          GROUP BY shipped_by_product.id_sales
        ), sold_by_product AS (
         SELECT t.id_sales,
            pr.nama_produk,
            sum(dnb.jumlah_terjual) AS total_terjual
           FROM (((public.detail_penagihan dnb
             JOIN public.penagihan nb ON ((dnb.id_penagihan = nb.id_penagihan)))
             JOIN public.toko t ON ((nb.id_toko = t.id_toko)))
             JOIN public.produk pr ON ((dnb.id_produk = pr.id_produk)))
          WHERE (dnb.jumlah_terjual > 0)
          GROUP BY t.id_sales, pr.nama_produk
        ), sales_sold AS (
         SELECT sold_by_product.id_sales,
            sum(sold_by_product.total_terjual) AS quantity_sold,
            string_agg(((((sold_by_product.nama_produk)::text || ' ['::text) || sold_by_product.total_terjual) || ']'::text), ', '::text ORDER BY sold_by_product.nama_produk) AS detail_sold
           FROM sold_by_product
          GROUP BY sold_by_product.id_sales
        ), sales_revenue AS (
         SELECT t.id_sales,
            sum(nb.total_uang_diterima) AS total_revenue
           FROM (public.penagihan nb
             JOIN public.toko t ON ((nb.id_toko = t.id_toko)))
          GROUP BY t.id_sales
        )
 SELECT s.id_sales,
    s.nama_sales,
    s.nomor_telepon,
    s.status_aktif,
    s.dibuat_pada,
    s.diperbarui_pada,
    COALESCE(st.total_stores, (0)::bigint) AS total_stores,
    COALESCE(sr.total_revenue, (0)::numeric) AS total_revenue,
    COALESCE(sh.quantity_shipped, (0)::numeric) AS quantity_shipped,
    COALESCE(so.quantity_sold, (0)::numeric) AS quantity_sold,
    COALESCE(sh.detail_shipped, 'Tidak ada produk terkirim'::text) AS detail_shipped,
    COALESCE(so.detail_sold, 'Tidak ada produk terjual'::text) AS detail_sold
   FROM ((((public.sales s
     LEFT JOIN sales_stores st ON ((s.id_sales = st.id_sales)))
     LEFT JOIN sales_shipped sh ON ((s.id_sales = sh.id_sales)))
     LEFT JOIN sales_sold so ON ((s.id_sales = so.id_sales)))
     LEFT JOIN sales_revenue sr ON ((s.id_sales = sr.id_sales)))
  ORDER BY s.nama_sales;


ALTER VIEW public.v_master_sales OWNER TO postgres;

--
-- TOC entry 410 (class 1259 OID 24527)
-- Name: v_master_toko; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_master_toko AS
 WITH shipped_per_product AS (
         SELECT p.id_toko,
            pr.nama_produk,
            sum(dp.jumlah_kirim) AS quantity
           FROM ((public.detail_pengiriman dp
             JOIN public.pengiriman p ON ((dp.id_pengiriman = p.id_pengiriman)))
             JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
          GROUP BY p.id_toko, pr.nama_produk
        ), billed_per_product AS (
         SELECT nb.id_toko,
            pr.nama_produk,
            sum(dnb.jumlah_terjual) AS sold_quantity,
            sum(dnb.jumlah_kembali) AS returned_quantity
           FROM ((public.detail_penagihan dnb
             JOIN public.penagihan nb ON ((dnb.id_penagihan = nb.id_penagihan)))
             JOIN public.produk pr ON ((dnb.id_produk = pr.id_produk)))
          GROUP BY nb.id_toko, pr.nama_produk
        ), stock_flow AS (
         SELECT COALESCE(spp.id_toko, bpp.id_toko) AS id_toko,
            COALESCE(spp.nama_produk, bpp.nama_produk) AS nama_produk,
            COALESCE(spp.quantity, (0)::bigint) AS shipped,
            COALESCE(bpp.sold_quantity, (0)::bigint) AS sold,
            COALESCE(bpp.returned_quantity, (0)::bigint) AS returned,
            (COALESCE(spp.quantity, (0)::bigint) - (COALESCE(bpp.sold_quantity, (0)::bigint) + COALESCE(bpp.returned_quantity, (0)::bigint))) AS remaining
           FROM (shipped_per_product spp
             FULL JOIN billed_per_product bpp ON (((spp.id_toko = bpp.id_toko) AND ((spp.nama_produk)::text = (bpp.nama_produk)::text))))
        ), toko_details AS (
         SELECT stock_flow.id_toko,
            string_agg(
                CASE
                    WHEN (stock_flow.shipped > 0) THEN ((((stock_flow.nama_produk)::text || ' ['::text) || stock_flow.shipped) || ']'::text)
                    ELSE NULL::text
                END, ', '::text ORDER BY stock_flow.nama_produk) AS detail_shipped,
            string_agg(
                CASE
                    WHEN (stock_flow.sold > 0) THEN ((((stock_flow.nama_produk)::text || ' ['::text) || stock_flow.sold) || ']'::text)
                    ELSE NULL::text
                END, ', '::text ORDER BY stock_flow.nama_produk) AS detail_sold,
            string_agg(
                CASE
                    WHEN (stock_flow.remaining > 0) THEN ((((stock_flow.nama_produk)::text || ' ['::text) || stock_flow.remaining) || ']'::text)
                    ELSE NULL::text
                END, ', '::text ORDER BY stock_flow.nama_produk) AS detail_remaining_stock
           FROM stock_flow
          GROUP BY stock_flow.id_toko
        ), toko_aggregates AS (
         SELECT sf.id_toko,
            sum(sf.shipped) AS total_shipped,
            sum(sf.sold) AS total_sold,
            sum(sf.returned) AS total_returned,
            sum(sf.remaining) AS total_remaining,
            sum(((sf.sold)::numeric * ( SELECT produk.harga_satuan
                   FROM public.produk
                  WHERE ((produk.nama_produk)::text = (sf.nama_produk)::text)))) AS estimated_revenue
           FROM stock_flow sf
          GROUP BY sf.id_toko
        ), toko_revenue AS (
         SELECT penagihan.id_toko,
            sum(penagihan.total_uang_diterima) AS total_revenue
           FROM public.penagihan
          GROUP BY penagihan.id_toko
        )
 SELECT t.id_toko,
    t.nama_toko,
    t.no_telepon,
    t.link_gmaps,
    t.kecamatan,
    t.kabupaten,
    t.status_toko,
    t.dibuat_pada,
    s.id_sales,
    s.nama_sales,
    COALESCE(ta.total_shipped, (0)::numeric) AS quantity_shipped,
    COALESCE(ta.total_sold, (0)::numeric) AS quantity_sold,
    COALESCE(ta.total_returned, (0)::numeric) AS quantity_returned,
    COALESCE(ta.total_remaining, (0)::numeric) AS remaining_stock,
    COALESCE(tr.total_revenue, (0)::numeric) AS total_revenue,
    COALESCE(td.detail_shipped, 'Tidak ada produk terkirim'::text) AS detail_shipped,
    COALESCE(td.detail_sold, 'Tidak ada produk terjual'::text) AS detail_sold,
    COALESCE(td.detail_remaining_stock, 'Tidak ada sisa stok'::text) AS detail_remaining_stock
   FROM ((((public.toko t
     JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN toko_aggregates ta ON ((t.id_toko = ta.id_toko)))
     LEFT JOIN toko_details td ON ((t.id_toko = td.id_toko)))
     LEFT JOIN toko_revenue tr ON ((t.id_toko = tr.id_toko)))
  ORDER BY t.nama_toko;


ALTER VIEW public.v_master_toko OWNER TO postgres;

--
-- TOC entry 408 (class 1259 OID 24422)
-- Name: v_penagihan_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_penagihan_dashboard AS
 SELECT p.id_penagihan,
    p.dibuat_pada,
    p.metode_pembayaran,
    p.total_uang_diterima,
    p.ada_potongan,
    t.id_toko,
    t.nama_toko,
    t.no_telepon AS nomor_telepon_toko,
    t.link_gmaps,
    t.kecamatan,
    t.kabupaten,
    s.id_sales,
    s.nama_sales,
    COALESCE(agg.kuantitas_terjual, (0)::bigint) AS kuantitas_terjual,
    COALESCE(agg.kuantitas_kembali, (0)::bigint) AS kuantitas_kembali,
    COALESCE(agg.detail_terjual, 'Tidak ada produk terjual'::text) AS detail_terjual,
    COALESCE(agg.detail_kembali, 'Tidak ada produk kembali'::text) AS detail_kembali
   FROM (((public.penagihan p
     JOIN public.toko t ON ((p.id_toko = t.id_toko)))
     JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN ( SELECT dnb.id_penagihan,
            sum(dnb.jumlah_terjual) AS kuantitas_terjual,
            sum(dnb.jumlah_kembali) AS kuantitas_kembali,
            string_agg(
                CASE
                    WHEN (dnb.jumlah_terjual > 0) THEN ((((pr.nama_produk)::text || ' ['::text) || dnb.jumlah_terjual) || ']'::text)
                    ELSE NULL::text
                END, ', '::text ORDER BY pr.nama_produk) AS detail_terjual,
            string_agg(
                CASE
                    WHEN (dnb.jumlah_kembali > 0) THEN ((((pr.nama_produk)::text || ' ['::text) || dnb.jumlah_kembali) || ']'::text)
                    ELSE NULL::text
                END, ', '::text ORDER BY pr.nama_produk) AS detail_kembali
           FROM (public.detail_penagihan dnb
             JOIN public.produk pr ON ((dnb.id_produk = pr.id_produk)))
          GROUP BY dnb.id_penagihan) agg ON ((p.id_penagihan = agg.id_penagihan)))
  ORDER BY p.dibuat_pada DESC;


ALTER VIEW public.v_penagihan_dashboard OWNER TO postgres;

--
-- TOC entry 407 (class 1259 OID 24391)
-- Name: v_pengiriman_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_pengiriman_dashboard AS
 SELECT p.id_pengiriman,
    p.tanggal_kirim,
    p.dibuat_pada,
    t.id_toko,
    t.nama_toko,
    t.no_telepon AS nomor_telepon_toko,
    t.link_gmaps,
    t.kecamatan,
    t.kabupaten,
    s.id_sales,
    s.nama_sales,
    s.nomor_telepon AS nomor_telepon_sales,
    COALESCE(agg.total_quantity, (0)::bigint) AS total_quantity,
    COALESCE(agg.detail_pengiriman_text, 'Tidak ada detail'::text) AS detail_pengiriman
   FROM (((public.pengiriman p
     JOIN public.toko t ON ((p.id_toko = t.id_toko)))
     JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN ( SELECT dp.id_pengiriman,
            sum(dp.jumlah_kirim) AS total_quantity,
            string_agg(((((pr.nama_produk)::text || ' ['::text) || dp.jumlah_kirim) || ']'::text), ', '::text ORDER BY pr.nama_produk) AS detail_pengiriman_text
           FROM (public.detail_pengiriman dp
             JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
          GROUP BY dp.id_pengiriman) agg ON ((p.id_pengiriman = agg.id_pengiriman)))
  ORDER BY p.tanggal_kirim DESC;


ALTER VIEW public.v_pengiriman_dashboard OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 22698)
-- Name: v_produk_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_produk_options AS
 SELECT DISTINCT id_produk,
    nama_produk,
    harga_satuan,
    status_produk,
    is_priority
   FROM public.produk
  WHERE ((nama_produk IS NOT NULL) AND ((nama_produk)::text <> ''::text))
  ORDER BY is_priority DESC, status_produk DESC, nama_produk;


ALTER VIEW public.v_produk_options OWNER TO postgres;

--
-- TOC entry 405 (class 1259 OID 22702)
-- Name: v_rekonsiliasi_setoran; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_rekonsiliasi_setoran AS
 SELECT s.id_setoran,
    date(s.dibuat_pada) AS tanggal_setoran,
    s.total_setoran,
    s.penerima_setoran,
    COALESCE(cash_summary.total_penagihan_cash, (0)::numeric) AS total_penagihan_cash,
    (s.total_setoran - COALESCE(cash_summary.total_penagihan_cash, (0)::numeric)) AS selisih
   FROM (public.setoran s
     LEFT JOIN ( SELECT date(pen.dibuat_pada) AS tanggal_cash,
            sum(pen.total_uang_diterima) AS total_penagihan_cash
           FROM public.penagihan pen
          WHERE ((pen.metode_pembayaran)::text = 'Cash'::text)
          GROUP BY (date(pen.dibuat_pada))) cash_summary ON ((date(s.dibuat_pada) = cash_summary.tanggal_cash)));


ALTER VIEW public.v_rekonsiliasi_setoran OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 22681)
-- Name: v_sales_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_sales_options AS
 SELECT DISTINCT id_sales,
    nama_sales,
    status_aktif
   FROM public.sales
  WHERE ((nama_sales IS NOT NULL) AND ((nama_sales)::text <> ''::text))
  ORDER BY status_aktif DESC, nama_sales;


ALTER VIEW public.v_sales_options OWNER TO postgres;

--
-- TOC entry 411 (class 1259 OID 24576)
-- Name: v_setoran_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_setoran_dashboard AS
 WITH cash_payments AS (
         SELECT p.dibuat_pada AS event_timestamp,
            'PEMBAYARAN_CASH'::text AS event_type,
            ('Pembayaran cash dari '::text || (t.nama_toko)::text) AS description,
            p.total_uang_diterima AS cash_in,
            0 AS cash_out,
            p.id_penagihan AS related_id,
            t.nama_toko,
            t.kecamatan,
            t.kabupaten,
            s.nama_sales,
            p.total_uang_diterima AS amount,
            'Cash'::text AS transaction_category,
            date(p.dibuat_pada) AS transaction_date
           FROM ((public.penagihan p
             JOIN public.toko t ON ((p.id_toko = t.id_toko)))
             JOIN public.sales s ON ((t.id_sales = s.id_sales)))
          WHERE ((p.metode_pembayaran)::text = 'Cash'::text)
        ), deposits AS (
         SELECT s.dibuat_pada AS event_timestamp,
            'SETORAN'::text AS event_type,
            ('Setoran diterima oleh '::text || (s.penerima_setoran)::text) AS description,
            0 AS cash_in,
            s.total_setoran AS cash_out,
            s.id_setoran AS related_id,
            'N/A'::text AS nama_toko,
            'N/A'::text AS kecamatan,
            'N/A'::text AS kabupaten,
            s.penerima_setoran AS nama_sales,
            s.total_setoran AS amount,
            'Deposit'::text AS transaction_category,
            date(s.dibuat_pada) AS transaction_date
           FROM public.setoran s
        ), cash_flow_events AS (
         SELECT cash_payments.event_timestamp,
            cash_payments.event_type,
            cash_payments.description,
            cash_payments.cash_in,
            cash_payments.cash_out,
            cash_payments.related_id,
            cash_payments.nama_toko,
            cash_payments.kecamatan,
            cash_payments.kabupaten,
            cash_payments.nama_sales,
            cash_payments.amount,
            cash_payments.transaction_category,
            cash_payments.transaction_date
           FROM cash_payments
        UNION ALL
         SELECT deposits.event_timestamp,
            deposits.event_type,
            deposits.description,
            deposits.cash_in,
            deposits.cash_out,
            deposits.related_id,
            deposits.nama_toko,
            deposits.kecamatan,
            deposits.kabupaten,
            deposits.nama_sales,
            deposits.amount,
            deposits.transaction_category,
            deposits.transaction_date
           FROM deposits
        ), events_with_balance AS (
         SELECT c.event_timestamp,
            c.event_type,
            c.description,
            c.related_id,
            c.cash_in,
            c.cash_out,
            c.nama_toko,
            c.kecamatan,
            c.kabupaten,
            c.nama_sales,
            c.amount,
            c.transaction_category,
            c.transaction_date,
            sum((c.cash_in - c.cash_out)) OVER (ORDER BY c.event_timestamp, c.related_id) AS running_balance
           FROM cash_flow_events c
        )
 SELECT related_id AS id_setoran,
    event_timestamp AS waktu_setoran,
    transaction_date AS tanggal_setoran,
    amount AS total_setoran,
    nama_sales AS penerima_setoran,
    cash_in AS pembayaran_cash_hari_ini,
    0 AS pembayaran_transfer_hari_ini,
    cash_in AS total_pembayaran_hari_ini,
    (cash_in - cash_out) AS selisih_cash_setoran,
        CASE
            WHEN (cash_in > cash_out) THEN 'KURANG_SETOR'::text
            WHEN (cash_in < cash_out) THEN 'LEBIH_SETOR'::text
            ELSE 'SESUAI'::text
        END AS status_setoran,
    event_type,
    description,
    transaction_category,
    nama_toko,
    kecamatan,
    kabupaten,
    running_balance AS cash_balance_kumulatif,
        CASE
            WHEN (event_type = 'PEMBAYARAN_CASH'::text) THEN 1
            ELSE 0
        END AS jumlah_transaksi_cash,
    0 AS jumlah_transaksi_transfer,
        CASE
            WHEN (running_balance > (1000000)::numeric) THEN 'CASH_TINGGI'::text
            WHEN (running_balance < (0)::numeric) THEN 'CASH_NEGATIF'::text
            ELSE 'CASH_NORMAL'::text
        END AS status_arus_kas
   FROM events_with_balance
  ORDER BY event_timestamp DESC, related_id DESC;


ALTER VIEW public.v_setoran_dashboard OWNER TO postgres;

--
-- TOC entry 403 (class 1259 OID 22693)
-- Name: v_toko_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_toko_options AS
 SELECT DISTINCT t.id_toko,
    t.nama_toko,
    t.kecamatan,
    t.kabupaten,
    s.nama_sales,
    t.status_toko
   FROM (public.toko t
     JOIN public.sales s ON ((t.id_sales = s.id_sales)))
  WHERE ((t.nama_toko IS NOT NULL) AND ((t.nama_toko)::text <> ''::text))
  ORDER BY t.status_toko DESC, s.nama_sales, t.nama_toko;


ALTER VIEW public.v_toko_options OWNER TO postgres;

--
-- TOC entry 3746 (class 2604 OID 17338)
-- Name: detail_penagihan id_detail_tagih; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan ALTER COLUMN id_detail_tagih SET DEFAULT nextval('public.detail_penagihan_id_detail_tagih_seq'::regclass);


--
-- TOC entry 3739 (class 2604 OID 17319)
-- Name: detail_pengiriman id_detail_kirim; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman ALTER COLUMN id_detail_kirim SET DEFAULT nextval('public.detail_pengiriman_id_detail_kirim_seq'::regclass);


--
-- TOC entry 3742 (class 2604 OID 17329)
-- Name: penagihan id_penagihan; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penagihan ALTER COLUMN id_penagihan SET DEFAULT nextval('public.penagihan_id_penagihan_seq'::regclass);


--
-- TOC entry 3735 (class 2604 OID 17311)
-- Name: pengiriman id_pengiriman; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman ALTER COLUMN id_pengiriman SET DEFAULT nextval('public.pengiriman_id_pengiriman_seq'::regclass);


--
-- TOC entry 3749 (class 2604 OID 17348)
-- Name: potongan_penagihan id_potongan; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potongan_penagihan ALTER COLUMN id_potongan SET DEFAULT nextval('public.potongan_penagihan_id_potongan_seq'::regclass);


--
-- TOC entry 3725 (class 2604 OID 17285)
-- Name: produk id_produk; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk ALTER COLUMN id_produk SET DEFAULT nextval('public.produk_id_produk_seq'::regclass);


--
-- TOC entry 3721 (class 2604 OID 17275)
-- Name: sales id_sales; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id_sales SET DEFAULT nextval('public.sales_id_sales_seq'::regclass);


--
-- TOC entry 3752 (class 2604 OID 17356)
-- Name: setoran id_setoran; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setoran ALTER COLUMN id_setoran SET DEFAULT nextval('public.setoran_id_setoran_seq'::regclass);


--
-- TOC entry 3755 (class 2604 OID 17648)
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- TOC entry 3731 (class 2604 OID 17295)
-- Name: toko id_toko; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko ALTER COLUMN id_toko SET DEFAULT nextval('public.toko_id_toko_seq'::regclass);


--
-- TOC entry 4056 (class 0 OID 17330)
-- Dependencies: 390
-- Data for Name: detail_penagihan; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- TOC entry 4150 (class 0 OID 0)
-- Dependencies: 391
-- Name: detail_penagihan_id_detail_tagih_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detail_penagihan_id_detail_tagih_seq', 80, true);


--
-- TOC entry 4151 (class 0 OID 0)
-- Dependencies: 387
-- Name: detail_pengiriman_id_detail_kirim_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detail_pengiriman_id_detail_kirim_seq', 4563, true);


--
-- TOC entry 4152 (class 0 OID 0)
-- Dependencies: 389
-- Name: penagihan_id_penagihan_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.penagihan_id_penagihan_seq', 32, true);


--
-- TOC entry 4153 (class 0 OID 0)
-- Dependencies: 385
-- Name: pengiriman_id_pengiriman_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pengiriman_id_pengiriman_seq', 928, true);


--
-- TOC entry 4154 (class 0 OID 0)
-- Dependencies: 393
-- Name: potongan_penagihan_id_potongan_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.potongan_penagihan_id_potongan_seq', 1, false);


--
-- TOC entry 4155 (class 0 OID 0)
-- Dependencies: 381
-- Name: produk_id_produk_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.produk_id_produk_seq', 5, true);


--
-- TOC entry 4156 (class 0 OID 0)
-- Dependencies: 379
-- Name: sales_id_sales_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_sales_seq', 5, true);


--
-- TOC entry 4157 (class 0 OID 0)
-- Dependencies: 395
-- Name: setoran_id_setoran_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.setoran_id_setoran_seq', 1, true);


--
-- TOC entry 4158 (class 0 OID 0)
-- Dependencies: 396
-- Name: system_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_logs_id_seq', 5, true);


--
-- TOC entry 4159 (class 0 OID 0)
-- Dependencies: 383
-- Name: toko_id_toko_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.toko_id_toko_seq', 911, true);


--
-- TOC entry 3832 (class 2606 OID 17360)
-- Name: detail_penagihan detail_penagihan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan
    ADD CONSTRAINT detail_penagihan_pkey PRIMARY KEY (id_detail_tagih);


--
-- TOC entry 3809 (class 2606 OID 17362)
-- Name: detail_pengiriman detail_pengiriman_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman
    ADD CONSTRAINT detail_pengiriman_pkey PRIMARY KEY (id_detail_kirim);


--
-- TOC entry 3830 (class 2606 OID 17364)
-- Name: penagihan penagihan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penagihan
    ADD CONSTRAINT penagihan_pkey PRIMARY KEY (id_penagihan);


--
-- TOC entry 3807 (class 2606 OID 17366)
-- Name: pengiriman pengiriman_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman
    ADD CONSTRAINT pengiriman_pkey PRIMARY KEY (id_pengiriman);


--
-- TOC entry 3842 (class 2606 OID 17368)
-- Name: potongan_penagihan potongan_penagihan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potongan_penagihan
    ADD CONSTRAINT potongan_penagihan_pkey PRIMARY KEY (id_potongan);


--
-- TOC entry 3784 (class 2606 OID 17370)
-- Name: produk produk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk
    ADD CONSTRAINT produk_pkey PRIMARY KEY (id_produk);


--
-- TOC entry 3774 (class 2606 OID 17372)
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id_sales);


--
-- TOC entry 3852 (class 2606 OID 17374)
-- Name: setoran setoran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setoran
    ADD CONSTRAINT setoran_pkey PRIMARY KEY (id_setoran);


--
-- TOC entry 3854 (class 2606 OID 17653)
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3799 (class 2606 OID 17376)
-- Name: toko toko_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_pkey PRIMARY KEY (id_toko);


--
-- TOC entry 3843 (class 1259 OID 22792)
-- Name: idx_cash_flow_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_flow_tanggal ON public.setoran USING btree (date(dibuat_pada));


--
-- TOC entry 3833 (class 1259 OID 17461)
-- Name: idx_detail_penagihan_penagihan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_penagihan ON public.detail_penagihan USING btree (id_penagihan);


--
-- TOC entry 3834 (class 1259 OID 17774)
-- Name: idx_detail_penagihan_penagihan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_penagihan_id ON public.detail_penagihan USING btree (id_penagihan);


--
-- TOC entry 3835 (class 1259 OID 22600)
-- Name: idx_detail_penagihan_produk_aggregation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_produk_aggregation ON public.detail_penagihan USING btree (id_produk, jumlah_terjual, jumlah_kembali);


--
-- TOC entry 3836 (class 1259 OID 17775)
-- Name: idx_detail_penagihan_produk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_produk_id ON public.detail_penagihan USING btree (id_produk);


--
-- TOC entry 3837 (class 1259 OID 17776)
-- Name: idx_detail_penagihan_quantities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_quantities ON public.detail_penagihan USING btree (id_penagihan, jumlah_terjual, jumlah_kembali);


--
-- TOC entry 3838 (class 1259 OID 17874)
-- Name: idx_detail_penagihan_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_sales ON public.detail_penagihan USING btree (id_produk, jumlah_terjual, jumlah_kembali, dibuat_pada DESC);


--
-- TOC entry 3810 (class 1259 OID 17611)
-- Name: idx_detail_pengiriman_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_composite ON public.detail_pengiriman USING btree (id_pengiriman, id_produk, jumlah_kirim);


--
-- TOC entry 3811 (class 1259 OID 17873)
-- Name: idx_detail_pengiriman_movement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_movement ON public.detail_pengiriman USING btree (id_produk, jumlah_kirim, dibuat_pada DESC);


--
-- TOC entry 3812 (class 1259 OID 17459)
-- Name: idx_detail_pengiriman_pengiriman; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_pengiriman ON public.detail_pengiriman USING btree (id_pengiriman);


--
-- TOC entry 3813 (class 1259 OID 17871)
-- Name: idx_detail_pengiriman_pengiriman_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_pengiriman_id ON public.detail_pengiriman USING btree (id_pengiriman);


--
-- TOC entry 3814 (class 1259 OID 22599)
-- Name: idx_detail_pengiriman_produk_aggregation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_produk_aggregation ON public.detail_pengiriman USING btree (id_produk, jumlah_kirim);


--
-- TOC entry 3815 (class 1259 OID 17870)
-- Name: idx_detail_pengiriman_produk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_produk_id ON public.detail_pengiriman USING btree (id_produk);


--
-- TOC entry 3816 (class 1259 OID 17872)
-- Name: idx_detail_pengiriman_quantities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_quantities ON public.detail_pengiriman USING btree (id_produk, jumlah_kirim);


--
-- TOC entry 3817 (class 1259 OID 17771)
-- Name: idx_penagihan_ada_potongan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_ada_potongan ON public.penagihan USING btree (ada_potongan, dibuat_pada DESC);


--
-- TOC entry 3818 (class 1259 OID 17773)
-- Name: idx_penagihan_amount; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_amount ON public.penagihan USING btree (total_uang_diterima, dibuat_pada DESC);


--
-- TOC entry 3819 (class 1259 OID 17768)
-- Name: idx_penagihan_composite_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_composite_search ON public.penagihan USING btree (id_toko, dibuat_pada DESC);


--
-- TOC entry 3820 (class 1259 OID 17769)
-- Name: idx_penagihan_date_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_date_filters ON public.penagihan USING btree (dibuat_pada DESC, diperbarui_pada);


--
-- TOC entry 3821 (class 1259 OID 22940)
-- Name: idx_penagihan_dibuat_pada; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_dibuat_pada ON public.penagihan USING btree (dibuat_pada);


--
-- TOC entry 3822 (class 1259 OID 22851)
-- Name: idx_penagihan_dibuat_pada_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_dibuat_pada_date ON public.penagihan USING btree (date(dibuat_pada));


--
-- TOC entry 3823 (class 1259 OID 17772)
-- Name: idx_penagihan_filters_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_filters_composite ON public.penagihan USING btree (metode_pembayaran, ada_potongan, dibuat_pada DESC);


--
-- TOC entry 3824 (class 1259 OID 22708)
-- Name: idx_penagihan_metode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_metode ON public.penagihan USING btree (metode_pembayaran);


--
-- TOC entry 3825 (class 1259 OID 17770)
-- Name: idx_penagihan_metode_pembayaran; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_metode_pembayaran ON public.penagihan USING btree (metode_pembayaran, dibuat_pada DESC);


--
-- TOC entry 3826 (class 1259 OID 22707)
-- Name: idx_penagihan_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_tanggal ON public.penagihan USING btree (date(dibuat_pada));


--
-- TOC entry 3827 (class 1259 OID 22793)
-- Name: idx_penagihan_tanggal_metode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_tanggal_metode ON public.penagihan USING btree (date(dibuat_pada), metode_pembayaran);


--
-- TOC entry 3828 (class 1259 OID 17460)
-- Name: idx_penagihan_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_toko ON public.penagihan USING btree (id_toko);


--
-- TOC entry 3800 (class 1259 OID 20953)
-- Name: idx_pengiriman_autorestock; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_autorestock ON public.pengiriman USING btree (is_autorestock);


--
-- TOC entry 3801 (class 1259 OID 17608)
-- Name: idx_pengiriman_composite_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_composite_search ON public.pengiriman USING btree (id_toko, tanggal_kirim DESC);


--
-- TOC entry 3802 (class 1259 OID 17610)
-- Name: idx_pengiriman_date_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_date_range ON public.pengiriman USING btree (tanggal_kirim);


--
-- TOC entry 3803 (class 1259 OID 22709)
-- Name: idx_pengiriman_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_tanggal ON public.pengiriman USING btree (tanggal_kirim);


--
-- TOC entry 3804 (class 1259 OID 17609)
-- Name: idx_pengiriman_tanggal_kirim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_tanggal_kirim ON public.pengiriman USING btree (tanggal_kirim DESC);


--
-- TOC entry 3805 (class 1259 OID 17458)
-- Name: idx_pengiriman_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_toko ON public.pengiriman USING btree (id_toko);


--
-- TOC entry 3839 (class 1259 OID 17778)
-- Name: idx_potongan_penagihan_amount; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_potongan_penagihan_amount ON public.potongan_penagihan USING btree (jumlah_potongan, id_penagihan);


--
-- TOC entry 3840 (class 1259 OID 17777)
-- Name: idx_potongan_penagihan_penagihan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_potongan_penagihan_penagihan_id ON public.potongan_penagihan USING btree (id_penagihan);


--
-- TOC entry 3775 (class 1259 OID 17868)
-- Name: idx_produk_date_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_date_filters ON public.produk USING btree (dibuat_pada DESC, diperbarui_pada);


--
-- TOC entry 3776 (class 1259 OID 17867)
-- Name: idx_produk_filters_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_filters_composite ON public.produk USING btree (status_produk, is_priority, harga_satuan, dibuat_pada DESC);


--
-- TOC entry 3777 (class 1259 OID 17869)
-- Name: idx_produk_nama_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_nama_gin ON public.produk USING gin (to_tsvector('indonesian'::regconfig, (nama_produk)::text));


--
-- TOC entry 3778 (class 1259 OID 17863)
-- Name: idx_produk_nama_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_nama_search ON public.produk USING btree (nama_produk);


--
-- TOC entry 3779 (class 1259 OID 17866)
-- Name: idx_produk_price_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_price_filters ON public.produk USING btree (harga_satuan, status_produk);


--
-- TOC entry 3780 (class 1259 OID 17865)
-- Name: idx_produk_priority_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_priority_filters ON public.produk USING btree (is_priority, priority_order, dibuat_pada DESC);


--
-- TOC entry 3781 (class 1259 OID 22601)
-- Name: idx_produk_search_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_search_filters ON public.produk USING btree (status_produk, is_priority, nama_produk);


--
-- TOC entry 3782 (class 1259 OID 17864)
-- Name: idx_produk_status_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_status_filters ON public.produk USING btree (status_produk, dibuat_pada DESC);


--
-- TOC entry 3764 (class 1259 OID 17961)
-- Name: idx_sales_active_name_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_active_name_composite ON public.sales USING btree (status_aktif, nama_sales) WHERE (status_aktif = true);


--
-- TOC entry 3765 (class 1259 OID 17965)
-- Name: idx_sales_advanced_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_advanced_filter ON public.sales USING btree (status_aktif, nomor_telepon, dibuat_pada DESC);


--
-- TOC entry 3766 (class 1259 OID 17963)
-- Name: idx_sales_date_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_date_range ON public.sales USING btree (dibuat_pada, status_aktif);


--
-- TOC entry 3767 (class 1259 OID 17964)
-- Name: idx_sales_fulltext_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_fulltext_name ON public.sales USING gin (to_tsvector('indonesian'::regconfig, (nama_sales)::text));


--
-- TOC entry 3768 (class 1259 OID 17580)
-- Name: idx_sales_nama_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_nama_sales ON public.sales USING btree (nama_sales);


--
-- TOC entry 3769 (class 1259 OID 17614)
-- Name: idx_sales_pengiriman_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_pengiriman_active ON public.sales USING btree (status_aktif, nama_sales) WHERE (status_aktif = true);


--
-- TOC entry 3770 (class 1259 OID 17962)
-- Name: idx_sales_phone_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_phone_search ON public.sales USING btree (nomor_telepon) WHERE (nomor_telepon IS NOT NULL);


--
-- TOC entry 3771 (class 1259 OID 17462)
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_status ON public.sales USING btree (status_aktif);


--
-- TOC entry 3772 (class 1259 OID 17581)
-- Name: idx_sales_status_aktif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_status_aktif ON public.sales USING btree (status_aktif);


--
-- TOC entry 3844 (class 1259 OID 18161)
-- Name: idx_setoran_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_created ON public.setoran USING btree (dibuat_pada DESC);


--
-- TOC entry 3845 (class 1259 OID 22941)
-- Name: idx_setoran_dibuat_pada; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_dibuat_pada ON public.setoran USING btree (dibuat_pada);


--
-- TOC entry 3846 (class 1259 OID 22852)
-- Name: idx_setoran_dibuat_pada_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_dibuat_pada_date ON public.setoran USING btree (date(dibuat_pada));


--
-- TOC entry 3847 (class 1259 OID 18159)
-- Name: idx_setoran_penerima; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_penerima ON public.setoran USING btree (penerima_setoran);


--
-- TOC entry 3848 (class 1259 OID 18162)
-- Name: idx_setoran_penerima_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_penerima_created ON public.setoran USING btree (penerima_setoran, dibuat_pada DESC);


--
-- TOC entry 3849 (class 1259 OID 22710)
-- Name: idx_setoran_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_tanggal ON public.setoran USING btree (date(dibuat_pada));


--
-- TOC entry 3850 (class 1259 OID 18160)
-- Name: idx_setoran_total; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_total ON public.setoran USING btree (total_setoran);


--
-- TOC entry 3785 (class 1259 OID 17575)
-- Name: idx_toko_composite_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_composite_filters ON public.toko USING btree (status_toko, id_sales, kabupaten, kecamatan);


--
-- TOC entry 3786 (class 1259 OID 17577)
-- Name: idx_toko_id_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_id_sales ON public.toko USING btree (id_sales);


--
-- TOC entry 3787 (class 1259 OID 17578)
-- Name: idx_toko_kabupaten; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_kabupaten ON public.toko USING btree (kabupaten);


--
-- TOC entry 3788 (class 1259 OID 17579)
-- Name: idx_toko_kecamatan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_kecamatan ON public.toko USING btree (kecamatan);


--
-- TOC entry 3789 (class 1259 OID 17454)
-- Name: idx_toko_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_location ON public.toko USING btree (kabupaten, kecamatan);


--
-- TOC entry 3790 (class 1259 OID 17613)
-- Name: idx_toko_nama_fulltext_pengiriman; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_nama_fulltext_pengiriman ON public.toko USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text)) WHERE (status_toko = true);


--
-- TOC entry 3791 (class 1259 OID 17453)
-- Name: idx_toko_nama_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_nama_search ON public.toko USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text));


--
-- TOC entry 3792 (class 1259 OID 17574)
-- Name: idx_toko_nama_toko_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_nama_toko_gin ON public.toko USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text));


--
-- TOC entry 3793 (class 1259 OID 17612)
-- Name: idx_toko_pengiriman_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_pengiriman_search ON public.toko USING btree (id_sales, kabupaten, kecamatan, status_toko);


--
-- TOC entry 3794 (class 1259 OID 17455)
-- Name: idx_toko_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_sales ON public.toko USING btree (id_sales);


--
-- TOC entry 3795 (class 1259 OID 17457)
-- Name: idx_toko_search_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_search_filter ON public.toko USING btree (id_sales, kabupaten, kecamatan, status_toko);


--
-- TOC entry 3796 (class 1259 OID 17456)
-- Name: idx_toko_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_status ON public.toko USING btree (status_toko);


--
-- TOC entry 3797 (class 1259 OID 17576)
-- Name: idx_toko_status_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_status_toko ON public.toko USING btree (status_toko);


--
-- TOC entry 3872 (class 2620 OID 17483)
-- Name: detail_penagihan refresh_on_penagihan_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_on_penagihan_change AFTER INSERT OR DELETE OR UPDATE ON public.detail_penagihan FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_toko_aggregates();


--
-- TOC entry 3869 (class 2620 OID 17482)
-- Name: detail_pengiriman refresh_on_pengiriman_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_on_pengiriman_change AFTER INSERT OR DELETE OR UPDATE ON public.detail_pengiriman FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_toko_aggregates();


--
-- TOC entry 3865 (class 2620 OID 17484)
-- Name: toko refresh_on_toko_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_on_toko_change AFTER INSERT OR DELETE OR UPDATE ON public.toko FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_toko_aggregates();


--
-- TOC entry 3863 (class 2620 OID 26883)
-- Name: sales sales_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sales_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.sales FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_sales_aggregates();


--
-- TOC entry 3866 (class 2620 OID 26884)
-- Name: toko toko_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER toko_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.toko FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_sales_aggregates();


--
-- TOC entry 3871 (class 2620 OID 17811)
-- Name: penagihan tr_penagihan_refresh_views; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_penagihan_refresh_views AFTER INSERT OR DELETE OR UPDATE ON public.penagihan FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_penagihan_views();


--
-- TOC entry 3873 (class 2620 OID 17813)
-- Name: potongan_penagihan tr_potongan_penagihan_refresh_views; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_potongan_penagihan_refresh_views AFTER INSERT OR DELETE OR UPDATE ON public.potongan_penagihan FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_penagihan_views();


--
-- TOC entry 3870 (class 2620 OID 17641)
-- Name: detail_pengiriman trigger_refresh_pengiriman_on_detail; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_detail AFTER INSERT OR DELETE OR UPDATE ON public.detail_pengiriman FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3868 (class 2620 OID 17640)
-- Name: pengiriman trigger_refresh_pengiriman_on_pengiriman; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_pengiriman AFTER INSERT OR DELETE OR UPDATE ON public.pengiriman FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3864 (class 2620 OID 17643)
-- Name: sales trigger_refresh_pengiriman_on_sales; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_sales AFTER UPDATE ON public.sales FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3867 (class 2620 OID 17642)
-- Name: toko trigger_refresh_pengiriman_on_toko; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_toko AFTER UPDATE ON public.toko FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3860 (class 2606 OID 17382)
-- Name: detail_penagihan detail_penagihan_id_penagihan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan
    ADD CONSTRAINT detail_penagihan_id_penagihan_fkey FOREIGN KEY (id_penagihan) REFERENCES public.penagihan(id_penagihan) ON DELETE CASCADE;


--
-- TOC entry 3861 (class 2606 OID 17387)
-- Name: detail_penagihan detail_penagihan_id_produk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan
    ADD CONSTRAINT detail_penagihan_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE;


--
-- TOC entry 3857 (class 2606 OID 17392)
-- Name: detail_pengiriman detail_pengiriman_id_pengiriman_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman
    ADD CONSTRAINT detail_pengiriman_id_pengiriman_fkey FOREIGN KEY (id_pengiriman) REFERENCES public.pengiriman(id_pengiriman) ON DELETE CASCADE;


--
-- TOC entry 3858 (class 2606 OID 17397)
-- Name: detail_pengiriman detail_pengiriman_id_produk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman
    ADD CONSTRAINT detail_pengiriman_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE;


--
-- TOC entry 3859 (class 2606 OID 17402)
-- Name: penagihan penagihan_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penagihan
    ADD CONSTRAINT penagihan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id_toko) ON DELETE CASCADE;


--
-- TOC entry 3856 (class 2606 OID 17412)
-- Name: pengiriman pengiriman_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman
    ADD CONSTRAINT pengiriman_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id_toko) ON DELETE CASCADE;


--
-- TOC entry 3862 (class 2606 OID 17417)
-- Name: potongan_penagihan potongan_penagihan_id_penagihan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potongan_penagihan
    ADD CONSTRAINT potongan_penagihan_id_penagihan_fkey FOREIGN KEY (id_penagihan) REFERENCES public.penagihan(id_penagihan) ON DELETE CASCADE;


--
-- TOC entry 3855 (class 2606 OID 17422)
-- Name: toko toko_id_sales_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_id_sales_fkey FOREIGN KEY (id_sales) REFERENCES public.sales(id_sales) ON DELETE CASCADE;


--
-- TOC entry 4070 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 4071 (class 0 OID 0)
-- Dependencies: 419
-- Name: FUNCTION count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO anon;
GRANT ALL ON FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO authenticated;
GRANT ALL ON FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO service_role;


--
-- TOC entry 4072 (class 0 OID 0)
-- Dependencies: 500
-- Name: FUNCTION get_setoran_filter_options(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_setoran_filter_options() TO anon;
GRANT ALL ON FUNCTION public.get_setoran_filter_options() TO authenticated;
GRANT ALL ON FUNCTION public.get_setoran_filter_options() TO service_role;


--
-- TOC entry 4073 (class 0 OID 0)
-- Dependencies: 509
-- Name: FUNCTION get_toko_filter_options_simple(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_toko_filter_options_simple() TO anon;
GRANT ALL ON FUNCTION public.get_toko_filter_options_simple() TO authenticated;
GRANT ALL ON FUNCTION public.get_toko_filter_options_simple() TO service_role;


--
-- TOC entry 4074 (class 0 OID 0)
-- Dependencies: 534
-- Name: FUNCTION get_toko_search_suggestions_simple(search_term text, max_results integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) TO anon;
GRANT ALL ON FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) TO service_role;


--
-- TOC entry 4076 (class 0 OID 0)
-- Dependencies: 427
-- Name: FUNCTION refresh_penagihan_materialized_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_penagihan_materialized_views() TO anon;
GRANT ALL ON FUNCTION public.refresh_penagihan_materialized_views() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_penagihan_materialized_views() TO service_role;


--
-- TOC entry 4078 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION rpc_count_products(search_term text, filter_status boolean, filter_priority boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rpc_count_products(search_term text, filter_status boolean, filter_priority boolean) TO anon;
GRANT ALL ON FUNCTION public.rpc_count_products(search_term text, filter_status boolean, filter_priority boolean) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_count_products(search_term text, filter_status boolean, filter_priority boolean) TO service_role;


--
-- TOC entry 4080 (class 0 OID 0)
-- Dependencies: 458
-- Name: FUNCTION rpc_get_product_by_id(product_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rpc_get_product_by_id(product_id integer) TO anon;
GRANT ALL ON FUNCTION public.rpc_get_product_by_id(product_id integer) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_get_product_by_id(product_id integer) TO service_role;


--
-- TOC entry 4082 (class 0 OID 0)
-- Dependencies: 525
-- Name: FUNCTION rpc_get_product_statistics(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rpc_get_product_statistics() TO anon;
GRANT ALL ON FUNCTION public.rpc_get_product_statistics() TO authenticated;
GRANT ALL ON FUNCTION public.rpc_get_product_statistics() TO service_role;


--
-- TOC entry 4084 (class 0 OID 0)
-- Dependencies: 501
-- Name: FUNCTION rpc_refresh_product_cache(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rpc_refresh_product_cache() TO anon;
GRANT ALL ON FUNCTION public.rpc_refresh_product_cache() TO authenticated;
GRANT ALL ON FUNCTION public.rpc_refresh_product_cache() TO service_role;


--
-- TOC entry 4086 (class 0 OID 0)
-- Dependencies: 454
-- Name: FUNCTION rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer) TO anon;
GRANT ALL ON FUNCTION public.rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.rpc_search_products(search_term text, filter_status boolean, filter_priority boolean, sort_column text, sort_direction text, page_limit integer, page_offset integer) TO service_role;


--
-- TOC entry 4087 (class 0 OID 0)
-- Dependencies: 515
-- Name: FUNCTION search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) TO anon;
GRANT ALL ON FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) TO authenticated;
GRANT ALL ON FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) TO service_role;


--
-- TOC entry 4088 (class 0 OID 0)
-- Dependencies: 536
-- Name: FUNCTION search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO anon;
GRANT ALL ON FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO service_role;


--
-- TOC entry 4089 (class 0 OID 0)
-- Dependencies: 443
-- Name: FUNCTION search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO anon;
GRANT ALL ON FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO service_role;


--
-- TOC entry 4090 (class 0 OID 0)
-- Dependencies: 519
-- Name: FUNCTION search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO anon;
GRANT ALL ON FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO authenticated;
GRANT ALL ON FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO service_role;


--
-- TOC entry 4091 (class 0 OID 0)
-- Dependencies: 422
-- Name: FUNCTION search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) TO anon;
GRANT ALL ON FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) TO service_role;


--
-- TOC entry 4092 (class 0 OID 0)
-- Dependencies: 437
-- Name: FUNCTION trigger_refresh_penagihan_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_penagihan_views() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_penagihan_views() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_penagihan_views() TO service_role;


--
-- TOC entry 4093 (class 0 OID 0)
-- Dependencies: 433
-- Name: FUNCTION trigger_refresh_pengiriman_mv(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_pengiriman_mv() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_pengiriman_mv() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_pengiriman_mv() TO service_role;


--
-- TOC entry 4094 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION trigger_refresh_produk_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_produk_views() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_produk_views() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_produk_views() TO service_role;


--
-- TOC entry 4095 (class 0 OID 0)
-- Dependencies: 470
-- Name: FUNCTION trigger_refresh_sales_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_sales_aggregates() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_sales_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_sales_aggregates() TO service_role;


--
-- TOC entry 4096 (class 0 OID 0)
-- Dependencies: 503
-- Name: FUNCTION trigger_refresh_toko_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_toko_aggregates() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_toko_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_toko_aggregates() TO service_role;


--
-- TOC entry 4097 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE detail_penagihan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.detail_penagihan TO anon;
GRANT ALL ON TABLE public.detail_penagihan TO authenticated;
GRANT ALL ON TABLE public.detail_penagihan TO service_role;


--
-- TOC entry 4099 (class 0 OID 0)
-- Dependencies: 391
-- Name: SEQUENCE detail_penagihan_id_detail_tagih_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.detail_penagihan_id_detail_tagih_seq TO anon;
GRANT ALL ON SEQUENCE public.detail_penagihan_id_detail_tagih_seq TO authenticated;
GRANT ALL ON SEQUENCE public.detail_penagihan_id_detail_tagih_seq TO service_role;


--
-- TOC entry 4100 (class 0 OID 0)
-- Dependencies: 386
-- Name: TABLE detail_pengiriman; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.detail_pengiriman TO anon;
GRANT ALL ON TABLE public.detail_pengiriman TO authenticated;
GRANT ALL ON TABLE public.detail_pengiriman TO service_role;


--
-- TOC entry 4102 (class 0 OID 0)
-- Dependencies: 387
-- Name: SEQUENCE detail_pengiriman_id_detail_kirim_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.detail_pengiriman_id_detail_kirim_seq TO anon;
GRANT ALL ON SEQUENCE public.detail_pengiriman_id_detail_kirim_seq TO authenticated;
GRANT ALL ON SEQUENCE public.detail_pengiriman_id_detail_kirim_seq TO service_role;


--
-- TOC entry 4103 (class 0 OID 0)
-- Dependencies: 388
-- Name: TABLE penagihan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penagihan TO anon;
GRANT ALL ON TABLE public.penagihan TO authenticated;
GRANT ALL ON TABLE public.penagihan TO service_role;


--
-- TOC entry 4105 (class 0 OID 0)
-- Dependencies: 389
-- Name: SEQUENCE penagihan_id_penagihan_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.penagihan_id_penagihan_seq TO anon;
GRANT ALL ON SEQUENCE public.penagihan_id_penagihan_seq TO authenticated;
GRANT ALL ON SEQUENCE public.penagihan_id_penagihan_seq TO service_role;


--
-- TOC entry 4108 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE pengiriman; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pengiriman TO anon;
GRANT ALL ON TABLE public.pengiriman TO authenticated;
GRANT ALL ON TABLE public.pengiriman TO service_role;


--
-- TOC entry 4110 (class 0 OID 0)
-- Dependencies: 385
-- Name: SEQUENCE pengiriman_id_pengiriman_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pengiriman_id_pengiriman_seq TO anon;
GRANT ALL ON SEQUENCE public.pengiriman_id_pengiriman_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pengiriman_id_pengiriman_seq TO service_role;


--
-- TOC entry 4111 (class 0 OID 0)
-- Dependencies: 392
-- Name: TABLE potongan_penagihan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.potongan_penagihan TO anon;
GRANT ALL ON TABLE public.potongan_penagihan TO authenticated;
GRANT ALL ON TABLE public.potongan_penagihan TO service_role;


--
-- TOC entry 4113 (class 0 OID 0)
-- Dependencies: 393
-- Name: SEQUENCE potongan_penagihan_id_potongan_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.potongan_penagihan_id_potongan_seq TO anon;
GRANT ALL ON SEQUENCE public.potongan_penagihan_id_potongan_seq TO authenticated;
GRANT ALL ON SEQUENCE public.potongan_penagihan_id_potongan_seq TO service_role;


--
-- TOC entry 4114 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE produk; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk TO anon;
GRANT ALL ON TABLE public.produk TO authenticated;
GRANT ALL ON TABLE public.produk TO service_role;


--
-- TOC entry 4116 (class 0 OID 0)
-- Dependencies: 381
-- Name: SEQUENCE produk_id_produk_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.produk_id_produk_seq TO anon;
GRANT ALL ON SEQUENCE public.produk_id_produk_seq TO authenticated;
GRANT ALL ON SEQUENCE public.produk_id_produk_seq TO service_role;


--
-- TOC entry 4117 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE sales; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales TO anon;
GRANT ALL ON TABLE public.sales TO authenticated;
GRANT ALL ON TABLE public.sales TO service_role;


--
-- TOC entry 4119 (class 0 OID 0)
-- Dependencies: 379
-- Name: SEQUENCE sales_id_sales_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sales_id_sales_seq TO anon;
GRANT ALL ON SEQUENCE public.sales_id_sales_seq TO authenticated;
GRANT ALL ON SEQUENCE public.sales_id_sales_seq TO service_role;


--
-- TOC entry 4120 (class 0 OID 0)
-- Dependencies: 394
-- Name: TABLE setoran; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.setoran TO anon;
GRANT ALL ON TABLE public.setoran TO authenticated;
GRANT ALL ON TABLE public.setoran TO service_role;


--
-- TOC entry 4122 (class 0 OID 0)
-- Dependencies: 395
-- Name: SEQUENCE setoran_id_setoran_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.setoran_id_setoran_seq TO anon;
GRANT ALL ON SEQUENCE public.setoran_id_setoran_seq TO authenticated;
GRANT ALL ON SEQUENCE public.setoran_id_setoran_seq TO service_role;


--
-- TOC entry 4123 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE system_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_logs TO anon;
GRANT ALL ON TABLE public.system_logs TO authenticated;
GRANT ALL ON TABLE public.system_logs TO service_role;


--
-- TOC entry 4125 (class 0 OID 0)
-- Dependencies: 396
-- Name: SEQUENCE system_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.system_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.system_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.system_logs_id_seq TO service_role;


--
-- TOC entry 4126 (class 0 OID 0)
-- Dependencies: 382
-- Name: TABLE toko; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.toko TO anon;
GRANT ALL ON TABLE public.toko TO authenticated;
GRANT ALL ON TABLE public.toko TO service_role;


--
-- TOC entry 4128 (class 0 OID 0)
-- Dependencies: 383
-- Name: SEQUENCE toko_id_toko_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.toko_id_toko_seq TO anon;
GRANT ALL ON SEQUENCE public.toko_id_toko_seq TO authenticated;
GRANT ALL ON SEQUENCE public.toko_id_toko_seq TO service_role;


--
-- TOC entry 4129 (class 0 OID 0)
-- Dependencies: 406
-- Name: TABLE v_cash_flow_dashboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_cash_flow_dashboard TO anon;
GRANT ALL ON TABLE public.v_cash_flow_dashboard TO authenticated;
GRANT ALL ON TABLE public.v_cash_flow_dashboard TO service_role;


--
-- TOC entry 4130 (class 0 OID 0)
-- Dependencies: 415
-- Name: TABLE v_chart_produk_performance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_chart_produk_performance TO anon;
GRANT ALL ON TABLE public.v_chart_produk_performance TO authenticated;
GRANT ALL ON TABLE public.v_chart_produk_performance TO service_role;


--
-- TOC entry 4131 (class 0 OID 0)
-- Dependencies: 413
-- Name: TABLE v_chart_sales_performance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_chart_sales_performance TO anon;
GRANT ALL ON TABLE public.v_chart_sales_performance TO authenticated;
GRANT ALL ON TABLE public.v_chart_sales_performance TO service_role;


--
-- TOC entry 4132 (class 0 OID 0)
-- Dependencies: 414
-- Name: TABLE v_chart_toko_performance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_chart_toko_performance TO anon;
GRANT ALL ON TABLE public.v_chart_toko_performance TO authenticated;
GRANT ALL ON TABLE public.v_chart_toko_performance TO service_role;


--
-- TOC entry 4133 (class 0 OID 0)
-- Dependencies: 416
-- Name: TABLE v_chart_wilayah_performance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_chart_wilayah_performance TO anon;
GRANT ALL ON TABLE public.v_chart_wilayah_performance TO authenticated;
GRANT ALL ON TABLE public.v_chart_wilayah_performance TO service_role;


--
-- TOC entry 4134 (class 0 OID 0)
-- Dependencies: 418
-- Name: TABLE v_dashboard_all_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_dashboard_all_transactions TO anon;
GRANT ALL ON TABLE public.v_dashboard_all_transactions TO authenticated;
GRANT ALL ON TABLE public.v_dashboard_all_transactions TO service_role;


--
-- TOC entry 4135 (class 0 OID 0)
-- Dependencies: 412
-- Name: TABLE v_dashboard_cards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_dashboard_cards TO anon;
GRANT ALL ON TABLE public.v_dashboard_cards TO authenticated;
GRANT ALL ON TABLE public.v_dashboard_cards TO service_role;


--
-- TOC entry 4136 (class 0 OID 0)
-- Dependencies: 417
-- Name: TABLE v_dashboard_latest_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_dashboard_latest_transactions TO anon;
GRANT ALL ON TABLE public.v_dashboard_latest_transactions TO authenticated;
GRANT ALL ON TABLE public.v_dashboard_latest_transactions TO service_role;


--
-- TOC entry 4137 (class 0 OID 0)
-- Dependencies: 399
-- Name: TABLE v_dashboard_overview; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_dashboard_overview TO anon;
GRANT ALL ON TABLE public.v_dashboard_overview TO authenticated;
GRANT ALL ON TABLE public.v_dashboard_overview TO service_role;


--
-- TOC entry 4138 (class 0 OID 0)
-- Dependencies: 401
-- Name: TABLE v_kabupaten_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_kabupaten_options TO anon;
GRANT ALL ON TABLE public.v_kabupaten_options TO authenticated;
GRANT ALL ON TABLE public.v_kabupaten_options TO service_role;


--
-- TOC entry 4139 (class 0 OID 0)
-- Dependencies: 402
-- Name: TABLE v_kecamatan_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_kecamatan_options TO anon;
GRANT ALL ON TABLE public.v_kecamatan_options TO authenticated;
GRANT ALL ON TABLE public.v_kecamatan_options TO service_role;


--
-- TOC entry 4140 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE v_master_produk; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_master_produk TO anon;
GRANT ALL ON TABLE public.v_master_produk TO authenticated;
GRANT ALL ON TABLE public.v_master_produk TO service_role;


--
-- TOC entry 4141 (class 0 OID 0)
-- Dependencies: 409
-- Name: TABLE v_master_sales; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_master_sales TO anon;
GRANT ALL ON TABLE public.v_master_sales TO authenticated;
GRANT ALL ON TABLE public.v_master_sales TO service_role;


--
-- TOC entry 4142 (class 0 OID 0)
-- Dependencies: 410
-- Name: TABLE v_master_toko; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_master_toko TO anon;
GRANT ALL ON TABLE public.v_master_toko TO authenticated;
GRANT ALL ON TABLE public.v_master_toko TO service_role;


--
-- TOC entry 4143 (class 0 OID 0)
-- Dependencies: 408
-- Name: TABLE v_penagihan_dashboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_penagihan_dashboard TO anon;
GRANT ALL ON TABLE public.v_penagihan_dashboard TO authenticated;
GRANT ALL ON TABLE public.v_penagihan_dashboard TO service_role;


--
-- TOC entry 4144 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE v_pengiriman_dashboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_pengiriman_dashboard TO anon;
GRANT ALL ON TABLE public.v_pengiriman_dashboard TO authenticated;
GRANT ALL ON TABLE public.v_pengiriman_dashboard TO service_role;


--
-- TOC entry 4145 (class 0 OID 0)
-- Dependencies: 404
-- Name: TABLE v_produk_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_produk_options TO anon;
GRANT ALL ON TABLE public.v_produk_options TO authenticated;
GRANT ALL ON TABLE public.v_produk_options TO service_role;


--
-- TOC entry 4146 (class 0 OID 0)
-- Dependencies: 405
-- Name: TABLE v_rekonsiliasi_setoran; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_rekonsiliasi_setoran TO anon;
GRANT ALL ON TABLE public.v_rekonsiliasi_setoran TO authenticated;
GRANT ALL ON TABLE public.v_rekonsiliasi_setoran TO service_role;


--
-- TOC entry 4147 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE v_sales_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_sales_options TO anon;
GRANT ALL ON TABLE public.v_sales_options TO authenticated;
GRANT ALL ON TABLE public.v_sales_options TO service_role;


--
-- TOC entry 4148 (class 0 OID 0)
-- Dependencies: 411
-- Name: TABLE v_setoran_dashboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_setoran_dashboard TO anon;
GRANT ALL ON TABLE public.v_setoran_dashboard TO authenticated;
GRANT ALL ON TABLE public.v_setoran_dashboard TO service_role;


--
-- TOC entry 4149 (class 0 OID 0)
-- Dependencies: 403
-- Name: TABLE v_toko_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_toko_options TO anon;
GRANT ALL ON TABLE public.v_toko_options TO authenticated;
GRANT ALL ON TABLE public.v_toko_options TO service_role;


--
-- TOC entry 2526 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2527 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2525 (class 826 OID 16487)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2529 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2524 (class 826 OID 16486)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2528 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2025-07-25 14:24:59

--
-- PostgreSQL database dump complete
--

