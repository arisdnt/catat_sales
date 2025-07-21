--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.0

-- Started on 2025-07-21 15:45:17

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
-- TOC entry 3994 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 476 (class 1255 OID 17985)
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
-- TOC entry 479 (class 1255 OID 18163)
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
-- TOC entry 463 (class 1255 OID 17584)
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
-- TOC entry 462 (class 1255 OID 17583)
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
-- TOC entry 474 (class 1255 OID 17910)
-- Name: manual_refresh_produk_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.manual_refresh_produk_views() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    result_text text := '';
BEGIN
    -- Refresh views manually
    PERFORM refresh_produk_materialized_views();
    
    -- Get statistics
    SELECT INTO result_text
        format('Produk views refreshed successfully at %s. Total products: %s, Total value: %s',
               NOW(),
               total_products,
               total_value)
    FROM mv_produk_aggregates;
    
    RETURN result_text;
END;
$$;


ALTER FUNCTION public.manual_refresh_produk_views() OWNER TO postgres;

--
-- TOC entry 469 (class 1255 OID 17809)
-- Name: refresh_penagihan_materialized_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_penagihan_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refresh penagihan aggregates view
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_penagihan_aggregates;
    EXCEPTION WHEN OTHERS THEN
        -- Fall back to non-concurrent refresh if concurrent fails
        REFRESH MATERIALIZED VIEW mv_penagihan_aggregates;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_penagihan_aggregates: %', SQLERRM;
    END;
    
    -- Refresh penagihan with totals view
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_penagihan_with_totals;
    EXCEPTION WHEN OTHERS THEN
        -- Fall back to non-concurrent refresh if concurrent fails
        REFRESH MATERIALIZED VIEW mv_penagihan_with_totals;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_penagihan_with_totals: %', SQLERRM;
    END;
    
    -- Log refresh
    RAISE NOTICE 'Penagihan materialized views refreshed at %', NOW();
END;
$$;


ALTER FUNCTION public.refresh_penagihan_materialized_views() OWNER TO postgres;

--
-- TOC entry 466 (class 1255 OID 17638)
-- Name: refresh_pengiriman_aggregates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_pengiriman_aggregates() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pengiriman_aggregates;
    
    -- Log refresh time
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES ('mv_refresh', 'Pengiriman aggregates materialized view refreshed', NOW())
    ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION public.refresh_pengiriman_aggregates() OWNER TO postgres;

--
-- TOC entry 472 (class 1255 OID 17908)
-- Name: refresh_produk_materialized_views(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_produk_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refresh produk aggregates view
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produk_aggregates;
        RAISE NOTICE 'Successfully refreshed mv_produk_aggregates concurrently at %', NOW();
    EXCEPTION WHEN OTHERS THEN
        -- Fall back to non-concurrent refresh
        REFRESH MATERIALIZED VIEW mv_produk_aggregates;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_produk_aggregates: % at %', SQLERRM, NOW();
    END;
    
    -- Refresh produk with stats view
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produk_with_stats;
        RAISE NOTICE 'Successfully refreshed mv_produk_with_stats concurrently at %', NOW();
    EXCEPTION WHEN OTHERS THEN
        -- Fall back to non-concurrent refresh
        REFRESH MATERIALIZED VIEW mv_produk_with_stats;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_produk_with_stats: % at %', SQLERRM, NOW();
    END;
    
    RAISE NOTICE 'Produk materialized views refresh completed at %', NOW();
END;
$$;


ALTER FUNCTION public.refresh_produk_materialized_views() OWNER TO postgres;

--
-- TOC entry 477 (class 1255 OID 17986)
-- Name: refresh_sales_aggregates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_sales_aggregates() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Try concurrent refresh first, fall back to full refresh if it fails
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_aggregates;
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_sales_aggregates;
    END;
END;
$$;


ALTER FUNCTION public.refresh_sales_aggregates() OWNER TO postgres;

--
-- TOC entry 459 (class 1255 OID 17480)
-- Name: refresh_toko_aggregates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_toko_aggregates() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_toko_aggregates;
END;
$$;


ALTER FUNCTION public.refresh_toko_aggregates() OWNER TO postgres;

--
-- TOC entry 468 (class 1255 OID 17807)
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
-- TOC entry 464 (class 1255 OID 17634)
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
-- TOC entry 465 (class 1255 OID 17636)
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
-- TOC entry 471 (class 1255 OID 17906)
-- Name: search_produk_optimized(text, integer, integer, text, text, boolean, boolean, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_produk_optimized(search_query text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, sort_column text DEFAULT 'nama_produk'::text, sort_direction text DEFAULT 'asc'::text, status_filter boolean DEFAULT NULL::boolean, priority_filter boolean DEFAULT NULL::boolean, price_from_filter numeric DEFAULT NULL::numeric, price_to_filter numeric DEFAULT NULL::numeric, date_from_filter text DEFAULT NULL::text, date_to_filter text DEFAULT NULL::text) RETURNS TABLE(id_produk integer, nama_produk character varying, harga_satuan numeric, status_produk boolean, is_priority boolean, priority_order integer, dibuat_pada timestamp with time zone, diperbarui_pada timestamp with time zone, stats json, total_count bigint)
    LANGUAGE plpgsql
    AS $_$
DECLARE
    query_text text;
    sort_clause text;
    where_conditions text[];
    final_query text;
BEGIN
    -- Build WHERE conditions
    where_conditions := ARRAY['p.id_produk IS NOT NULL'];
    
    -- Search condition
    IF search_query IS NOT NULL AND LENGTH(TRIM(search_query)) > 0 THEN
        IF search_query ~ '^\d+$' THEN
            -- Numeric search - search by product ID
            where_conditions := where_conditions || ARRAY[format('p.id_produk = %s', search_query)];
        ELSE
            -- Text search - use both ILIKE and full-text search
            where_conditions := where_conditions || ARRAY[format(
                '(p.nama_produk ILIKE ''%%%s%%'' OR to_tsvector(''indonesian'', p.nama_produk) @@ plainto_tsquery(''indonesian'', ''%s''))', 
                search_query, search_query
            )];
        END IF;
    END IF;
    
    -- Status filter
    IF status_filter IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[format('p.status_produk = %s', status_filter)];
    END IF;
    
    -- Priority filter
    IF priority_filter IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[format('p.is_priority = %s', priority_filter)];
    END IF;
    
    -- Price from filter
    IF price_from_filter IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[format('p.harga_satuan >= %s', price_from_filter)];
    END IF;
    
    -- Price to filter
    IF price_to_filter IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY[format('p.harga_satuan <= %s', price_to_filter)];
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
    IF sort_column = 'harga_satuan' THEN
        sort_clause := 'p.harga_satuan';
    ELSIF sort_column = 'dibuat_pada' THEN
        sort_clause := 'p.dibuat_pada';
    ELSIF sort_column = 'total_terkirim' THEN
        sort_clause := 'stats.total_terkirim';
    ELSIF sort_column = 'total_terbayar' THEN
        sort_clause := 'stats.total_terbayar';
    ELSIF sort_column = 'sisa_stok' THEN
        sort_clause := 'stats.sisa_stok';
    ELSE
        sort_clause := 'p.' || sort_column;
    END IF;
    
    IF sort_direction = 'desc' THEN
        sort_clause := sort_clause || ' DESC';
    ELSE
        sort_clause := sort_clause || ' ASC';
    END IF;
    
    -- Build final query using materialized view for better performance
    final_query := format('
        WITH filtered_data AS (
            SELECT 
                p.id_produk,
                p.nama_produk,
                p.harga_satuan,
                p.status_produk,
                p.is_priority,
                p.priority_order,
                p.dibuat_pada,
                p.diperbarui_pada,
                COALESCE(
                    json_build_object(
                        ''total_terkirim'', stats.total_terkirim,
                        ''total_terjual'', stats.total_terjual,
                        ''total_kembali'', stats.total_kembali,
                        ''total_terbayar'', stats.total_terbayar,
                        ''sisa_stok'', stats.sisa_stok
                    ),
                    json_build_object(
                        ''total_terkirim'', 0,
                        ''total_terjual'', 0,
                        ''total_kembali'', 0,
                        ''total_terbayar'', 0,
                        ''sisa_stok'', 0
                    )
                ) as stats,
                COUNT(*) OVER() as total_count
            FROM produk p
            LEFT JOIN mv_produk_with_stats stats ON p.id_produk = stats.id_produk
            WHERE %s
            ORDER BY %s
            LIMIT %s OFFSET %s
        )
        SELECT 
            fd.id_produk,
            fd.nama_produk,
            fd.harga_satuan,
            fd.status_produk,
            fd.is_priority,
            fd.priority_order,
            fd.dibuat_pada,
            fd.diperbarui_pada,
            fd.stats,
            fd.total_count
        FROM filtered_data fd
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


ALTER FUNCTION public.search_produk_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, status_filter boolean, priority_filter boolean, price_from_filter numeric, price_to_filter numeric, date_from_filter text, date_to_filter text) OWNER TO postgres;

--
-- TOC entry 475 (class 1255 OID 17984)
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
-- TOC entry 461 (class 1255 OID 17582)
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
-- TOC entry 470 (class 1255 OID 17810)
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
-- TOC entry 467 (class 1255 OID 17639)
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
-- TOC entry 473 (class 1255 OID 17909)
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
-- TOC entry 478 (class 1255 OID 17987)
-- Name: trigger_refresh_sales_aggregates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_sales_aggregates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Schedule a refresh (you might want to use a job queue in production)
    PERFORM refresh_sales_aggregates();
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_refresh_sales_aggregates() OWNER TO postgres;

--
-- TOC entry 460 (class 1255 OID 17481)
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
-- TOC entry 328 (class 1259 OID 17296)
-- Name: bulk_pengiriman; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bulk_pengiriman (
    id_bulk_pengiriman integer NOT NULL,
    id_sales integer NOT NULL,
    tanggal_kirim date NOT NULL,
    total_toko integer NOT NULL,
    total_item integer NOT NULL,
    keterangan text,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bulk_pengiriman OWNER TO postgres;

--
-- TOC entry 329 (class 1259 OID 17303)
-- Name: bulk_pengiriman_id_bulk_pengiriman_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq OWNER TO postgres;

--
-- TOC entry 4018 (class 0 OID 0)
-- Dependencies: 329
-- Name: bulk_pengiriman_id_bulk_pengiriman_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq OWNED BY public.bulk_pengiriman.id_bulk_pengiriman;


--
-- TOC entry 336 (class 1259 OID 17330)
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
-- TOC entry 337 (class 1259 OID 17337)
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
-- TOC entry 4021 (class 0 OID 0)
-- Dependencies: 337
-- Name: detail_penagihan_id_detail_tagih_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detail_penagihan_id_detail_tagih_seq OWNED BY public.detail_penagihan.id_detail_tagih;


--
-- TOC entry 332 (class 1259 OID 17312)
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
-- TOC entry 333 (class 1259 OID 17318)
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
-- TOC entry 4024 (class 0 OID 0)
-- Dependencies: 333
-- Name: detail_pengiriman_id_detail_kirim_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detail_pengiriman_id_detail_kirim_seq OWNED BY public.detail_pengiriman.id_detail_kirim;


--
-- TOC entry 334 (class 1259 OID 17320)
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
-- TOC entry 349 (class 1259 OID 17779)
-- Name: mv_penagihan_aggregates; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_penagihan_aggregates AS
 SELECT 1 AS id,
    count(*) AS total_billings,
    count(
        CASE
            WHEN (date(dibuat_pada) = CURRENT_DATE) THEN 1
            ELSE NULL::integer
        END) AS today_billings,
    count(
        CASE
            WHEN (dibuat_pada >= (CURRENT_DATE - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS this_week_billings,
    count(DISTINCT id_toko) AS unique_toko,
    count(
        CASE
            WHEN ((metode_pembayaran)::text = 'Cash'::text) THEN 1
            ELSE NULL::integer
        END) AS cash_payments,
    count(
        CASE
            WHEN ((metode_pembayaran)::text = 'Transfer'::text) THEN 1
            ELSE NULL::integer
        END) AS transfer_payments,
    count(
        CASE
            WHEN (ada_potongan = true) THEN 1
            ELSE NULL::integer
        END) AS with_deductions,
    sum(total_uang_diterima) AS total_revenue,
    avg(total_uang_diterima) AS avg_amount,
    min(dibuat_pada) AS first_billing_date,
    max(dibuat_pada) AS last_billing_date
   FROM public.penagihan
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_penagihan_aggregates OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 17339)
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
-- TOC entry 350 (class 1259 OID 17792)
-- Name: mv_penagihan_with_totals; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_penagihan_with_totals AS
 SELECT p.id_penagihan,
    p.id_toko,
    p.total_uang_diterima,
    p.metode_pembayaran,
    p.ada_potongan,
    p.dibuat_pada,
    p.diperbarui_pada,
    COALESCE(sum(dp.jumlah_terjual), (0)::bigint) AS total_quantity_sold,
    COALESCE(sum(dp.jumlah_kembali), (0)::bigint) AS total_quantity_returned,
    COALESCE(count(dp.id_detail_tagih), (0)::bigint) AS detail_count,
    COALESCE(sum(pot.jumlah_potongan), (0)::numeric) AS total_deductions
   FROM ((public.penagihan p
     LEFT JOIN public.detail_penagihan dp ON ((p.id_penagihan = dp.id_penagihan)))
     LEFT JOIN public.potongan_penagihan pot ON ((p.id_penagihan = pot.id_penagihan)))
  GROUP BY p.id_penagihan, p.id_toko, p.total_uang_diterima, p.metode_pembayaran, p.ada_potongan, p.dibuat_pada, p.diperbarui_pada
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_penagihan_with_totals OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 17305)
-- Name: pengiriman; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pengiriman (
    id_pengiriman integer NOT NULL,
    id_toko integer NOT NULL,
    tanggal_kirim date NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_bulk_pengiriman integer
);


ALTER TABLE public.pengiriman OWNER TO postgres;

--
-- TOC entry 324 (class 1259 OID 17276)
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
-- TOC entry 322 (class 1259 OID 17268)
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
-- TOC entry 326 (class 1259 OID 17286)
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
-- TOC entry 346 (class 1259 OID 17615)
-- Name: mv_pengiriman_aggregates; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_pengiriman_aggregates AS
 SELECT p.id_pengiriman,
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
    COALESCE(agg.total_quantity, (0)::bigint) AS total_quantity,
    COALESCE(agg.total_products, (0)::bigint) AS total_products,
    COALESCE(agg.detail_pengiriman, '[]'::json) AS detail_pengiriman,
    to_tsvector('indonesian'::regconfig, (((((((COALESCE(t.nama_toko, ''::character varying))::text || ' '::text) || (COALESCE(s.nama_sales, ''::character varying))::text) || ' '::text) || (COALESCE(t.kecamatan, ''::character varying))::text) || ' '::text) || (COALESCE(t.kabupaten, ''::character varying))::text)) AS search_vector,
    p.tanggal_kirim AS tanggal_kirim_date,
    EXTRACT(year FROM p.tanggal_kirim) AS tahun,
    EXTRACT(month FROM p.tanggal_kirim) AS bulan,
    EXTRACT(week FROM p.tanggal_kirim) AS minggu
   FROM (((public.pengiriman p
     JOIN public.toko t ON ((p.id_toko = t.id_toko)))
     JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN ( SELECT dp.id_pengiriman,
            sum(dp.jumlah_kirim) AS total_quantity,
            count(DISTINCT dp.id_produk) AS total_products,
            json_agg(json_build_object('id_detail_kirim', dp.id_detail_kirim, 'id_produk', dp.id_produk, 'nama_produk', pr.nama_produk, 'jumlah_kirim', dp.jumlah_kirim, 'harga_satuan', pr.harga_satuan) ORDER BY pr.nama_produk) AS detail_pengiriman
           FROM (public.detail_pengiriman dp
             JOIN public.produk pr ON ((dp.id_produk = pr.id_produk)))
          GROUP BY dp.id_pengiriman) agg ON ((p.id_pengiriman = agg.id_pengiriman)))
  WHERE ((t.status_toko = true) AND (s.status_aktif = true))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_pengiriman_aggregates OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 17875)
-- Name: mv_produk_aggregates; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_produk_aggregates AS
 SELECT 1 AS id,
    count(*) AS total_products,
    count(
        CASE
            WHEN (status_produk = true) THEN 1
            ELSE NULL::integer
        END) AS active_products,
    count(
        CASE
            WHEN (status_produk = false) THEN 1
            ELSE NULL::integer
        END) AS inactive_products,
    count(
        CASE
            WHEN (is_priority = true) THEN 1
            ELSE NULL::integer
        END) AS priority_products,
    count(
        CASE
            WHEN (is_priority = false) THEN 1
            ELSE NULL::integer
        END) AS standard_products,
    count(
        CASE
            WHEN (date(dibuat_pada) = CURRENT_DATE) THEN 1
            ELSE NULL::integer
        END) AS today_products,
    count(
        CASE
            WHEN (dibuat_pada >= (CURRENT_DATE - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS this_week_products,
    min(harga_satuan) AS min_price,
    max(harga_satuan) AS max_price,
    avg(harga_satuan) AS avg_price,
    sum(harga_satuan) AS total_value,
    min(dibuat_pada) AS first_product_date,
    max(dibuat_pada) AS last_product_date
   FROM public.produk
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_produk_aggregates OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 17888)
-- Name: mv_produk_with_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_produk_with_stats AS
 SELECT p.id_produk,
    p.nama_produk,
    p.harga_satuan,
    p.status_produk,
    p.is_priority,
    p.priority_order,
    p.dibuat_pada,
    p.diperbarui_pada,
    COALESCE(ship_stats.total_terkirim, (0)::bigint) AS total_terkirim,
    COALESCE(bill_stats.total_terjual, (0)::bigint) AS total_terjual,
    COALESCE(bill_stats.total_kembali, (0)::bigint) AS total_kembali,
    (COALESCE(bill_stats.total_terjual, (0)::bigint) - COALESCE(bill_stats.total_kembali, (0)::bigint)) AS total_terbayar,
    (COALESCE(ship_stats.total_terkirim, (0)::bigint) - COALESCE(bill_stats.total_terjual, (0)::bigint)) AS sisa_stok,
    COALESCE(ship_stats.shipment_count, (0)::bigint) AS shipment_count,
    COALESCE(bill_stats.billing_count, (0)::bigint) AS billing_count,
    (((COALESCE(bill_stats.total_terjual, (0)::bigint) - COALESCE(bill_stats.total_kembali, (0)::bigint)))::numeric * p.harga_satuan) AS total_revenue
   FROM ((public.produk p
     LEFT JOIN ( SELECT dp.id_produk,
            sum(dp.jumlah_kirim) AS total_terkirim,
            count(DISTINCT dp.id_pengiriman) AS shipment_count
           FROM public.detail_pengiriman dp
          GROUP BY dp.id_produk) ship_stats ON ((p.id_produk = ship_stats.id_produk)))
     LEFT JOIN ( SELECT dp.id_produk,
            sum(dp.jumlah_terjual) AS total_terjual,
            sum(dp.jumlah_kembali) AS total_kembali,
            count(DISTINCT dp.id_penagihan) AS billing_count
           FROM public.detail_penagihan dp
          GROUP BY dp.id_produk) bill_stats ON ((p.id_produk = bill_stats.id_produk)))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_produk_with_stats OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 17966)
-- Name: mv_sales_aggregates; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_sales_aggregates AS
 SELECT s.id_sales,
    s.nama_sales,
    s.nomor_telepon,
    s.status_aktif,
    s.dibuat_pada,
    s.diperbarui_pada,
    COALESCE(store_stats.total_stores, (0)::bigint) AS total_stores,
    COALESCE(store_stats.active_stores, (0)::bigint) AS active_stores,
    COALESCE(store_stats.inactive_stores, (0)::bigint) AS inactive_stores,
    COALESCE(shipment_stats.total_shipments, (0)::bigint) AS total_shipments,
    COALESCE(shipment_stats.total_shipped_items, (0)::bigint) AS total_shipped_items,
    COALESCE(shipment_stats.last_shipment_date, NULL::date) AS last_shipment_date,
    COALESCE(billing_stats.total_billings, (0)::bigint) AS total_billings,
    COALESCE(billing_stats.total_revenue, (0)::numeric) AS total_revenue,
    COALESCE(billing_stats.total_items_sold, (0)::bigint) AS total_items_sold,
    COALESCE(billing_stats.total_items_returned, (0)::bigint) AS total_items_returned,
    COALESCE(billing_stats.last_billing_date, NULL::timestamp without time zone) AS last_billing_date,
        CASE
            WHEN (COALESCE(shipment_stats.total_shipped_items, (0)::bigint) > 0) THEN round((((COALESCE(billing_stats.total_items_sold, (0)::bigint))::numeric / (shipment_stats.total_shipped_items)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS sales_efficiency_percentage,
        CASE
            WHEN (COALESCE(store_stats.total_stores, (0)::bigint) > 0) THEN round((COALESCE(billing_stats.total_revenue, (0)::numeric) / (store_stats.total_stores)::numeric), 2)
            ELSE (0)::numeric
        END AS avg_revenue_per_store,
    EXTRACT(year FROM s.dibuat_pada) AS created_year,
    EXTRACT(month FROM s.dibuat_pada) AS created_month,
    date_trunc('month'::text, s.dibuat_pada) AS created_month_date
   FROM (((public.sales s
     LEFT JOIN ( SELECT toko.id_sales,
            count(*) AS total_stores,
            count(*) FILTER (WHERE (toko.status_toko = true)) AS active_stores,
            count(*) FILTER (WHERE (toko.status_toko = false)) AS inactive_stores
           FROM public.toko
          GROUP BY toko.id_sales) store_stats ON ((s.id_sales = store_stats.id_sales)))
     LEFT JOIN ( SELECT t.id_sales,
            count(DISTINCT p.id_pengiriman) AS total_shipments,
            COALESCE(sum(dp.jumlah_kirim), (0)::bigint) AS total_shipped_items,
            max(p.tanggal_kirim) AS last_shipment_date
           FROM ((public.pengiriman p
             JOIN public.toko t ON ((p.id_toko = t.id_toko)))
             LEFT JOIN public.detail_pengiriman dp ON ((p.id_pengiriman = dp.id_pengiriman)))
          GROUP BY t.id_sales) shipment_stats ON ((s.id_sales = shipment_stats.id_sales)))
     LEFT JOIN ( SELECT t.id_sales,
            count(DISTINCT pen.id_penagihan) AS total_billings,
            COALESCE(sum(pen.total_uang_diterima), (0)::numeric) AS total_revenue,
            COALESCE(sum(dp.jumlah_terjual), (0)::bigint) AS total_items_sold,
            COALESCE(sum(dp.jumlah_kembali), (0)::bigint) AS total_items_returned,
            max(pen.dibuat_pada) AS last_billing_date
           FROM ((public.penagihan pen
             JOIN public.toko t ON ((pen.id_toko = t.id_toko)))
             LEFT JOIN public.detail_penagihan dp ON ((pen.id_penagihan = dp.id_penagihan)))
          GROUP BY t.id_sales) billing_stats ON ((s.id_sales = billing_stats.id_sales)))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_sales_aggregates OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 17463)
-- Name: mv_toko_aggregates; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_toko_aggregates AS
 SELECT t.id_toko,
    t.nama_toko,
    t.id_sales,
    s.nama_sales,
    t.kabupaten,
    t.kecamatan,
    t.no_telepon,
    t.link_gmaps,
    t.status_toko,
    t.dibuat_pada,
    t.diperbarui_pada,
    COALESCE(agg_kirim.total_terkirim, (0)::bigint) AS barang_terkirim,
    COALESCE(agg_bayar.total_terbayar, (0)::bigint) AS barang_terbayar,
    (COALESCE(agg_kirim.total_terkirim, (0)::bigint) - COALESCE(agg_bayar.total_terbayar, (0)::bigint)) AS sisa_stok
   FROM (((public.toko t
     LEFT JOIN public.sales s ON ((t.id_sales = s.id_sales)))
     LEFT JOIN ( SELECT p.id_toko,
            sum(dp.jumlah_kirim) AS total_terkirim
           FROM (public.pengiriman p
             JOIN public.detail_pengiriman dp ON ((p.id_pengiriman = dp.id_pengiriman)))
          GROUP BY p.id_toko) agg_kirim ON ((t.id_toko = agg_kirim.id_toko)))
     LEFT JOIN ( SELECT pen.id_toko,
            sum(dt.jumlah_terjual) AS total_terbayar
           FROM (public.penagihan pen
             JOIN public.detail_penagihan dt ON ((pen.id_penagihan = dt.id_penagihan)))
          GROUP BY pen.id_toko) agg_bayar ON ((t.id_toko = agg_bayar.id_toko)))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_toko_aggregates OWNER TO postgres;

--
-- TOC entry 335 (class 1259 OID 17328)
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
-- TOC entry 4039 (class 0 OID 0)
-- Dependencies: 335
-- Name: penagihan_id_penagihan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.penagihan_id_penagihan_seq OWNED BY public.penagihan.id_penagihan;


--
-- TOC entry 331 (class 1259 OID 17310)
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
-- TOC entry 4041 (class 0 OID 0)
-- Dependencies: 331
-- Name: pengiriman_id_pengiriman_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pengiriman_id_pengiriman_seq OWNED BY public.pengiriman.id_pengiriman;


--
-- TOC entry 339 (class 1259 OID 17347)
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
-- TOC entry 4043 (class 0 OID 0)
-- Dependencies: 339
-- Name: potongan_penagihan_id_potongan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.potongan_penagihan_id_potongan_seq OWNED BY public.potongan_penagihan.id_potongan;


--
-- TOC entry 325 (class 1259 OID 17284)
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
-- TOC entry 4045 (class 0 OID 0)
-- Dependencies: 325
-- Name: produk_id_produk_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.produk_id_produk_seq OWNED BY public.produk.id_produk;


--
-- TOC entry 323 (class 1259 OID 17274)
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
-- TOC entry 4047 (class 0 OID 0)
-- Dependencies: 323
-- Name: sales_id_sales_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_sales_seq OWNED BY public.sales.id_sales;


--
-- TOC entry 340 (class 1259 OID 17349)
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
-- TOC entry 341 (class 1259 OID 17355)
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
-- TOC entry 4050 (class 0 OID 0)
-- Dependencies: 341
-- Name: setoran_id_setoran_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.setoran_id_setoran_seq OWNED BY public.setoran.id_setoran;


--
-- TOC entry 348 (class 1259 OID 17645)
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
-- TOC entry 347 (class 1259 OID 17644)
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
-- TOC entry 4053 (class 0 OID 0)
-- Dependencies: 347
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- TOC entry 327 (class 1259 OID 17294)
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
-- TOC entry 4055 (class 0 OID 0)
-- Dependencies: 327
-- Name: toko_id_toko_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.toko_id_toko_seq OWNED BY public.toko.id_toko;


--
-- TOC entry 343 (class 1259 OID 17485)
-- Name: v_kabupaten_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_kabupaten_options AS
 SELECT DISTINCT kabupaten
   FROM public.toko
  WHERE ((kabupaten IS NOT NULL) AND ((kabupaten)::text <> ''::text))
  ORDER BY kabupaten;


ALTER VIEW public.v_kabupaten_options OWNER TO postgres;

--
-- TOC entry 344 (class 1259 OID 17489)
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
-- TOC entry 345 (class 1259 OID 17493)
-- Name: v_sales_options; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_sales_options AS
 SELECT id_sales,
    nama_sales
   FROM public.sales
  WHERE (status_aktif = true)
  ORDER BY nama_sales;


ALTER VIEW public.v_sales_options OWNER TO postgres;

--
-- TOC entry 3641 (class 2604 OID 17304)
-- Name: bulk_pengiriman id_bulk_pengiriman; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_pengiriman ALTER COLUMN id_bulk_pengiriman SET DEFAULT nextval('public.bulk_pengiriman_id_bulk_pengiriman_seq'::regclass);


--
-- TOC entry 3654 (class 2604 OID 17338)
-- Name: detail_penagihan id_detail_tagih; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan ALTER COLUMN id_detail_tagih SET DEFAULT nextval('public.detail_penagihan_id_detail_tagih_seq'::regclass);


--
-- TOC entry 3647 (class 2604 OID 17319)
-- Name: detail_pengiriman id_detail_kirim; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman ALTER COLUMN id_detail_kirim SET DEFAULT nextval('public.detail_pengiriman_id_detail_kirim_seq'::regclass);


--
-- TOC entry 3650 (class 2604 OID 17329)
-- Name: penagihan id_penagihan; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penagihan ALTER COLUMN id_penagihan SET DEFAULT nextval('public.penagihan_id_penagihan_seq'::regclass);


--
-- TOC entry 3644 (class 2604 OID 17311)
-- Name: pengiriman id_pengiriman; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman ALTER COLUMN id_pengiriman SET DEFAULT nextval('public.pengiriman_id_pengiriman_seq'::regclass);


--
-- TOC entry 3657 (class 2604 OID 17348)
-- Name: potongan_penagihan id_potongan; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potongan_penagihan ALTER COLUMN id_potongan SET DEFAULT nextval('public.potongan_penagihan_id_potongan_seq'::regclass);


--
-- TOC entry 3631 (class 2604 OID 17285)
-- Name: produk id_produk; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk ALTER COLUMN id_produk SET DEFAULT nextval('public.produk_id_produk_seq'::regclass);


--
-- TOC entry 3627 (class 2604 OID 17275)
-- Name: sales id_sales; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id_sales SET DEFAULT nextval('public.sales_id_sales_seq'::regclass);


--
-- TOC entry 3660 (class 2604 OID 17356)
-- Name: setoran id_setoran; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setoran ALTER COLUMN id_setoran SET DEFAULT nextval('public.setoran_id_setoran_seq'::regclass);


--
-- TOC entry 3663 (class 2604 OID 17648)
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- TOC entry 3637 (class 2604 OID 17295)
-- Name: toko id_toko; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko ALTER COLUMN id_toko SET DEFAULT nextval('public.toko_id_toko_seq'::regclass);


--
-- TOC entry 3966 (class 0 OID 17296)
-- Dependencies: 328
-- Data for Name: bulk_pengiriman; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bulk_pengiriman (id_bulk_pengiriman, id_sales, tanggal_kirim, total_toko, total_item, keterangan, dibuat_pada, diperbarui_pada) FROM stdin;
\.


--
-- TOC entry 3974 (class 0 OID 17330)
-- Dependencies: 336
-- Data for Name: detail_penagihan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detail_penagihan (id_detail_tagih, id_penagihan, id_produk, jumlah_terjual, jumlah_kembali, dibuat_pada, diperbarui_pada) FROM stdin;
5	3	1	4	0	2025-07-21 07:41:09.150945	2025-07-21 07:41:09.150945
6	3	2	3	0	2025-07-21 07:41:09.150945	2025-07-21 07:41:09.150945
7	3	3	1	0	2025-07-21 07:41:09.150945	2025-07-21 07:41:09.150945
8	3	5	2	0	2025-07-21 07:41:09.150945	2025-07-21 07:41:09.150945
9	4	1	1	0	2025-07-21 07:41:37.497441	2025-07-21 07:41:37.497441
10	4	2	1	0	2025-07-21 07:41:37.497441	2025-07-21 07:41:37.497441
11	4	3	1	0	2025-07-21 07:41:37.497441	2025-07-21 07:41:37.497441
12	5	1	1	0	2025-07-21 07:42:20.549803	2025-07-21 07:42:20.549803
13	5	2	1	0	2025-07-21 07:42:20.549803	2025-07-21 07:42:20.549803
14	5	4	2	0	2025-07-21 07:42:20.549803	2025-07-21 07:42:20.549803
15	5	5	2	0	2025-07-21 07:42:20.549803	2025-07-21 07:42:20.549803
16	6	1	4	0	2025-07-21 07:43:00.27569	2025-07-21 07:43:00.27569
17	6	3	5	0	2025-07-21 07:43:00.27569	2025-07-21 07:43:00.27569
18	6	4	6	0	2025-07-21 07:43:00.27569	2025-07-21 07:43:00.27569
19	6	5	10	0	2025-07-21 07:43:00.27569	2025-07-21 07:43:00.27569
20	7	1	2	0	2025-07-21 07:45:31.267858	2025-07-21 07:45:31.267858
21	7	4	2	0	2025-07-21 07:45:31.267858	2025-07-21 07:45:31.267858
22	7	5	1	0	2025-07-21 07:45:31.267858	2025-07-21 07:45:31.267858
23	8	1	2	0	2025-07-21 07:46:33.416163	2025-07-21 07:46:33.416163
24	8	2	1	0	2025-07-21 07:46:33.416163	2025-07-21 07:46:33.416163
25	8	3	2	0	2025-07-21 07:46:33.416163	2025-07-21 07:46:33.416163
26	8	5	1	0	2025-07-21 07:46:33.416163	2025-07-21 07:46:33.416163
27	9	1	1	0	2025-07-21 07:52:40.079145	2025-07-21 07:52:40.079145
28	9	3	2	0	2025-07-21 07:52:40.079145	2025-07-21 07:52:40.079145
29	10	1	1	0	2025-07-21 07:52:42.639642	2025-07-21 07:52:42.639642
30	10	2	2	0	2025-07-21 07:52:42.639642	2025-07-21 07:52:42.639642
31	10	4	1	0	2025-07-21 07:52:42.639642	2025-07-21 07:52:42.639642
32	10	5	2	0	2025-07-21 07:52:42.639642	2025-07-21 07:52:42.639642
33	11	3	1	0	2025-07-21 07:52:45.22564	2025-07-21 07:52:45.22564
34	11	4	2	0	2025-07-21 07:52:45.22564	2025-07-21 07:52:45.22564
35	11	5	2	0	2025-07-21 07:52:45.22564	2025-07-21 07:52:45.22564
36	12	1	2	0	2025-07-21 07:52:47.737158	2025-07-21 07:52:47.737158
37	12	3	1	0	2025-07-21 07:52:47.737158	2025-07-21 07:52:47.737158
38	13	1	3	0	2025-07-21 07:52:50.282533	2025-07-21 07:52:50.282533
39	13	2	1	0	2025-07-21 07:52:50.282533	2025-07-21 07:52:50.282533
40	13	3	2	0	2025-07-21 07:52:50.282533	2025-07-21 07:52:50.282533
41	13	4	2	0	2025-07-21 07:52:50.282533	2025-07-21 07:52:50.282533
42	13	5	1	0	2025-07-21 07:52:50.282533	2025-07-21 07:52:50.282533
43	14	3	1	0	2025-07-21 07:52:52.874599	2025-07-21 07:52:52.874599
44	14	4	1	0	2025-07-21 07:52:52.874599	2025-07-21 07:52:52.874599
45	14	5	3	0	2025-07-21 07:52:52.874599	2025-07-21 07:52:52.874599
46	15	1	1	0	2025-07-21 07:52:55.428604	2025-07-21 07:52:55.428604
47	15	5	1	0	2025-07-21 07:52:55.428604	2025-07-21 07:52:55.428604
48	16	4	2	0	2025-07-21 07:52:57.982972	2025-07-21 07:52:57.982972
49	17	1	3	0	2025-07-21 07:53:00.502327	2025-07-21 07:53:00.502327
50	17	2	2	0	2025-07-21 07:53:00.502327	2025-07-21 07:53:00.502327
51	17	3	2	0	2025-07-21 07:53:00.502327	2025-07-21 07:53:00.502327
52	17	4	1	0	2025-07-21 07:53:00.502327	2025-07-21 07:53:00.502327
53	17	5	2	0	2025-07-21 07:53:00.502327	2025-07-21 07:53:00.502327
54	18	1	1	0	2025-07-21 07:53:03.040303	2025-07-21 07:53:03.040303
55	18	3	1	0	2025-07-21 07:53:03.040303	2025-07-21 07:53:03.040303
56	18	4	2	0	2025-07-21 07:53:03.040303	2025-07-21 07:53:03.040303
57	18	5	1	0	2025-07-21 07:53:03.040303	2025-07-21 07:53:03.040303
\.


--
-- TOC entry 3970 (class 0 OID 17312)
-- Dependencies: 332
-- Data for Name: detail_pengiriman; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detail_pengiriman (id_detail_kirim, id_pengiriman, id_produk, jumlah_kirim, dibuat_pada, diperbarui_pada) FROM stdin;
1	1	1	2	2025-07-19 02:19:03.07062	2025-07-19 02:19:03.07062
2	1	2	2	2025-07-19 02:19:03.07062	2025-07-19 02:19:03.07062
3	1	3	2	2025-07-19 02:19:03.07062	2025-07-19 02:19:03.07062
4	1	4	2	2025-07-19 02:19:03.07062	2025-07-19 02:19:03.07062
5	1	5	2	2025-07-19 02:19:03.07062	2025-07-19 02:19:03.07062
6	2	1	2	2025-07-19 02:19:03.237476	2025-07-19 02:19:03.237476
7	2	2	2	2025-07-19 02:19:03.237476	2025-07-19 02:19:03.237476
8	2	3	2	2025-07-19 02:19:03.237476	2025-07-19 02:19:03.237476
9	2	4	2	2025-07-19 02:19:03.237476	2025-07-19 02:19:03.237476
10	2	5	2	2025-07-19 02:19:03.237476	2025-07-19 02:19:03.237476
11	3	1	2	2025-07-19 02:19:03.417881	2025-07-19 02:19:03.417881
12	3	2	2	2025-07-19 02:19:03.417881	2025-07-19 02:19:03.417881
13	3	3	2	2025-07-19 02:19:03.417881	2025-07-19 02:19:03.417881
14	3	4	2	2025-07-19 02:19:03.417881	2025-07-19 02:19:03.417881
15	3	5	2	2025-07-19 02:19:03.417881	2025-07-19 02:19:03.417881
16	4	1	1	2025-07-19 02:19:03.582351	2025-07-19 02:19:03.582351
17	4	2	1	2025-07-19 02:19:03.582351	2025-07-19 02:19:03.582351
18	4	3	1	2025-07-19 02:19:03.582351	2025-07-19 02:19:03.582351
19	4	4	1	2025-07-19 02:19:03.582351	2025-07-19 02:19:03.582351
20	4	5	1	2025-07-19 02:19:03.582351	2025-07-19 02:19:03.582351
21	5	1	3	2025-07-19 02:19:03.761673	2025-07-19 02:19:03.761673
22	5	2	2	2025-07-19 02:19:03.761673	2025-07-19 02:19:03.761673
23	5	3	2	2025-07-19 02:19:03.761673	2025-07-19 02:19:03.761673
24	5	4	3	2025-07-19 02:19:03.761673	2025-07-19 02:19:03.761673
25	5	5	3	2025-07-19 02:19:03.761673	2025-07-19 02:19:03.761673
26	6	1	2	2025-07-19 02:19:03.936328	2025-07-19 02:19:03.936328
27	6	2	2	2025-07-19 02:19:03.936328	2025-07-19 02:19:03.936328
28	6	3	2	2025-07-19 02:19:03.936328	2025-07-19 02:19:03.936328
29	6	4	2	2025-07-19 02:19:03.936328	2025-07-19 02:19:03.936328
30	6	5	2	2025-07-19 02:19:03.936328	2025-07-19 02:19:03.936328
31	7	1	2	2025-07-19 02:19:04.108056	2025-07-19 02:19:04.108056
32	7	2	2	2025-07-19 02:19:04.108056	2025-07-19 02:19:04.108056
33	7	3	2	2025-07-19 02:19:04.108056	2025-07-19 02:19:04.108056
34	7	4	2	2025-07-19 02:19:04.108056	2025-07-19 02:19:04.108056
35	7	5	2	2025-07-19 02:19:04.108056	2025-07-19 02:19:04.108056
36	8	1	2	2025-07-19 02:19:04.264674	2025-07-19 02:19:04.264674
37	8	2	2	2025-07-19 02:19:04.264674	2025-07-19 02:19:04.264674
38	8	3	2	2025-07-19 02:19:04.264674	2025-07-19 02:19:04.264674
39	8	4	2	2025-07-19 02:19:04.264674	2025-07-19 02:19:04.264674
40	8	5	2	2025-07-19 02:19:04.264674	2025-07-19 02:19:04.264674
41	9	1	2	2025-07-19 02:19:04.429453	2025-07-19 02:19:04.429453
42	9	2	2	2025-07-19 02:19:04.429453	2025-07-19 02:19:04.429453
43	9	3	2	2025-07-19 02:19:04.429453	2025-07-19 02:19:04.429453
44	9	4	2	2025-07-19 02:19:04.429453	2025-07-19 02:19:04.429453
45	9	5	2	2025-07-19 02:19:04.429453	2025-07-19 02:19:04.429453
46	10	1	3	2025-07-19 02:19:04.606095	2025-07-19 02:19:04.606095
47	10	2	3	2025-07-19 02:19:04.606095	2025-07-19 02:19:04.606095
48	10	3	3	2025-07-19 02:19:04.606095	2025-07-19 02:19:04.606095
49	10	4	3	2025-07-19 02:19:04.606095	2025-07-19 02:19:04.606095
50	10	5	3	2025-07-19 02:19:04.606095	2025-07-19 02:19:04.606095
51	11	1	3	2025-07-19 02:19:04.771096	2025-07-19 02:19:04.771096
52	11	2	2	2025-07-19 02:19:04.771096	2025-07-19 02:19:04.771096
53	11	3	2	2025-07-19 02:19:04.771096	2025-07-19 02:19:04.771096
54	11	4	2	2025-07-19 02:19:04.771096	2025-07-19 02:19:04.771096
55	11	5	2	2025-07-19 02:19:04.771096	2025-07-19 02:19:04.771096
56	12	1	2	2025-07-19 02:19:04.930054	2025-07-19 02:19:04.930054
57	12	2	2	2025-07-19 02:19:04.930054	2025-07-19 02:19:04.930054
58	12	3	2	2025-07-19 02:19:04.930054	2025-07-19 02:19:04.930054
59	12	4	2	2025-07-19 02:19:04.930054	2025-07-19 02:19:04.930054
60	12	5	2	2025-07-19 02:19:04.930054	2025-07-19 02:19:04.930054
61	13	1	2	2025-07-19 02:19:05.144281	2025-07-19 02:19:05.144281
62	13	2	2	2025-07-19 02:19:05.144281	2025-07-19 02:19:05.144281
63	13	3	2	2025-07-19 02:19:05.144281	2025-07-19 02:19:05.144281
64	13	4	2	2025-07-19 02:19:05.144281	2025-07-19 02:19:05.144281
65	13	5	2	2025-07-19 02:19:05.144281	2025-07-19 02:19:05.144281
66	14	1	2	2025-07-19 02:19:05.299448	2025-07-19 02:19:05.299448
67	14	2	2	2025-07-19 02:19:05.299448	2025-07-19 02:19:05.299448
68	14	3	2	2025-07-19 02:19:05.299448	2025-07-19 02:19:05.299448
69	14	4	2	2025-07-19 02:19:05.299448	2025-07-19 02:19:05.299448
70	14	5	2	2025-07-19 02:19:05.299448	2025-07-19 02:19:05.299448
71	15	1	2	2025-07-19 02:19:05.454957	2025-07-19 02:19:05.454957
72	15	2	2	2025-07-19 02:19:05.454957	2025-07-19 02:19:05.454957
73	15	3	2	2025-07-19 02:19:05.454957	2025-07-19 02:19:05.454957
74	15	4	2	2025-07-19 02:19:05.454957	2025-07-19 02:19:05.454957
75	15	5	2	2025-07-19 02:19:05.454957	2025-07-19 02:19:05.454957
76	16	1	2	2025-07-19 02:19:05.626896	2025-07-19 02:19:05.626896
77	16	2	2	2025-07-19 02:19:05.626896	2025-07-19 02:19:05.626896
78	16	3	2	2025-07-19 02:19:05.626896	2025-07-19 02:19:05.626896
79	16	4	2	2025-07-19 02:19:05.626896	2025-07-19 02:19:05.626896
80	16	5	2	2025-07-19 02:19:05.626896	2025-07-19 02:19:05.626896
81	17	1	2	2025-07-19 02:19:05.791552	2025-07-19 02:19:05.791552
82	17	2	2	2025-07-19 02:19:05.791552	2025-07-19 02:19:05.791552
83	17	3	2	2025-07-19 02:19:05.791552	2025-07-19 02:19:05.791552
84	17	4	2	2025-07-19 02:19:05.791552	2025-07-19 02:19:05.791552
85	17	5	2	2025-07-19 02:19:05.791552	2025-07-19 02:19:05.791552
86	18	1	2	2025-07-19 02:19:05.939644	2025-07-19 02:19:05.939644
87	18	2	2	2025-07-19 02:19:05.939644	2025-07-19 02:19:05.939644
88	18	3	2	2025-07-19 02:19:05.939644	2025-07-19 02:19:05.939644
89	18	4	2	2025-07-19 02:19:05.939644	2025-07-19 02:19:05.939644
90	18	5	2	2025-07-19 02:19:05.939644	2025-07-19 02:19:05.939644
91	19	1	1	2025-07-19 02:19:06.088828	2025-07-19 02:19:06.088828
92	19	2	1	2025-07-19 02:19:06.088828	2025-07-19 02:19:06.088828
93	19	3	1	2025-07-19 02:19:06.088828	2025-07-19 02:19:06.088828
94	19	4	1	2025-07-19 02:19:06.088828	2025-07-19 02:19:06.088828
95	19	5	1	2025-07-19 02:19:06.088828	2025-07-19 02:19:06.088828
96	20	1	2	2025-07-19 02:19:06.261676	2025-07-19 02:19:06.261676
97	20	2	2	2025-07-19 02:19:06.261676	2025-07-19 02:19:06.261676
98	20	3	2	2025-07-19 02:19:06.261676	2025-07-19 02:19:06.261676
99	20	4	2	2025-07-19 02:19:06.261676	2025-07-19 02:19:06.261676
100	20	5	2	2025-07-19 02:19:06.261676	2025-07-19 02:19:06.261676
101	21	1	2	2025-07-19 02:19:06.412814	2025-07-19 02:19:06.412814
102	21	2	2	2025-07-19 02:19:06.412814	2025-07-19 02:19:06.412814
103	21	3	2	2025-07-19 02:19:06.412814	2025-07-19 02:19:06.412814
104	21	4	2	2025-07-19 02:19:06.412814	2025-07-19 02:19:06.412814
105	21	5	2	2025-07-19 02:19:06.412814	2025-07-19 02:19:06.412814
106	22	1	2	2025-07-19 02:19:06.573342	2025-07-19 02:19:06.573342
107	22	2	2	2025-07-19 02:19:06.573342	2025-07-19 02:19:06.573342
108	22	3	2	2025-07-19 02:19:06.573342	2025-07-19 02:19:06.573342
109	22	4	2	2025-07-19 02:19:06.573342	2025-07-19 02:19:06.573342
110	22	5	2	2025-07-19 02:19:06.573342	2025-07-19 02:19:06.573342
111	23	1	2	2025-07-19 02:19:06.749268	2025-07-19 02:19:06.749268
112	23	2	2	2025-07-19 02:19:06.749268	2025-07-19 02:19:06.749268
113	23	3	2	2025-07-19 02:19:06.749268	2025-07-19 02:19:06.749268
114	23	4	2	2025-07-19 02:19:06.749268	2025-07-19 02:19:06.749268
115	23	5	2	2025-07-19 02:19:06.749268	2025-07-19 02:19:06.749268
116	24	1	2	2025-07-19 02:19:06.909842	2025-07-19 02:19:06.909842
117	24	2	2	2025-07-19 02:19:06.909842	2025-07-19 02:19:06.909842
118	24	3	2	2025-07-19 02:19:06.909842	2025-07-19 02:19:06.909842
119	24	4	2	2025-07-19 02:19:06.909842	2025-07-19 02:19:06.909842
120	24	5	2	2025-07-19 02:19:06.909842	2025-07-19 02:19:06.909842
121	25	1	2	2025-07-19 02:19:07.063827	2025-07-19 02:19:07.063827
122	25	2	2	2025-07-19 02:19:07.063827	2025-07-19 02:19:07.063827
123	25	3	2	2025-07-19 02:19:07.063827	2025-07-19 02:19:07.063827
124	25	4	2	2025-07-19 02:19:07.063827	2025-07-19 02:19:07.063827
125	25	5	2	2025-07-19 02:19:07.063827	2025-07-19 02:19:07.063827
126	26	1	2	2025-07-19 02:19:07.222754	2025-07-19 02:19:07.222754
127	26	2	2	2025-07-19 02:19:07.222754	2025-07-19 02:19:07.222754
128	26	3	2	2025-07-19 02:19:07.222754	2025-07-19 02:19:07.222754
129	26	4	2	2025-07-19 02:19:07.222754	2025-07-19 02:19:07.222754
130	26	5	2	2025-07-19 02:19:07.222754	2025-07-19 02:19:07.222754
131	27	1	1	2025-07-19 02:19:07.384334	2025-07-19 02:19:07.384334
132	27	2	1	2025-07-19 02:19:07.384334	2025-07-19 02:19:07.384334
133	27	3	1	2025-07-19 02:19:07.384334	2025-07-19 02:19:07.384334
134	27	4	1	2025-07-19 02:19:07.384334	2025-07-19 02:19:07.384334
135	27	5	1	2025-07-19 02:19:07.384334	2025-07-19 02:19:07.384334
136	28	1	2	2025-07-19 02:19:07.556641	2025-07-19 02:19:07.556641
137	28	2	2	2025-07-19 02:19:07.556641	2025-07-19 02:19:07.556641
138	28	3	2	2025-07-19 02:19:07.556641	2025-07-19 02:19:07.556641
139	28	4	2	2025-07-19 02:19:07.556641	2025-07-19 02:19:07.556641
140	28	5	2	2025-07-19 02:19:07.556641	2025-07-19 02:19:07.556641
141	29	1	2	2025-07-19 02:19:07.712568	2025-07-19 02:19:07.712568
142	29	2	2	2025-07-19 02:19:07.712568	2025-07-19 02:19:07.712568
143	29	3	2	2025-07-19 02:19:07.712568	2025-07-19 02:19:07.712568
144	29	4	2	2025-07-19 02:19:07.712568	2025-07-19 02:19:07.712568
145	29	5	2	2025-07-19 02:19:07.712568	2025-07-19 02:19:07.712568
146	30	1	1	2025-07-19 02:19:07.869859	2025-07-19 02:19:07.869859
147	30	2	1	2025-07-19 02:19:07.869859	2025-07-19 02:19:07.869859
148	30	3	1	2025-07-19 02:19:07.869859	2025-07-19 02:19:07.869859
149	30	4	1	2025-07-19 02:19:07.869859	2025-07-19 02:19:07.869859
150	30	5	1	2025-07-19 02:19:07.869859	2025-07-19 02:19:07.869859
151	31	1	2	2025-07-19 02:19:08.026948	2025-07-19 02:19:08.026948
152	31	2	2	2025-07-19 02:19:08.026948	2025-07-19 02:19:08.026948
153	31	3	2	2025-07-19 02:19:08.026948	2025-07-19 02:19:08.026948
154	31	4	2	2025-07-19 02:19:08.026948	2025-07-19 02:19:08.026948
155	31	5	2	2025-07-19 02:19:08.026948	2025-07-19 02:19:08.026948
156	32	1	2	2025-07-19 02:19:08.191464	2025-07-19 02:19:08.191464
157	32	2	2	2025-07-19 02:19:08.191464	2025-07-19 02:19:08.191464
158	32	3	2	2025-07-19 02:19:08.191464	2025-07-19 02:19:08.191464
159	32	4	2	2025-07-19 02:19:08.191464	2025-07-19 02:19:08.191464
160	32	5	2	2025-07-19 02:19:08.191464	2025-07-19 02:19:08.191464
161	33	1	2	2025-07-19 02:19:08.353722	2025-07-19 02:19:08.353722
162	33	2	2	2025-07-19 02:19:08.353722	2025-07-19 02:19:08.353722
163	33	3	2	2025-07-19 02:19:08.353722	2025-07-19 02:19:08.353722
164	33	4	2	2025-07-19 02:19:08.353722	2025-07-19 02:19:08.353722
165	33	5	2	2025-07-19 02:19:08.353722	2025-07-19 02:19:08.353722
166	34	1	2	2025-07-19 02:19:08.51852	2025-07-19 02:19:08.51852
167	34	2	2	2025-07-19 02:19:08.51852	2025-07-19 02:19:08.51852
168	34	3	2	2025-07-19 02:19:08.51852	2025-07-19 02:19:08.51852
169	34	4	2	2025-07-19 02:19:08.51852	2025-07-19 02:19:08.51852
170	34	5	2	2025-07-19 02:19:08.51852	2025-07-19 02:19:08.51852
171	35	1	1	2025-07-19 02:19:08.675344	2025-07-19 02:19:08.675344
172	35	2	1	2025-07-19 02:19:08.675344	2025-07-19 02:19:08.675344
173	35	3	1	2025-07-19 02:19:08.675344	2025-07-19 02:19:08.675344
174	35	4	1	2025-07-19 02:19:08.675344	2025-07-19 02:19:08.675344
175	35	5	1	2025-07-19 02:19:08.675344	2025-07-19 02:19:08.675344
176	36	1	3	2025-07-19 02:19:08.830759	2025-07-19 02:19:08.830759
177	36	2	3	2025-07-19 02:19:08.830759	2025-07-19 02:19:08.830759
178	36	3	3	2025-07-19 02:19:08.830759	2025-07-19 02:19:08.830759
179	36	4	3	2025-07-19 02:19:08.830759	2025-07-19 02:19:08.830759
180	36	5	3	2025-07-19 02:19:08.830759	2025-07-19 02:19:08.830759
181	37	1	2	2025-07-19 02:19:08.977654	2025-07-19 02:19:08.977654
182	37	2	2	2025-07-19 02:19:08.977654	2025-07-19 02:19:08.977654
183	37	3	2	2025-07-19 02:19:08.977654	2025-07-19 02:19:08.977654
184	37	4	2	2025-07-19 02:19:08.977654	2025-07-19 02:19:08.977654
185	37	5	2	2025-07-19 02:19:08.977654	2025-07-19 02:19:08.977654
186	38	1	2	2025-07-19 02:19:09.14012	2025-07-19 02:19:09.14012
187	38	2	2	2025-07-19 02:19:09.14012	2025-07-19 02:19:09.14012
188	38	3	2	2025-07-19 02:19:09.14012	2025-07-19 02:19:09.14012
189	38	4	2	2025-07-19 02:19:09.14012	2025-07-19 02:19:09.14012
190	38	5	2	2025-07-19 02:19:09.14012	2025-07-19 02:19:09.14012
191	39	1	1	2025-07-19 02:19:09.291752	2025-07-19 02:19:09.291752
192	39	2	1	2025-07-19 02:19:09.291752	2025-07-19 02:19:09.291752
193	39	3	1	2025-07-19 02:19:09.291752	2025-07-19 02:19:09.291752
194	39	4	1	2025-07-19 02:19:09.291752	2025-07-19 02:19:09.291752
195	39	5	1	2025-07-19 02:19:09.291752	2025-07-19 02:19:09.291752
196	40	1	2	2025-07-19 02:19:09.443553	2025-07-19 02:19:09.443553
197	40	2	2	2025-07-19 02:19:09.443553	2025-07-19 02:19:09.443553
198	40	3	2	2025-07-19 02:19:09.443553	2025-07-19 02:19:09.443553
199	40	4	2	2025-07-19 02:19:09.443553	2025-07-19 02:19:09.443553
200	40	5	2	2025-07-19 02:19:09.443553	2025-07-19 02:19:09.443553
201	41	1	1	2025-07-19 02:19:09.590669	2025-07-19 02:19:09.590669
202	41	2	1	2025-07-19 02:19:09.590669	2025-07-19 02:19:09.590669
203	41	3	1	2025-07-19 02:19:09.590669	2025-07-19 02:19:09.590669
204	41	4	1	2025-07-19 02:19:09.590669	2025-07-19 02:19:09.590669
205	41	5	1	2025-07-19 02:19:09.590669	2025-07-19 02:19:09.590669
206	42	1	2	2025-07-19 02:19:09.740535	2025-07-19 02:19:09.740535
207	42	2	2	2025-07-19 02:19:09.740535	2025-07-19 02:19:09.740535
208	42	3	2	2025-07-19 02:19:09.740535	2025-07-19 02:19:09.740535
209	42	4	2	2025-07-19 02:19:09.740535	2025-07-19 02:19:09.740535
210	42	5	2	2025-07-19 02:19:09.740535	2025-07-19 02:19:09.740535
211	43	1	10	2025-07-19 02:19:09.887533	2025-07-19 02:19:09.887533
212	43	2	10	2025-07-19 02:19:09.887533	2025-07-19 02:19:09.887533
213	43	3	10	2025-07-19 02:19:09.887533	2025-07-19 02:19:09.887533
214	43	4	10	2025-07-19 02:19:09.887533	2025-07-19 02:19:09.887533
215	43	5	10	2025-07-19 02:19:09.887533	2025-07-19 02:19:09.887533
216	44	1	10	2025-07-19 02:19:10.044912	2025-07-19 02:19:10.044912
217	44	2	10	2025-07-19 02:19:10.044912	2025-07-19 02:19:10.044912
218	44	3	10	2025-07-19 02:19:10.044912	2025-07-19 02:19:10.044912
219	44	4	10	2025-07-19 02:19:10.044912	2025-07-19 02:19:10.044912
220	44	5	10	2025-07-19 02:19:10.044912	2025-07-19 02:19:10.044912
221	45	1	2	2025-07-19 02:19:10.195928	2025-07-19 02:19:10.195928
222	45	2	2	2025-07-19 02:19:10.195928	2025-07-19 02:19:10.195928
223	45	3	2	2025-07-19 02:19:10.195928	2025-07-19 02:19:10.195928
224	45	4	2	2025-07-19 02:19:10.195928	2025-07-19 02:19:10.195928
225	45	5	2	2025-07-19 02:19:10.195928	2025-07-19 02:19:10.195928
226	46	1	2	2025-07-19 02:19:10.34579	2025-07-19 02:19:10.34579
227	46	2	2	2025-07-19 02:19:10.34579	2025-07-19 02:19:10.34579
228	46	3	2	2025-07-19 02:19:10.34579	2025-07-19 02:19:10.34579
229	46	4	2	2025-07-19 02:19:10.34579	2025-07-19 02:19:10.34579
230	46	5	2	2025-07-19 02:19:10.34579	2025-07-19 02:19:10.34579
231	47	1	2	2025-07-19 02:19:10.503679	2025-07-19 02:19:10.503679
232	47	2	2	2025-07-19 02:19:10.503679	2025-07-19 02:19:10.503679
233	47	3	2	2025-07-19 02:19:10.503679	2025-07-19 02:19:10.503679
234	47	4	2	2025-07-19 02:19:10.503679	2025-07-19 02:19:10.503679
235	47	5	2	2025-07-19 02:19:10.503679	2025-07-19 02:19:10.503679
236	48	1	1	2025-07-19 02:19:10.657772	2025-07-19 02:19:10.657772
237	48	2	1	2025-07-19 02:19:10.657772	2025-07-19 02:19:10.657772
238	48	3	1	2025-07-19 02:19:10.657772	2025-07-19 02:19:10.657772
239	48	4	1	2025-07-19 02:19:10.657772	2025-07-19 02:19:10.657772
240	48	5	1	2025-07-19 02:19:10.657772	2025-07-19 02:19:10.657772
241	49	1	2	2025-07-19 02:19:10.81207	2025-07-19 02:19:10.81207
242	49	2	2	2025-07-19 02:19:10.81207	2025-07-19 02:19:10.81207
243	49	3	2	2025-07-19 02:19:10.81207	2025-07-19 02:19:10.81207
244	49	4	2	2025-07-19 02:19:10.81207	2025-07-19 02:19:10.81207
245	49	5	2	2025-07-19 02:19:10.81207	2025-07-19 02:19:10.81207
246	50	1	2	2025-07-19 02:19:10.964146	2025-07-19 02:19:10.964146
247	50	2	2	2025-07-19 02:19:10.964146	2025-07-19 02:19:10.964146
248	50	3	2	2025-07-19 02:19:10.964146	2025-07-19 02:19:10.964146
249	50	4	2	2025-07-19 02:19:10.964146	2025-07-19 02:19:10.964146
250	50	5	2	2025-07-19 02:19:10.964146	2025-07-19 02:19:10.964146
251	51	1	1	2025-07-19 02:19:11.116657	2025-07-19 02:19:11.116657
252	51	2	1	2025-07-19 02:19:11.116657	2025-07-19 02:19:11.116657
253	51	3	1	2025-07-19 02:19:11.116657	2025-07-19 02:19:11.116657
254	51	4	1	2025-07-19 02:19:11.116657	2025-07-19 02:19:11.116657
255	51	5	1	2025-07-19 02:19:11.116657	2025-07-19 02:19:11.116657
256	52	1	2	2025-07-19 02:19:11.275967	2025-07-19 02:19:11.275967
257	52	2	2	2025-07-19 02:19:11.275967	2025-07-19 02:19:11.275967
258	52	3	2	2025-07-19 02:19:11.275967	2025-07-19 02:19:11.275967
259	52	4	2	2025-07-19 02:19:11.275967	2025-07-19 02:19:11.275967
260	52	5	2	2025-07-19 02:19:11.275967	2025-07-19 02:19:11.275967
261	53	1	2	2025-07-19 02:19:11.426549	2025-07-19 02:19:11.426549
262	53	2	2	2025-07-19 02:19:11.426549	2025-07-19 02:19:11.426549
263	53	3	2	2025-07-19 02:19:11.426549	2025-07-19 02:19:11.426549
264	53	4	2	2025-07-19 02:19:11.426549	2025-07-19 02:19:11.426549
265	53	5	2	2025-07-19 02:19:11.426549	2025-07-19 02:19:11.426549
266	54	1	2	2025-07-19 02:19:11.582705	2025-07-19 02:19:11.582705
267	54	2	2	2025-07-19 02:19:11.582705	2025-07-19 02:19:11.582705
268	54	3	2	2025-07-19 02:19:11.582705	2025-07-19 02:19:11.582705
269	54	4	2	2025-07-19 02:19:11.582705	2025-07-19 02:19:11.582705
270	54	5	2	2025-07-19 02:19:11.582705	2025-07-19 02:19:11.582705
271	55	1	2	2025-07-19 02:19:11.728809	2025-07-19 02:19:11.728809
272	55	2	2	2025-07-19 02:19:11.728809	2025-07-19 02:19:11.728809
273	55	3	2	2025-07-19 02:19:11.728809	2025-07-19 02:19:11.728809
274	55	4	2	2025-07-19 02:19:11.728809	2025-07-19 02:19:11.728809
275	55	5	2	2025-07-19 02:19:11.728809	2025-07-19 02:19:11.728809
276	56	1	2	2025-07-19 02:19:11.887283	2025-07-19 02:19:11.887283
277	56	2	2	2025-07-19 02:19:11.887283	2025-07-19 02:19:11.887283
278	56	3	2	2025-07-19 02:19:11.887283	2025-07-19 02:19:11.887283
279	56	4	2	2025-07-19 02:19:11.887283	2025-07-19 02:19:11.887283
280	56	5	2	2025-07-19 02:19:11.887283	2025-07-19 02:19:11.887283
281	57	1	2	2025-07-19 02:19:12.047514	2025-07-19 02:19:12.047514
282	57	2	2	2025-07-19 02:19:12.047514	2025-07-19 02:19:12.047514
283	57	3	2	2025-07-19 02:19:12.047514	2025-07-19 02:19:12.047514
284	57	4	2	2025-07-19 02:19:12.047514	2025-07-19 02:19:12.047514
285	57	5	2	2025-07-19 02:19:12.047514	2025-07-19 02:19:12.047514
286	58	1	2	2025-07-19 02:19:12.203987	2025-07-19 02:19:12.203987
287	58	2	2	2025-07-19 02:19:12.203987	2025-07-19 02:19:12.203987
288	58	3	2	2025-07-19 02:19:12.203987	2025-07-19 02:19:12.203987
289	58	4	2	2025-07-19 02:19:12.203987	2025-07-19 02:19:12.203987
290	58	5	2	2025-07-19 02:19:12.203987	2025-07-19 02:19:12.203987
291	59	1	2	2025-07-19 02:19:12.362194	2025-07-19 02:19:12.362194
292	59	2	2	2025-07-19 02:19:12.362194	2025-07-19 02:19:12.362194
293	59	3	2	2025-07-19 02:19:12.362194	2025-07-19 02:19:12.362194
294	59	4	2	2025-07-19 02:19:12.362194	2025-07-19 02:19:12.362194
295	59	5	2	2025-07-19 02:19:12.362194	2025-07-19 02:19:12.362194
296	60	1	1	2025-07-19 02:19:12.511231	2025-07-19 02:19:12.511231
297	60	2	1	2025-07-19 02:19:12.511231	2025-07-19 02:19:12.511231
298	60	3	1	2025-07-19 02:19:12.511231	2025-07-19 02:19:12.511231
299	60	4	1	2025-07-19 02:19:12.511231	2025-07-19 02:19:12.511231
300	60	5	1	2025-07-19 02:19:12.511231	2025-07-19 02:19:12.511231
301	61	1	2	2025-07-19 02:19:12.669558	2025-07-19 02:19:12.669558
302	61	2	2	2025-07-19 02:19:12.669558	2025-07-19 02:19:12.669558
303	61	3	2	2025-07-19 02:19:12.669558	2025-07-19 02:19:12.669558
304	61	4	2	2025-07-19 02:19:12.669558	2025-07-19 02:19:12.669558
305	61	5	2	2025-07-19 02:19:12.669558	2025-07-19 02:19:12.669558
306	62	1	2	2025-07-19 02:19:12.82322	2025-07-19 02:19:12.82322
307	62	2	2	2025-07-19 02:19:12.82322	2025-07-19 02:19:12.82322
308	62	3	2	2025-07-19 02:19:12.82322	2025-07-19 02:19:12.82322
309	62	4	2	2025-07-19 02:19:12.82322	2025-07-19 02:19:12.82322
310	62	5	2	2025-07-19 02:19:12.82322	2025-07-19 02:19:12.82322
311	63	1	2	2025-07-19 02:19:12.976472	2025-07-19 02:19:12.976472
312	63	2	2	2025-07-19 02:19:12.976472	2025-07-19 02:19:12.976472
313	63	3	2	2025-07-19 02:19:12.976472	2025-07-19 02:19:12.976472
314	63	4	2	2025-07-19 02:19:12.976472	2025-07-19 02:19:12.976472
315	63	5	2	2025-07-19 02:19:12.976472	2025-07-19 02:19:12.976472
316	64	1	2	2025-07-19 02:19:13.134449	2025-07-19 02:19:13.134449
317	64	2	2	2025-07-19 02:19:13.134449	2025-07-19 02:19:13.134449
318	64	3	2	2025-07-19 02:19:13.134449	2025-07-19 02:19:13.134449
319	64	4	2	2025-07-19 02:19:13.134449	2025-07-19 02:19:13.134449
320	64	5	2	2025-07-19 02:19:13.134449	2025-07-19 02:19:13.134449
321	65	1	2	2025-07-19 02:19:13.290836	2025-07-19 02:19:13.290836
322	65	2	2	2025-07-19 02:19:13.290836	2025-07-19 02:19:13.290836
323	65	4	2	2025-07-19 02:19:13.290836	2025-07-19 02:19:13.290836
324	65	5	2	2025-07-19 02:19:13.290836	2025-07-19 02:19:13.290836
325	66	1	2	2025-07-19 02:19:13.473021	2025-07-19 02:19:13.473021
326	66	2	2	2025-07-19 02:19:13.473021	2025-07-19 02:19:13.473021
327	66	3	2	2025-07-19 02:19:13.473021	2025-07-19 02:19:13.473021
328	66	4	2	2025-07-19 02:19:13.473021	2025-07-19 02:19:13.473021
329	66	5	2	2025-07-19 02:19:13.473021	2025-07-19 02:19:13.473021
330	67	1	2	2025-07-19 02:19:13.625856	2025-07-19 02:19:13.625856
331	67	2	2	2025-07-19 02:19:13.625856	2025-07-19 02:19:13.625856
332	67	3	2	2025-07-19 02:19:13.625856	2025-07-19 02:19:13.625856
333	67	4	2	2025-07-19 02:19:13.625856	2025-07-19 02:19:13.625856
334	67	5	2	2025-07-19 02:19:13.625856	2025-07-19 02:19:13.625856
335	68	1	2	2025-07-19 02:19:13.785439	2025-07-19 02:19:13.785439
336	68	2	2	2025-07-19 02:19:13.785439	2025-07-19 02:19:13.785439
337	68	3	2	2025-07-19 02:19:13.785439	2025-07-19 02:19:13.785439
338	68	4	2	2025-07-19 02:19:13.785439	2025-07-19 02:19:13.785439
339	68	5	2	2025-07-19 02:19:13.785439	2025-07-19 02:19:13.785439
340	69	1	2	2025-07-19 02:19:13.965779	2025-07-19 02:19:13.965779
341	69	2	2	2025-07-19 02:19:13.965779	2025-07-19 02:19:13.965779
342	69	3	2	2025-07-19 02:19:13.965779	2025-07-19 02:19:13.965779
343	69	4	2	2025-07-19 02:19:13.965779	2025-07-19 02:19:13.965779
344	69	5	2	2025-07-19 02:19:13.965779	2025-07-19 02:19:13.965779
345	70	1	2	2025-07-19 02:19:14.119615	2025-07-19 02:19:14.119615
346	70	2	2	2025-07-19 02:19:14.119615	2025-07-19 02:19:14.119615
347	70	3	2	2025-07-19 02:19:14.119615	2025-07-19 02:19:14.119615
348	70	4	2	2025-07-19 02:19:14.119615	2025-07-19 02:19:14.119615
349	70	5	2	2025-07-19 02:19:14.119615	2025-07-19 02:19:14.119615
350	71	1	2	2025-07-19 02:19:14.267937	2025-07-19 02:19:14.267937
351	71	2	2	2025-07-19 02:19:14.267937	2025-07-19 02:19:14.267937
352	71	3	2	2025-07-19 02:19:14.267937	2025-07-19 02:19:14.267937
353	71	4	2	2025-07-19 02:19:14.267937	2025-07-19 02:19:14.267937
354	71	5	2	2025-07-19 02:19:14.267937	2025-07-19 02:19:14.267937
355	72	1	2	2025-07-19 02:19:14.419228	2025-07-19 02:19:14.419228
356	72	2	2	2025-07-19 02:19:14.419228	2025-07-19 02:19:14.419228
357	72	3	2	2025-07-19 02:19:14.419228	2025-07-19 02:19:14.419228
358	72	4	2	2025-07-19 02:19:14.419228	2025-07-19 02:19:14.419228
359	72	5	2	2025-07-19 02:19:14.419228	2025-07-19 02:19:14.419228
360	73	1	2	2025-07-19 02:19:14.579407	2025-07-19 02:19:14.579407
361	73	2	2	2025-07-19 02:19:14.579407	2025-07-19 02:19:14.579407
362	73	3	2	2025-07-19 02:19:14.579407	2025-07-19 02:19:14.579407
363	73	4	2	2025-07-19 02:19:14.579407	2025-07-19 02:19:14.579407
364	73	5	2	2025-07-19 02:19:14.579407	2025-07-19 02:19:14.579407
365	74	1	2	2025-07-19 02:19:14.740447	2025-07-19 02:19:14.740447
366	74	2	2	2025-07-19 02:19:14.740447	2025-07-19 02:19:14.740447
367	74	3	2	2025-07-19 02:19:14.740447	2025-07-19 02:19:14.740447
368	74	4	2	2025-07-19 02:19:14.740447	2025-07-19 02:19:14.740447
369	74	5	2	2025-07-19 02:19:14.740447	2025-07-19 02:19:14.740447
370	75	1	2	2025-07-19 02:19:14.910228	2025-07-19 02:19:14.910228
371	75	2	2	2025-07-19 02:19:14.910228	2025-07-19 02:19:14.910228
372	75	3	2	2025-07-19 02:19:14.910228	2025-07-19 02:19:14.910228
373	75	4	2	2025-07-19 02:19:14.910228	2025-07-19 02:19:14.910228
374	75	5	2	2025-07-19 02:19:14.910228	2025-07-19 02:19:14.910228
375	76	1	2	2025-07-19 02:19:15.092179	2025-07-19 02:19:15.092179
376	76	2	2	2025-07-19 02:19:15.092179	2025-07-19 02:19:15.092179
377	76	3	2	2025-07-19 02:19:15.092179	2025-07-19 02:19:15.092179
378	76	4	2	2025-07-19 02:19:15.092179	2025-07-19 02:19:15.092179
379	76	5	2	2025-07-19 02:19:15.092179	2025-07-19 02:19:15.092179
380	77	1	2	2025-07-19 02:19:15.244796	2025-07-19 02:19:15.244796
381	77	2	2	2025-07-19 02:19:15.244796	2025-07-19 02:19:15.244796
382	77	3	2	2025-07-19 02:19:15.244796	2025-07-19 02:19:15.244796
383	77	4	2	2025-07-19 02:19:15.244796	2025-07-19 02:19:15.244796
384	77	5	2	2025-07-19 02:19:15.244796	2025-07-19 02:19:15.244796
385	78	1	3	2025-07-19 02:19:15.397482	2025-07-19 02:19:15.397482
386	78	2	3	2025-07-19 02:19:15.397482	2025-07-19 02:19:15.397482
387	78	3	3	2025-07-19 02:19:15.397482	2025-07-19 02:19:15.397482
388	78	4	3	2025-07-19 02:19:15.397482	2025-07-19 02:19:15.397482
389	78	5	3	2025-07-19 02:19:15.397482	2025-07-19 02:19:15.397482
390	79	1	2	2025-07-19 02:19:15.54979	2025-07-19 02:19:15.54979
391	79	2	2	2025-07-19 02:19:15.54979	2025-07-19 02:19:15.54979
392	79	3	2	2025-07-19 02:19:15.54979	2025-07-19 02:19:15.54979
393	79	4	2	2025-07-19 02:19:15.54979	2025-07-19 02:19:15.54979
394	79	5	2	2025-07-19 02:19:15.54979	2025-07-19 02:19:15.54979
395	80	1	2	2025-07-19 02:19:15.698284	2025-07-19 02:19:15.698284
396	80	2	2	2025-07-19 02:19:15.698284	2025-07-19 02:19:15.698284
397	80	3	2	2025-07-19 02:19:15.698284	2025-07-19 02:19:15.698284
398	80	4	2	2025-07-19 02:19:15.698284	2025-07-19 02:19:15.698284
399	80	5	2	2025-07-19 02:19:15.698284	2025-07-19 02:19:15.698284
400	81	1	2	2025-07-19 02:19:15.846166	2025-07-19 02:19:15.846166
401	81	2	2	2025-07-19 02:19:15.846166	2025-07-19 02:19:15.846166
402	81	3	2	2025-07-19 02:19:15.846166	2025-07-19 02:19:15.846166
403	81	4	2	2025-07-19 02:19:15.846166	2025-07-19 02:19:15.846166
404	81	5	2	2025-07-19 02:19:15.846166	2025-07-19 02:19:15.846166
405	82	1	1	2025-07-19 02:19:16.040064	2025-07-19 02:19:16.040064
406	82	2	1	2025-07-19 02:19:16.040064	2025-07-19 02:19:16.040064
407	82	3	1	2025-07-19 02:19:16.040064	2025-07-19 02:19:16.040064
408	82	4	1	2025-07-19 02:19:16.040064	2025-07-19 02:19:16.040064
409	82	5	1	2025-07-19 02:19:16.040064	2025-07-19 02:19:16.040064
410	83	1	2	2025-07-19 02:19:16.185743	2025-07-19 02:19:16.185743
411	83	2	2	2025-07-19 02:19:16.185743	2025-07-19 02:19:16.185743
412	83	3	2	2025-07-19 02:19:16.185743	2025-07-19 02:19:16.185743
413	83	4	2	2025-07-19 02:19:16.185743	2025-07-19 02:19:16.185743
414	83	5	2	2025-07-19 02:19:16.185743	2025-07-19 02:19:16.185743
415	84	1	1	2025-07-19 02:19:16.35106	2025-07-19 02:19:16.35106
416	84	2	1	2025-07-19 02:19:16.35106	2025-07-19 02:19:16.35106
417	84	3	1	2025-07-19 02:19:16.35106	2025-07-19 02:19:16.35106
418	84	4	1	2025-07-19 02:19:16.35106	2025-07-19 02:19:16.35106
419	84	5	1	2025-07-19 02:19:16.35106	2025-07-19 02:19:16.35106
420	85	1	2	2025-07-19 02:19:16.497162	2025-07-19 02:19:16.497162
421	85	2	2	2025-07-19 02:19:16.497162	2025-07-19 02:19:16.497162
422	85	3	2	2025-07-19 02:19:16.497162	2025-07-19 02:19:16.497162
423	85	4	2	2025-07-19 02:19:16.497162	2025-07-19 02:19:16.497162
424	85	5	2	2025-07-19 02:19:16.497162	2025-07-19 02:19:16.497162
425	86	1	2	2025-07-19 02:19:16.647605	2025-07-19 02:19:16.647605
426	86	2	2	2025-07-19 02:19:16.647605	2025-07-19 02:19:16.647605
427	86	3	2	2025-07-19 02:19:16.647605	2025-07-19 02:19:16.647605
428	86	4	2	2025-07-19 02:19:16.647605	2025-07-19 02:19:16.647605
429	86	5	2	2025-07-19 02:19:16.647605	2025-07-19 02:19:16.647605
430	87	1	1	2025-07-19 02:19:16.803638	2025-07-19 02:19:16.803638
431	87	2	1	2025-07-19 02:19:16.803638	2025-07-19 02:19:16.803638
432	87	3	1	2025-07-19 02:19:16.803638	2025-07-19 02:19:16.803638
433	87	4	1	2025-07-19 02:19:16.803638	2025-07-19 02:19:16.803638
434	87	5	1	2025-07-19 02:19:16.803638	2025-07-19 02:19:16.803638
435	88	1	2	2025-07-19 02:19:16.954966	2025-07-19 02:19:16.954966
436	88	2	2	2025-07-19 02:19:16.954966	2025-07-19 02:19:16.954966
437	88	3	2	2025-07-19 02:19:16.954966	2025-07-19 02:19:16.954966
438	88	4	2	2025-07-19 02:19:16.954966	2025-07-19 02:19:16.954966
439	88	5	2	2025-07-19 02:19:16.954966	2025-07-19 02:19:16.954966
440	89	1	24	2025-07-19 02:19:17.115975	2025-07-19 02:19:17.115975
441	89	2	24	2025-07-19 02:19:17.115975	2025-07-19 02:19:17.115975
442	89	3	36	2025-07-19 02:19:17.115975	2025-07-19 02:19:17.115975
443	89	4	36	2025-07-19 02:19:17.115975	2025-07-19 02:19:17.115975
444	89	5	36	2025-07-19 02:19:17.115975	2025-07-19 02:19:17.115975
445	90	1	2	2025-07-19 02:19:17.269846	2025-07-19 02:19:17.269846
446	90	2	2	2025-07-19 02:19:17.269846	2025-07-19 02:19:17.269846
447	90	3	2	2025-07-19 02:19:17.269846	2025-07-19 02:19:17.269846
448	90	4	2	2025-07-19 02:19:17.269846	2025-07-19 02:19:17.269846
449	90	5	2	2025-07-19 02:19:17.269846	2025-07-19 02:19:17.269846
450	91	1	2	2025-07-19 02:19:17.427802	2025-07-19 02:19:17.427802
451	91	2	2	2025-07-19 02:19:17.427802	2025-07-19 02:19:17.427802
452	91	3	2	2025-07-19 02:19:17.427802	2025-07-19 02:19:17.427802
453	91	4	2	2025-07-19 02:19:17.427802	2025-07-19 02:19:17.427802
454	91	5	2	2025-07-19 02:19:17.427802	2025-07-19 02:19:17.427802
455	92	1	2	2025-07-19 02:19:17.588124	2025-07-19 02:19:17.588124
456	92	2	2	2025-07-19 02:19:17.588124	2025-07-19 02:19:17.588124
457	92	3	2	2025-07-19 02:19:17.588124	2025-07-19 02:19:17.588124
458	92	4	2	2025-07-19 02:19:17.588124	2025-07-19 02:19:17.588124
459	92	5	2	2025-07-19 02:19:17.588124	2025-07-19 02:19:17.588124
460	93	1	5	2025-07-19 02:19:17.742523	2025-07-19 02:19:17.742523
461	93	2	5	2025-07-19 02:19:17.742523	2025-07-19 02:19:17.742523
462	93	3	5	2025-07-19 02:19:17.742523	2025-07-19 02:19:17.742523
463	93	4	5	2025-07-19 02:19:17.742523	2025-07-19 02:19:17.742523
464	93	5	5	2025-07-19 02:19:17.742523	2025-07-19 02:19:17.742523
465	94	1	2	2025-07-19 02:19:17.895136	2025-07-19 02:19:17.895136
466	94	2	2	2025-07-19 02:19:17.895136	2025-07-19 02:19:17.895136
467	94	3	2	2025-07-19 02:19:17.895136	2025-07-19 02:19:17.895136
468	94	4	2	2025-07-19 02:19:17.895136	2025-07-19 02:19:17.895136
469	94	5	2	2025-07-19 02:19:17.895136	2025-07-19 02:19:17.895136
470	95	1	2	2025-07-19 02:19:18.050818	2025-07-19 02:19:18.050818
471	95	2	2	2025-07-19 02:19:18.050818	2025-07-19 02:19:18.050818
472	95	3	2	2025-07-19 02:19:18.050818	2025-07-19 02:19:18.050818
473	95	4	2	2025-07-19 02:19:18.050818	2025-07-19 02:19:18.050818
474	95	5	2	2025-07-19 02:19:18.050818	2025-07-19 02:19:18.050818
475	96	1	2	2025-07-19 02:19:18.202468	2025-07-19 02:19:18.202468
476	96	2	2	2025-07-19 02:19:18.202468	2025-07-19 02:19:18.202468
477	96	3	2	2025-07-19 02:19:18.202468	2025-07-19 02:19:18.202468
478	96	4	2	2025-07-19 02:19:18.202468	2025-07-19 02:19:18.202468
479	96	5	2	2025-07-19 02:19:18.202468	2025-07-19 02:19:18.202468
480	97	1	5	2025-07-19 02:19:18.351434	2025-07-19 02:19:18.351434
481	97	2	5	2025-07-19 02:19:18.351434	2025-07-19 02:19:18.351434
482	97	3	5	2025-07-19 02:19:18.351434	2025-07-19 02:19:18.351434
483	97	4	5	2025-07-19 02:19:18.351434	2025-07-19 02:19:18.351434
484	97	5	5	2025-07-19 02:19:18.351434	2025-07-19 02:19:18.351434
485	98	1	2	2025-07-19 02:19:18.5014	2025-07-19 02:19:18.5014
486	98	2	2	2025-07-19 02:19:18.5014	2025-07-19 02:19:18.5014
487	98	3	2	2025-07-19 02:19:18.5014	2025-07-19 02:19:18.5014
488	98	4	2	2025-07-19 02:19:18.5014	2025-07-19 02:19:18.5014
489	98	5	2	2025-07-19 02:19:18.5014	2025-07-19 02:19:18.5014
490	99	1	2	2025-07-19 02:19:18.67231	2025-07-19 02:19:18.67231
491	99	2	2	2025-07-19 02:19:18.67231	2025-07-19 02:19:18.67231
492	99	3	2	2025-07-19 02:19:18.67231	2025-07-19 02:19:18.67231
493	99	4	2	2025-07-19 02:19:18.67231	2025-07-19 02:19:18.67231
494	99	5	2	2025-07-19 02:19:18.67231	2025-07-19 02:19:18.67231
495	100	1	2	2025-07-19 02:19:18.8322	2025-07-19 02:19:18.8322
496	100	2	2	2025-07-19 02:19:18.8322	2025-07-19 02:19:18.8322
497	100	3	2	2025-07-19 02:19:18.8322	2025-07-19 02:19:18.8322
498	100	4	2	2025-07-19 02:19:18.8322	2025-07-19 02:19:18.8322
499	100	5	2	2025-07-19 02:19:18.8322	2025-07-19 02:19:18.8322
500	101	1	2	2025-07-19 02:19:19.030812	2025-07-19 02:19:19.030812
501	101	2	2	2025-07-19 02:19:19.030812	2025-07-19 02:19:19.030812
502	101	3	2	2025-07-19 02:19:19.030812	2025-07-19 02:19:19.030812
503	101	4	2	2025-07-19 02:19:19.030812	2025-07-19 02:19:19.030812
504	101	5	2	2025-07-19 02:19:19.030812	2025-07-19 02:19:19.030812
505	102	1	2	2025-07-19 02:19:19.187289	2025-07-19 02:19:19.187289
506	102	2	2	2025-07-19 02:19:19.187289	2025-07-19 02:19:19.187289
507	102	3	2	2025-07-19 02:19:19.187289	2025-07-19 02:19:19.187289
508	102	4	2	2025-07-19 02:19:19.187289	2025-07-19 02:19:19.187289
509	102	5	2	2025-07-19 02:19:19.187289	2025-07-19 02:19:19.187289
510	103	1	2	2025-07-19 02:19:19.344047	2025-07-19 02:19:19.344047
511	103	2	2	2025-07-19 02:19:19.344047	2025-07-19 02:19:19.344047
512	103	3	2	2025-07-19 02:19:19.344047	2025-07-19 02:19:19.344047
513	103	4	2	2025-07-19 02:19:19.344047	2025-07-19 02:19:19.344047
514	103	5	2	2025-07-19 02:19:19.344047	2025-07-19 02:19:19.344047
515	104	1	2	2025-07-19 02:19:19.495124	2025-07-19 02:19:19.495124
516	104	2	2	2025-07-19 02:19:19.495124	2025-07-19 02:19:19.495124
517	104	3	2	2025-07-19 02:19:19.495124	2025-07-19 02:19:19.495124
518	104	4	2	2025-07-19 02:19:19.495124	2025-07-19 02:19:19.495124
519	104	5	2	2025-07-19 02:19:19.495124	2025-07-19 02:19:19.495124
520	105	1	2	2025-07-19 02:19:19.649915	2025-07-19 02:19:19.649915
521	105	2	2	2025-07-19 02:19:19.649915	2025-07-19 02:19:19.649915
522	105	3	2	2025-07-19 02:19:19.649915	2025-07-19 02:19:19.649915
523	105	4	2	2025-07-19 02:19:19.649915	2025-07-19 02:19:19.649915
524	105	5	2	2025-07-19 02:19:19.649915	2025-07-19 02:19:19.649915
525	106	1	2	2025-07-19 02:19:19.809051	2025-07-19 02:19:19.809051
526	106	2	2	2025-07-19 02:19:19.809051	2025-07-19 02:19:19.809051
527	106	3	2	2025-07-19 02:19:19.809051	2025-07-19 02:19:19.809051
528	106	4	2	2025-07-19 02:19:19.809051	2025-07-19 02:19:19.809051
529	106	5	2	2025-07-19 02:19:19.809051	2025-07-19 02:19:19.809051
530	107	1	2	2025-07-19 02:19:19.959021	2025-07-19 02:19:19.959021
531	107	2	2	2025-07-19 02:19:19.959021	2025-07-19 02:19:19.959021
532	107	3	2	2025-07-19 02:19:19.959021	2025-07-19 02:19:19.959021
533	107	4	2	2025-07-19 02:19:19.959021	2025-07-19 02:19:19.959021
534	107	5	2	2025-07-19 02:19:19.959021	2025-07-19 02:19:19.959021
535	108	1	2	2025-07-19 02:19:20.123535	2025-07-19 02:19:20.123535
536	108	2	2	2025-07-19 02:19:20.123535	2025-07-19 02:19:20.123535
537	108	3	2	2025-07-19 02:19:20.123535	2025-07-19 02:19:20.123535
538	108	4	2	2025-07-19 02:19:20.123535	2025-07-19 02:19:20.123535
539	108	5	2	2025-07-19 02:19:20.123535	2025-07-19 02:19:20.123535
540	109	1	2	2025-07-19 02:19:20.292973	2025-07-19 02:19:20.292973
541	109	2	2	2025-07-19 02:19:20.292973	2025-07-19 02:19:20.292973
542	109	3	2	2025-07-19 02:19:20.292973	2025-07-19 02:19:20.292973
543	109	4	2	2025-07-19 02:19:20.292973	2025-07-19 02:19:20.292973
544	109	5	2	2025-07-19 02:19:20.292973	2025-07-19 02:19:20.292973
545	110	1	2	2025-07-19 02:19:20.459491	2025-07-19 02:19:20.459491
546	110	2	2	2025-07-19 02:19:20.459491	2025-07-19 02:19:20.459491
547	110	3	2	2025-07-19 02:19:20.459491	2025-07-19 02:19:20.459491
548	110	4	2	2025-07-19 02:19:20.459491	2025-07-19 02:19:20.459491
549	110	5	2	2025-07-19 02:19:20.459491	2025-07-19 02:19:20.459491
550	111	1	2	2025-07-19 02:19:20.614599	2025-07-19 02:19:20.614599
551	111	2	2	2025-07-19 02:19:20.614599	2025-07-19 02:19:20.614599
552	111	3	2	2025-07-19 02:19:20.614599	2025-07-19 02:19:20.614599
553	111	4	2	2025-07-19 02:19:20.614599	2025-07-19 02:19:20.614599
554	111	5	2	2025-07-19 02:19:20.614599	2025-07-19 02:19:20.614599
555	112	1	2	2025-07-19 02:19:20.764598	2025-07-19 02:19:20.764598
556	112	2	2	2025-07-19 02:19:20.764598	2025-07-19 02:19:20.764598
557	112	3	2	2025-07-19 02:19:20.764598	2025-07-19 02:19:20.764598
558	112	4	2	2025-07-19 02:19:20.764598	2025-07-19 02:19:20.764598
559	112	5	2	2025-07-19 02:19:20.764598	2025-07-19 02:19:20.764598
560	113	1	2	2025-07-19 02:19:20.995197	2025-07-19 02:19:20.995197
561	113	2	2	2025-07-19 02:19:20.995197	2025-07-19 02:19:20.995197
562	113	3	2	2025-07-19 02:19:20.995197	2025-07-19 02:19:20.995197
563	113	4	2	2025-07-19 02:19:20.995197	2025-07-19 02:19:20.995197
564	113	5	2	2025-07-19 02:19:20.995197	2025-07-19 02:19:20.995197
565	114	1	2	2025-07-19 02:19:21.151229	2025-07-19 02:19:21.151229
566	114	2	2	2025-07-19 02:19:21.151229	2025-07-19 02:19:21.151229
567	114	3	2	2025-07-19 02:19:21.151229	2025-07-19 02:19:21.151229
568	114	4	2	2025-07-19 02:19:21.151229	2025-07-19 02:19:21.151229
569	114	5	2	2025-07-19 02:19:21.151229	2025-07-19 02:19:21.151229
570	115	1	2	2025-07-19 02:19:21.307434	2025-07-19 02:19:21.307434
571	115	2	2	2025-07-19 02:19:21.307434	2025-07-19 02:19:21.307434
572	115	3	2	2025-07-19 02:19:21.307434	2025-07-19 02:19:21.307434
573	115	4	2	2025-07-19 02:19:21.307434	2025-07-19 02:19:21.307434
574	115	5	2	2025-07-19 02:19:21.307434	2025-07-19 02:19:21.307434
575	116	1	2	2025-07-19 02:19:21.45834	2025-07-19 02:19:21.45834
576	116	2	2	2025-07-19 02:19:21.45834	2025-07-19 02:19:21.45834
577	116	3	2	2025-07-19 02:19:21.45834	2025-07-19 02:19:21.45834
578	116	4	2	2025-07-19 02:19:21.45834	2025-07-19 02:19:21.45834
579	116	5	2	2025-07-19 02:19:21.45834	2025-07-19 02:19:21.45834
580	117	1	2	2025-07-19 02:19:21.663576	2025-07-19 02:19:21.663576
581	117	2	2	2025-07-19 02:19:21.663576	2025-07-19 02:19:21.663576
582	117	3	2	2025-07-19 02:19:21.663576	2025-07-19 02:19:21.663576
583	117	4	2	2025-07-19 02:19:21.663576	2025-07-19 02:19:21.663576
584	117	5	2	2025-07-19 02:19:21.663576	2025-07-19 02:19:21.663576
585	118	1	2	2025-07-19 02:19:21.821859	2025-07-19 02:19:21.821859
586	118	2	2	2025-07-19 02:19:21.821859	2025-07-19 02:19:21.821859
587	118	3	2	2025-07-19 02:19:21.821859	2025-07-19 02:19:21.821859
588	118	4	2	2025-07-19 02:19:21.821859	2025-07-19 02:19:21.821859
589	118	5	2	2025-07-19 02:19:21.821859	2025-07-19 02:19:21.821859
590	119	1	2	2025-07-19 02:19:22.027105	2025-07-19 02:19:22.027105
591	119	2	2	2025-07-19 02:19:22.027105	2025-07-19 02:19:22.027105
592	119	3	2	2025-07-19 02:19:22.027105	2025-07-19 02:19:22.027105
593	119	4	2	2025-07-19 02:19:22.027105	2025-07-19 02:19:22.027105
594	119	5	2	2025-07-19 02:19:22.027105	2025-07-19 02:19:22.027105
595	120	1	2	2025-07-19 02:19:22.182743	2025-07-19 02:19:22.182743
596	120	2	2	2025-07-19 02:19:22.182743	2025-07-19 02:19:22.182743
597	120	3	2	2025-07-19 02:19:22.182743	2025-07-19 02:19:22.182743
598	120	4	2	2025-07-19 02:19:22.182743	2025-07-19 02:19:22.182743
599	120	5	2	2025-07-19 02:19:22.182743	2025-07-19 02:19:22.182743
600	121	1	2	2025-07-19 02:19:22.334465	2025-07-19 02:19:22.334465
601	121	2	2	2025-07-19 02:19:22.334465	2025-07-19 02:19:22.334465
602	121	3	2	2025-07-19 02:19:22.334465	2025-07-19 02:19:22.334465
603	121	4	2	2025-07-19 02:19:22.334465	2025-07-19 02:19:22.334465
604	121	5	2	2025-07-19 02:19:22.334465	2025-07-19 02:19:22.334465
605	122	1	2	2025-07-19 02:19:22.480911	2025-07-19 02:19:22.480911
606	122	2	2	2025-07-19 02:19:22.480911	2025-07-19 02:19:22.480911
607	122	3	2	2025-07-19 02:19:22.480911	2025-07-19 02:19:22.480911
608	122	4	2	2025-07-19 02:19:22.480911	2025-07-19 02:19:22.480911
609	122	5	2	2025-07-19 02:19:22.480911	2025-07-19 02:19:22.480911
610	123	1	2	2025-07-19 02:19:22.637809	2025-07-19 02:19:22.637809
611	123	2	2	2025-07-19 02:19:22.637809	2025-07-19 02:19:22.637809
612	123	3	2	2025-07-19 02:19:22.637809	2025-07-19 02:19:22.637809
613	123	4	2	2025-07-19 02:19:22.637809	2025-07-19 02:19:22.637809
614	123	5	2	2025-07-19 02:19:22.637809	2025-07-19 02:19:22.637809
615	124	1	2	2025-07-19 02:19:22.787529	2025-07-19 02:19:22.787529
616	124	2	2	2025-07-19 02:19:22.787529	2025-07-19 02:19:22.787529
617	124	3	2	2025-07-19 02:19:22.787529	2025-07-19 02:19:22.787529
618	124	4	2	2025-07-19 02:19:22.787529	2025-07-19 02:19:22.787529
619	124	5	2	2025-07-19 02:19:22.787529	2025-07-19 02:19:22.787529
620	125	1	2	2025-07-19 02:19:22.968499	2025-07-19 02:19:22.968499
621	125	2	2	2025-07-19 02:19:22.968499	2025-07-19 02:19:22.968499
622	125	3	2	2025-07-19 02:19:22.968499	2025-07-19 02:19:22.968499
623	125	4	2	2025-07-19 02:19:22.968499	2025-07-19 02:19:22.968499
624	125	5	2	2025-07-19 02:19:22.968499	2025-07-19 02:19:22.968499
625	126	1	2	2025-07-19 02:19:23.160549	2025-07-19 02:19:23.160549
626	126	2	2	2025-07-19 02:19:23.160549	2025-07-19 02:19:23.160549
627	126	3	2	2025-07-19 02:19:23.160549	2025-07-19 02:19:23.160549
628	126	4	2	2025-07-19 02:19:23.160549	2025-07-19 02:19:23.160549
629	126	5	2	2025-07-19 02:19:23.160549	2025-07-19 02:19:23.160549
630	127	1	2	2025-07-19 02:19:23.324838	2025-07-19 02:19:23.324838
631	127	2	2	2025-07-19 02:19:23.324838	2025-07-19 02:19:23.324838
632	127	3	2	2025-07-19 02:19:23.324838	2025-07-19 02:19:23.324838
633	127	4	2	2025-07-19 02:19:23.324838	2025-07-19 02:19:23.324838
634	127	5	2	2025-07-19 02:19:23.324838	2025-07-19 02:19:23.324838
635	128	1	2	2025-07-19 02:19:23.497678	2025-07-19 02:19:23.497678
636	128	2	2	2025-07-19 02:19:23.497678	2025-07-19 02:19:23.497678
637	128	3	2	2025-07-19 02:19:23.497678	2025-07-19 02:19:23.497678
638	128	4	2	2025-07-19 02:19:23.497678	2025-07-19 02:19:23.497678
639	128	5	2	2025-07-19 02:19:23.497678	2025-07-19 02:19:23.497678
640	129	1	2	2025-07-19 02:19:23.652351	2025-07-19 02:19:23.652351
641	129	2	2	2025-07-19 02:19:23.652351	2025-07-19 02:19:23.652351
642	129	3	2	2025-07-19 02:19:23.652351	2025-07-19 02:19:23.652351
643	129	4	2	2025-07-19 02:19:23.652351	2025-07-19 02:19:23.652351
644	129	5	2	2025-07-19 02:19:23.652351	2025-07-19 02:19:23.652351
645	130	1	2	2025-07-19 02:19:23.82105	2025-07-19 02:19:23.82105
646	130	2	2	2025-07-19 02:19:23.82105	2025-07-19 02:19:23.82105
647	130	3	2	2025-07-19 02:19:23.82105	2025-07-19 02:19:23.82105
648	130	4	2	2025-07-19 02:19:23.82105	2025-07-19 02:19:23.82105
649	130	5	2	2025-07-19 02:19:23.82105	2025-07-19 02:19:23.82105
650	131	1	2	2025-07-19 02:19:23.976531	2025-07-19 02:19:23.976531
651	131	2	2	2025-07-19 02:19:23.976531	2025-07-19 02:19:23.976531
652	131	3	2	2025-07-19 02:19:23.976531	2025-07-19 02:19:23.976531
653	131	4	2	2025-07-19 02:19:23.976531	2025-07-19 02:19:23.976531
654	131	5	2	2025-07-19 02:19:23.976531	2025-07-19 02:19:23.976531
655	132	1	2	2025-07-19 02:19:24.132665	2025-07-19 02:19:24.132665
656	132	2	2	2025-07-19 02:19:24.132665	2025-07-19 02:19:24.132665
657	132	3	2	2025-07-19 02:19:24.132665	2025-07-19 02:19:24.132665
658	132	4	2	2025-07-19 02:19:24.132665	2025-07-19 02:19:24.132665
659	132	5	2	2025-07-19 02:19:24.132665	2025-07-19 02:19:24.132665
660	133	1	2	2025-07-19 02:19:24.2947	2025-07-19 02:19:24.2947
661	133	2	2	2025-07-19 02:19:24.2947	2025-07-19 02:19:24.2947
662	133	3	2	2025-07-19 02:19:24.2947	2025-07-19 02:19:24.2947
663	133	4	2	2025-07-19 02:19:24.2947	2025-07-19 02:19:24.2947
664	133	5	2	2025-07-19 02:19:24.2947	2025-07-19 02:19:24.2947
665	134	1	3	2025-07-19 02:19:24.459236	2025-07-19 02:19:24.459236
666	134	2	3	2025-07-19 02:19:24.459236	2025-07-19 02:19:24.459236
667	134	3	3	2025-07-19 02:19:24.459236	2025-07-19 02:19:24.459236
668	134	4	3	2025-07-19 02:19:24.459236	2025-07-19 02:19:24.459236
669	134	5	3	2025-07-19 02:19:24.459236	2025-07-19 02:19:24.459236
670	135	1	2	2025-07-19 02:19:24.6232	2025-07-19 02:19:24.6232
671	135	2	2	2025-07-19 02:19:24.6232	2025-07-19 02:19:24.6232
672	135	3	2	2025-07-19 02:19:24.6232	2025-07-19 02:19:24.6232
673	135	4	2	2025-07-19 02:19:24.6232	2025-07-19 02:19:24.6232
674	135	5	2	2025-07-19 02:19:24.6232	2025-07-19 02:19:24.6232
675	136	1	2	2025-07-19 02:19:24.784823	2025-07-19 02:19:24.784823
676	136	2	2	2025-07-19 02:19:24.784823	2025-07-19 02:19:24.784823
677	136	3	2	2025-07-19 02:19:24.784823	2025-07-19 02:19:24.784823
678	136	4	2	2025-07-19 02:19:24.784823	2025-07-19 02:19:24.784823
679	136	5	2	2025-07-19 02:19:24.784823	2025-07-19 02:19:24.784823
680	137	1	1	2025-07-19 02:19:24.941103	2025-07-19 02:19:24.941103
681	137	2	1	2025-07-19 02:19:24.941103	2025-07-19 02:19:24.941103
682	137	3	1	2025-07-19 02:19:24.941103	2025-07-19 02:19:24.941103
683	137	4	1	2025-07-19 02:19:24.941103	2025-07-19 02:19:24.941103
684	137	5	1	2025-07-19 02:19:24.941103	2025-07-19 02:19:24.941103
685	138	1	2	2025-07-19 02:19:25.096405	2025-07-19 02:19:25.096405
686	138	2	2	2025-07-19 02:19:25.096405	2025-07-19 02:19:25.096405
687	138	3	2	2025-07-19 02:19:25.096405	2025-07-19 02:19:25.096405
688	138	4	2	2025-07-19 02:19:25.096405	2025-07-19 02:19:25.096405
689	138	5	2	2025-07-19 02:19:25.096405	2025-07-19 02:19:25.096405
690	139	1	2	2025-07-19 02:19:25.242489	2025-07-19 02:19:25.242489
691	139	2	2	2025-07-19 02:19:25.242489	2025-07-19 02:19:25.242489
692	139	3	2	2025-07-19 02:19:25.242489	2025-07-19 02:19:25.242489
693	139	4	2	2025-07-19 02:19:25.242489	2025-07-19 02:19:25.242489
694	139	5	2	2025-07-19 02:19:25.242489	2025-07-19 02:19:25.242489
695	140	1	2	2025-07-19 02:19:25.396141	2025-07-19 02:19:25.396141
696	140	2	2	2025-07-19 02:19:25.396141	2025-07-19 02:19:25.396141
697	140	3	2	2025-07-19 02:19:25.396141	2025-07-19 02:19:25.396141
698	140	4	2	2025-07-19 02:19:25.396141	2025-07-19 02:19:25.396141
699	140	5	2	2025-07-19 02:19:25.396141	2025-07-19 02:19:25.396141
700	141	1	2	2025-07-19 02:19:25.570247	2025-07-19 02:19:25.570247
701	141	2	2	2025-07-19 02:19:25.570247	2025-07-19 02:19:25.570247
702	141	3	2	2025-07-19 02:19:25.570247	2025-07-19 02:19:25.570247
703	141	4	2	2025-07-19 02:19:25.570247	2025-07-19 02:19:25.570247
704	141	5	2	2025-07-19 02:19:25.570247	2025-07-19 02:19:25.570247
705	142	1	2	2025-07-19 02:19:25.725007	2025-07-19 02:19:25.725007
706	142	2	2	2025-07-19 02:19:25.725007	2025-07-19 02:19:25.725007
707	142	3	2	2025-07-19 02:19:25.725007	2025-07-19 02:19:25.725007
708	142	4	2	2025-07-19 02:19:25.725007	2025-07-19 02:19:25.725007
709	142	5	2	2025-07-19 02:19:25.725007	2025-07-19 02:19:25.725007
710	143	1	2	2025-07-19 02:19:25.875584	2025-07-19 02:19:25.875584
711	143	2	2	2025-07-19 02:19:25.875584	2025-07-19 02:19:25.875584
712	143	3	2	2025-07-19 02:19:25.875584	2025-07-19 02:19:25.875584
713	143	4	2	2025-07-19 02:19:25.875584	2025-07-19 02:19:25.875584
714	143	5	2	2025-07-19 02:19:25.875584	2025-07-19 02:19:25.875584
715	144	1	2	2025-07-19 02:19:26.026696	2025-07-19 02:19:26.026696
716	144	2	2	2025-07-19 02:19:26.026696	2025-07-19 02:19:26.026696
717	144	3	2	2025-07-19 02:19:26.026696	2025-07-19 02:19:26.026696
718	144	4	2	2025-07-19 02:19:26.026696	2025-07-19 02:19:26.026696
719	144	5	2	2025-07-19 02:19:26.026696	2025-07-19 02:19:26.026696
720	145	1	2	2025-07-19 02:19:26.176153	2025-07-19 02:19:26.176153
721	145	2	2	2025-07-19 02:19:26.176153	2025-07-19 02:19:26.176153
722	145	3	2	2025-07-19 02:19:26.176153	2025-07-19 02:19:26.176153
723	145	4	2	2025-07-19 02:19:26.176153	2025-07-19 02:19:26.176153
724	145	5	2	2025-07-19 02:19:26.176153	2025-07-19 02:19:26.176153
725	146	1	2	2025-07-19 02:19:26.327192	2025-07-19 02:19:26.327192
726	146	2	2	2025-07-19 02:19:26.327192	2025-07-19 02:19:26.327192
727	146	3	2	2025-07-19 02:19:26.327192	2025-07-19 02:19:26.327192
728	146	4	2	2025-07-19 02:19:26.327192	2025-07-19 02:19:26.327192
729	146	5	2	2025-07-19 02:19:26.327192	2025-07-19 02:19:26.327192
730	147	1	2	2025-07-19 02:19:26.47638	2025-07-19 02:19:26.47638
731	147	2	2	2025-07-19 02:19:26.47638	2025-07-19 02:19:26.47638
732	147	3	2	2025-07-19 02:19:26.47638	2025-07-19 02:19:26.47638
733	147	4	2	2025-07-19 02:19:26.47638	2025-07-19 02:19:26.47638
734	147	5	2	2025-07-19 02:19:26.47638	2025-07-19 02:19:26.47638
735	148	1	2	2025-07-19 02:19:26.651514	2025-07-19 02:19:26.651514
736	148	2	2	2025-07-19 02:19:26.651514	2025-07-19 02:19:26.651514
737	148	3	2	2025-07-19 02:19:26.651514	2025-07-19 02:19:26.651514
738	148	4	2	2025-07-19 02:19:26.651514	2025-07-19 02:19:26.651514
739	148	5	2	2025-07-19 02:19:26.651514	2025-07-19 02:19:26.651514
740	149	1	10	2025-07-19 02:19:26.817786	2025-07-19 02:19:26.817786
741	149	2	13	2025-07-19 02:19:26.817786	2025-07-19 02:19:26.817786
742	149	3	12	2025-07-19 02:19:26.817786	2025-07-19 02:19:26.817786
743	149	4	10	2025-07-19 02:19:26.817786	2025-07-19 02:19:26.817786
744	149	5	10	2025-07-19 02:19:26.817786	2025-07-19 02:19:26.817786
745	150	1	2	2025-07-19 02:19:26.963887	2025-07-19 02:19:26.963887
746	150	2	2	2025-07-19 02:19:26.963887	2025-07-19 02:19:26.963887
747	150	3	2	2025-07-19 02:19:26.963887	2025-07-19 02:19:26.963887
748	150	4	2	2025-07-19 02:19:26.963887	2025-07-19 02:19:26.963887
749	150	5	2	2025-07-19 02:19:26.963887	2025-07-19 02:19:26.963887
750	151	2	1	2025-07-19 02:19:27.129893	2025-07-19 02:19:27.129893
751	151	3	1	2025-07-19 02:19:27.129893	2025-07-19 02:19:27.129893
752	151	4	1	2025-07-19 02:19:27.129893	2025-07-19 02:19:27.129893
753	151	5	1	2025-07-19 02:19:27.129893	2025-07-19 02:19:27.129893
754	152	1	2	2025-07-19 02:19:27.27978	2025-07-19 02:19:27.27978
755	152	2	2	2025-07-19 02:19:27.27978	2025-07-19 02:19:27.27978
756	152	3	2	2025-07-19 02:19:27.27978	2025-07-19 02:19:27.27978
757	152	4	2	2025-07-19 02:19:27.27978	2025-07-19 02:19:27.27978
758	152	5	2	2025-07-19 02:19:27.27978	2025-07-19 02:19:27.27978
759	153	1	2	2025-07-19 02:19:27.429293	2025-07-19 02:19:27.429293
760	153	2	2	2025-07-19 02:19:27.429293	2025-07-19 02:19:27.429293
761	153	3	2	2025-07-19 02:19:27.429293	2025-07-19 02:19:27.429293
762	153	4	2	2025-07-19 02:19:27.429293	2025-07-19 02:19:27.429293
763	153	5	2	2025-07-19 02:19:27.429293	2025-07-19 02:19:27.429293
764	154	1	2	2025-07-19 02:19:27.581604	2025-07-19 02:19:27.581604
765	154	2	2	2025-07-19 02:19:27.581604	2025-07-19 02:19:27.581604
766	154	3	2	2025-07-19 02:19:27.581604	2025-07-19 02:19:27.581604
767	154	4	2	2025-07-19 02:19:27.581604	2025-07-19 02:19:27.581604
768	154	5	2	2025-07-19 02:19:27.581604	2025-07-19 02:19:27.581604
769	155	1	2	2025-07-19 02:19:27.743355	2025-07-19 02:19:27.743355
770	155	2	2	2025-07-19 02:19:27.743355	2025-07-19 02:19:27.743355
771	155	3	2	2025-07-19 02:19:27.743355	2025-07-19 02:19:27.743355
772	155	4	2	2025-07-19 02:19:27.743355	2025-07-19 02:19:27.743355
773	155	5	2	2025-07-19 02:19:27.743355	2025-07-19 02:19:27.743355
774	156	1	2	2025-07-19 02:19:27.910239	2025-07-19 02:19:27.910239
775	156	2	2	2025-07-19 02:19:27.910239	2025-07-19 02:19:27.910239
776	156	3	2	2025-07-19 02:19:27.910239	2025-07-19 02:19:27.910239
777	156	4	2	2025-07-19 02:19:27.910239	2025-07-19 02:19:27.910239
778	156	5	2	2025-07-19 02:19:27.910239	2025-07-19 02:19:27.910239
779	157	1	2	2025-07-19 02:19:28.065789	2025-07-19 02:19:28.065789
780	157	2	2	2025-07-19 02:19:28.065789	2025-07-19 02:19:28.065789
781	157	3	2	2025-07-19 02:19:28.065789	2025-07-19 02:19:28.065789
782	157	4	2	2025-07-19 02:19:28.065789	2025-07-19 02:19:28.065789
783	157	5	2	2025-07-19 02:19:28.065789	2025-07-19 02:19:28.065789
784	158	1	2	2025-07-19 02:19:28.222621	2025-07-19 02:19:28.222621
785	158	2	2	2025-07-19 02:19:28.222621	2025-07-19 02:19:28.222621
786	158	3	2	2025-07-19 02:19:28.222621	2025-07-19 02:19:28.222621
787	158	4	2	2025-07-19 02:19:28.222621	2025-07-19 02:19:28.222621
788	158	5	2	2025-07-19 02:19:28.222621	2025-07-19 02:19:28.222621
789	159	1	2	2025-07-19 02:19:28.382749	2025-07-19 02:19:28.382749
790	159	2	2	2025-07-19 02:19:28.382749	2025-07-19 02:19:28.382749
791	159	3	2	2025-07-19 02:19:28.382749	2025-07-19 02:19:28.382749
792	159	4	2	2025-07-19 02:19:28.382749	2025-07-19 02:19:28.382749
793	159	5	2	2025-07-19 02:19:28.382749	2025-07-19 02:19:28.382749
794	160	1	2	2025-07-19 02:19:28.531853	2025-07-19 02:19:28.531853
795	160	2	2	2025-07-19 02:19:28.531853	2025-07-19 02:19:28.531853
796	160	3	2	2025-07-19 02:19:28.531853	2025-07-19 02:19:28.531853
797	160	4	2	2025-07-19 02:19:28.531853	2025-07-19 02:19:28.531853
798	160	5	2	2025-07-19 02:19:28.531853	2025-07-19 02:19:28.531853
799	161	1	2	2025-07-19 02:19:28.717344	2025-07-19 02:19:28.717344
800	161	2	2	2025-07-19 02:19:28.717344	2025-07-19 02:19:28.717344
801	161	3	2	2025-07-19 02:19:28.717344	2025-07-19 02:19:28.717344
802	161	4	2	2025-07-19 02:19:28.717344	2025-07-19 02:19:28.717344
803	161	5	2	2025-07-19 02:19:28.717344	2025-07-19 02:19:28.717344
804	162	1	2	2025-07-19 02:19:28.870967	2025-07-19 02:19:28.870967
805	162	2	2	2025-07-19 02:19:28.870967	2025-07-19 02:19:28.870967
806	162	3	2	2025-07-19 02:19:28.870967	2025-07-19 02:19:28.870967
807	162	4	2	2025-07-19 02:19:28.870967	2025-07-19 02:19:28.870967
808	162	5	2	2025-07-19 02:19:28.870967	2025-07-19 02:19:28.870967
809	163	1	2	2025-07-19 02:19:29.022954	2025-07-19 02:19:29.022954
810	163	2	2	2025-07-19 02:19:29.022954	2025-07-19 02:19:29.022954
811	163	3	2	2025-07-19 02:19:29.022954	2025-07-19 02:19:29.022954
812	163	4	2	2025-07-19 02:19:29.022954	2025-07-19 02:19:29.022954
813	163	5	2	2025-07-19 02:19:29.022954	2025-07-19 02:19:29.022954
814	164	1	2	2025-07-19 02:19:29.210982	2025-07-19 02:19:29.210982
815	164	2	2	2025-07-19 02:19:29.210982	2025-07-19 02:19:29.210982
816	164	3	2	2025-07-19 02:19:29.210982	2025-07-19 02:19:29.210982
817	164	4	2	2025-07-19 02:19:29.210982	2025-07-19 02:19:29.210982
818	164	5	2	2025-07-19 02:19:29.210982	2025-07-19 02:19:29.210982
819	165	1	2	2025-07-19 02:19:29.364868	2025-07-19 02:19:29.364868
820	165	2	2	2025-07-19 02:19:29.364868	2025-07-19 02:19:29.364868
821	165	3	2	2025-07-19 02:19:29.364868	2025-07-19 02:19:29.364868
822	165	4	2	2025-07-19 02:19:29.364868	2025-07-19 02:19:29.364868
823	165	5	2	2025-07-19 02:19:29.364868	2025-07-19 02:19:29.364868
824	166	1	2	2025-07-19 02:19:29.517151	2025-07-19 02:19:29.517151
825	166	2	2	2025-07-19 02:19:29.517151	2025-07-19 02:19:29.517151
826	166	3	2	2025-07-19 02:19:29.517151	2025-07-19 02:19:29.517151
827	166	4	2	2025-07-19 02:19:29.517151	2025-07-19 02:19:29.517151
828	166	5	2	2025-07-19 02:19:29.517151	2025-07-19 02:19:29.517151
829	167	1	2	2025-07-19 02:19:29.667237	2025-07-19 02:19:29.667237
830	167	2	2	2025-07-19 02:19:29.667237	2025-07-19 02:19:29.667237
831	167	3	2	2025-07-19 02:19:29.667237	2025-07-19 02:19:29.667237
832	167	4	2	2025-07-19 02:19:29.667237	2025-07-19 02:19:29.667237
833	167	5	2	2025-07-19 02:19:29.667237	2025-07-19 02:19:29.667237
834	168	1	2	2025-07-19 02:19:29.846555	2025-07-19 02:19:29.846555
835	168	2	2	2025-07-19 02:19:29.846555	2025-07-19 02:19:29.846555
836	168	3	2	2025-07-19 02:19:29.846555	2025-07-19 02:19:29.846555
837	168	4	2	2025-07-19 02:19:29.846555	2025-07-19 02:19:29.846555
838	168	5	2	2025-07-19 02:19:29.846555	2025-07-19 02:19:29.846555
839	169	1	2	2025-07-19 02:19:30.000159	2025-07-19 02:19:30.000159
840	169	2	2	2025-07-19 02:19:30.000159	2025-07-19 02:19:30.000159
841	169	3	2	2025-07-19 02:19:30.000159	2025-07-19 02:19:30.000159
842	169	4	2	2025-07-19 02:19:30.000159	2025-07-19 02:19:30.000159
843	169	5	2	2025-07-19 02:19:30.000159	2025-07-19 02:19:30.000159
844	170	1	2	2025-07-19 02:19:30.161436	2025-07-19 02:19:30.161436
845	170	2	2	2025-07-19 02:19:30.161436	2025-07-19 02:19:30.161436
846	170	3	2	2025-07-19 02:19:30.161436	2025-07-19 02:19:30.161436
847	170	4	2	2025-07-19 02:19:30.161436	2025-07-19 02:19:30.161436
848	170	5	2	2025-07-19 02:19:30.161436	2025-07-19 02:19:30.161436
849	171	1	2	2025-07-19 02:19:30.312446	2025-07-19 02:19:30.312446
850	171	2	2	2025-07-19 02:19:30.312446	2025-07-19 02:19:30.312446
851	171	3	2	2025-07-19 02:19:30.312446	2025-07-19 02:19:30.312446
852	171	4	2	2025-07-19 02:19:30.312446	2025-07-19 02:19:30.312446
853	171	5	2	2025-07-19 02:19:30.312446	2025-07-19 02:19:30.312446
854	172	1	2	2025-07-19 02:19:30.465143	2025-07-19 02:19:30.465143
855	172	2	2	2025-07-19 02:19:30.465143	2025-07-19 02:19:30.465143
856	172	3	2	2025-07-19 02:19:30.465143	2025-07-19 02:19:30.465143
857	172	4	2	2025-07-19 02:19:30.465143	2025-07-19 02:19:30.465143
858	172	5	2	2025-07-19 02:19:30.465143	2025-07-19 02:19:30.465143
859	173	1	2	2025-07-19 02:19:30.619648	2025-07-19 02:19:30.619648
860	173	2	2	2025-07-19 02:19:30.619648	2025-07-19 02:19:30.619648
861	173	3	2	2025-07-19 02:19:30.619648	2025-07-19 02:19:30.619648
862	173	4	2	2025-07-19 02:19:30.619648	2025-07-19 02:19:30.619648
863	173	5	2	2025-07-19 02:19:30.619648	2025-07-19 02:19:30.619648
864	174	1	2	2025-07-19 02:19:30.770322	2025-07-19 02:19:30.770322
865	174	2	2	2025-07-19 02:19:30.770322	2025-07-19 02:19:30.770322
866	174	3	2	2025-07-19 02:19:30.770322	2025-07-19 02:19:30.770322
867	174	4	2	2025-07-19 02:19:30.770322	2025-07-19 02:19:30.770322
868	174	5	2	2025-07-19 02:19:30.770322	2025-07-19 02:19:30.770322
869	175	1	2	2025-07-19 02:19:30.927374	2025-07-19 02:19:30.927374
870	175	2	2	2025-07-19 02:19:30.927374	2025-07-19 02:19:30.927374
871	175	3	2	2025-07-19 02:19:30.927374	2025-07-19 02:19:30.927374
872	175	4	2	2025-07-19 02:19:30.927374	2025-07-19 02:19:30.927374
873	175	5	2	2025-07-19 02:19:30.927374	2025-07-19 02:19:30.927374
874	176	1	3	2025-07-19 02:19:31.083975	2025-07-19 02:19:31.083975
875	176	2	3	2025-07-19 02:19:31.083975	2025-07-19 02:19:31.083975
876	176	3	3	2025-07-19 02:19:31.083975	2025-07-19 02:19:31.083975
877	176	4	3	2025-07-19 02:19:31.083975	2025-07-19 02:19:31.083975
878	176	5	3	2025-07-19 02:19:31.083975	2025-07-19 02:19:31.083975
879	177	1	2	2025-07-19 02:19:31.256028	2025-07-19 02:19:31.256028
880	177	2	2	2025-07-19 02:19:31.256028	2025-07-19 02:19:31.256028
881	177	3	2	2025-07-19 02:19:31.256028	2025-07-19 02:19:31.256028
882	177	4	2	2025-07-19 02:19:31.256028	2025-07-19 02:19:31.256028
883	177	5	2	2025-07-19 02:19:31.256028	2025-07-19 02:19:31.256028
884	178	1	2	2025-07-19 02:19:31.415237	2025-07-19 02:19:31.415237
885	178	2	2	2025-07-19 02:19:31.415237	2025-07-19 02:19:31.415237
886	178	3	2	2025-07-19 02:19:31.415237	2025-07-19 02:19:31.415237
887	178	4	2	2025-07-19 02:19:31.415237	2025-07-19 02:19:31.415237
888	178	5	2	2025-07-19 02:19:31.415237	2025-07-19 02:19:31.415237
889	179	1	2	2025-07-19 02:19:31.589515	2025-07-19 02:19:31.589515
890	179	2	2	2025-07-19 02:19:31.589515	2025-07-19 02:19:31.589515
891	179	3	2	2025-07-19 02:19:31.589515	2025-07-19 02:19:31.589515
892	179	4	2	2025-07-19 02:19:31.589515	2025-07-19 02:19:31.589515
893	179	5	2	2025-07-19 02:19:31.589515	2025-07-19 02:19:31.589515
894	180	1	2	2025-07-19 02:19:31.741734	2025-07-19 02:19:31.741734
895	180	2	2	2025-07-19 02:19:31.741734	2025-07-19 02:19:31.741734
896	180	3	2	2025-07-19 02:19:31.741734	2025-07-19 02:19:31.741734
897	180	4	2	2025-07-19 02:19:31.741734	2025-07-19 02:19:31.741734
898	180	5	2	2025-07-19 02:19:31.741734	2025-07-19 02:19:31.741734
899	181	1	2	2025-07-19 02:19:31.894116	2025-07-19 02:19:31.894116
900	181	2	2	2025-07-19 02:19:31.894116	2025-07-19 02:19:31.894116
901	181	3	2	2025-07-19 02:19:31.894116	2025-07-19 02:19:31.894116
902	181	4	2	2025-07-19 02:19:31.894116	2025-07-19 02:19:31.894116
903	181	5	2	2025-07-19 02:19:31.894116	2025-07-19 02:19:31.894116
904	182	1	2	2025-07-19 02:19:32.054425	2025-07-19 02:19:32.054425
905	182	2	2	2025-07-19 02:19:32.054425	2025-07-19 02:19:32.054425
906	182	3	2	2025-07-19 02:19:32.054425	2025-07-19 02:19:32.054425
907	182	4	2	2025-07-19 02:19:32.054425	2025-07-19 02:19:32.054425
908	182	5	2	2025-07-19 02:19:32.054425	2025-07-19 02:19:32.054425
909	183	1	2	2025-07-19 02:19:32.22435	2025-07-19 02:19:32.22435
910	183	2	2	2025-07-19 02:19:32.22435	2025-07-19 02:19:32.22435
911	183	3	2	2025-07-19 02:19:32.22435	2025-07-19 02:19:32.22435
912	183	4	2	2025-07-19 02:19:32.22435	2025-07-19 02:19:32.22435
913	183	5	2	2025-07-19 02:19:32.22435	2025-07-19 02:19:32.22435
914	184	1	2	2025-07-19 02:19:32.384245	2025-07-19 02:19:32.384245
915	184	2	2	2025-07-19 02:19:32.384245	2025-07-19 02:19:32.384245
916	184	3	2	2025-07-19 02:19:32.384245	2025-07-19 02:19:32.384245
917	184	4	2	2025-07-19 02:19:32.384245	2025-07-19 02:19:32.384245
918	184	5	2	2025-07-19 02:19:32.384245	2025-07-19 02:19:32.384245
919	185	1	2	2025-07-19 02:19:32.527472	2025-07-19 02:19:32.527472
920	185	2	2	2025-07-19 02:19:32.527472	2025-07-19 02:19:32.527472
921	185	3	2	2025-07-19 02:19:32.527472	2025-07-19 02:19:32.527472
922	185	4	2	2025-07-19 02:19:32.527472	2025-07-19 02:19:32.527472
923	185	5	2	2025-07-19 02:19:32.527472	2025-07-19 02:19:32.527472
924	186	1	2	2025-07-19 02:19:32.684008	2025-07-19 02:19:32.684008
925	186	2	2	2025-07-19 02:19:32.684008	2025-07-19 02:19:32.684008
926	186	3	2	2025-07-19 02:19:32.684008	2025-07-19 02:19:32.684008
927	186	4	2	2025-07-19 02:19:32.684008	2025-07-19 02:19:32.684008
928	186	5	2	2025-07-19 02:19:32.684008	2025-07-19 02:19:32.684008
929	187	1	2	2025-07-19 02:19:32.867992	2025-07-19 02:19:32.867992
930	187	2	2	2025-07-19 02:19:32.867992	2025-07-19 02:19:32.867992
931	187	3	2	2025-07-19 02:19:32.867992	2025-07-19 02:19:32.867992
932	187	4	2	2025-07-19 02:19:32.867992	2025-07-19 02:19:32.867992
933	187	5	2	2025-07-19 02:19:32.867992	2025-07-19 02:19:32.867992
934	188	1	2	2025-07-19 02:19:33.02283	2025-07-19 02:19:33.02283
935	188	2	2	2025-07-19 02:19:33.02283	2025-07-19 02:19:33.02283
936	188	3	2	2025-07-19 02:19:33.02283	2025-07-19 02:19:33.02283
937	188	4	2	2025-07-19 02:19:33.02283	2025-07-19 02:19:33.02283
938	188	5	2	2025-07-19 02:19:33.02283	2025-07-19 02:19:33.02283
939	189	1	2	2025-07-19 02:19:33.173696	2025-07-19 02:19:33.173696
940	189	2	2	2025-07-19 02:19:33.173696	2025-07-19 02:19:33.173696
941	189	3	2	2025-07-19 02:19:33.173696	2025-07-19 02:19:33.173696
942	189	4	2	2025-07-19 02:19:33.173696	2025-07-19 02:19:33.173696
943	189	5	2	2025-07-19 02:19:33.173696	2025-07-19 02:19:33.173696
944	190	1	2	2025-07-19 02:19:33.326389	2025-07-19 02:19:33.326389
945	190	2	2	2025-07-19 02:19:33.326389	2025-07-19 02:19:33.326389
946	190	3	2	2025-07-19 02:19:33.326389	2025-07-19 02:19:33.326389
947	190	4	2	2025-07-19 02:19:33.326389	2025-07-19 02:19:33.326389
948	190	5	2	2025-07-19 02:19:33.326389	2025-07-19 02:19:33.326389
949	191	1	2	2025-07-19 02:19:33.477685	2025-07-19 02:19:33.477685
950	191	2	2	2025-07-19 02:19:33.477685	2025-07-19 02:19:33.477685
951	191	3	2	2025-07-19 02:19:33.477685	2025-07-19 02:19:33.477685
952	191	4	2	2025-07-19 02:19:33.477685	2025-07-19 02:19:33.477685
953	191	5	2	2025-07-19 02:19:33.477685	2025-07-19 02:19:33.477685
954	192	1	2	2025-07-19 02:19:33.62525	2025-07-19 02:19:33.62525
955	192	2	2	2025-07-19 02:19:33.62525	2025-07-19 02:19:33.62525
956	192	3	2	2025-07-19 02:19:33.62525	2025-07-19 02:19:33.62525
957	192	4	2	2025-07-19 02:19:33.62525	2025-07-19 02:19:33.62525
958	192	5	2	2025-07-19 02:19:33.62525	2025-07-19 02:19:33.62525
959	193	1	2	2025-07-19 02:19:33.773403	2025-07-19 02:19:33.773403
960	193	2	2	2025-07-19 02:19:33.773403	2025-07-19 02:19:33.773403
961	193	3	2	2025-07-19 02:19:33.773403	2025-07-19 02:19:33.773403
962	193	4	2	2025-07-19 02:19:33.773403	2025-07-19 02:19:33.773403
963	193	5	2	2025-07-19 02:19:33.773403	2025-07-19 02:19:33.773403
964	194	1	2	2025-07-19 02:19:33.927051	2025-07-19 02:19:33.927051
965	194	2	2	2025-07-19 02:19:33.927051	2025-07-19 02:19:33.927051
966	194	3	2	2025-07-19 02:19:33.927051	2025-07-19 02:19:33.927051
967	194	4	2	2025-07-19 02:19:33.927051	2025-07-19 02:19:33.927051
968	194	5	2	2025-07-19 02:19:33.927051	2025-07-19 02:19:33.927051
969	195	1	2	2025-07-19 02:19:34.088591	2025-07-19 02:19:34.088591
970	195	2	2	2025-07-19 02:19:34.088591	2025-07-19 02:19:34.088591
971	195	3	2	2025-07-19 02:19:34.088591	2025-07-19 02:19:34.088591
972	195	4	2	2025-07-19 02:19:34.088591	2025-07-19 02:19:34.088591
973	195	5	2	2025-07-19 02:19:34.088591	2025-07-19 02:19:34.088591
974	196	1	2	2025-07-19 02:19:34.2378	2025-07-19 02:19:34.2378
975	196	2	2	2025-07-19 02:19:34.2378	2025-07-19 02:19:34.2378
976	196	3	2	2025-07-19 02:19:34.2378	2025-07-19 02:19:34.2378
977	196	4	2	2025-07-19 02:19:34.2378	2025-07-19 02:19:34.2378
978	196	5	2	2025-07-19 02:19:34.2378	2025-07-19 02:19:34.2378
979	197	1	2	2025-07-19 02:19:34.392758	2025-07-19 02:19:34.392758
980	197	2	2	2025-07-19 02:19:34.392758	2025-07-19 02:19:34.392758
981	197	3	2	2025-07-19 02:19:34.392758	2025-07-19 02:19:34.392758
982	197	4	2	2025-07-19 02:19:34.392758	2025-07-19 02:19:34.392758
983	197	5	2	2025-07-19 02:19:34.392758	2025-07-19 02:19:34.392758
984	198	1	2	2025-07-19 02:19:34.550678	2025-07-19 02:19:34.550678
985	198	2	2	2025-07-19 02:19:34.550678	2025-07-19 02:19:34.550678
986	198	3	2	2025-07-19 02:19:34.550678	2025-07-19 02:19:34.550678
987	198	4	2	2025-07-19 02:19:34.550678	2025-07-19 02:19:34.550678
988	198	5	2	2025-07-19 02:19:34.550678	2025-07-19 02:19:34.550678
989	199	1	2	2025-07-19 02:19:34.755876	2025-07-19 02:19:34.755876
990	199	2	2	2025-07-19 02:19:34.755876	2025-07-19 02:19:34.755876
991	199	3	2	2025-07-19 02:19:34.755876	2025-07-19 02:19:34.755876
992	199	4	2	2025-07-19 02:19:34.755876	2025-07-19 02:19:34.755876
993	199	5	2	2025-07-19 02:19:34.755876	2025-07-19 02:19:34.755876
994	200	1	2	2025-07-19 02:19:34.905132	2025-07-19 02:19:34.905132
995	200	2	2	2025-07-19 02:19:34.905132	2025-07-19 02:19:34.905132
996	200	3	2	2025-07-19 02:19:34.905132	2025-07-19 02:19:34.905132
997	200	4	2	2025-07-19 02:19:34.905132	2025-07-19 02:19:34.905132
998	200	5	2	2025-07-19 02:19:34.905132	2025-07-19 02:19:34.905132
999	201	1	2	2025-07-19 02:19:35.063564	2025-07-19 02:19:35.063564
1000	201	2	2	2025-07-19 02:19:35.063564	2025-07-19 02:19:35.063564
1001	201	3	2	2025-07-19 02:19:35.063564	2025-07-19 02:19:35.063564
1002	201	4	2	2025-07-19 02:19:35.063564	2025-07-19 02:19:35.063564
1003	201	5	2	2025-07-19 02:19:35.063564	2025-07-19 02:19:35.063564
1004	202	1	2	2025-07-19 02:19:35.215992	2025-07-19 02:19:35.215992
1005	202	2	2	2025-07-19 02:19:35.215992	2025-07-19 02:19:35.215992
1006	202	3	2	2025-07-19 02:19:35.215992	2025-07-19 02:19:35.215992
1007	202	4	2	2025-07-19 02:19:35.215992	2025-07-19 02:19:35.215992
1008	202	5	2	2025-07-19 02:19:35.215992	2025-07-19 02:19:35.215992
1009	203	1	2	2025-07-19 02:19:35.362463	2025-07-19 02:19:35.362463
1010	203	2	2	2025-07-19 02:19:35.362463	2025-07-19 02:19:35.362463
1011	203	3	2	2025-07-19 02:19:35.362463	2025-07-19 02:19:35.362463
1012	203	4	2	2025-07-19 02:19:35.362463	2025-07-19 02:19:35.362463
1013	203	5	2	2025-07-19 02:19:35.362463	2025-07-19 02:19:35.362463
1014	204	1	2	2025-07-19 02:19:35.515052	2025-07-19 02:19:35.515052
1015	204	2	2	2025-07-19 02:19:35.515052	2025-07-19 02:19:35.515052
1016	204	3	2	2025-07-19 02:19:35.515052	2025-07-19 02:19:35.515052
1017	204	4	2	2025-07-19 02:19:35.515052	2025-07-19 02:19:35.515052
1018	204	5	2	2025-07-19 02:19:35.515052	2025-07-19 02:19:35.515052
1019	205	1	2	2025-07-19 02:19:35.670832	2025-07-19 02:19:35.670832
1020	205	2	2	2025-07-19 02:19:35.670832	2025-07-19 02:19:35.670832
1021	205	3	2	2025-07-19 02:19:35.670832	2025-07-19 02:19:35.670832
1022	205	4	2	2025-07-19 02:19:35.670832	2025-07-19 02:19:35.670832
1023	205	5	2	2025-07-19 02:19:35.670832	2025-07-19 02:19:35.670832
1024	206	1	2	2025-07-19 02:19:35.823615	2025-07-19 02:19:35.823615
1025	206	2	2	2025-07-19 02:19:35.823615	2025-07-19 02:19:35.823615
1026	206	3	2	2025-07-19 02:19:35.823615	2025-07-19 02:19:35.823615
1027	206	4	2	2025-07-19 02:19:35.823615	2025-07-19 02:19:35.823615
1028	206	5	2	2025-07-19 02:19:35.823615	2025-07-19 02:19:35.823615
1029	207	1	2	2025-07-19 02:19:35.978741	2025-07-19 02:19:35.978741
1030	207	2	2	2025-07-19 02:19:35.978741	2025-07-19 02:19:35.978741
1031	207	3	2	2025-07-19 02:19:35.978741	2025-07-19 02:19:35.978741
1032	207	4	2	2025-07-19 02:19:35.978741	2025-07-19 02:19:35.978741
1033	207	5	2	2025-07-19 02:19:35.978741	2025-07-19 02:19:35.978741
1034	208	1	2	2025-07-19 02:19:36.135021	2025-07-19 02:19:36.135021
1035	208	2	2	2025-07-19 02:19:36.135021	2025-07-19 02:19:36.135021
1036	208	3	2	2025-07-19 02:19:36.135021	2025-07-19 02:19:36.135021
1037	208	4	2	2025-07-19 02:19:36.135021	2025-07-19 02:19:36.135021
1038	208	5	2	2025-07-19 02:19:36.135021	2025-07-19 02:19:36.135021
1039	209	1	2	2025-07-19 02:19:36.281991	2025-07-19 02:19:36.281991
1040	209	2	2	2025-07-19 02:19:36.281991	2025-07-19 02:19:36.281991
1041	209	3	2	2025-07-19 02:19:36.281991	2025-07-19 02:19:36.281991
1042	209	4	2	2025-07-19 02:19:36.281991	2025-07-19 02:19:36.281991
1043	209	5	2	2025-07-19 02:19:36.281991	2025-07-19 02:19:36.281991
1044	210	1	4	2025-07-19 02:19:36.454455	2025-07-19 02:19:36.454455
1045	210	2	4	2025-07-19 02:19:36.454455	2025-07-19 02:19:36.454455
1046	210	3	4	2025-07-19 02:19:36.454455	2025-07-19 02:19:36.454455
1047	210	4	4	2025-07-19 02:19:36.454455	2025-07-19 02:19:36.454455
1048	210	5	4	2025-07-19 02:19:36.454455	2025-07-19 02:19:36.454455
1049	211	1	2	2025-07-19 02:19:36.609993	2025-07-19 02:19:36.609993
1050	211	2	2	2025-07-19 02:19:36.609993	2025-07-19 02:19:36.609993
1051	211	3	2	2025-07-19 02:19:36.609993	2025-07-19 02:19:36.609993
1052	211	4	2	2025-07-19 02:19:36.609993	2025-07-19 02:19:36.609993
1053	211	5	2	2025-07-19 02:19:36.609993	2025-07-19 02:19:36.609993
1054	212	1	2	2025-07-19 02:19:36.756782	2025-07-19 02:19:36.756782
1055	212	2	2	2025-07-19 02:19:36.756782	2025-07-19 02:19:36.756782
1056	212	3	2	2025-07-19 02:19:36.756782	2025-07-19 02:19:36.756782
1057	212	4	2	2025-07-19 02:19:36.756782	2025-07-19 02:19:36.756782
1058	212	5	2	2025-07-19 02:19:36.756782	2025-07-19 02:19:36.756782
1059	213	1	5	2025-07-19 02:19:36.922547	2025-07-19 02:19:36.922547
1060	213	2	5	2025-07-19 02:19:36.922547	2025-07-19 02:19:36.922547
1061	213	3	5	2025-07-19 02:19:36.922547	2025-07-19 02:19:36.922547
1062	213	4	5	2025-07-19 02:19:36.922547	2025-07-19 02:19:36.922547
1063	213	5	5	2025-07-19 02:19:36.922547	2025-07-19 02:19:36.922547
1064	214	1	2	2025-07-19 02:19:37.065799	2025-07-19 02:19:37.065799
1065	214	2	2	2025-07-19 02:19:37.065799	2025-07-19 02:19:37.065799
1066	214	3	2	2025-07-19 02:19:37.065799	2025-07-19 02:19:37.065799
1067	214	4	2	2025-07-19 02:19:37.065799	2025-07-19 02:19:37.065799
1068	214	5	2	2025-07-19 02:19:37.065799	2025-07-19 02:19:37.065799
1069	215	1	2	2025-07-19 02:19:37.216983	2025-07-19 02:19:37.216983
1070	215	2	2	2025-07-19 02:19:37.216983	2025-07-19 02:19:37.216983
1071	215	3	2	2025-07-19 02:19:37.216983	2025-07-19 02:19:37.216983
1072	215	4	2	2025-07-19 02:19:37.216983	2025-07-19 02:19:37.216983
1073	215	5	2	2025-07-19 02:19:37.216983	2025-07-19 02:19:37.216983
1074	216	1	2	2025-07-19 02:19:37.370032	2025-07-19 02:19:37.370032
1075	216	2	2	2025-07-19 02:19:37.370032	2025-07-19 02:19:37.370032
1076	216	3	2	2025-07-19 02:19:37.370032	2025-07-19 02:19:37.370032
1077	216	4	2	2025-07-19 02:19:37.370032	2025-07-19 02:19:37.370032
1078	216	5	2	2025-07-19 02:19:37.370032	2025-07-19 02:19:37.370032
1079	217	1	2	2025-07-19 02:19:37.527656	2025-07-19 02:19:37.527656
1080	217	2	2	2025-07-19 02:19:37.527656	2025-07-19 02:19:37.527656
1081	217	3	2	2025-07-19 02:19:37.527656	2025-07-19 02:19:37.527656
1082	217	4	2	2025-07-19 02:19:37.527656	2025-07-19 02:19:37.527656
1083	217	5	2	2025-07-19 02:19:37.527656	2025-07-19 02:19:37.527656
1084	218	1	2	2025-07-19 02:19:37.684377	2025-07-19 02:19:37.684377
1085	218	2	2	2025-07-19 02:19:37.684377	2025-07-19 02:19:37.684377
1086	218	3	2	2025-07-19 02:19:37.684377	2025-07-19 02:19:37.684377
1087	218	4	2	2025-07-19 02:19:37.684377	2025-07-19 02:19:37.684377
1088	218	5	2	2025-07-19 02:19:37.684377	2025-07-19 02:19:37.684377
1089	219	1	2	2025-07-19 02:19:37.835456	2025-07-19 02:19:37.835456
1090	219	2	2	2025-07-19 02:19:37.835456	2025-07-19 02:19:37.835456
1091	219	3	2	2025-07-19 02:19:37.835456	2025-07-19 02:19:37.835456
1092	219	4	2	2025-07-19 02:19:37.835456	2025-07-19 02:19:37.835456
1093	219	5	2	2025-07-19 02:19:37.835456	2025-07-19 02:19:37.835456
1094	220	1	2	2025-07-19 02:19:37.986445	2025-07-19 02:19:37.986445
1095	220	2	2	2025-07-19 02:19:37.986445	2025-07-19 02:19:37.986445
1096	220	3	2	2025-07-19 02:19:37.986445	2025-07-19 02:19:37.986445
1097	220	4	2	2025-07-19 02:19:37.986445	2025-07-19 02:19:37.986445
1098	220	5	2	2025-07-19 02:19:37.986445	2025-07-19 02:19:37.986445
1099	221	1	2	2025-07-19 02:19:38.137567	2025-07-19 02:19:38.137567
1100	221	2	2	2025-07-19 02:19:38.137567	2025-07-19 02:19:38.137567
1101	221	3	2	2025-07-19 02:19:38.137567	2025-07-19 02:19:38.137567
1102	221	4	2	2025-07-19 02:19:38.137567	2025-07-19 02:19:38.137567
1103	221	5	2	2025-07-19 02:19:38.137567	2025-07-19 02:19:38.137567
1104	222	1	2	2025-07-19 02:19:38.280647	2025-07-19 02:19:38.280647
1105	222	2	2	2025-07-19 02:19:38.280647	2025-07-19 02:19:38.280647
1106	222	3	2	2025-07-19 02:19:38.280647	2025-07-19 02:19:38.280647
1107	222	4	2	2025-07-19 02:19:38.280647	2025-07-19 02:19:38.280647
1108	222	5	2	2025-07-19 02:19:38.280647	2025-07-19 02:19:38.280647
1109	223	1	2	2025-07-19 02:19:38.434688	2025-07-19 02:19:38.434688
1110	223	2	2	2025-07-19 02:19:38.434688	2025-07-19 02:19:38.434688
1111	223	3	2	2025-07-19 02:19:38.434688	2025-07-19 02:19:38.434688
1112	223	4	2	2025-07-19 02:19:38.434688	2025-07-19 02:19:38.434688
1113	223	5	2	2025-07-19 02:19:38.434688	2025-07-19 02:19:38.434688
1114	224	1	2	2025-07-19 02:19:38.586941	2025-07-19 02:19:38.586941
1115	224	2	2	2025-07-19 02:19:38.586941	2025-07-19 02:19:38.586941
1116	224	3	2	2025-07-19 02:19:38.586941	2025-07-19 02:19:38.586941
1117	224	4	2	2025-07-19 02:19:38.586941	2025-07-19 02:19:38.586941
1118	224	5	2	2025-07-19 02:19:38.586941	2025-07-19 02:19:38.586941
1119	225	1	2	2025-07-19 02:19:38.733561	2025-07-19 02:19:38.733561
1120	225	2	2	2025-07-19 02:19:38.733561	2025-07-19 02:19:38.733561
1121	225	3	2	2025-07-19 02:19:38.733561	2025-07-19 02:19:38.733561
1122	225	4	2	2025-07-19 02:19:38.733561	2025-07-19 02:19:38.733561
1123	225	5	2	2025-07-19 02:19:38.733561	2025-07-19 02:19:38.733561
1124	226	1	2	2025-07-19 02:19:38.887437	2025-07-19 02:19:38.887437
1125	226	2	2	2025-07-19 02:19:38.887437	2025-07-19 02:19:38.887437
1126	226	3	2	2025-07-19 02:19:38.887437	2025-07-19 02:19:38.887437
1127	226	4	2	2025-07-19 02:19:38.887437	2025-07-19 02:19:38.887437
1128	226	5	2	2025-07-19 02:19:38.887437	2025-07-19 02:19:38.887437
1129	227	1	2	2025-07-19 02:19:39.032262	2025-07-19 02:19:39.032262
1130	227	2	2	2025-07-19 02:19:39.032262	2025-07-19 02:19:39.032262
1131	227	3	2	2025-07-19 02:19:39.032262	2025-07-19 02:19:39.032262
1132	227	4	2	2025-07-19 02:19:39.032262	2025-07-19 02:19:39.032262
1133	227	5	2	2025-07-19 02:19:39.032262	2025-07-19 02:19:39.032262
1134	228	1	2	2025-07-19 02:19:39.180584	2025-07-19 02:19:39.180584
1135	228	2	2	2025-07-19 02:19:39.180584	2025-07-19 02:19:39.180584
1136	228	3	2	2025-07-19 02:19:39.180584	2025-07-19 02:19:39.180584
1137	228	4	2	2025-07-19 02:19:39.180584	2025-07-19 02:19:39.180584
1138	228	5	2	2025-07-19 02:19:39.180584	2025-07-19 02:19:39.180584
1139	229	1	2	2025-07-19 02:19:39.330143	2025-07-19 02:19:39.330143
1140	229	2	2	2025-07-19 02:19:39.330143	2025-07-19 02:19:39.330143
1141	229	3	2	2025-07-19 02:19:39.330143	2025-07-19 02:19:39.330143
1142	229	4	2	2025-07-19 02:19:39.330143	2025-07-19 02:19:39.330143
1143	229	5	2	2025-07-19 02:19:39.330143	2025-07-19 02:19:39.330143
1144	230	1	2	2025-07-19 02:19:39.516742	2025-07-19 02:19:39.516742
1145	230	2	2	2025-07-19 02:19:39.516742	2025-07-19 02:19:39.516742
1146	230	3	2	2025-07-19 02:19:39.516742	2025-07-19 02:19:39.516742
1147	230	4	2	2025-07-19 02:19:39.516742	2025-07-19 02:19:39.516742
1148	230	5	2	2025-07-19 02:19:39.516742	2025-07-19 02:19:39.516742
1149	231	1	2	2025-07-19 02:19:39.663277	2025-07-19 02:19:39.663277
1150	231	2	2	2025-07-19 02:19:39.663277	2025-07-19 02:19:39.663277
1151	231	3	2	2025-07-19 02:19:39.663277	2025-07-19 02:19:39.663277
1152	231	4	2	2025-07-19 02:19:39.663277	2025-07-19 02:19:39.663277
1153	231	5	2	2025-07-19 02:19:39.663277	2025-07-19 02:19:39.663277
1154	232	1	2	2025-07-19 02:19:39.806713	2025-07-19 02:19:39.806713
1155	232	2	2	2025-07-19 02:19:39.806713	2025-07-19 02:19:39.806713
1156	232	3	2	2025-07-19 02:19:39.806713	2025-07-19 02:19:39.806713
1157	232	4	2	2025-07-19 02:19:39.806713	2025-07-19 02:19:39.806713
1158	232	5	2	2025-07-19 02:19:39.806713	2025-07-19 02:19:39.806713
1159	233	1	2	2025-07-19 02:19:39.970153	2025-07-19 02:19:39.970153
1160	233	2	2	2025-07-19 02:19:39.970153	2025-07-19 02:19:39.970153
1161	233	3	2	2025-07-19 02:19:39.970153	2025-07-19 02:19:39.970153
1162	233	4	2	2025-07-19 02:19:39.970153	2025-07-19 02:19:39.970153
1163	233	5	2	2025-07-19 02:19:39.970153	2025-07-19 02:19:39.970153
1164	234	1	2	2025-07-19 02:19:40.132314	2025-07-19 02:19:40.132314
1165	234	2	2	2025-07-19 02:19:40.132314	2025-07-19 02:19:40.132314
1166	234	3	2	2025-07-19 02:19:40.132314	2025-07-19 02:19:40.132314
1167	234	4	2	2025-07-19 02:19:40.132314	2025-07-19 02:19:40.132314
1168	234	5	2	2025-07-19 02:19:40.132314	2025-07-19 02:19:40.132314
1169	235	1	2	2025-07-19 02:19:40.287435	2025-07-19 02:19:40.287435
1170	235	2	2	2025-07-19 02:19:40.287435	2025-07-19 02:19:40.287435
1171	235	3	2	2025-07-19 02:19:40.287435	2025-07-19 02:19:40.287435
1172	235	4	2	2025-07-19 02:19:40.287435	2025-07-19 02:19:40.287435
1173	235	5	2	2025-07-19 02:19:40.287435	2025-07-19 02:19:40.287435
1174	236	1	2	2025-07-19 02:19:40.43858	2025-07-19 02:19:40.43858
1175	236	2	2	2025-07-19 02:19:40.43858	2025-07-19 02:19:40.43858
1176	236	3	2	2025-07-19 02:19:40.43858	2025-07-19 02:19:40.43858
1177	236	4	2	2025-07-19 02:19:40.43858	2025-07-19 02:19:40.43858
1178	236	5	2	2025-07-19 02:19:40.43858	2025-07-19 02:19:40.43858
1179	237	1	2	2025-07-19 02:19:40.591741	2025-07-19 02:19:40.591741
1180	237	2	2	2025-07-19 02:19:40.591741	2025-07-19 02:19:40.591741
1181	237	3	2	2025-07-19 02:19:40.591741	2025-07-19 02:19:40.591741
1182	237	4	2	2025-07-19 02:19:40.591741	2025-07-19 02:19:40.591741
1183	237	5	2	2025-07-19 02:19:40.591741	2025-07-19 02:19:40.591741
1184	238	1	2	2025-07-19 02:19:40.742809	2025-07-19 02:19:40.742809
1185	238	2	2	2025-07-19 02:19:40.742809	2025-07-19 02:19:40.742809
1186	238	3	2	2025-07-19 02:19:40.742809	2025-07-19 02:19:40.742809
1187	238	4	2	2025-07-19 02:19:40.742809	2025-07-19 02:19:40.742809
1188	238	5	2	2025-07-19 02:19:40.742809	2025-07-19 02:19:40.742809
1189	239	1	2	2025-07-19 02:19:40.893787	2025-07-19 02:19:40.893787
1190	239	2	2	2025-07-19 02:19:40.893787	2025-07-19 02:19:40.893787
1191	239	3	2	2025-07-19 02:19:40.893787	2025-07-19 02:19:40.893787
1192	239	4	2	2025-07-19 02:19:40.893787	2025-07-19 02:19:40.893787
1193	239	5	2	2025-07-19 02:19:40.893787	2025-07-19 02:19:40.893787
1194	240	1	2	2025-07-19 02:19:41.039024	2025-07-19 02:19:41.039024
1195	240	2	2	2025-07-19 02:19:41.039024	2025-07-19 02:19:41.039024
1196	240	3	2	2025-07-19 02:19:41.039024	2025-07-19 02:19:41.039024
1197	240	4	2	2025-07-19 02:19:41.039024	2025-07-19 02:19:41.039024
1198	240	5	2	2025-07-19 02:19:41.039024	2025-07-19 02:19:41.039024
1199	241	1	2	2025-07-19 02:19:41.193949	2025-07-19 02:19:41.193949
1200	241	2	2	2025-07-19 02:19:41.193949	2025-07-19 02:19:41.193949
1201	241	3	2	2025-07-19 02:19:41.193949	2025-07-19 02:19:41.193949
1202	241	4	2	2025-07-19 02:19:41.193949	2025-07-19 02:19:41.193949
1203	241	5	2	2025-07-19 02:19:41.193949	2025-07-19 02:19:41.193949
1204	242	1	2	2025-07-19 02:19:41.344783	2025-07-19 02:19:41.344783
1205	242	2	2	2025-07-19 02:19:41.344783	2025-07-19 02:19:41.344783
1206	242	3	2	2025-07-19 02:19:41.344783	2025-07-19 02:19:41.344783
1207	242	4	2	2025-07-19 02:19:41.344783	2025-07-19 02:19:41.344783
1208	242	5	2	2025-07-19 02:19:41.344783	2025-07-19 02:19:41.344783
1209	243	1	2	2025-07-19 02:19:41.493744	2025-07-19 02:19:41.493744
1210	243	2	2	2025-07-19 02:19:41.493744	2025-07-19 02:19:41.493744
1211	243	3	2	2025-07-19 02:19:41.493744	2025-07-19 02:19:41.493744
1212	243	4	2	2025-07-19 02:19:41.493744	2025-07-19 02:19:41.493744
1213	243	5	2	2025-07-19 02:19:41.493744	2025-07-19 02:19:41.493744
1214	244	1	2	2025-07-19 02:19:41.640025	2025-07-19 02:19:41.640025
1215	244	2	2	2025-07-19 02:19:41.640025	2025-07-19 02:19:41.640025
1216	244	3	2	2025-07-19 02:19:41.640025	2025-07-19 02:19:41.640025
1217	244	4	2	2025-07-19 02:19:41.640025	2025-07-19 02:19:41.640025
1218	244	5	2	2025-07-19 02:19:41.640025	2025-07-19 02:19:41.640025
1219	245	1	2	2025-07-19 02:19:41.786909	2025-07-19 02:19:41.786909
1220	245	2	2	2025-07-19 02:19:41.786909	2025-07-19 02:19:41.786909
1221	245	3	2	2025-07-19 02:19:41.786909	2025-07-19 02:19:41.786909
1222	245	4	2	2025-07-19 02:19:41.786909	2025-07-19 02:19:41.786909
1223	245	5	2	2025-07-19 02:19:41.786909	2025-07-19 02:19:41.786909
1224	246	1	2	2025-07-19 02:19:41.941086	2025-07-19 02:19:41.941086
1225	246	2	2	2025-07-19 02:19:41.941086	2025-07-19 02:19:41.941086
1226	246	3	2	2025-07-19 02:19:41.941086	2025-07-19 02:19:41.941086
1227	246	4	2	2025-07-19 02:19:41.941086	2025-07-19 02:19:41.941086
1228	246	5	2	2025-07-19 02:19:41.941086	2025-07-19 02:19:41.941086
1229	247	1	2	2025-07-19 02:19:42.105543	2025-07-19 02:19:42.105543
1230	247	2	2	2025-07-19 02:19:42.105543	2025-07-19 02:19:42.105543
1231	247	3	2	2025-07-19 02:19:42.105543	2025-07-19 02:19:42.105543
1232	247	4	2	2025-07-19 02:19:42.105543	2025-07-19 02:19:42.105543
1233	247	5	2	2025-07-19 02:19:42.105543	2025-07-19 02:19:42.105543
1234	248	1	2	2025-07-19 02:19:42.264159	2025-07-19 02:19:42.264159
1235	248	2	2	2025-07-19 02:19:42.264159	2025-07-19 02:19:42.264159
1236	248	3	2	2025-07-19 02:19:42.264159	2025-07-19 02:19:42.264159
1237	248	4	2	2025-07-19 02:19:42.264159	2025-07-19 02:19:42.264159
1238	248	5	2	2025-07-19 02:19:42.264159	2025-07-19 02:19:42.264159
1239	249	1	2	2025-07-19 02:19:42.418999	2025-07-19 02:19:42.418999
1240	249	2	2	2025-07-19 02:19:42.418999	2025-07-19 02:19:42.418999
1241	249	3	2	2025-07-19 02:19:42.418999	2025-07-19 02:19:42.418999
1242	249	4	2	2025-07-19 02:19:42.418999	2025-07-19 02:19:42.418999
1243	249	5	2	2025-07-19 02:19:42.418999	2025-07-19 02:19:42.418999
1244	250	1	2	2025-07-19 02:19:42.576258	2025-07-19 02:19:42.576258
1245	250	2	2	2025-07-19 02:19:42.576258	2025-07-19 02:19:42.576258
1246	250	3	2	2025-07-19 02:19:42.576258	2025-07-19 02:19:42.576258
1247	250	4	2	2025-07-19 02:19:42.576258	2025-07-19 02:19:42.576258
1248	250	5	2	2025-07-19 02:19:42.576258	2025-07-19 02:19:42.576258
1249	251	1	2	2025-07-19 02:19:42.725568	2025-07-19 02:19:42.725568
1250	251	2	2	2025-07-19 02:19:42.725568	2025-07-19 02:19:42.725568
1251	251	3	2	2025-07-19 02:19:42.725568	2025-07-19 02:19:42.725568
1252	251	4	2	2025-07-19 02:19:42.725568	2025-07-19 02:19:42.725568
1253	251	5	2	2025-07-19 02:19:42.725568	2025-07-19 02:19:42.725568
1254	252	1	2	2025-07-19 02:19:42.883728	2025-07-19 02:19:42.883728
1255	252	2	2	2025-07-19 02:19:42.883728	2025-07-19 02:19:42.883728
1256	252	3	2	2025-07-19 02:19:42.883728	2025-07-19 02:19:42.883728
1257	252	4	2	2025-07-19 02:19:42.883728	2025-07-19 02:19:42.883728
1258	252	5	2	2025-07-19 02:19:42.883728	2025-07-19 02:19:42.883728
1259	253	1	2	2025-07-19 02:19:43.043907	2025-07-19 02:19:43.043907
1260	253	2	2	2025-07-19 02:19:43.043907	2025-07-19 02:19:43.043907
1261	253	3	2	2025-07-19 02:19:43.043907	2025-07-19 02:19:43.043907
1262	253	4	2	2025-07-19 02:19:43.043907	2025-07-19 02:19:43.043907
1263	253	5	2	2025-07-19 02:19:43.043907	2025-07-19 02:19:43.043907
1264	254	1	2	2025-07-19 02:19:43.193217	2025-07-19 02:19:43.193217
1265	254	2	2	2025-07-19 02:19:43.193217	2025-07-19 02:19:43.193217
1266	254	3	2	2025-07-19 02:19:43.193217	2025-07-19 02:19:43.193217
1267	254	4	2	2025-07-19 02:19:43.193217	2025-07-19 02:19:43.193217
1268	254	5	2	2025-07-19 02:19:43.193217	2025-07-19 02:19:43.193217
1269	255	1	2	2025-07-19 02:19:43.35945	2025-07-19 02:19:43.35945
1270	255	2	2	2025-07-19 02:19:43.35945	2025-07-19 02:19:43.35945
1271	255	3	2	2025-07-19 02:19:43.35945	2025-07-19 02:19:43.35945
1272	255	4	2	2025-07-19 02:19:43.35945	2025-07-19 02:19:43.35945
1273	255	5	2	2025-07-19 02:19:43.35945	2025-07-19 02:19:43.35945
1274	256	1	2	2025-07-19 02:19:43.512262	2025-07-19 02:19:43.512262
1275	256	2	2	2025-07-19 02:19:43.512262	2025-07-19 02:19:43.512262
1276	256	3	2	2025-07-19 02:19:43.512262	2025-07-19 02:19:43.512262
1277	256	4	2	2025-07-19 02:19:43.512262	2025-07-19 02:19:43.512262
1278	256	5	2	2025-07-19 02:19:43.512262	2025-07-19 02:19:43.512262
1279	257	1	2	2025-07-19 02:19:43.662717	2025-07-19 02:19:43.662717
1280	257	2	2	2025-07-19 02:19:43.662717	2025-07-19 02:19:43.662717
1281	257	3	2	2025-07-19 02:19:43.662717	2025-07-19 02:19:43.662717
1282	257	4	2	2025-07-19 02:19:43.662717	2025-07-19 02:19:43.662717
1283	257	5	2	2025-07-19 02:19:43.662717	2025-07-19 02:19:43.662717
1284	258	1	2	2025-07-19 02:19:43.84641	2025-07-19 02:19:43.84641
1285	258	2	2	2025-07-19 02:19:43.84641	2025-07-19 02:19:43.84641
1286	258	3	2	2025-07-19 02:19:43.84641	2025-07-19 02:19:43.84641
1287	258	4	2	2025-07-19 02:19:43.84641	2025-07-19 02:19:43.84641
1288	258	5	2	2025-07-19 02:19:43.84641	2025-07-19 02:19:43.84641
1289	259	1	2	2025-07-19 02:19:44.00371	2025-07-19 02:19:44.00371
1290	259	2	2	2025-07-19 02:19:44.00371	2025-07-19 02:19:44.00371
1291	259	3	2	2025-07-19 02:19:44.00371	2025-07-19 02:19:44.00371
1292	259	4	2	2025-07-19 02:19:44.00371	2025-07-19 02:19:44.00371
1293	259	5	2	2025-07-19 02:19:44.00371	2025-07-19 02:19:44.00371
1294	260	1	2	2025-07-19 02:19:44.165223	2025-07-19 02:19:44.165223
1295	260	2	2	2025-07-19 02:19:44.165223	2025-07-19 02:19:44.165223
1296	260	3	2	2025-07-19 02:19:44.165223	2025-07-19 02:19:44.165223
1297	260	4	2	2025-07-19 02:19:44.165223	2025-07-19 02:19:44.165223
1298	260	5	2	2025-07-19 02:19:44.165223	2025-07-19 02:19:44.165223
1299	261	1	2	2025-07-19 02:19:44.378204	2025-07-19 02:19:44.378204
1300	261	2	2	2025-07-19 02:19:44.378204	2025-07-19 02:19:44.378204
1301	261	3	2	2025-07-19 02:19:44.378204	2025-07-19 02:19:44.378204
1302	261	4	2	2025-07-19 02:19:44.378204	2025-07-19 02:19:44.378204
1303	261	5	2	2025-07-19 02:19:44.378204	2025-07-19 02:19:44.378204
1304	262	1	2	2025-07-19 02:19:44.551815	2025-07-19 02:19:44.551815
1305	262	2	2	2025-07-19 02:19:44.551815	2025-07-19 02:19:44.551815
1306	262	3	2	2025-07-19 02:19:44.551815	2025-07-19 02:19:44.551815
1307	262	4	2	2025-07-19 02:19:44.551815	2025-07-19 02:19:44.551815
1308	262	5	2	2025-07-19 02:19:44.551815	2025-07-19 02:19:44.551815
1309	263	1	2	2025-07-19 02:19:44.721848	2025-07-19 02:19:44.721848
1310	263	2	2	2025-07-19 02:19:44.721848	2025-07-19 02:19:44.721848
1311	263	3	2	2025-07-19 02:19:44.721848	2025-07-19 02:19:44.721848
1312	263	4	2	2025-07-19 02:19:44.721848	2025-07-19 02:19:44.721848
1313	263	5	2	2025-07-19 02:19:44.721848	2025-07-19 02:19:44.721848
1314	264	1	2	2025-07-19 02:19:44.893731	2025-07-19 02:19:44.893731
1315	264	2	2	2025-07-19 02:19:44.893731	2025-07-19 02:19:44.893731
1316	264	3	2	2025-07-19 02:19:44.893731	2025-07-19 02:19:44.893731
1317	264	4	2	2025-07-19 02:19:44.893731	2025-07-19 02:19:44.893731
1318	264	5	2	2025-07-19 02:19:44.893731	2025-07-19 02:19:44.893731
1319	265	1	2	2025-07-19 02:19:45.06037	2025-07-19 02:19:45.06037
1320	265	2	2	2025-07-19 02:19:45.06037	2025-07-19 02:19:45.06037
1321	265	3	2	2025-07-19 02:19:45.06037	2025-07-19 02:19:45.06037
1322	265	4	2	2025-07-19 02:19:45.06037	2025-07-19 02:19:45.06037
1323	265	5	2	2025-07-19 02:19:45.06037	2025-07-19 02:19:45.06037
1324	266	1	2	2025-07-19 02:19:45.220409	2025-07-19 02:19:45.220409
1325	266	2	2	2025-07-19 02:19:45.220409	2025-07-19 02:19:45.220409
1326	266	3	2	2025-07-19 02:19:45.220409	2025-07-19 02:19:45.220409
1327	266	4	2	2025-07-19 02:19:45.220409	2025-07-19 02:19:45.220409
1328	266	5	2	2025-07-19 02:19:45.220409	2025-07-19 02:19:45.220409
1329	267	1	2	2025-07-19 02:19:45.378907	2025-07-19 02:19:45.378907
1330	267	2	2	2025-07-19 02:19:45.378907	2025-07-19 02:19:45.378907
1331	267	3	2	2025-07-19 02:19:45.378907	2025-07-19 02:19:45.378907
1332	267	4	2	2025-07-19 02:19:45.378907	2025-07-19 02:19:45.378907
1333	267	5	2	2025-07-19 02:19:45.378907	2025-07-19 02:19:45.378907
1334	268	1	2	2025-07-19 02:19:45.534119	2025-07-19 02:19:45.534119
1335	268	2	2	2025-07-19 02:19:45.534119	2025-07-19 02:19:45.534119
1336	268	3	2	2025-07-19 02:19:45.534119	2025-07-19 02:19:45.534119
1337	268	4	2	2025-07-19 02:19:45.534119	2025-07-19 02:19:45.534119
1338	268	5	2	2025-07-19 02:19:45.534119	2025-07-19 02:19:45.534119
1339	269	1	2	2025-07-19 02:19:45.702307	2025-07-19 02:19:45.702307
1340	269	2	2	2025-07-19 02:19:45.702307	2025-07-19 02:19:45.702307
1341	269	3	2	2025-07-19 02:19:45.702307	2025-07-19 02:19:45.702307
1342	269	4	2	2025-07-19 02:19:45.702307	2025-07-19 02:19:45.702307
1343	269	5	2	2025-07-19 02:19:45.702307	2025-07-19 02:19:45.702307
1344	270	1	2	2025-07-19 02:19:45.872617	2025-07-19 02:19:45.872617
1345	270	2	2	2025-07-19 02:19:45.872617	2025-07-19 02:19:45.872617
1346	270	3	2	2025-07-19 02:19:45.872617	2025-07-19 02:19:45.872617
1347	270	4	2	2025-07-19 02:19:45.872617	2025-07-19 02:19:45.872617
1348	270	5	2	2025-07-19 02:19:45.872617	2025-07-19 02:19:45.872617
1349	271	1	2	2025-07-19 02:19:46.045503	2025-07-19 02:19:46.045503
1350	271	2	2	2025-07-19 02:19:46.045503	2025-07-19 02:19:46.045503
1351	271	3	2	2025-07-19 02:19:46.045503	2025-07-19 02:19:46.045503
1352	271	4	2	2025-07-19 02:19:46.045503	2025-07-19 02:19:46.045503
1353	271	5	2	2025-07-19 02:19:46.045503	2025-07-19 02:19:46.045503
1354	272	1	2	2025-07-19 02:19:46.204176	2025-07-19 02:19:46.204176
1355	272	2	2	2025-07-19 02:19:46.204176	2025-07-19 02:19:46.204176
1356	272	3	2	2025-07-19 02:19:46.204176	2025-07-19 02:19:46.204176
1357	272	4	2	2025-07-19 02:19:46.204176	2025-07-19 02:19:46.204176
1358	272	5	2	2025-07-19 02:19:46.204176	2025-07-19 02:19:46.204176
1359	273	1	2	2025-07-19 02:19:46.366681	2025-07-19 02:19:46.366681
1360	273	2	2	2025-07-19 02:19:46.366681	2025-07-19 02:19:46.366681
1361	273	3	2	2025-07-19 02:19:46.366681	2025-07-19 02:19:46.366681
1362	273	4	2	2025-07-19 02:19:46.366681	2025-07-19 02:19:46.366681
1363	273	5	2	2025-07-19 02:19:46.366681	2025-07-19 02:19:46.366681
1364	274	1	2	2025-07-19 02:19:46.556069	2025-07-19 02:19:46.556069
1365	274	2	2	2025-07-19 02:19:46.556069	2025-07-19 02:19:46.556069
1366	274	3	2	2025-07-19 02:19:46.556069	2025-07-19 02:19:46.556069
1367	274	4	2	2025-07-19 02:19:46.556069	2025-07-19 02:19:46.556069
1368	274	5	2	2025-07-19 02:19:46.556069	2025-07-19 02:19:46.556069
1369	275	1	2	2025-07-19 02:19:46.726804	2025-07-19 02:19:46.726804
1370	275	2	2	2025-07-19 02:19:46.726804	2025-07-19 02:19:46.726804
1371	275	3	2	2025-07-19 02:19:46.726804	2025-07-19 02:19:46.726804
1372	275	4	2	2025-07-19 02:19:46.726804	2025-07-19 02:19:46.726804
1373	275	5	2	2025-07-19 02:19:46.726804	2025-07-19 02:19:46.726804
1374	276	1	2	2025-07-19 02:19:46.887148	2025-07-19 02:19:46.887148
1375	276	2	2	2025-07-19 02:19:46.887148	2025-07-19 02:19:46.887148
1376	276	3	2	2025-07-19 02:19:46.887148	2025-07-19 02:19:46.887148
1377	276	4	2	2025-07-19 02:19:46.887148	2025-07-19 02:19:46.887148
1378	276	5	2	2025-07-19 02:19:46.887148	2025-07-19 02:19:46.887148
1379	277	1	2	2025-07-19 02:19:47.064744	2025-07-19 02:19:47.064744
1380	277	2	2	2025-07-19 02:19:47.064744	2025-07-19 02:19:47.064744
1381	277	3	2	2025-07-19 02:19:47.064744	2025-07-19 02:19:47.064744
1382	277	4	2	2025-07-19 02:19:47.064744	2025-07-19 02:19:47.064744
1383	277	5	2	2025-07-19 02:19:47.064744	2025-07-19 02:19:47.064744
1384	278	1	2	2025-07-19 02:19:47.221944	2025-07-19 02:19:47.221944
1385	278	2	2	2025-07-19 02:19:47.221944	2025-07-19 02:19:47.221944
1386	278	3	2	2025-07-19 02:19:47.221944	2025-07-19 02:19:47.221944
1387	278	4	2	2025-07-19 02:19:47.221944	2025-07-19 02:19:47.221944
1388	278	5	2	2025-07-19 02:19:47.221944	2025-07-19 02:19:47.221944
1389	279	1	2	2025-07-19 02:19:47.393816	2025-07-19 02:19:47.393816
1390	279	2	2	2025-07-19 02:19:47.393816	2025-07-19 02:19:47.393816
1391	279	3	2	2025-07-19 02:19:47.393816	2025-07-19 02:19:47.393816
1392	279	4	2	2025-07-19 02:19:47.393816	2025-07-19 02:19:47.393816
1393	279	5	2	2025-07-19 02:19:47.393816	2025-07-19 02:19:47.393816
1394	280	1	2	2025-07-19 02:19:47.549663	2025-07-19 02:19:47.549663
1395	280	2	2	2025-07-19 02:19:47.549663	2025-07-19 02:19:47.549663
1396	280	3	2	2025-07-19 02:19:47.549663	2025-07-19 02:19:47.549663
1397	280	4	2	2025-07-19 02:19:47.549663	2025-07-19 02:19:47.549663
1398	280	5	2	2025-07-19 02:19:47.549663	2025-07-19 02:19:47.549663
1399	281	1	1	2025-07-19 02:19:47.704498	2025-07-19 02:19:47.704498
1400	281	2	1	2025-07-19 02:19:47.704498	2025-07-19 02:19:47.704498
1401	281	3	1	2025-07-19 02:19:47.704498	2025-07-19 02:19:47.704498
1402	281	4	1	2025-07-19 02:19:47.704498	2025-07-19 02:19:47.704498
1403	281	5	1	2025-07-19 02:19:47.704498	2025-07-19 02:19:47.704498
1404	282	1	2	2025-07-19 02:19:47.868161	2025-07-19 02:19:47.868161
1405	282	2	2	2025-07-19 02:19:47.868161	2025-07-19 02:19:47.868161
1406	282	3	2	2025-07-19 02:19:47.868161	2025-07-19 02:19:47.868161
1407	282	4	2	2025-07-19 02:19:47.868161	2025-07-19 02:19:47.868161
1408	282	5	2	2025-07-19 02:19:47.868161	2025-07-19 02:19:47.868161
1409	283	1	2	2025-07-19 02:19:48.026168	2025-07-19 02:19:48.026168
1410	283	2	2	2025-07-19 02:19:48.026168	2025-07-19 02:19:48.026168
1411	283	3	2	2025-07-19 02:19:48.026168	2025-07-19 02:19:48.026168
1412	283	4	2	2025-07-19 02:19:48.026168	2025-07-19 02:19:48.026168
1413	283	5	2	2025-07-19 02:19:48.026168	2025-07-19 02:19:48.026168
1414	284	1	2	2025-07-19 02:19:48.195115	2025-07-19 02:19:48.195115
1415	284	2	2	2025-07-19 02:19:48.195115	2025-07-19 02:19:48.195115
1416	284	3	2	2025-07-19 02:19:48.195115	2025-07-19 02:19:48.195115
1417	284	4	2	2025-07-19 02:19:48.195115	2025-07-19 02:19:48.195115
1418	284	5	2	2025-07-19 02:19:48.195115	2025-07-19 02:19:48.195115
1419	285	1	2	2025-07-19 02:19:48.352589	2025-07-19 02:19:48.352589
1420	285	2	2	2025-07-19 02:19:48.352589	2025-07-19 02:19:48.352589
1421	285	3	2	2025-07-19 02:19:48.352589	2025-07-19 02:19:48.352589
1422	285	4	2	2025-07-19 02:19:48.352589	2025-07-19 02:19:48.352589
1423	285	5	2	2025-07-19 02:19:48.352589	2025-07-19 02:19:48.352589
1424	286	1	2	2025-07-19 02:19:48.517121	2025-07-19 02:19:48.517121
1425	286	2	2	2025-07-19 02:19:48.517121	2025-07-19 02:19:48.517121
1426	286	3	2	2025-07-19 02:19:48.517121	2025-07-19 02:19:48.517121
1427	286	4	2	2025-07-19 02:19:48.517121	2025-07-19 02:19:48.517121
1428	286	5	2	2025-07-19 02:19:48.517121	2025-07-19 02:19:48.517121
1429	287	1	4	2025-07-19 02:19:48.672664	2025-07-19 02:19:48.672664
1430	287	2	4	2025-07-19 02:19:48.672664	2025-07-19 02:19:48.672664
1431	287	3	4	2025-07-19 02:19:48.672664	2025-07-19 02:19:48.672664
1432	287	4	4	2025-07-19 02:19:48.672664	2025-07-19 02:19:48.672664
1433	287	5	4	2025-07-19 02:19:48.672664	2025-07-19 02:19:48.672664
1434	288	1	2	2025-07-19 02:19:48.836328	2025-07-19 02:19:48.836328
1435	288	2	2	2025-07-19 02:19:48.836328	2025-07-19 02:19:48.836328
1436	288	3	2	2025-07-19 02:19:48.836328	2025-07-19 02:19:48.836328
1437	288	4	2	2025-07-19 02:19:48.836328	2025-07-19 02:19:48.836328
1438	288	5	2	2025-07-19 02:19:48.836328	2025-07-19 02:19:48.836328
1439	289	1	2	2025-07-19 02:19:48.991585	2025-07-19 02:19:48.991585
1440	289	2	2	2025-07-19 02:19:48.991585	2025-07-19 02:19:48.991585
1441	289	3	2	2025-07-19 02:19:48.991585	2025-07-19 02:19:48.991585
1442	289	4	2	2025-07-19 02:19:48.991585	2025-07-19 02:19:48.991585
1443	289	5	2	2025-07-19 02:19:48.991585	2025-07-19 02:19:48.991585
1444	290	1	2	2025-07-19 02:19:49.152022	2025-07-19 02:19:49.152022
1445	290	2	2	2025-07-19 02:19:49.152022	2025-07-19 02:19:49.152022
1446	290	3	2	2025-07-19 02:19:49.152022	2025-07-19 02:19:49.152022
1447	290	4	2	2025-07-19 02:19:49.152022	2025-07-19 02:19:49.152022
1448	290	5	2	2025-07-19 02:19:49.152022	2025-07-19 02:19:49.152022
1449	291	1	2	2025-07-19 02:19:49.320922	2025-07-19 02:19:49.320922
1450	291	2	2	2025-07-19 02:19:49.320922	2025-07-19 02:19:49.320922
1451	291	3	2	2025-07-19 02:19:49.320922	2025-07-19 02:19:49.320922
1452	291	4	2	2025-07-19 02:19:49.320922	2025-07-19 02:19:49.320922
1453	291	5	2	2025-07-19 02:19:49.320922	2025-07-19 02:19:49.320922
1454	292	1	2	2025-07-19 02:19:49.482765	2025-07-19 02:19:49.482765
1455	292	2	2	2025-07-19 02:19:49.482765	2025-07-19 02:19:49.482765
1456	292	3	2	2025-07-19 02:19:49.482765	2025-07-19 02:19:49.482765
1457	292	4	2	2025-07-19 02:19:49.482765	2025-07-19 02:19:49.482765
1458	292	5	2	2025-07-19 02:19:49.482765	2025-07-19 02:19:49.482765
1459	293	1	2	2025-07-19 02:19:49.645064	2025-07-19 02:19:49.645064
1460	293	2	2	2025-07-19 02:19:49.645064	2025-07-19 02:19:49.645064
1461	293	3	2	2025-07-19 02:19:49.645064	2025-07-19 02:19:49.645064
1462	293	4	2	2025-07-19 02:19:49.645064	2025-07-19 02:19:49.645064
1463	293	5	2	2025-07-19 02:19:49.645064	2025-07-19 02:19:49.645064
1464	294	1	3	2025-07-19 02:19:49.822198	2025-07-19 02:19:49.822198
1465	294	2	3	2025-07-19 02:19:49.822198	2025-07-19 02:19:49.822198
1466	294	3	3	2025-07-19 02:19:49.822198	2025-07-19 02:19:49.822198
1467	294	4	3	2025-07-19 02:19:49.822198	2025-07-19 02:19:49.822198
1468	294	5	3	2025-07-19 02:19:49.822198	2025-07-19 02:19:49.822198
1469	295	1	2	2025-07-19 02:19:50.003231	2025-07-19 02:19:50.003231
1470	295	2	2	2025-07-19 02:19:50.003231	2025-07-19 02:19:50.003231
1471	295	3	2	2025-07-19 02:19:50.003231	2025-07-19 02:19:50.003231
1472	295	4	2	2025-07-19 02:19:50.003231	2025-07-19 02:19:50.003231
1473	295	5	2	2025-07-19 02:19:50.003231	2025-07-19 02:19:50.003231
1474	296	1	2	2025-07-19 02:19:50.174297	2025-07-19 02:19:50.174297
1475	296	2	2	2025-07-19 02:19:50.174297	2025-07-19 02:19:50.174297
1476	296	3	2	2025-07-19 02:19:50.174297	2025-07-19 02:19:50.174297
1477	296	4	2	2025-07-19 02:19:50.174297	2025-07-19 02:19:50.174297
1478	296	5	2	2025-07-19 02:19:50.174297	2025-07-19 02:19:50.174297
1479	297	1	2	2025-07-19 02:19:50.339946	2025-07-19 02:19:50.339946
1480	297	2	2	2025-07-19 02:19:50.339946	2025-07-19 02:19:50.339946
1481	297	3	2	2025-07-19 02:19:50.339946	2025-07-19 02:19:50.339946
1482	297	4	2	2025-07-19 02:19:50.339946	2025-07-19 02:19:50.339946
1483	297	5	2	2025-07-19 02:19:50.339946	2025-07-19 02:19:50.339946
1484	298	1	2	2025-07-19 02:19:50.499265	2025-07-19 02:19:50.499265
1485	298	2	2	2025-07-19 02:19:50.499265	2025-07-19 02:19:50.499265
1486	298	3	2	2025-07-19 02:19:50.499265	2025-07-19 02:19:50.499265
1487	298	4	2	2025-07-19 02:19:50.499265	2025-07-19 02:19:50.499265
1488	298	5	2	2025-07-19 02:19:50.499265	2025-07-19 02:19:50.499265
1489	299	1	2	2025-07-19 02:19:50.673983	2025-07-19 02:19:50.673983
1490	299	2	2	2025-07-19 02:19:50.673983	2025-07-19 02:19:50.673983
1491	299	3	2	2025-07-19 02:19:50.673983	2025-07-19 02:19:50.673983
1492	299	4	2	2025-07-19 02:19:50.673983	2025-07-19 02:19:50.673983
1493	299	5	2	2025-07-19 02:19:50.673983	2025-07-19 02:19:50.673983
1494	300	1	2	2025-07-19 02:19:50.829738	2025-07-19 02:19:50.829738
1495	300	2	2	2025-07-19 02:19:50.829738	2025-07-19 02:19:50.829738
1496	300	3	2	2025-07-19 02:19:50.829738	2025-07-19 02:19:50.829738
1497	300	4	2	2025-07-19 02:19:50.829738	2025-07-19 02:19:50.829738
1498	300	5	2	2025-07-19 02:19:50.829738	2025-07-19 02:19:50.829738
1499	301	1	2	2025-07-19 02:19:50.987043	2025-07-19 02:19:50.987043
1500	301	2	2	2025-07-19 02:19:50.987043	2025-07-19 02:19:50.987043
1501	301	3	2	2025-07-19 02:19:50.987043	2025-07-19 02:19:50.987043
1502	301	4	2	2025-07-19 02:19:50.987043	2025-07-19 02:19:50.987043
1503	301	5	2	2025-07-19 02:19:50.987043	2025-07-19 02:19:50.987043
1504	302	1	2	2025-07-19 02:19:51.177502	2025-07-19 02:19:51.177502
1505	302	2	2	2025-07-19 02:19:51.177502	2025-07-19 02:19:51.177502
1506	302	3	2	2025-07-19 02:19:51.177502	2025-07-19 02:19:51.177502
1507	302	4	2	2025-07-19 02:19:51.177502	2025-07-19 02:19:51.177502
1508	302	5	2	2025-07-19 02:19:51.177502	2025-07-19 02:19:51.177502
1509	303	1	2	2025-07-19 02:19:51.393465	2025-07-19 02:19:51.393465
1510	303	2	2	2025-07-19 02:19:51.393465	2025-07-19 02:19:51.393465
1511	303	3	2	2025-07-19 02:19:51.393465	2025-07-19 02:19:51.393465
1512	303	4	2	2025-07-19 02:19:51.393465	2025-07-19 02:19:51.393465
1513	303	5	2	2025-07-19 02:19:51.393465	2025-07-19 02:19:51.393465
1514	304	1	2	2025-07-19 02:19:51.598138	2025-07-19 02:19:51.598138
1515	304	2	2	2025-07-19 02:19:51.598138	2025-07-19 02:19:51.598138
1516	304	3	2	2025-07-19 02:19:51.598138	2025-07-19 02:19:51.598138
1517	304	4	2	2025-07-19 02:19:51.598138	2025-07-19 02:19:51.598138
1518	304	5	2	2025-07-19 02:19:51.598138	2025-07-19 02:19:51.598138
1519	305	1	2	2025-07-19 02:19:51.865122	2025-07-19 02:19:51.865122
1520	305	2	2	2025-07-19 02:19:51.865122	2025-07-19 02:19:51.865122
1521	305	3	2	2025-07-19 02:19:51.865122	2025-07-19 02:19:51.865122
1522	305	4	2	2025-07-19 02:19:51.865122	2025-07-19 02:19:51.865122
1523	305	5	2	2025-07-19 02:19:51.865122	2025-07-19 02:19:51.865122
1524	306	1	2	2025-07-19 02:19:52.044053	2025-07-19 02:19:52.044053
1525	306	2	2	2025-07-19 02:19:52.044053	2025-07-19 02:19:52.044053
1526	306	3	2	2025-07-19 02:19:52.044053	2025-07-19 02:19:52.044053
1527	306	4	2	2025-07-19 02:19:52.044053	2025-07-19 02:19:52.044053
1528	306	5	2	2025-07-19 02:19:52.044053	2025-07-19 02:19:52.044053
1529	307	1	8	2025-07-19 02:19:52.210542	2025-07-19 02:19:52.210542
1530	307	2	8	2025-07-19 02:19:52.210542	2025-07-19 02:19:52.210542
1531	307	3	8	2025-07-19 02:19:52.210542	2025-07-19 02:19:52.210542
1532	307	4	8	2025-07-19 02:19:52.210542	2025-07-19 02:19:52.210542
1533	307	5	8	2025-07-19 02:19:52.210542	2025-07-19 02:19:52.210542
1534	308	1	3	2025-07-19 02:19:52.369889	2025-07-19 02:19:52.369889
1535	308	2	3	2025-07-19 02:19:52.369889	2025-07-19 02:19:52.369889
1536	308	3	3	2025-07-19 02:19:52.369889	2025-07-19 02:19:52.369889
1537	308	4	3	2025-07-19 02:19:52.369889	2025-07-19 02:19:52.369889
1538	308	5	3	2025-07-19 02:19:52.369889	2025-07-19 02:19:52.369889
1539	309	1	2	2025-07-19 02:19:52.524979	2025-07-19 02:19:52.524979
1540	309	2	2	2025-07-19 02:19:52.524979	2025-07-19 02:19:52.524979
1541	309	3	2	2025-07-19 02:19:52.524979	2025-07-19 02:19:52.524979
1542	309	4	2	2025-07-19 02:19:52.524979	2025-07-19 02:19:52.524979
1543	309	5	2	2025-07-19 02:19:52.524979	2025-07-19 02:19:52.524979
1544	310	1	2	2025-07-19 02:19:52.679817	2025-07-19 02:19:52.679817
1545	310	2	2	2025-07-19 02:19:52.679817	2025-07-19 02:19:52.679817
1546	310	3	2	2025-07-19 02:19:52.679817	2025-07-19 02:19:52.679817
1547	310	4	2	2025-07-19 02:19:52.679817	2025-07-19 02:19:52.679817
1548	310	5	2	2025-07-19 02:19:52.679817	2025-07-19 02:19:52.679817
1549	311	1	2	2025-07-19 02:19:52.847983	2025-07-19 02:19:52.847983
1550	311	2	2	2025-07-19 02:19:52.847983	2025-07-19 02:19:52.847983
1551	311	3	2	2025-07-19 02:19:52.847983	2025-07-19 02:19:52.847983
1552	311	4	2	2025-07-19 02:19:52.847983	2025-07-19 02:19:52.847983
1553	311	5	2	2025-07-19 02:19:52.847983	2025-07-19 02:19:52.847983
1554	312	1	2	2025-07-19 02:19:53.085112	2025-07-19 02:19:53.085112
1555	312	2	2	2025-07-19 02:19:53.085112	2025-07-19 02:19:53.085112
1556	312	3	2	2025-07-19 02:19:53.085112	2025-07-19 02:19:53.085112
1557	312	4	2	2025-07-19 02:19:53.085112	2025-07-19 02:19:53.085112
1558	312	5	2	2025-07-19 02:19:53.085112	2025-07-19 02:19:53.085112
1559	313	1	2	2025-07-19 02:19:53.263612	2025-07-19 02:19:53.263612
1560	313	2	2	2025-07-19 02:19:53.263612	2025-07-19 02:19:53.263612
1561	313	3	2	2025-07-19 02:19:53.263612	2025-07-19 02:19:53.263612
1562	313	4	2	2025-07-19 02:19:53.263612	2025-07-19 02:19:53.263612
1563	313	5	2	2025-07-19 02:19:53.263612	2025-07-19 02:19:53.263612
1564	314	1	2	2025-07-19 02:19:53.424397	2025-07-19 02:19:53.424397
1565	314	2	2	2025-07-19 02:19:53.424397	2025-07-19 02:19:53.424397
1566	314	3	2	2025-07-19 02:19:53.424397	2025-07-19 02:19:53.424397
1567	314	4	2	2025-07-19 02:19:53.424397	2025-07-19 02:19:53.424397
1568	314	5	2	2025-07-19 02:19:53.424397	2025-07-19 02:19:53.424397
1569	315	1	2	2025-07-19 02:19:53.592336	2025-07-19 02:19:53.592336
1570	315	2	2	2025-07-19 02:19:53.592336	2025-07-19 02:19:53.592336
1571	315	3	2	2025-07-19 02:19:53.592336	2025-07-19 02:19:53.592336
1572	315	4	2	2025-07-19 02:19:53.592336	2025-07-19 02:19:53.592336
1573	315	5	2	2025-07-19 02:19:53.592336	2025-07-19 02:19:53.592336
1574	316	1	2	2025-07-19 02:19:53.753972	2025-07-19 02:19:53.753972
1575	316	2	2	2025-07-19 02:19:53.753972	2025-07-19 02:19:53.753972
1576	316	3	2	2025-07-19 02:19:53.753972	2025-07-19 02:19:53.753972
1577	316	4	2	2025-07-19 02:19:53.753972	2025-07-19 02:19:53.753972
1578	316	5	2	2025-07-19 02:19:53.753972	2025-07-19 02:19:53.753972
1579	317	1	2	2025-07-19 02:19:53.911952	2025-07-19 02:19:53.911952
1580	317	2	2	2025-07-19 02:19:53.911952	2025-07-19 02:19:53.911952
1581	317	3	2	2025-07-19 02:19:53.911952	2025-07-19 02:19:53.911952
1582	317	4	2	2025-07-19 02:19:53.911952	2025-07-19 02:19:53.911952
1583	317	5	2	2025-07-19 02:19:53.911952	2025-07-19 02:19:53.911952
1584	318	1	2	2025-07-19 02:19:54.080719	2025-07-19 02:19:54.080719
1585	318	2	2	2025-07-19 02:19:54.080719	2025-07-19 02:19:54.080719
1586	318	3	2	2025-07-19 02:19:54.080719	2025-07-19 02:19:54.080719
1587	318	4	2	2025-07-19 02:19:54.080719	2025-07-19 02:19:54.080719
1588	318	5	2	2025-07-19 02:19:54.080719	2025-07-19 02:19:54.080719
1589	319	1	2	2025-07-19 02:19:54.249648	2025-07-19 02:19:54.249648
1590	319	2	2	2025-07-19 02:19:54.249648	2025-07-19 02:19:54.249648
1591	319	3	2	2025-07-19 02:19:54.249648	2025-07-19 02:19:54.249648
1592	319	4	2	2025-07-19 02:19:54.249648	2025-07-19 02:19:54.249648
1593	319	5	2	2025-07-19 02:19:54.249648	2025-07-19 02:19:54.249648
1594	320	1	1	2025-07-19 02:19:54.410976	2025-07-19 02:19:54.410976
1595	320	2	1	2025-07-19 02:19:54.410976	2025-07-19 02:19:54.410976
1596	320	3	1	2025-07-19 02:19:54.410976	2025-07-19 02:19:54.410976
1597	320	4	1	2025-07-19 02:19:54.410976	2025-07-19 02:19:54.410976
1598	320	5	1	2025-07-19 02:19:54.410976	2025-07-19 02:19:54.410976
1599	321	1	2	2025-07-19 02:19:54.569824	2025-07-19 02:19:54.569824
1600	321	2	2	2025-07-19 02:19:54.569824	2025-07-19 02:19:54.569824
1601	321	3	2	2025-07-19 02:19:54.569824	2025-07-19 02:19:54.569824
1602	321	4	2	2025-07-19 02:19:54.569824	2025-07-19 02:19:54.569824
1603	321	5	2	2025-07-19 02:19:54.569824	2025-07-19 02:19:54.569824
1604	322	1	2	2025-07-19 02:19:54.742911	2025-07-19 02:19:54.742911
1605	322	2	2	2025-07-19 02:19:54.742911	2025-07-19 02:19:54.742911
1606	322	3	2	2025-07-19 02:19:54.742911	2025-07-19 02:19:54.742911
1607	322	4	2	2025-07-19 02:19:54.742911	2025-07-19 02:19:54.742911
1608	322	5	2	2025-07-19 02:19:54.742911	2025-07-19 02:19:54.742911
1609	323	1	2	2025-07-19 02:19:54.91098	2025-07-19 02:19:54.91098
1610	323	2	2	2025-07-19 02:19:54.91098	2025-07-19 02:19:54.91098
1611	323	3	2	2025-07-19 02:19:54.91098	2025-07-19 02:19:54.91098
1612	323	4	2	2025-07-19 02:19:54.91098	2025-07-19 02:19:54.91098
1613	323	5	2	2025-07-19 02:19:54.91098	2025-07-19 02:19:54.91098
1614	324	1	2	2025-07-19 02:19:55.089812	2025-07-19 02:19:55.089812
1615	324	2	2	2025-07-19 02:19:55.089812	2025-07-19 02:19:55.089812
1616	324	3	2	2025-07-19 02:19:55.089812	2025-07-19 02:19:55.089812
1617	324	4	2	2025-07-19 02:19:55.089812	2025-07-19 02:19:55.089812
1618	324	5	2	2025-07-19 02:19:55.089812	2025-07-19 02:19:55.089812
1619	325	1	2	2025-07-19 02:19:55.25363	2025-07-19 02:19:55.25363
1620	325	2	2	2025-07-19 02:19:55.25363	2025-07-19 02:19:55.25363
1621	325	3	2	2025-07-19 02:19:55.25363	2025-07-19 02:19:55.25363
1622	325	4	2	2025-07-19 02:19:55.25363	2025-07-19 02:19:55.25363
1623	325	5	2	2025-07-19 02:19:55.25363	2025-07-19 02:19:55.25363
1624	326	1	5	2025-07-19 02:19:55.417876	2025-07-19 02:19:55.417876
1625	326	2	5	2025-07-19 02:19:55.417876	2025-07-19 02:19:55.417876
1626	326	3	5	2025-07-19 02:19:55.417876	2025-07-19 02:19:55.417876
1627	326	4	5	2025-07-19 02:19:55.417876	2025-07-19 02:19:55.417876
1628	326	5	5	2025-07-19 02:19:55.417876	2025-07-19 02:19:55.417876
1629	327	1	2	2025-07-19 02:19:55.572548	2025-07-19 02:19:55.572548
1630	327	2	2	2025-07-19 02:19:55.572548	2025-07-19 02:19:55.572548
1631	327	3	2	2025-07-19 02:19:55.572548	2025-07-19 02:19:55.572548
1632	327	4	2	2025-07-19 02:19:55.572548	2025-07-19 02:19:55.572548
1633	327	5	2	2025-07-19 02:19:55.572548	2025-07-19 02:19:55.572548
1634	328	1	2	2025-07-19 02:19:55.738003	2025-07-19 02:19:55.738003
1635	328	2	2	2025-07-19 02:19:55.738003	2025-07-19 02:19:55.738003
1636	328	3	2	2025-07-19 02:19:55.738003	2025-07-19 02:19:55.738003
1637	328	4	2	2025-07-19 02:19:55.738003	2025-07-19 02:19:55.738003
1638	328	5	2	2025-07-19 02:19:55.738003	2025-07-19 02:19:55.738003
1639	329	1	2	2025-07-19 02:19:55.917678	2025-07-19 02:19:55.917678
1640	329	2	2	2025-07-19 02:19:55.917678	2025-07-19 02:19:55.917678
1641	329	3	2	2025-07-19 02:19:55.917678	2025-07-19 02:19:55.917678
1642	329	4	2	2025-07-19 02:19:55.917678	2025-07-19 02:19:55.917678
1643	329	5	2	2025-07-19 02:19:55.917678	2025-07-19 02:19:55.917678
1644	330	1	2	2025-07-19 02:19:56.081814	2025-07-19 02:19:56.081814
1645	330	2	2	2025-07-19 02:19:56.081814	2025-07-19 02:19:56.081814
1646	330	3	2	2025-07-19 02:19:56.081814	2025-07-19 02:19:56.081814
1647	330	4	2	2025-07-19 02:19:56.081814	2025-07-19 02:19:56.081814
1648	330	5	2	2025-07-19 02:19:56.081814	2025-07-19 02:19:56.081814
1649	331	1	2	2025-07-19 02:19:56.240671	2025-07-19 02:19:56.240671
1650	331	2	2	2025-07-19 02:19:56.240671	2025-07-19 02:19:56.240671
1651	331	3	2	2025-07-19 02:19:56.240671	2025-07-19 02:19:56.240671
1652	331	4	2	2025-07-19 02:19:56.240671	2025-07-19 02:19:56.240671
1653	331	5	2	2025-07-19 02:19:56.240671	2025-07-19 02:19:56.240671
1654	332	1	2	2025-07-19 02:19:56.482516	2025-07-19 02:19:56.482516
1655	332	2	2	2025-07-19 02:19:56.482516	2025-07-19 02:19:56.482516
1656	332	3	2	2025-07-19 02:19:56.482516	2025-07-19 02:19:56.482516
1657	332	4	2	2025-07-19 02:19:56.482516	2025-07-19 02:19:56.482516
1658	332	5	2	2025-07-19 02:19:56.482516	2025-07-19 02:19:56.482516
1659	333	1	2	2025-07-19 02:19:56.694612	2025-07-19 02:19:56.694612
1660	333	2	2	2025-07-19 02:19:56.694612	2025-07-19 02:19:56.694612
1661	333	3	2	2025-07-19 02:19:56.694612	2025-07-19 02:19:56.694612
1662	333	4	2	2025-07-19 02:19:56.694612	2025-07-19 02:19:56.694612
1663	333	5	2	2025-07-19 02:19:56.694612	2025-07-19 02:19:56.694612
1664	334	1	2	2025-07-19 02:19:56.893685	2025-07-19 02:19:56.893685
1665	334	2	2	2025-07-19 02:19:56.893685	2025-07-19 02:19:56.893685
1666	334	3	2	2025-07-19 02:19:56.893685	2025-07-19 02:19:56.893685
1667	334	4	2	2025-07-19 02:19:56.893685	2025-07-19 02:19:56.893685
1668	334	5	2	2025-07-19 02:19:56.893685	2025-07-19 02:19:56.893685
1669	335	1	2	2025-07-19 02:19:57.119474	2025-07-19 02:19:57.119474
1670	335	2	2	2025-07-19 02:19:57.119474	2025-07-19 02:19:57.119474
1671	335	3	2	2025-07-19 02:19:57.119474	2025-07-19 02:19:57.119474
1672	335	4	2	2025-07-19 02:19:57.119474	2025-07-19 02:19:57.119474
1673	335	5	2	2025-07-19 02:19:57.119474	2025-07-19 02:19:57.119474
1674	336	1	2	2025-07-19 02:19:57.340649	2025-07-19 02:19:57.340649
1675	336	2	2	2025-07-19 02:19:57.340649	2025-07-19 02:19:57.340649
1676	336	3	2	2025-07-19 02:19:57.340649	2025-07-19 02:19:57.340649
1677	336	4	2	2025-07-19 02:19:57.340649	2025-07-19 02:19:57.340649
1678	336	5	2	2025-07-19 02:19:57.340649	2025-07-19 02:19:57.340649
1679	337	1	2	2025-07-19 02:19:57.535496	2025-07-19 02:19:57.535496
1680	337	2	2	2025-07-19 02:19:57.535496	2025-07-19 02:19:57.535496
1681	337	3	2	2025-07-19 02:19:57.535496	2025-07-19 02:19:57.535496
1682	337	4	2	2025-07-19 02:19:57.535496	2025-07-19 02:19:57.535496
1683	337	5	2	2025-07-19 02:19:57.535496	2025-07-19 02:19:57.535496
1684	338	1	2	2025-07-19 02:19:57.739236	2025-07-19 02:19:57.739236
1685	338	2	2	2025-07-19 02:19:57.739236	2025-07-19 02:19:57.739236
1686	338	3	2	2025-07-19 02:19:57.739236	2025-07-19 02:19:57.739236
1687	338	4	2	2025-07-19 02:19:57.739236	2025-07-19 02:19:57.739236
1688	338	5	2	2025-07-19 02:19:57.739236	2025-07-19 02:19:57.739236
1689	339	1	2	2025-07-19 02:19:57.939121	2025-07-19 02:19:57.939121
1690	339	2	2	2025-07-19 02:19:57.939121	2025-07-19 02:19:57.939121
1691	339	3	2	2025-07-19 02:19:57.939121	2025-07-19 02:19:57.939121
1692	339	4	2	2025-07-19 02:19:57.939121	2025-07-19 02:19:57.939121
1693	339	5	2	2025-07-19 02:19:57.939121	2025-07-19 02:19:57.939121
1694	340	1	2	2025-07-19 02:19:58.172661	2025-07-19 02:19:58.172661
1695	340	2	2	2025-07-19 02:19:58.172661	2025-07-19 02:19:58.172661
1696	340	3	2	2025-07-19 02:19:58.172661	2025-07-19 02:19:58.172661
1697	340	4	2	2025-07-19 02:19:58.172661	2025-07-19 02:19:58.172661
1698	340	5	2	2025-07-19 02:19:58.172661	2025-07-19 02:19:58.172661
1699	341	1	2	2025-07-19 02:19:58.375282	2025-07-19 02:19:58.375282
1700	341	2	2	2025-07-19 02:19:58.375282	2025-07-19 02:19:58.375282
1701	341	3	2	2025-07-19 02:19:58.375282	2025-07-19 02:19:58.375282
1702	341	4	2	2025-07-19 02:19:58.375282	2025-07-19 02:19:58.375282
1703	341	5	2	2025-07-19 02:19:58.375282	2025-07-19 02:19:58.375282
1704	342	1	2	2025-07-19 02:19:58.577048	2025-07-19 02:19:58.577048
1705	342	2	2	2025-07-19 02:19:58.577048	2025-07-19 02:19:58.577048
1706	342	3	2	2025-07-19 02:19:58.577048	2025-07-19 02:19:58.577048
1707	342	4	2	2025-07-19 02:19:58.577048	2025-07-19 02:19:58.577048
1708	342	5	2	2025-07-19 02:19:58.577048	2025-07-19 02:19:58.577048
1709	343	1	2	2025-07-19 02:19:58.794184	2025-07-19 02:19:58.794184
1710	343	2	2	2025-07-19 02:19:58.794184	2025-07-19 02:19:58.794184
1711	343	3	2	2025-07-19 02:19:58.794184	2025-07-19 02:19:58.794184
1712	343	4	2	2025-07-19 02:19:58.794184	2025-07-19 02:19:58.794184
1713	343	5	2	2025-07-19 02:19:58.794184	2025-07-19 02:19:58.794184
1714	344	1	2	2025-07-19 02:19:59.003528	2025-07-19 02:19:59.003528
1715	344	2	2	2025-07-19 02:19:59.003528	2025-07-19 02:19:59.003528
1716	344	3	2	2025-07-19 02:19:59.003528	2025-07-19 02:19:59.003528
1717	344	4	2	2025-07-19 02:19:59.003528	2025-07-19 02:19:59.003528
1718	344	5	2	2025-07-19 02:19:59.003528	2025-07-19 02:19:59.003528
1719	345	1	1	2025-07-19 02:19:59.192665	2025-07-19 02:19:59.192665
1720	345	2	1	2025-07-19 02:19:59.192665	2025-07-19 02:19:59.192665
1721	345	3	1	2025-07-19 02:19:59.192665	2025-07-19 02:19:59.192665
1722	345	4	1	2025-07-19 02:19:59.192665	2025-07-19 02:19:59.192665
1723	345	5	1	2025-07-19 02:19:59.192665	2025-07-19 02:19:59.192665
1724	346	1	2	2025-07-19 02:19:59.401708	2025-07-19 02:19:59.401708
1725	346	2	2	2025-07-19 02:19:59.401708	2025-07-19 02:19:59.401708
1726	346	3	2	2025-07-19 02:19:59.401708	2025-07-19 02:19:59.401708
1727	346	4	2	2025-07-19 02:19:59.401708	2025-07-19 02:19:59.401708
1728	346	5	2	2025-07-19 02:19:59.401708	2025-07-19 02:19:59.401708
1729	347	1	2	2025-07-19 02:19:59.583624	2025-07-19 02:19:59.583624
1730	347	2	2	2025-07-19 02:19:59.583624	2025-07-19 02:19:59.583624
1731	347	3	2	2025-07-19 02:19:59.583624	2025-07-19 02:19:59.583624
1732	347	4	2	2025-07-19 02:19:59.583624	2025-07-19 02:19:59.583624
1733	347	5	2	2025-07-19 02:19:59.583624	2025-07-19 02:19:59.583624
1734	348	1	2	2025-07-19 02:19:59.767562	2025-07-19 02:19:59.767562
1735	348	2	2	2025-07-19 02:19:59.767562	2025-07-19 02:19:59.767562
1736	348	3	2	2025-07-19 02:19:59.767562	2025-07-19 02:19:59.767562
1737	348	4	2	2025-07-19 02:19:59.767562	2025-07-19 02:19:59.767562
1738	348	5	2	2025-07-19 02:19:59.767562	2025-07-19 02:19:59.767562
1739	349	1	2	2025-07-19 02:19:59.943233	2025-07-19 02:19:59.943233
1740	349	2	2	2025-07-19 02:19:59.943233	2025-07-19 02:19:59.943233
1741	349	3	2	2025-07-19 02:19:59.943233	2025-07-19 02:19:59.943233
1742	349	4	2	2025-07-19 02:19:59.943233	2025-07-19 02:19:59.943233
1743	349	5	2	2025-07-19 02:19:59.943233	2025-07-19 02:19:59.943233
1744	350	1	2	2025-07-19 02:20:00.134275	2025-07-19 02:20:00.134275
1745	350	2	2	2025-07-19 02:20:00.134275	2025-07-19 02:20:00.134275
1746	350	3	2	2025-07-19 02:20:00.134275	2025-07-19 02:20:00.134275
1747	350	4	2	2025-07-19 02:20:00.134275	2025-07-19 02:20:00.134275
1748	350	5	2	2025-07-19 02:20:00.134275	2025-07-19 02:20:00.134275
1749	351	1	2	2025-07-19 02:20:00.315242	2025-07-19 02:20:00.315242
1750	351	2	2	2025-07-19 02:20:00.315242	2025-07-19 02:20:00.315242
1751	351	3	2	2025-07-19 02:20:00.315242	2025-07-19 02:20:00.315242
1752	351	4	2	2025-07-19 02:20:00.315242	2025-07-19 02:20:00.315242
1753	351	5	2	2025-07-19 02:20:00.315242	2025-07-19 02:20:00.315242
1754	352	1	2	2025-07-19 02:20:00.488087	2025-07-19 02:20:00.488087
1755	352	2	2	2025-07-19 02:20:00.488087	2025-07-19 02:20:00.488087
1756	352	3	2	2025-07-19 02:20:00.488087	2025-07-19 02:20:00.488087
1757	352	4	2	2025-07-19 02:20:00.488087	2025-07-19 02:20:00.488087
1758	352	5	2	2025-07-19 02:20:00.488087	2025-07-19 02:20:00.488087
1759	353	1	2	2025-07-19 02:20:00.666369	2025-07-19 02:20:00.666369
1760	353	2	2	2025-07-19 02:20:00.666369	2025-07-19 02:20:00.666369
1761	353	3	2	2025-07-19 02:20:00.666369	2025-07-19 02:20:00.666369
1762	353	4	2	2025-07-19 02:20:00.666369	2025-07-19 02:20:00.666369
1763	353	5	2	2025-07-19 02:20:00.666369	2025-07-19 02:20:00.666369
1764	354	1	1	2025-07-19 02:20:00.853808	2025-07-19 02:20:00.853808
1765	354	2	1	2025-07-19 02:20:00.853808	2025-07-19 02:20:00.853808
1766	354	3	1	2025-07-19 02:20:00.853808	2025-07-19 02:20:00.853808
1767	354	4	1	2025-07-19 02:20:00.853808	2025-07-19 02:20:00.853808
1768	354	5	1	2025-07-19 02:20:00.853808	2025-07-19 02:20:00.853808
1769	355	1	2	2025-07-19 02:20:01.037295	2025-07-19 02:20:01.037295
1770	355	2	2	2025-07-19 02:20:01.037295	2025-07-19 02:20:01.037295
1771	355	3	2	2025-07-19 02:20:01.037295	2025-07-19 02:20:01.037295
1772	355	4	2	2025-07-19 02:20:01.037295	2025-07-19 02:20:01.037295
1773	355	5	2	2025-07-19 02:20:01.037295	2025-07-19 02:20:01.037295
1774	356	1	2	2025-07-19 02:20:01.212029	2025-07-19 02:20:01.212029
1775	356	2	2	2025-07-19 02:20:01.212029	2025-07-19 02:20:01.212029
1776	356	3	2	2025-07-19 02:20:01.212029	2025-07-19 02:20:01.212029
1777	356	4	2	2025-07-19 02:20:01.212029	2025-07-19 02:20:01.212029
1778	356	5	2	2025-07-19 02:20:01.212029	2025-07-19 02:20:01.212029
1779	357	1	2	2025-07-19 02:20:01.395147	2025-07-19 02:20:01.395147
1780	357	2	2	2025-07-19 02:20:01.395147	2025-07-19 02:20:01.395147
1781	357	3	2	2025-07-19 02:20:01.395147	2025-07-19 02:20:01.395147
1782	357	4	2	2025-07-19 02:20:01.395147	2025-07-19 02:20:01.395147
1783	357	5	2	2025-07-19 02:20:01.395147	2025-07-19 02:20:01.395147
1784	358	1	2	2025-07-19 02:20:01.598881	2025-07-19 02:20:01.598881
1785	358	2	2	2025-07-19 02:20:01.598881	2025-07-19 02:20:01.598881
1786	358	3	2	2025-07-19 02:20:01.598881	2025-07-19 02:20:01.598881
1787	358	4	2	2025-07-19 02:20:01.598881	2025-07-19 02:20:01.598881
1788	358	5	2	2025-07-19 02:20:01.598881	2025-07-19 02:20:01.598881
1789	359	1	2	2025-07-19 02:20:01.794678	2025-07-19 02:20:01.794678
1790	359	2	2	2025-07-19 02:20:01.794678	2025-07-19 02:20:01.794678
1791	359	3	2	2025-07-19 02:20:01.794678	2025-07-19 02:20:01.794678
1792	359	4	2	2025-07-19 02:20:01.794678	2025-07-19 02:20:01.794678
1793	359	5	2	2025-07-19 02:20:01.794678	2025-07-19 02:20:01.794678
1794	360	1	2	2025-07-19 02:20:01.978901	2025-07-19 02:20:01.978901
1795	360	2	2	2025-07-19 02:20:01.978901	2025-07-19 02:20:01.978901
1796	360	3	2	2025-07-19 02:20:01.978901	2025-07-19 02:20:01.978901
1797	360	4	2	2025-07-19 02:20:01.978901	2025-07-19 02:20:01.978901
1798	360	5	2	2025-07-19 02:20:01.978901	2025-07-19 02:20:01.978901
1799	361	1	2	2025-07-19 02:20:02.190986	2025-07-19 02:20:02.190986
1800	361	2	2	2025-07-19 02:20:02.190986	2025-07-19 02:20:02.190986
1801	361	3	2	2025-07-19 02:20:02.190986	2025-07-19 02:20:02.190986
1802	361	4	2	2025-07-19 02:20:02.190986	2025-07-19 02:20:02.190986
1803	361	5	2	2025-07-19 02:20:02.190986	2025-07-19 02:20:02.190986
1804	362	1	2	2025-07-19 02:20:02.885891	2025-07-19 02:20:02.885891
1805	362	2	2	2025-07-19 02:20:02.885891	2025-07-19 02:20:02.885891
1806	362	3	2	2025-07-19 02:20:02.885891	2025-07-19 02:20:02.885891
1807	362	4	2	2025-07-19 02:20:02.885891	2025-07-19 02:20:02.885891
1808	362	5	2	2025-07-19 02:20:02.885891	2025-07-19 02:20:02.885891
1809	363	1	2	2025-07-19 02:20:03.129132	2025-07-19 02:20:03.129132
1810	363	2	2	2025-07-19 02:20:03.129132	2025-07-19 02:20:03.129132
1811	363	3	2	2025-07-19 02:20:03.129132	2025-07-19 02:20:03.129132
1812	363	4	2	2025-07-19 02:20:03.129132	2025-07-19 02:20:03.129132
1813	363	5	2	2025-07-19 02:20:03.129132	2025-07-19 02:20:03.129132
1814	364	1	2	2025-07-19 02:20:03.320107	2025-07-19 02:20:03.320107
1815	364	2	2	2025-07-19 02:20:03.320107	2025-07-19 02:20:03.320107
1816	364	3	2	2025-07-19 02:20:03.320107	2025-07-19 02:20:03.320107
1817	364	4	2	2025-07-19 02:20:03.320107	2025-07-19 02:20:03.320107
1818	364	5	2	2025-07-19 02:20:03.320107	2025-07-19 02:20:03.320107
1819	365	1	2	2025-07-19 02:20:03.524207	2025-07-19 02:20:03.524207
1820	365	2	2	2025-07-19 02:20:03.524207	2025-07-19 02:20:03.524207
1821	365	3	2	2025-07-19 02:20:03.524207	2025-07-19 02:20:03.524207
1822	365	4	2	2025-07-19 02:20:03.524207	2025-07-19 02:20:03.524207
1823	365	5	2	2025-07-19 02:20:03.524207	2025-07-19 02:20:03.524207
1824	366	1	2	2025-07-19 02:20:03.744565	2025-07-19 02:20:03.744565
1825	366	2	2	2025-07-19 02:20:03.744565	2025-07-19 02:20:03.744565
1826	366	3	2	2025-07-19 02:20:03.744565	2025-07-19 02:20:03.744565
1827	366	4	2	2025-07-19 02:20:03.744565	2025-07-19 02:20:03.744565
1828	366	5	2	2025-07-19 02:20:03.744565	2025-07-19 02:20:03.744565
1829	367	1	2	2025-07-19 02:20:03.954515	2025-07-19 02:20:03.954515
1830	367	2	2	2025-07-19 02:20:03.954515	2025-07-19 02:20:03.954515
1831	367	3	2	2025-07-19 02:20:03.954515	2025-07-19 02:20:03.954515
1832	367	4	2	2025-07-19 02:20:03.954515	2025-07-19 02:20:03.954515
1833	367	5	2	2025-07-19 02:20:03.954515	2025-07-19 02:20:03.954515
1834	368	1	2	2025-07-19 02:20:04.201974	2025-07-19 02:20:04.201974
1835	368	2	2	2025-07-19 02:20:04.201974	2025-07-19 02:20:04.201974
1836	368	3	2	2025-07-19 02:20:04.201974	2025-07-19 02:20:04.201974
1837	368	4	2	2025-07-19 02:20:04.201974	2025-07-19 02:20:04.201974
1838	368	5	2	2025-07-19 02:20:04.201974	2025-07-19 02:20:04.201974
1839	369	1	2	2025-07-19 02:20:04.514517	2025-07-19 02:20:04.514517
1840	369	2	2	2025-07-19 02:20:04.514517	2025-07-19 02:20:04.514517
1841	369	3	2	2025-07-19 02:20:04.514517	2025-07-19 02:20:04.514517
1842	369	4	2	2025-07-19 02:20:04.514517	2025-07-19 02:20:04.514517
1843	369	5	2	2025-07-19 02:20:04.514517	2025-07-19 02:20:04.514517
1844	370	1	2	2025-07-19 02:20:04.700041	2025-07-19 02:20:04.700041
1845	370	2	2	2025-07-19 02:20:04.700041	2025-07-19 02:20:04.700041
1846	370	3	2	2025-07-19 02:20:04.700041	2025-07-19 02:20:04.700041
1847	370	4	2	2025-07-19 02:20:04.700041	2025-07-19 02:20:04.700041
1848	370	5	2	2025-07-19 02:20:04.700041	2025-07-19 02:20:04.700041
1849	371	1	2	2025-07-19 02:20:04.899711	2025-07-19 02:20:04.899711
1850	371	2	2	2025-07-19 02:20:04.899711	2025-07-19 02:20:04.899711
1851	371	3	2	2025-07-19 02:20:04.899711	2025-07-19 02:20:04.899711
1852	371	4	2	2025-07-19 02:20:04.899711	2025-07-19 02:20:04.899711
1853	371	5	2	2025-07-19 02:20:04.899711	2025-07-19 02:20:04.899711
1854	372	1	2	2025-07-19 02:20:05.074225	2025-07-19 02:20:05.074225
1855	372	2	2	2025-07-19 02:20:05.074225	2025-07-19 02:20:05.074225
1856	372	3	2	2025-07-19 02:20:05.074225	2025-07-19 02:20:05.074225
1857	372	4	2	2025-07-19 02:20:05.074225	2025-07-19 02:20:05.074225
1858	372	5	2	2025-07-19 02:20:05.074225	2025-07-19 02:20:05.074225
1859	373	1	2	2025-07-19 02:20:05.262798	2025-07-19 02:20:05.262798
1860	373	2	2	2025-07-19 02:20:05.262798	2025-07-19 02:20:05.262798
1861	373	3	2	2025-07-19 02:20:05.262798	2025-07-19 02:20:05.262798
1862	373	4	2	2025-07-19 02:20:05.262798	2025-07-19 02:20:05.262798
1863	373	5	2	2025-07-19 02:20:05.262798	2025-07-19 02:20:05.262798
1864	374	1	1	2025-07-19 02:20:05.447687	2025-07-19 02:20:05.447687
1865	374	2	1	2025-07-19 02:20:05.447687	2025-07-19 02:20:05.447687
1866	374	3	1	2025-07-19 02:20:05.447687	2025-07-19 02:20:05.447687
1867	374	4	1	2025-07-19 02:20:05.447687	2025-07-19 02:20:05.447687
1868	374	5	1	2025-07-19 02:20:05.447687	2025-07-19 02:20:05.447687
1869	375	1	2	2025-07-19 02:20:05.629428	2025-07-19 02:20:05.629428
1870	375	2	2	2025-07-19 02:20:05.629428	2025-07-19 02:20:05.629428
1871	375	3	2	2025-07-19 02:20:05.629428	2025-07-19 02:20:05.629428
1872	375	4	2	2025-07-19 02:20:05.629428	2025-07-19 02:20:05.629428
1873	375	5	2	2025-07-19 02:20:05.629428	2025-07-19 02:20:05.629428
1874	376	1	2	2025-07-19 02:20:05.808415	2025-07-19 02:20:05.808415
1875	376	2	2	2025-07-19 02:20:05.808415	2025-07-19 02:20:05.808415
1876	376	3	2	2025-07-19 02:20:05.808415	2025-07-19 02:20:05.808415
1877	376	4	2	2025-07-19 02:20:05.808415	2025-07-19 02:20:05.808415
1878	376	5	2	2025-07-19 02:20:05.808415	2025-07-19 02:20:05.808415
1879	377	1	2	2025-07-19 02:20:05.985338	2025-07-19 02:20:05.985338
1880	377	2	2	2025-07-19 02:20:05.985338	2025-07-19 02:20:05.985338
1881	377	3	2	2025-07-19 02:20:05.985338	2025-07-19 02:20:05.985338
1882	377	4	2	2025-07-19 02:20:05.985338	2025-07-19 02:20:05.985338
1883	377	5	2	2025-07-19 02:20:05.985338	2025-07-19 02:20:05.985338
1884	378	1	2	2025-07-19 02:20:06.173879	2025-07-19 02:20:06.173879
1885	378	2	2	2025-07-19 02:20:06.173879	2025-07-19 02:20:06.173879
1886	378	3	2	2025-07-19 02:20:06.173879	2025-07-19 02:20:06.173879
1887	378	4	2	2025-07-19 02:20:06.173879	2025-07-19 02:20:06.173879
1888	378	5	2	2025-07-19 02:20:06.173879	2025-07-19 02:20:06.173879
1889	379	1	2	2025-07-19 02:20:06.353265	2025-07-19 02:20:06.353265
1890	379	2	2	2025-07-19 02:20:06.353265	2025-07-19 02:20:06.353265
1891	379	3	2	2025-07-19 02:20:06.353265	2025-07-19 02:20:06.353265
1892	379	4	2	2025-07-19 02:20:06.353265	2025-07-19 02:20:06.353265
1893	379	5	2	2025-07-19 02:20:06.353265	2025-07-19 02:20:06.353265
1894	380	1	2	2025-07-19 02:20:06.537444	2025-07-19 02:20:06.537444
1895	380	2	2	2025-07-19 02:20:06.537444	2025-07-19 02:20:06.537444
1896	380	3	2	2025-07-19 02:20:06.537444	2025-07-19 02:20:06.537444
1897	380	4	2	2025-07-19 02:20:06.537444	2025-07-19 02:20:06.537444
1898	380	5	2	2025-07-19 02:20:06.537444	2025-07-19 02:20:06.537444
1899	381	1	2	2025-07-19 02:20:06.728447	2025-07-19 02:20:06.728447
1900	381	2	2	2025-07-19 02:20:06.728447	2025-07-19 02:20:06.728447
1901	381	3	2	2025-07-19 02:20:06.728447	2025-07-19 02:20:06.728447
1902	381	4	2	2025-07-19 02:20:06.728447	2025-07-19 02:20:06.728447
1903	381	5	2	2025-07-19 02:20:06.728447	2025-07-19 02:20:06.728447
1904	382	1	2	2025-07-19 02:20:06.91752	2025-07-19 02:20:06.91752
1905	382	2	2	2025-07-19 02:20:06.91752	2025-07-19 02:20:06.91752
1906	382	3	2	2025-07-19 02:20:06.91752	2025-07-19 02:20:06.91752
1907	382	4	2	2025-07-19 02:20:06.91752	2025-07-19 02:20:06.91752
1908	382	5	2	2025-07-19 02:20:06.91752	2025-07-19 02:20:06.91752
1909	383	1	2	2025-07-19 02:20:07.107544	2025-07-19 02:20:07.107544
1910	383	2	2	2025-07-19 02:20:07.107544	2025-07-19 02:20:07.107544
1911	383	3	2	2025-07-19 02:20:07.107544	2025-07-19 02:20:07.107544
1912	383	4	2	2025-07-19 02:20:07.107544	2025-07-19 02:20:07.107544
1913	383	5	2	2025-07-19 02:20:07.107544	2025-07-19 02:20:07.107544
1914	384	1	2	2025-07-19 02:20:07.286931	2025-07-19 02:20:07.286931
1915	384	2	2	2025-07-19 02:20:07.286931	2025-07-19 02:20:07.286931
1916	384	3	2	2025-07-19 02:20:07.286931	2025-07-19 02:20:07.286931
1917	384	4	2	2025-07-19 02:20:07.286931	2025-07-19 02:20:07.286931
1918	384	5	2	2025-07-19 02:20:07.286931	2025-07-19 02:20:07.286931
1919	385	1	2	2025-07-19 02:20:07.487305	2025-07-19 02:20:07.487305
1920	385	2	2	2025-07-19 02:20:07.487305	2025-07-19 02:20:07.487305
1921	385	3	2	2025-07-19 02:20:07.487305	2025-07-19 02:20:07.487305
1922	385	4	2	2025-07-19 02:20:07.487305	2025-07-19 02:20:07.487305
1923	385	5	2	2025-07-19 02:20:07.487305	2025-07-19 02:20:07.487305
1924	386	1	2	2025-07-19 02:20:07.705152	2025-07-19 02:20:07.705152
1925	386	2	2	2025-07-19 02:20:07.705152	2025-07-19 02:20:07.705152
1926	386	3	2	2025-07-19 02:20:07.705152	2025-07-19 02:20:07.705152
1927	386	4	2	2025-07-19 02:20:07.705152	2025-07-19 02:20:07.705152
1928	386	5	2	2025-07-19 02:20:07.705152	2025-07-19 02:20:07.705152
1929	387	1	2	2025-07-19 02:20:07.924402	2025-07-19 02:20:07.924402
1930	387	2	2	2025-07-19 02:20:07.924402	2025-07-19 02:20:07.924402
1931	387	3	2	2025-07-19 02:20:07.924402	2025-07-19 02:20:07.924402
1932	387	4	2	2025-07-19 02:20:07.924402	2025-07-19 02:20:07.924402
1933	387	5	2	2025-07-19 02:20:07.924402	2025-07-19 02:20:07.924402
1934	388	1	2	2025-07-19 02:20:08.11944	2025-07-19 02:20:08.11944
1935	388	2	2	2025-07-19 02:20:08.11944	2025-07-19 02:20:08.11944
1936	388	3	2	2025-07-19 02:20:08.11944	2025-07-19 02:20:08.11944
1937	388	4	2	2025-07-19 02:20:08.11944	2025-07-19 02:20:08.11944
1938	388	5	2	2025-07-19 02:20:08.11944	2025-07-19 02:20:08.11944
1939	389	1	2	2025-07-19 02:20:08.351044	2025-07-19 02:20:08.351044
1940	389	2	2	2025-07-19 02:20:08.351044	2025-07-19 02:20:08.351044
1941	389	3	2	2025-07-19 02:20:08.351044	2025-07-19 02:20:08.351044
1942	389	4	2	2025-07-19 02:20:08.351044	2025-07-19 02:20:08.351044
1943	389	5	2	2025-07-19 02:20:08.351044	2025-07-19 02:20:08.351044
1944	390	1	2	2025-07-19 02:20:08.558834	2025-07-19 02:20:08.558834
1945	390	2	2	2025-07-19 02:20:08.558834	2025-07-19 02:20:08.558834
1946	390	3	2	2025-07-19 02:20:08.558834	2025-07-19 02:20:08.558834
1947	390	4	2	2025-07-19 02:20:08.558834	2025-07-19 02:20:08.558834
1948	390	5	2	2025-07-19 02:20:08.558834	2025-07-19 02:20:08.558834
1949	391	1	2	2025-07-19 02:20:08.741835	2025-07-19 02:20:08.741835
1950	391	2	2	2025-07-19 02:20:08.741835	2025-07-19 02:20:08.741835
1951	391	3	2	2025-07-19 02:20:08.741835	2025-07-19 02:20:08.741835
1952	391	4	2	2025-07-19 02:20:08.741835	2025-07-19 02:20:08.741835
1953	391	5	2	2025-07-19 02:20:08.741835	2025-07-19 02:20:08.741835
1954	392	1	2	2025-07-19 02:20:08.927444	2025-07-19 02:20:08.927444
1955	392	2	2	2025-07-19 02:20:08.927444	2025-07-19 02:20:08.927444
1956	392	3	2	2025-07-19 02:20:08.927444	2025-07-19 02:20:08.927444
1957	392	4	2	2025-07-19 02:20:08.927444	2025-07-19 02:20:08.927444
1958	392	5	2	2025-07-19 02:20:08.927444	2025-07-19 02:20:08.927444
1959	393	1	2	2025-07-19 02:20:09.112156	2025-07-19 02:20:09.112156
1960	393	2	2	2025-07-19 02:20:09.112156	2025-07-19 02:20:09.112156
1961	393	3	2	2025-07-19 02:20:09.112156	2025-07-19 02:20:09.112156
1962	393	4	2	2025-07-19 02:20:09.112156	2025-07-19 02:20:09.112156
1963	393	5	2	2025-07-19 02:20:09.112156	2025-07-19 02:20:09.112156
1964	394	1	2	2025-07-19 02:20:09.305929	2025-07-19 02:20:09.305929
1965	394	2	2	2025-07-19 02:20:09.305929	2025-07-19 02:20:09.305929
1966	394	3	2	2025-07-19 02:20:09.305929	2025-07-19 02:20:09.305929
1967	394	4	2	2025-07-19 02:20:09.305929	2025-07-19 02:20:09.305929
1968	394	5	2	2025-07-19 02:20:09.305929	2025-07-19 02:20:09.305929
1969	395	1	2	2025-07-19 02:20:09.485768	2025-07-19 02:20:09.485768
1970	395	2	2	2025-07-19 02:20:09.485768	2025-07-19 02:20:09.485768
1971	395	3	2	2025-07-19 02:20:09.485768	2025-07-19 02:20:09.485768
1972	395	4	2	2025-07-19 02:20:09.485768	2025-07-19 02:20:09.485768
1973	395	5	2	2025-07-19 02:20:09.485768	2025-07-19 02:20:09.485768
1974	396	1	2	2025-07-19 02:20:09.674792	2025-07-19 02:20:09.674792
1975	396	2	2	2025-07-19 02:20:09.674792	2025-07-19 02:20:09.674792
1976	396	3	2	2025-07-19 02:20:09.674792	2025-07-19 02:20:09.674792
1977	396	4	2	2025-07-19 02:20:09.674792	2025-07-19 02:20:09.674792
1978	396	5	2	2025-07-19 02:20:09.674792	2025-07-19 02:20:09.674792
1979	397	1	2	2025-07-19 02:20:09.853977	2025-07-19 02:20:09.853977
1980	397	2	2	2025-07-19 02:20:09.853977	2025-07-19 02:20:09.853977
1981	397	3	2	2025-07-19 02:20:09.853977	2025-07-19 02:20:09.853977
1982	397	4	2	2025-07-19 02:20:09.853977	2025-07-19 02:20:09.853977
1983	397	5	2	2025-07-19 02:20:09.853977	2025-07-19 02:20:09.853977
1984	398	1	2	2025-07-19 02:20:10.047405	2025-07-19 02:20:10.047405
1985	398	2	2	2025-07-19 02:20:10.047405	2025-07-19 02:20:10.047405
1986	398	3	2	2025-07-19 02:20:10.047405	2025-07-19 02:20:10.047405
1987	398	4	2	2025-07-19 02:20:10.047405	2025-07-19 02:20:10.047405
1988	398	5	2	2025-07-19 02:20:10.047405	2025-07-19 02:20:10.047405
1989	399	1	2	2025-07-19 02:20:10.225457	2025-07-19 02:20:10.225457
1990	399	2	2	2025-07-19 02:20:10.225457	2025-07-19 02:20:10.225457
1991	399	3	2	2025-07-19 02:20:10.225457	2025-07-19 02:20:10.225457
1992	399	4	2	2025-07-19 02:20:10.225457	2025-07-19 02:20:10.225457
1993	399	5	2	2025-07-19 02:20:10.225457	2025-07-19 02:20:10.225457
1994	400	1	2	2025-07-19 02:20:10.407403	2025-07-19 02:20:10.407403
1995	400	2	2	2025-07-19 02:20:10.407403	2025-07-19 02:20:10.407403
1996	400	3	2	2025-07-19 02:20:10.407403	2025-07-19 02:20:10.407403
1997	400	4	2	2025-07-19 02:20:10.407403	2025-07-19 02:20:10.407403
1998	400	5	2	2025-07-19 02:20:10.407403	2025-07-19 02:20:10.407403
1999	401	1	1	2025-07-19 02:20:10.604447	2025-07-19 02:20:10.604447
2000	401	2	1	2025-07-19 02:20:10.604447	2025-07-19 02:20:10.604447
2001	401	3	1	2025-07-19 02:20:10.604447	2025-07-19 02:20:10.604447
2002	401	4	1	2025-07-19 02:20:10.604447	2025-07-19 02:20:10.604447
2003	401	5	1	2025-07-19 02:20:10.604447	2025-07-19 02:20:10.604447
2004	402	1	2	2025-07-19 02:20:10.784358	2025-07-19 02:20:10.784358
2005	402	2	2	2025-07-19 02:20:10.784358	2025-07-19 02:20:10.784358
2006	402	3	2	2025-07-19 02:20:10.784358	2025-07-19 02:20:10.784358
2007	402	4	2	2025-07-19 02:20:10.784358	2025-07-19 02:20:10.784358
2008	402	5	2	2025-07-19 02:20:10.784358	2025-07-19 02:20:10.784358
2009	403	1	2	2025-07-19 02:20:11.042276	2025-07-19 02:20:11.042276
2010	403	2	2	2025-07-19 02:20:11.042276	2025-07-19 02:20:11.042276
2011	403	3	2	2025-07-19 02:20:11.042276	2025-07-19 02:20:11.042276
2012	403	4	2	2025-07-19 02:20:11.042276	2025-07-19 02:20:11.042276
2013	403	5	2	2025-07-19 02:20:11.042276	2025-07-19 02:20:11.042276
2014	404	1	2	2025-07-19 02:20:11.237556	2025-07-19 02:20:11.237556
2015	404	2	2	2025-07-19 02:20:11.237556	2025-07-19 02:20:11.237556
2016	404	3	2	2025-07-19 02:20:11.237556	2025-07-19 02:20:11.237556
2017	404	4	2	2025-07-19 02:20:11.237556	2025-07-19 02:20:11.237556
2018	404	5	2	2025-07-19 02:20:11.237556	2025-07-19 02:20:11.237556
2019	405	1	2	2025-07-19 02:20:11.421785	2025-07-19 02:20:11.421785
2020	405	2	2	2025-07-19 02:20:11.421785	2025-07-19 02:20:11.421785
2021	405	3	2	2025-07-19 02:20:11.421785	2025-07-19 02:20:11.421785
2022	405	4	2	2025-07-19 02:20:11.421785	2025-07-19 02:20:11.421785
2023	405	5	2	2025-07-19 02:20:11.421785	2025-07-19 02:20:11.421785
2024	406	1	2	2025-07-19 02:20:11.61924	2025-07-19 02:20:11.61924
2025	406	2	2	2025-07-19 02:20:11.61924	2025-07-19 02:20:11.61924
2026	406	3	2	2025-07-19 02:20:11.61924	2025-07-19 02:20:11.61924
2027	406	4	2	2025-07-19 02:20:11.61924	2025-07-19 02:20:11.61924
2028	406	5	2	2025-07-19 02:20:11.61924	2025-07-19 02:20:11.61924
2029	407	1	2	2025-07-19 02:20:11.795515	2025-07-19 02:20:11.795515
2030	407	2	2	2025-07-19 02:20:11.795515	2025-07-19 02:20:11.795515
2031	407	3	2	2025-07-19 02:20:11.795515	2025-07-19 02:20:11.795515
2032	407	4	2	2025-07-19 02:20:11.795515	2025-07-19 02:20:11.795515
2033	407	5	2	2025-07-19 02:20:11.795515	2025-07-19 02:20:11.795515
2034	408	1	2	2025-07-19 02:20:12.006273	2025-07-19 02:20:12.006273
2035	408	2	2	2025-07-19 02:20:12.006273	2025-07-19 02:20:12.006273
2036	408	3	2	2025-07-19 02:20:12.006273	2025-07-19 02:20:12.006273
2037	408	4	2	2025-07-19 02:20:12.006273	2025-07-19 02:20:12.006273
2038	408	5	2	2025-07-19 02:20:12.006273	2025-07-19 02:20:12.006273
2039	409	1	2	2025-07-19 02:20:12.199461	2025-07-19 02:20:12.199461
2040	409	2	2	2025-07-19 02:20:12.199461	2025-07-19 02:20:12.199461
2041	409	3	2	2025-07-19 02:20:12.199461	2025-07-19 02:20:12.199461
2042	409	4	2	2025-07-19 02:20:12.199461	2025-07-19 02:20:12.199461
2043	409	5	2	2025-07-19 02:20:12.199461	2025-07-19 02:20:12.199461
2044	410	1	2	2025-07-19 02:20:12.381113	2025-07-19 02:20:12.381113
2045	410	2	2	2025-07-19 02:20:12.381113	2025-07-19 02:20:12.381113
2046	410	3	2	2025-07-19 02:20:12.381113	2025-07-19 02:20:12.381113
2047	410	4	2	2025-07-19 02:20:12.381113	2025-07-19 02:20:12.381113
2048	410	5	2	2025-07-19 02:20:12.381113	2025-07-19 02:20:12.381113
2049	411	1	2	2025-07-19 02:20:12.580062	2025-07-19 02:20:12.580062
2050	411	2	2	2025-07-19 02:20:12.580062	2025-07-19 02:20:12.580062
2051	411	3	2	2025-07-19 02:20:12.580062	2025-07-19 02:20:12.580062
2052	411	4	2	2025-07-19 02:20:12.580062	2025-07-19 02:20:12.580062
2053	411	5	2	2025-07-19 02:20:12.580062	2025-07-19 02:20:12.580062
2054	412	1	2	2025-07-19 02:20:12.760152	2025-07-19 02:20:12.760152
2055	412	2	2	2025-07-19 02:20:12.760152	2025-07-19 02:20:12.760152
2056	412	3	2	2025-07-19 02:20:12.760152	2025-07-19 02:20:12.760152
2057	412	4	2	2025-07-19 02:20:12.760152	2025-07-19 02:20:12.760152
2058	412	5	2	2025-07-19 02:20:12.760152	2025-07-19 02:20:12.760152
2059	413	1	2	2025-07-19 02:20:12.94691	2025-07-19 02:20:12.94691
2060	413	2	2	2025-07-19 02:20:12.94691	2025-07-19 02:20:12.94691
2061	413	3	2	2025-07-19 02:20:12.94691	2025-07-19 02:20:12.94691
2062	413	4	2	2025-07-19 02:20:12.94691	2025-07-19 02:20:12.94691
2063	413	5	2	2025-07-19 02:20:12.94691	2025-07-19 02:20:12.94691
2064	414	1	2	2025-07-19 02:20:13.122581	2025-07-19 02:20:13.122581
2065	414	2	2	2025-07-19 02:20:13.122581	2025-07-19 02:20:13.122581
2066	414	3	2	2025-07-19 02:20:13.122581	2025-07-19 02:20:13.122581
2067	414	4	2	2025-07-19 02:20:13.122581	2025-07-19 02:20:13.122581
2068	414	5	2	2025-07-19 02:20:13.122581	2025-07-19 02:20:13.122581
2069	415	1	2	2025-07-19 02:20:13.316391	2025-07-19 02:20:13.316391
2070	415	2	2	2025-07-19 02:20:13.316391	2025-07-19 02:20:13.316391
2071	415	3	2	2025-07-19 02:20:13.316391	2025-07-19 02:20:13.316391
2072	415	4	2	2025-07-19 02:20:13.316391	2025-07-19 02:20:13.316391
2073	415	5	2	2025-07-19 02:20:13.316391	2025-07-19 02:20:13.316391
2074	416	1	2	2025-07-19 02:20:13.540292	2025-07-19 02:20:13.540292
2075	416	2	2	2025-07-19 02:20:13.540292	2025-07-19 02:20:13.540292
2076	416	3	2	2025-07-19 02:20:13.540292	2025-07-19 02:20:13.540292
2077	416	4	2	2025-07-19 02:20:13.540292	2025-07-19 02:20:13.540292
2078	416	5	2	2025-07-19 02:20:13.540292	2025-07-19 02:20:13.540292
2079	417	1	2	2025-07-19 02:20:13.709357	2025-07-19 02:20:13.709357
2080	417	2	2	2025-07-19 02:20:13.709357	2025-07-19 02:20:13.709357
2081	417	3	2	2025-07-19 02:20:13.709357	2025-07-19 02:20:13.709357
2082	417	4	2	2025-07-19 02:20:13.709357	2025-07-19 02:20:13.709357
2083	417	5	2	2025-07-19 02:20:13.709357	2025-07-19 02:20:13.709357
2084	418	1	2	2025-07-19 02:20:13.89773	2025-07-19 02:20:13.89773
2085	418	2	2	2025-07-19 02:20:13.89773	2025-07-19 02:20:13.89773
2086	418	3	2	2025-07-19 02:20:13.89773	2025-07-19 02:20:13.89773
2087	418	4	2	2025-07-19 02:20:13.89773	2025-07-19 02:20:13.89773
2088	418	5	2	2025-07-19 02:20:13.89773	2025-07-19 02:20:13.89773
2089	419	1	2	2025-07-19 02:20:14.07902	2025-07-19 02:20:14.07902
2090	419	2	2	2025-07-19 02:20:14.07902	2025-07-19 02:20:14.07902
2091	419	3	2	2025-07-19 02:20:14.07902	2025-07-19 02:20:14.07902
2092	419	4	2	2025-07-19 02:20:14.07902	2025-07-19 02:20:14.07902
2093	419	5	2	2025-07-19 02:20:14.07902	2025-07-19 02:20:14.07902
2094	420	1	2	2025-07-19 02:20:14.269899	2025-07-19 02:20:14.269899
2095	420	2	2	2025-07-19 02:20:14.269899	2025-07-19 02:20:14.269899
2096	420	3	2	2025-07-19 02:20:14.269899	2025-07-19 02:20:14.269899
2097	420	4	2	2025-07-19 02:20:14.269899	2025-07-19 02:20:14.269899
2098	420	5	2	2025-07-19 02:20:14.269899	2025-07-19 02:20:14.269899
2099	421	1	2	2025-07-19 02:20:14.444821	2025-07-19 02:20:14.444821
2100	421	2	2	2025-07-19 02:20:14.444821	2025-07-19 02:20:14.444821
2101	421	3	2	2025-07-19 02:20:14.444821	2025-07-19 02:20:14.444821
2102	421	4	2	2025-07-19 02:20:14.444821	2025-07-19 02:20:14.444821
2103	421	5	2	2025-07-19 02:20:14.444821	2025-07-19 02:20:14.444821
2104	422	1	2	2025-07-19 02:20:14.62726	2025-07-19 02:20:14.62726
2105	422	2	2	2025-07-19 02:20:14.62726	2025-07-19 02:20:14.62726
2106	422	3	2	2025-07-19 02:20:14.62726	2025-07-19 02:20:14.62726
2107	422	4	2	2025-07-19 02:20:14.62726	2025-07-19 02:20:14.62726
2108	422	5	2	2025-07-19 02:20:14.62726	2025-07-19 02:20:14.62726
2109	423	1	2	2025-07-19 02:20:14.823225	2025-07-19 02:20:14.823225
2110	423	2	2	2025-07-19 02:20:14.823225	2025-07-19 02:20:14.823225
2111	423	3	2	2025-07-19 02:20:14.823225	2025-07-19 02:20:14.823225
2112	423	4	2	2025-07-19 02:20:14.823225	2025-07-19 02:20:14.823225
2113	423	5	2	2025-07-19 02:20:14.823225	2025-07-19 02:20:14.823225
2114	424	1	2	2025-07-19 02:20:15.00713	2025-07-19 02:20:15.00713
2115	424	2	2	2025-07-19 02:20:15.00713	2025-07-19 02:20:15.00713
2116	424	3	2	2025-07-19 02:20:15.00713	2025-07-19 02:20:15.00713
2117	424	4	2	2025-07-19 02:20:15.00713	2025-07-19 02:20:15.00713
2118	424	5	2	2025-07-19 02:20:15.00713	2025-07-19 02:20:15.00713
2119	425	1	2	2025-07-19 02:20:15.189032	2025-07-19 02:20:15.189032
2120	425	2	2	2025-07-19 02:20:15.189032	2025-07-19 02:20:15.189032
2121	425	3	2	2025-07-19 02:20:15.189032	2025-07-19 02:20:15.189032
2122	425	4	2	2025-07-19 02:20:15.189032	2025-07-19 02:20:15.189032
2123	425	5	2	2025-07-19 02:20:15.189032	2025-07-19 02:20:15.189032
2124	426	1	2	2025-07-19 02:20:15.530595	2025-07-19 02:20:15.530595
2125	426	2	2	2025-07-19 02:20:15.530595	2025-07-19 02:20:15.530595
2126	426	3	2	2025-07-19 02:20:15.530595	2025-07-19 02:20:15.530595
2127	426	4	2	2025-07-19 02:20:15.530595	2025-07-19 02:20:15.530595
2128	426	5	2	2025-07-19 02:20:15.530595	2025-07-19 02:20:15.530595
2129	427	1	2	2025-07-19 02:20:15.865731	2025-07-19 02:20:15.865731
2130	427	2	2	2025-07-19 02:20:15.865731	2025-07-19 02:20:15.865731
2131	427	3	2	2025-07-19 02:20:15.865731	2025-07-19 02:20:15.865731
2132	427	4	2	2025-07-19 02:20:15.865731	2025-07-19 02:20:15.865731
2133	427	5	2	2025-07-19 02:20:15.865731	2025-07-19 02:20:15.865731
2134	428	1	2	2025-07-19 02:20:16.104317	2025-07-19 02:20:16.104317
2135	428	2	2	2025-07-19 02:20:16.104317	2025-07-19 02:20:16.104317
2136	428	3	2	2025-07-19 02:20:16.104317	2025-07-19 02:20:16.104317
2137	428	4	2	2025-07-19 02:20:16.104317	2025-07-19 02:20:16.104317
2138	428	5	2	2025-07-19 02:20:16.104317	2025-07-19 02:20:16.104317
2139	429	1	2	2025-07-19 02:20:16.284635	2025-07-19 02:20:16.284635
2140	429	2	2	2025-07-19 02:20:16.284635	2025-07-19 02:20:16.284635
2141	429	3	2	2025-07-19 02:20:16.284635	2025-07-19 02:20:16.284635
2142	429	4	2	2025-07-19 02:20:16.284635	2025-07-19 02:20:16.284635
2143	429	5	2	2025-07-19 02:20:16.284635	2025-07-19 02:20:16.284635
2144	430	1	2	2025-07-19 02:20:16.462292	2025-07-19 02:20:16.462292
2145	430	2	2	2025-07-19 02:20:16.462292	2025-07-19 02:20:16.462292
2146	430	3	2	2025-07-19 02:20:16.462292	2025-07-19 02:20:16.462292
2147	430	4	2	2025-07-19 02:20:16.462292	2025-07-19 02:20:16.462292
2148	430	5	2	2025-07-19 02:20:16.462292	2025-07-19 02:20:16.462292
2149	431	1	2	2025-07-19 02:20:16.635453	2025-07-19 02:20:16.635453
2150	431	2	2	2025-07-19 02:20:16.635453	2025-07-19 02:20:16.635453
2151	431	3	2	2025-07-19 02:20:16.635453	2025-07-19 02:20:16.635453
2152	431	4	2	2025-07-19 02:20:16.635453	2025-07-19 02:20:16.635453
2153	431	5	2	2025-07-19 02:20:16.635453	2025-07-19 02:20:16.635453
2154	432	1	2	2025-07-19 02:20:16.814811	2025-07-19 02:20:16.814811
2155	432	2	2	2025-07-19 02:20:16.814811	2025-07-19 02:20:16.814811
2156	432	3	2	2025-07-19 02:20:16.814811	2025-07-19 02:20:16.814811
2157	432	4	2	2025-07-19 02:20:16.814811	2025-07-19 02:20:16.814811
2158	432	5	2	2025-07-19 02:20:16.814811	2025-07-19 02:20:16.814811
2159	433	1	2	2025-07-19 02:20:16.993084	2025-07-19 02:20:16.993084
2160	433	2	2	2025-07-19 02:20:16.993084	2025-07-19 02:20:16.993084
2161	433	3	2	2025-07-19 02:20:16.993084	2025-07-19 02:20:16.993084
2162	433	4	2	2025-07-19 02:20:16.993084	2025-07-19 02:20:16.993084
2163	433	5	2	2025-07-19 02:20:16.993084	2025-07-19 02:20:16.993084
2164	434	1	2	2025-07-19 02:20:17.185053	2025-07-19 02:20:17.185053
2165	434	2	2	2025-07-19 02:20:17.185053	2025-07-19 02:20:17.185053
2166	434	3	2	2025-07-19 02:20:17.185053	2025-07-19 02:20:17.185053
2167	434	4	2	2025-07-19 02:20:17.185053	2025-07-19 02:20:17.185053
2168	434	5	2	2025-07-19 02:20:17.185053	2025-07-19 02:20:17.185053
2169	435	1	2	2025-07-19 02:20:17.35857	2025-07-19 02:20:17.35857
2170	435	2	2	2025-07-19 02:20:17.35857	2025-07-19 02:20:17.35857
2171	435	3	2	2025-07-19 02:20:17.35857	2025-07-19 02:20:17.35857
2172	435	4	2	2025-07-19 02:20:17.35857	2025-07-19 02:20:17.35857
2173	435	5	2	2025-07-19 02:20:17.35857	2025-07-19 02:20:17.35857
2174	436	1	2	2025-07-19 02:20:17.543456	2025-07-19 02:20:17.543456
2175	436	2	2	2025-07-19 02:20:17.543456	2025-07-19 02:20:17.543456
2176	436	3	2	2025-07-19 02:20:17.543456	2025-07-19 02:20:17.543456
2177	436	4	2	2025-07-19 02:20:17.543456	2025-07-19 02:20:17.543456
2178	436	5	2	2025-07-19 02:20:17.543456	2025-07-19 02:20:17.543456
2179	437	1	2	2025-07-19 02:20:17.751473	2025-07-19 02:20:17.751473
2180	437	2	2	2025-07-19 02:20:17.751473	2025-07-19 02:20:17.751473
2181	437	3	2	2025-07-19 02:20:17.751473	2025-07-19 02:20:17.751473
2182	437	4	2	2025-07-19 02:20:17.751473	2025-07-19 02:20:17.751473
2183	437	5	2	2025-07-19 02:20:17.751473	2025-07-19 02:20:17.751473
2184	438	1	2	2025-07-19 02:20:17.927892	2025-07-19 02:20:17.927892
2185	438	2	2	2025-07-19 02:20:17.927892	2025-07-19 02:20:17.927892
2186	438	3	2	2025-07-19 02:20:17.927892	2025-07-19 02:20:17.927892
2187	438	4	2	2025-07-19 02:20:17.927892	2025-07-19 02:20:17.927892
2188	438	5	2	2025-07-19 02:20:17.927892	2025-07-19 02:20:17.927892
2189	439	1	2	2025-07-19 02:20:18.104704	2025-07-19 02:20:18.104704
2190	439	2	2	2025-07-19 02:20:18.104704	2025-07-19 02:20:18.104704
2191	439	3	2	2025-07-19 02:20:18.104704	2025-07-19 02:20:18.104704
2192	439	4	2	2025-07-19 02:20:18.104704	2025-07-19 02:20:18.104704
2193	439	5	2	2025-07-19 02:20:18.104704	2025-07-19 02:20:18.104704
2194	440	1	2	2025-07-19 02:20:18.28367	2025-07-19 02:20:18.28367
2195	440	2	2	2025-07-19 02:20:18.28367	2025-07-19 02:20:18.28367
2196	440	3	2	2025-07-19 02:20:18.28367	2025-07-19 02:20:18.28367
2197	440	4	2	2025-07-19 02:20:18.28367	2025-07-19 02:20:18.28367
2198	440	5	2	2025-07-19 02:20:18.28367	2025-07-19 02:20:18.28367
2199	441	1	2	2025-07-19 02:20:18.458506	2025-07-19 02:20:18.458506
2200	441	2	2	2025-07-19 02:20:18.458506	2025-07-19 02:20:18.458506
2201	441	3	2	2025-07-19 02:20:18.458506	2025-07-19 02:20:18.458506
2202	441	4	2	2025-07-19 02:20:18.458506	2025-07-19 02:20:18.458506
2203	441	5	2	2025-07-19 02:20:18.458506	2025-07-19 02:20:18.458506
2204	442	1	2	2025-07-19 02:20:18.648089	2025-07-19 02:20:18.648089
2205	442	2	2	2025-07-19 02:20:18.648089	2025-07-19 02:20:18.648089
2206	442	3	2	2025-07-19 02:20:18.648089	2025-07-19 02:20:18.648089
2207	442	4	2	2025-07-19 02:20:18.648089	2025-07-19 02:20:18.648089
2208	442	5	2	2025-07-19 02:20:18.648089	2025-07-19 02:20:18.648089
2209	443	1	2	2025-07-19 02:20:18.821932	2025-07-19 02:20:18.821932
2210	443	2	2	2025-07-19 02:20:18.821932	2025-07-19 02:20:18.821932
2211	443	3	2	2025-07-19 02:20:18.821932	2025-07-19 02:20:18.821932
2212	443	4	2	2025-07-19 02:20:18.821932	2025-07-19 02:20:18.821932
2213	443	5	2	2025-07-19 02:20:18.821932	2025-07-19 02:20:18.821932
2214	444	1	2	2025-07-19 02:20:18.99522	2025-07-19 02:20:18.99522
2215	444	2	2	2025-07-19 02:20:18.99522	2025-07-19 02:20:18.99522
2216	444	3	2	2025-07-19 02:20:18.99522	2025-07-19 02:20:18.99522
2217	444	4	2	2025-07-19 02:20:18.99522	2025-07-19 02:20:18.99522
2218	444	5	2	2025-07-19 02:20:18.99522	2025-07-19 02:20:18.99522
2219	445	1	2	2025-07-19 02:20:19.175908	2025-07-19 02:20:19.175908
2220	445	2	2	2025-07-19 02:20:19.175908	2025-07-19 02:20:19.175908
2221	445	3	2	2025-07-19 02:20:19.175908	2025-07-19 02:20:19.175908
2222	445	4	2	2025-07-19 02:20:19.175908	2025-07-19 02:20:19.175908
2223	445	5	2	2025-07-19 02:20:19.175908	2025-07-19 02:20:19.175908
2224	446	1	2	2025-07-19 02:20:19.349103	2025-07-19 02:20:19.349103
2225	446	2	2	2025-07-19 02:20:19.349103	2025-07-19 02:20:19.349103
2226	446	3	2	2025-07-19 02:20:19.349103	2025-07-19 02:20:19.349103
2227	446	4	2	2025-07-19 02:20:19.349103	2025-07-19 02:20:19.349103
2228	446	5	2	2025-07-19 02:20:19.349103	2025-07-19 02:20:19.349103
2229	447	1	2	2025-07-19 02:20:19.524169	2025-07-19 02:20:19.524169
2230	447	2	2	2025-07-19 02:20:19.524169	2025-07-19 02:20:19.524169
2231	447	3	2	2025-07-19 02:20:19.524169	2025-07-19 02:20:19.524169
2232	447	4	2	2025-07-19 02:20:19.524169	2025-07-19 02:20:19.524169
2233	447	5	2	2025-07-19 02:20:19.524169	2025-07-19 02:20:19.524169
2234	448	1	2	2025-07-19 02:20:19.704742	2025-07-19 02:20:19.704742
2235	448	2	2	2025-07-19 02:20:19.704742	2025-07-19 02:20:19.704742
2236	448	3	2	2025-07-19 02:20:19.704742	2025-07-19 02:20:19.704742
2237	448	4	2	2025-07-19 02:20:19.704742	2025-07-19 02:20:19.704742
2238	448	5	2	2025-07-19 02:20:19.704742	2025-07-19 02:20:19.704742
2239	449	1	2	2025-07-19 02:20:19.939606	2025-07-19 02:20:19.939606
2240	449	2	2	2025-07-19 02:20:19.939606	2025-07-19 02:20:19.939606
2241	449	3	2	2025-07-19 02:20:19.939606	2025-07-19 02:20:19.939606
2242	449	4	2	2025-07-19 02:20:19.939606	2025-07-19 02:20:19.939606
2243	449	5	2	2025-07-19 02:20:19.939606	2025-07-19 02:20:19.939606
2244	450	1	2	2025-07-19 02:20:20.154169	2025-07-19 02:20:20.154169
2245	450	2	2	2025-07-19 02:20:20.154169	2025-07-19 02:20:20.154169
2246	450	3	2	2025-07-19 02:20:20.154169	2025-07-19 02:20:20.154169
2247	450	4	2	2025-07-19 02:20:20.154169	2025-07-19 02:20:20.154169
2248	450	5	2	2025-07-19 02:20:20.154169	2025-07-19 02:20:20.154169
2249	451	1	2	2025-07-19 02:20:20.389963	2025-07-19 02:20:20.389963
2250	451	2	2	2025-07-19 02:20:20.389963	2025-07-19 02:20:20.389963
2251	451	3	2	2025-07-19 02:20:20.389963	2025-07-19 02:20:20.389963
2252	451	4	2	2025-07-19 02:20:20.389963	2025-07-19 02:20:20.389963
2253	451	5	2	2025-07-19 02:20:20.389963	2025-07-19 02:20:20.389963
2254	452	1	2	2025-07-19 02:20:20.580847	2025-07-19 02:20:20.580847
2255	452	2	2	2025-07-19 02:20:20.580847	2025-07-19 02:20:20.580847
2256	452	3	2	2025-07-19 02:20:20.580847	2025-07-19 02:20:20.580847
2257	452	4	2	2025-07-19 02:20:20.580847	2025-07-19 02:20:20.580847
2258	452	5	2	2025-07-19 02:20:20.580847	2025-07-19 02:20:20.580847
2259	453	1	2	2025-07-19 02:20:20.766629	2025-07-19 02:20:20.766629
2260	453	2	2	2025-07-19 02:20:20.766629	2025-07-19 02:20:20.766629
2261	453	3	2	2025-07-19 02:20:20.766629	2025-07-19 02:20:20.766629
2262	453	4	2	2025-07-19 02:20:20.766629	2025-07-19 02:20:20.766629
2263	453	5	2	2025-07-19 02:20:20.766629	2025-07-19 02:20:20.766629
2264	454	1	2	2025-07-19 02:20:21.005465	2025-07-19 02:20:21.005465
2265	454	2	2	2025-07-19 02:20:21.005465	2025-07-19 02:20:21.005465
2266	454	3	2	2025-07-19 02:20:21.005465	2025-07-19 02:20:21.005465
2267	454	4	2	2025-07-19 02:20:21.005465	2025-07-19 02:20:21.005465
2268	454	5	2	2025-07-19 02:20:21.005465	2025-07-19 02:20:21.005465
2269	455	1	2	2025-07-19 02:20:21.23242	2025-07-19 02:20:21.23242
2270	455	2	2	2025-07-19 02:20:21.23242	2025-07-19 02:20:21.23242
2271	455	3	2	2025-07-19 02:20:21.23242	2025-07-19 02:20:21.23242
2272	455	4	2	2025-07-19 02:20:21.23242	2025-07-19 02:20:21.23242
2273	455	5	2	2025-07-19 02:20:21.23242	2025-07-19 02:20:21.23242
2274	456	1	2	2025-07-19 02:20:21.427239	2025-07-19 02:20:21.427239
2275	456	2	2	2025-07-19 02:20:21.427239	2025-07-19 02:20:21.427239
2276	456	3	2	2025-07-19 02:20:21.427239	2025-07-19 02:20:21.427239
2277	456	4	2	2025-07-19 02:20:21.427239	2025-07-19 02:20:21.427239
2278	456	5	2	2025-07-19 02:20:21.427239	2025-07-19 02:20:21.427239
2279	457	1	2	2025-07-19 02:20:21.649011	2025-07-19 02:20:21.649011
2280	457	2	2	2025-07-19 02:20:21.649011	2025-07-19 02:20:21.649011
2281	457	3	2	2025-07-19 02:20:21.649011	2025-07-19 02:20:21.649011
2282	457	4	2	2025-07-19 02:20:21.649011	2025-07-19 02:20:21.649011
2283	457	5	2	2025-07-19 02:20:21.649011	2025-07-19 02:20:21.649011
2284	458	1	2	2025-07-19 02:20:21.824149	2025-07-19 02:20:21.824149
2285	458	2	2	2025-07-19 02:20:21.824149	2025-07-19 02:20:21.824149
2286	458	3	2	2025-07-19 02:20:21.824149	2025-07-19 02:20:21.824149
2287	458	4	2	2025-07-19 02:20:21.824149	2025-07-19 02:20:21.824149
2288	458	5	2	2025-07-19 02:20:21.824149	2025-07-19 02:20:21.824149
2289	459	1	2	2025-07-19 02:20:22.032026	2025-07-19 02:20:22.032026
2290	459	2	2	2025-07-19 02:20:22.032026	2025-07-19 02:20:22.032026
2291	459	3	2	2025-07-19 02:20:22.032026	2025-07-19 02:20:22.032026
2292	459	4	2	2025-07-19 02:20:22.032026	2025-07-19 02:20:22.032026
2293	459	5	2	2025-07-19 02:20:22.032026	2025-07-19 02:20:22.032026
2294	460	1	2	2025-07-19 02:20:22.242975	2025-07-19 02:20:22.242975
2295	460	2	2	2025-07-19 02:20:22.242975	2025-07-19 02:20:22.242975
2296	460	3	2	2025-07-19 02:20:22.242975	2025-07-19 02:20:22.242975
2297	460	4	2	2025-07-19 02:20:22.242975	2025-07-19 02:20:22.242975
2298	460	5	2	2025-07-19 02:20:22.242975	2025-07-19 02:20:22.242975
2299	461	1	2	2025-07-19 02:20:22.421454	2025-07-19 02:20:22.421454
2300	461	2	2	2025-07-19 02:20:22.421454	2025-07-19 02:20:22.421454
2301	461	3	2	2025-07-19 02:20:22.421454	2025-07-19 02:20:22.421454
2302	461	4	2	2025-07-19 02:20:22.421454	2025-07-19 02:20:22.421454
2303	461	5	2	2025-07-19 02:20:22.421454	2025-07-19 02:20:22.421454
2304	462	1	2	2025-07-19 02:20:22.621639	2025-07-19 02:20:22.621639
2305	462	2	2	2025-07-19 02:20:22.621639	2025-07-19 02:20:22.621639
2306	462	3	2	2025-07-19 02:20:22.621639	2025-07-19 02:20:22.621639
2307	462	4	2	2025-07-19 02:20:22.621639	2025-07-19 02:20:22.621639
2308	462	5	2	2025-07-19 02:20:22.621639	2025-07-19 02:20:22.621639
2309	463	1	2	2025-07-19 02:20:22.815338	2025-07-19 02:20:22.815338
2310	463	2	2	2025-07-19 02:20:22.815338	2025-07-19 02:20:22.815338
2311	463	3	2	2025-07-19 02:20:22.815338	2025-07-19 02:20:22.815338
2312	463	4	2	2025-07-19 02:20:22.815338	2025-07-19 02:20:22.815338
2313	463	5	2	2025-07-19 02:20:22.815338	2025-07-19 02:20:22.815338
2314	464	1	2	2025-07-19 02:20:22.986623	2025-07-19 02:20:22.986623
2315	464	2	2	2025-07-19 02:20:22.986623	2025-07-19 02:20:22.986623
2316	464	3	2	2025-07-19 02:20:22.986623	2025-07-19 02:20:22.986623
2317	464	4	2	2025-07-19 02:20:22.986623	2025-07-19 02:20:22.986623
2318	464	5	2	2025-07-19 02:20:22.986623	2025-07-19 02:20:22.986623
2319	465	1	2	2025-07-19 02:20:23.162279	2025-07-19 02:20:23.162279
2320	465	2	2	2025-07-19 02:20:23.162279	2025-07-19 02:20:23.162279
2321	465	3	2	2025-07-19 02:20:23.162279	2025-07-19 02:20:23.162279
2322	465	4	2	2025-07-19 02:20:23.162279	2025-07-19 02:20:23.162279
2323	465	5	2	2025-07-19 02:20:23.162279	2025-07-19 02:20:23.162279
2324	466	1	2	2025-07-19 02:20:23.346751	2025-07-19 02:20:23.346751
2325	466	2	2	2025-07-19 02:20:23.346751	2025-07-19 02:20:23.346751
2326	466	3	2	2025-07-19 02:20:23.346751	2025-07-19 02:20:23.346751
2327	466	4	2	2025-07-19 02:20:23.346751	2025-07-19 02:20:23.346751
2328	466	5	2	2025-07-19 02:20:23.346751	2025-07-19 02:20:23.346751
2329	467	1	2	2025-07-19 02:20:23.521165	2025-07-19 02:20:23.521165
2330	467	2	2	2025-07-19 02:20:23.521165	2025-07-19 02:20:23.521165
2331	467	3	2	2025-07-19 02:20:23.521165	2025-07-19 02:20:23.521165
2332	467	4	2	2025-07-19 02:20:23.521165	2025-07-19 02:20:23.521165
2333	467	5	2	2025-07-19 02:20:23.521165	2025-07-19 02:20:23.521165
2334	468	1	2	2025-07-19 02:20:23.702618	2025-07-19 02:20:23.702618
2335	468	2	2	2025-07-19 02:20:23.702618	2025-07-19 02:20:23.702618
2336	468	3	2	2025-07-19 02:20:23.702618	2025-07-19 02:20:23.702618
2337	468	4	2	2025-07-19 02:20:23.702618	2025-07-19 02:20:23.702618
2338	468	5	2	2025-07-19 02:20:23.702618	2025-07-19 02:20:23.702618
2339	469	1	2	2025-07-19 02:20:23.88284	2025-07-19 02:20:23.88284
2340	469	2	2	2025-07-19 02:20:23.88284	2025-07-19 02:20:23.88284
2341	469	3	2	2025-07-19 02:20:23.88284	2025-07-19 02:20:23.88284
2342	469	4	2	2025-07-19 02:20:23.88284	2025-07-19 02:20:23.88284
2343	469	5	2	2025-07-19 02:20:23.88284	2025-07-19 02:20:23.88284
2344	470	1	2	2025-07-19 02:20:24.060946	2025-07-19 02:20:24.060946
2345	470	2	2	2025-07-19 02:20:24.060946	2025-07-19 02:20:24.060946
2346	470	3	2	2025-07-19 02:20:24.060946	2025-07-19 02:20:24.060946
2347	470	4	2	2025-07-19 02:20:24.060946	2025-07-19 02:20:24.060946
2348	470	5	2	2025-07-19 02:20:24.060946	2025-07-19 02:20:24.060946
2349	471	1	2	2025-07-19 02:20:24.241839	2025-07-19 02:20:24.241839
2350	471	2	2	2025-07-19 02:20:24.241839	2025-07-19 02:20:24.241839
2351	471	3	2	2025-07-19 02:20:24.241839	2025-07-19 02:20:24.241839
2352	471	4	2	2025-07-19 02:20:24.241839	2025-07-19 02:20:24.241839
2353	471	5	2	2025-07-19 02:20:24.241839	2025-07-19 02:20:24.241839
2354	472	1	2	2025-07-19 02:20:24.415687	2025-07-19 02:20:24.415687
2355	472	2	2	2025-07-19 02:20:24.415687	2025-07-19 02:20:24.415687
2356	472	3	2	2025-07-19 02:20:24.415687	2025-07-19 02:20:24.415687
2357	472	4	2	2025-07-19 02:20:24.415687	2025-07-19 02:20:24.415687
2358	472	5	2	2025-07-19 02:20:24.415687	2025-07-19 02:20:24.415687
2359	473	1	2	2025-07-19 02:20:24.601346	2025-07-19 02:20:24.601346
2360	473	2	2	2025-07-19 02:20:24.601346	2025-07-19 02:20:24.601346
2361	473	3	2	2025-07-19 02:20:24.601346	2025-07-19 02:20:24.601346
2362	473	4	2	2025-07-19 02:20:24.601346	2025-07-19 02:20:24.601346
2363	473	5	2	2025-07-19 02:20:24.601346	2025-07-19 02:20:24.601346
2364	474	1	2	2025-07-19 02:20:24.776478	2025-07-19 02:20:24.776478
2365	474	2	2	2025-07-19 02:20:24.776478	2025-07-19 02:20:24.776478
2366	474	3	2	2025-07-19 02:20:24.776478	2025-07-19 02:20:24.776478
2367	474	4	2	2025-07-19 02:20:24.776478	2025-07-19 02:20:24.776478
2368	474	5	2	2025-07-19 02:20:24.776478	2025-07-19 02:20:24.776478
2369	475	1	2	2025-07-19 02:20:24.95924	2025-07-19 02:20:24.95924
2370	475	2	2	2025-07-19 02:20:24.95924	2025-07-19 02:20:24.95924
2371	475	3	2	2025-07-19 02:20:24.95924	2025-07-19 02:20:24.95924
2372	475	4	2	2025-07-19 02:20:24.95924	2025-07-19 02:20:24.95924
2373	475	5	2	2025-07-19 02:20:24.95924	2025-07-19 02:20:24.95924
2374	476	1	2	2025-07-19 02:20:25.140695	2025-07-19 02:20:25.140695
2375	476	2	2	2025-07-19 02:20:25.140695	2025-07-19 02:20:25.140695
2376	476	3	2	2025-07-19 02:20:25.140695	2025-07-19 02:20:25.140695
2377	476	4	2	2025-07-19 02:20:25.140695	2025-07-19 02:20:25.140695
2378	476	5	2	2025-07-19 02:20:25.140695	2025-07-19 02:20:25.140695
2379	477	1	2	2025-07-19 02:20:25.321999	2025-07-19 02:20:25.321999
2380	477	2	2	2025-07-19 02:20:25.321999	2025-07-19 02:20:25.321999
2381	477	3	2	2025-07-19 02:20:25.321999	2025-07-19 02:20:25.321999
2382	477	4	2	2025-07-19 02:20:25.321999	2025-07-19 02:20:25.321999
2383	477	5	2	2025-07-19 02:20:25.321999	2025-07-19 02:20:25.321999
2384	478	1	2	2025-07-19 02:20:25.508388	2025-07-19 02:20:25.508388
2385	478	2	2	2025-07-19 02:20:25.508388	2025-07-19 02:20:25.508388
2386	478	3	2	2025-07-19 02:20:25.508388	2025-07-19 02:20:25.508388
2387	478	4	2	2025-07-19 02:20:25.508388	2025-07-19 02:20:25.508388
2388	478	5	2	2025-07-19 02:20:25.508388	2025-07-19 02:20:25.508388
2389	479	1	2	2025-07-19 02:20:25.707632	2025-07-19 02:20:25.707632
2390	479	2	2	2025-07-19 02:20:25.707632	2025-07-19 02:20:25.707632
2391	479	3	2	2025-07-19 02:20:25.707632	2025-07-19 02:20:25.707632
2392	479	4	2	2025-07-19 02:20:25.707632	2025-07-19 02:20:25.707632
2393	479	5	2	2025-07-19 02:20:25.707632	2025-07-19 02:20:25.707632
2394	480	1	2	2025-07-19 02:20:25.897965	2025-07-19 02:20:25.897965
2395	480	2	2	2025-07-19 02:20:25.897965	2025-07-19 02:20:25.897965
2396	480	3	2	2025-07-19 02:20:25.897965	2025-07-19 02:20:25.897965
2397	480	4	2	2025-07-19 02:20:25.897965	2025-07-19 02:20:25.897965
2398	480	5	2	2025-07-19 02:20:25.897965	2025-07-19 02:20:25.897965
2399	481	1	2	2025-07-19 02:20:26.088781	2025-07-19 02:20:26.088781
2400	481	2	2	2025-07-19 02:20:26.088781	2025-07-19 02:20:26.088781
2401	481	3	2	2025-07-19 02:20:26.088781	2025-07-19 02:20:26.088781
2402	481	4	2	2025-07-19 02:20:26.088781	2025-07-19 02:20:26.088781
2403	481	5	2	2025-07-19 02:20:26.088781	2025-07-19 02:20:26.088781
2404	482	1	2	2025-07-19 02:20:26.267321	2025-07-19 02:20:26.267321
2405	482	2	2	2025-07-19 02:20:26.267321	2025-07-19 02:20:26.267321
2406	482	3	2	2025-07-19 02:20:26.267321	2025-07-19 02:20:26.267321
2407	482	4	2	2025-07-19 02:20:26.267321	2025-07-19 02:20:26.267321
2408	482	5	2	2025-07-19 02:20:26.267321	2025-07-19 02:20:26.267321
2409	483	1	2	2025-07-19 02:20:26.44651	2025-07-19 02:20:26.44651
2410	483	2	2	2025-07-19 02:20:26.44651	2025-07-19 02:20:26.44651
2411	483	3	2	2025-07-19 02:20:26.44651	2025-07-19 02:20:26.44651
2412	483	4	2	2025-07-19 02:20:26.44651	2025-07-19 02:20:26.44651
2413	483	5	2	2025-07-19 02:20:26.44651	2025-07-19 02:20:26.44651
2414	484	1	2	2025-07-19 02:20:26.628432	2025-07-19 02:20:26.628432
2415	484	2	2	2025-07-19 02:20:26.628432	2025-07-19 02:20:26.628432
2416	484	3	2	2025-07-19 02:20:26.628432	2025-07-19 02:20:26.628432
2417	484	4	2	2025-07-19 02:20:26.628432	2025-07-19 02:20:26.628432
2418	484	5	2	2025-07-19 02:20:26.628432	2025-07-19 02:20:26.628432
2419	485	1	2	2025-07-19 02:20:26.84228	2025-07-19 02:20:26.84228
2420	485	2	2	2025-07-19 02:20:26.84228	2025-07-19 02:20:26.84228
2421	485	3	2	2025-07-19 02:20:26.84228	2025-07-19 02:20:26.84228
2422	485	4	2	2025-07-19 02:20:26.84228	2025-07-19 02:20:26.84228
2423	485	5	2	2025-07-19 02:20:26.84228	2025-07-19 02:20:26.84228
2424	486	1	2	2025-07-19 02:20:27.064879	2025-07-19 02:20:27.064879
2425	486	2	2	2025-07-19 02:20:27.064879	2025-07-19 02:20:27.064879
2426	486	3	2	2025-07-19 02:20:27.064879	2025-07-19 02:20:27.064879
2427	486	4	2	2025-07-19 02:20:27.064879	2025-07-19 02:20:27.064879
2428	486	5	2	2025-07-19 02:20:27.064879	2025-07-19 02:20:27.064879
2429	487	1	2	2025-07-19 02:20:27.254774	2025-07-19 02:20:27.254774
2430	487	2	2	2025-07-19 02:20:27.254774	2025-07-19 02:20:27.254774
2431	487	3	2	2025-07-19 02:20:27.254774	2025-07-19 02:20:27.254774
2432	487	4	2	2025-07-19 02:20:27.254774	2025-07-19 02:20:27.254774
2433	487	5	2	2025-07-19 02:20:27.254774	2025-07-19 02:20:27.254774
2434	488	1	2	2025-07-19 02:20:27.447323	2025-07-19 02:20:27.447323
2435	488	2	2	2025-07-19 02:20:27.447323	2025-07-19 02:20:27.447323
2436	488	3	2	2025-07-19 02:20:27.447323	2025-07-19 02:20:27.447323
2437	488	4	2	2025-07-19 02:20:27.447323	2025-07-19 02:20:27.447323
2438	488	5	2	2025-07-19 02:20:27.447323	2025-07-19 02:20:27.447323
2439	489	1	2	2025-07-19 02:20:27.627227	2025-07-19 02:20:27.627227
2440	489	2	2	2025-07-19 02:20:27.627227	2025-07-19 02:20:27.627227
2441	489	3	2	2025-07-19 02:20:27.627227	2025-07-19 02:20:27.627227
2442	489	4	2	2025-07-19 02:20:27.627227	2025-07-19 02:20:27.627227
2443	489	5	2	2025-07-19 02:20:27.627227	2025-07-19 02:20:27.627227
2444	490	1	2	2025-07-19 02:20:27.817168	2025-07-19 02:20:27.817168
2445	490	2	2	2025-07-19 02:20:27.817168	2025-07-19 02:20:27.817168
2446	490	3	2	2025-07-19 02:20:27.817168	2025-07-19 02:20:27.817168
2447	490	4	2	2025-07-19 02:20:27.817168	2025-07-19 02:20:27.817168
2448	490	5	2	2025-07-19 02:20:27.817168	2025-07-19 02:20:27.817168
2449	491	1	2	2025-07-19 02:20:27.993526	2025-07-19 02:20:27.993526
2450	491	2	2	2025-07-19 02:20:27.993526	2025-07-19 02:20:27.993526
2451	491	3	2	2025-07-19 02:20:27.993526	2025-07-19 02:20:27.993526
2452	491	4	2	2025-07-19 02:20:27.993526	2025-07-19 02:20:27.993526
2453	491	5	2	2025-07-19 02:20:27.993526	2025-07-19 02:20:27.993526
2454	492	1	2	2025-07-19 02:20:28.172809	2025-07-19 02:20:28.172809
2455	492	2	2	2025-07-19 02:20:28.172809	2025-07-19 02:20:28.172809
2456	492	3	2	2025-07-19 02:20:28.172809	2025-07-19 02:20:28.172809
2457	492	4	2	2025-07-19 02:20:28.172809	2025-07-19 02:20:28.172809
2458	492	5	2	2025-07-19 02:20:28.172809	2025-07-19 02:20:28.172809
2459	493	1	2	2025-07-19 02:20:28.358858	2025-07-19 02:20:28.358858
2460	493	2	2	2025-07-19 02:20:28.358858	2025-07-19 02:20:28.358858
2461	493	3	2	2025-07-19 02:20:28.358858	2025-07-19 02:20:28.358858
2462	493	4	2	2025-07-19 02:20:28.358858	2025-07-19 02:20:28.358858
2463	493	5	2	2025-07-19 02:20:28.358858	2025-07-19 02:20:28.358858
2464	494	1	2	2025-07-19 02:20:28.537988	2025-07-19 02:20:28.537988
2465	494	2	2	2025-07-19 02:20:28.537988	2025-07-19 02:20:28.537988
2466	494	3	2	2025-07-19 02:20:28.537988	2025-07-19 02:20:28.537988
2467	494	4	2	2025-07-19 02:20:28.537988	2025-07-19 02:20:28.537988
2468	494	5	2	2025-07-19 02:20:28.537988	2025-07-19 02:20:28.537988
2469	495	1	2	2025-07-19 02:20:28.727406	2025-07-19 02:20:28.727406
2470	495	2	2	2025-07-19 02:20:28.727406	2025-07-19 02:20:28.727406
2471	495	3	2	2025-07-19 02:20:28.727406	2025-07-19 02:20:28.727406
2472	495	4	2	2025-07-19 02:20:28.727406	2025-07-19 02:20:28.727406
2473	495	5	2	2025-07-19 02:20:28.727406	2025-07-19 02:20:28.727406
2474	496	1	2	2025-07-19 02:20:28.908521	2025-07-19 02:20:28.908521
2475	496	2	2	2025-07-19 02:20:28.908521	2025-07-19 02:20:28.908521
2476	496	3	2	2025-07-19 02:20:28.908521	2025-07-19 02:20:28.908521
2477	496	4	2	2025-07-19 02:20:28.908521	2025-07-19 02:20:28.908521
2478	496	5	2	2025-07-19 02:20:28.908521	2025-07-19 02:20:28.908521
2479	497	1	2	2025-07-19 02:20:29.098965	2025-07-19 02:20:29.098965
2480	497	2	2	2025-07-19 02:20:29.098965	2025-07-19 02:20:29.098965
2481	497	3	2	2025-07-19 02:20:29.098965	2025-07-19 02:20:29.098965
2482	497	4	2	2025-07-19 02:20:29.098965	2025-07-19 02:20:29.098965
2483	497	5	2	2025-07-19 02:20:29.098965	2025-07-19 02:20:29.098965
2484	498	1	2	2025-07-19 02:20:29.276504	2025-07-19 02:20:29.276504
2485	498	2	2	2025-07-19 02:20:29.276504	2025-07-19 02:20:29.276504
2486	498	3	2	2025-07-19 02:20:29.276504	2025-07-19 02:20:29.276504
2487	498	4	2	2025-07-19 02:20:29.276504	2025-07-19 02:20:29.276504
2488	498	5	2	2025-07-19 02:20:29.276504	2025-07-19 02:20:29.276504
2489	499	1	2	2025-07-19 02:20:29.46365	2025-07-19 02:20:29.46365
2490	499	2	2	2025-07-19 02:20:29.46365	2025-07-19 02:20:29.46365
2491	499	3	2	2025-07-19 02:20:29.46365	2025-07-19 02:20:29.46365
2492	499	4	2	2025-07-19 02:20:29.46365	2025-07-19 02:20:29.46365
2493	499	5	2	2025-07-19 02:20:29.46365	2025-07-19 02:20:29.46365
2494	500	1	2	2025-07-19 02:20:29.64327	2025-07-19 02:20:29.64327
2495	500	2	2	2025-07-19 02:20:29.64327	2025-07-19 02:20:29.64327
2496	500	3	2	2025-07-19 02:20:29.64327	2025-07-19 02:20:29.64327
2497	500	4	2	2025-07-19 02:20:29.64327	2025-07-19 02:20:29.64327
2498	500	5	2	2025-07-19 02:20:29.64327	2025-07-19 02:20:29.64327
2499	501	1	2	2025-07-19 02:20:29.826402	2025-07-19 02:20:29.826402
2500	501	2	2	2025-07-19 02:20:29.826402	2025-07-19 02:20:29.826402
2501	501	3	2	2025-07-19 02:20:29.826402	2025-07-19 02:20:29.826402
2502	501	4	2	2025-07-19 02:20:29.826402	2025-07-19 02:20:29.826402
2503	501	5	2	2025-07-19 02:20:29.826402	2025-07-19 02:20:29.826402
2504	502	1	2	2025-07-19 02:20:30.007512	2025-07-19 02:20:30.007512
2505	502	2	2	2025-07-19 02:20:30.007512	2025-07-19 02:20:30.007512
2506	502	3	2	2025-07-19 02:20:30.007512	2025-07-19 02:20:30.007512
2507	502	4	2	2025-07-19 02:20:30.007512	2025-07-19 02:20:30.007512
2508	502	5	2	2025-07-19 02:20:30.007512	2025-07-19 02:20:30.007512
2509	503	1	2	2025-07-19 02:20:30.19712	2025-07-19 02:20:30.19712
2510	503	2	2	2025-07-19 02:20:30.19712	2025-07-19 02:20:30.19712
2511	503	3	2	2025-07-19 02:20:30.19712	2025-07-19 02:20:30.19712
2512	503	4	2	2025-07-19 02:20:30.19712	2025-07-19 02:20:30.19712
2513	503	5	2	2025-07-19 02:20:30.19712	2025-07-19 02:20:30.19712
2514	504	1	2	2025-07-19 02:20:30.384033	2025-07-19 02:20:30.384033
2515	504	2	2	2025-07-19 02:20:30.384033	2025-07-19 02:20:30.384033
2516	504	3	2	2025-07-19 02:20:30.384033	2025-07-19 02:20:30.384033
2517	504	4	2	2025-07-19 02:20:30.384033	2025-07-19 02:20:30.384033
2518	504	5	2	2025-07-19 02:20:30.384033	2025-07-19 02:20:30.384033
2519	505	1	2	2025-07-19 02:20:30.574136	2025-07-19 02:20:30.574136
2520	505	2	2	2025-07-19 02:20:30.574136	2025-07-19 02:20:30.574136
2521	505	3	2	2025-07-19 02:20:30.574136	2025-07-19 02:20:30.574136
2522	505	4	2	2025-07-19 02:20:30.574136	2025-07-19 02:20:30.574136
2523	505	5	2	2025-07-19 02:20:30.574136	2025-07-19 02:20:30.574136
2524	506	1	2	2025-07-19 02:20:30.769696	2025-07-19 02:20:30.769696
2525	506	2	2	2025-07-19 02:20:30.769696	2025-07-19 02:20:30.769696
2526	506	3	2	2025-07-19 02:20:30.769696	2025-07-19 02:20:30.769696
2527	506	4	2	2025-07-19 02:20:30.769696	2025-07-19 02:20:30.769696
2528	506	5	2	2025-07-19 02:20:30.769696	2025-07-19 02:20:30.769696
2529	507	1	2	2025-07-19 02:20:30.956883	2025-07-19 02:20:30.956883
2530	507	2	2	2025-07-19 02:20:30.956883	2025-07-19 02:20:30.956883
2531	507	3	2	2025-07-19 02:20:30.956883	2025-07-19 02:20:30.956883
2532	507	4	2	2025-07-19 02:20:30.956883	2025-07-19 02:20:30.956883
2533	507	5	2	2025-07-19 02:20:30.956883	2025-07-19 02:20:30.956883
2534	508	1	2	2025-07-19 02:20:31.134634	2025-07-19 02:20:31.134634
2535	508	2	2	2025-07-19 02:20:31.134634	2025-07-19 02:20:31.134634
2536	508	3	2	2025-07-19 02:20:31.134634	2025-07-19 02:20:31.134634
2537	508	4	2	2025-07-19 02:20:31.134634	2025-07-19 02:20:31.134634
2538	508	5	2	2025-07-19 02:20:31.134634	2025-07-19 02:20:31.134634
2539	509	1	2	2025-07-19 02:20:31.333815	2025-07-19 02:20:31.333815
2540	509	2	2	2025-07-19 02:20:31.333815	2025-07-19 02:20:31.333815
2541	509	3	2	2025-07-19 02:20:31.333815	2025-07-19 02:20:31.333815
2542	509	4	2	2025-07-19 02:20:31.333815	2025-07-19 02:20:31.333815
2543	509	5	2	2025-07-19 02:20:31.333815	2025-07-19 02:20:31.333815
2544	510	1	2	2025-07-19 02:20:31.534911	2025-07-19 02:20:31.534911
2545	510	2	2	2025-07-19 02:20:31.534911	2025-07-19 02:20:31.534911
2546	510	3	2	2025-07-19 02:20:31.534911	2025-07-19 02:20:31.534911
2547	510	4	2	2025-07-19 02:20:31.534911	2025-07-19 02:20:31.534911
2548	510	5	2	2025-07-19 02:20:31.534911	2025-07-19 02:20:31.534911
2549	511	1	2	2025-07-19 02:20:31.72543	2025-07-19 02:20:31.72543
2550	511	2	2	2025-07-19 02:20:31.72543	2025-07-19 02:20:31.72543
2551	511	3	2	2025-07-19 02:20:31.72543	2025-07-19 02:20:31.72543
2552	511	4	2	2025-07-19 02:20:31.72543	2025-07-19 02:20:31.72543
2553	511	5	2	2025-07-19 02:20:31.72543	2025-07-19 02:20:31.72543
2554	512	1	2	2025-07-19 02:20:31.914487	2025-07-19 02:20:31.914487
2555	512	2	2	2025-07-19 02:20:31.914487	2025-07-19 02:20:31.914487
2556	512	3	2	2025-07-19 02:20:31.914487	2025-07-19 02:20:31.914487
2557	512	4	2	2025-07-19 02:20:31.914487	2025-07-19 02:20:31.914487
2558	512	5	2	2025-07-19 02:20:31.914487	2025-07-19 02:20:31.914487
2559	513	1	2	2025-07-19 02:20:32.097467	2025-07-19 02:20:32.097467
2560	513	2	2	2025-07-19 02:20:32.097467	2025-07-19 02:20:32.097467
2561	513	3	2	2025-07-19 02:20:32.097467	2025-07-19 02:20:32.097467
2562	513	4	2	2025-07-19 02:20:32.097467	2025-07-19 02:20:32.097467
2563	513	5	2	2025-07-19 02:20:32.097467	2025-07-19 02:20:32.097467
2564	514	1	2	2025-07-19 02:20:32.31374	2025-07-19 02:20:32.31374
2565	514	2	2	2025-07-19 02:20:32.31374	2025-07-19 02:20:32.31374
2566	514	3	2	2025-07-19 02:20:32.31374	2025-07-19 02:20:32.31374
2567	514	4	2	2025-07-19 02:20:32.31374	2025-07-19 02:20:32.31374
2568	514	5	2	2025-07-19 02:20:32.31374	2025-07-19 02:20:32.31374
2569	515	1	2	2025-07-19 02:20:32.490448	2025-07-19 02:20:32.490448
2570	515	2	2	2025-07-19 02:20:32.490448	2025-07-19 02:20:32.490448
2571	515	3	2	2025-07-19 02:20:32.490448	2025-07-19 02:20:32.490448
2572	515	4	2	2025-07-19 02:20:32.490448	2025-07-19 02:20:32.490448
2573	515	5	2	2025-07-19 02:20:32.490448	2025-07-19 02:20:32.490448
2574	516	1	2	2025-07-19 02:20:32.66655	2025-07-19 02:20:32.66655
2575	516	2	2	2025-07-19 02:20:32.66655	2025-07-19 02:20:32.66655
2576	516	3	2	2025-07-19 02:20:32.66655	2025-07-19 02:20:32.66655
2577	516	4	2	2025-07-19 02:20:32.66655	2025-07-19 02:20:32.66655
2578	516	5	2	2025-07-19 02:20:32.66655	2025-07-19 02:20:32.66655
2579	517	1	2	2025-07-19 02:20:32.869453	2025-07-19 02:20:32.869453
2580	517	2	2	2025-07-19 02:20:32.869453	2025-07-19 02:20:32.869453
2581	517	3	2	2025-07-19 02:20:32.869453	2025-07-19 02:20:32.869453
2582	517	4	2	2025-07-19 02:20:32.869453	2025-07-19 02:20:32.869453
2583	517	5	2	2025-07-19 02:20:32.869453	2025-07-19 02:20:32.869453
2584	518	1	2	2025-07-19 02:20:33.139253	2025-07-19 02:20:33.139253
2585	518	2	2	2025-07-19 02:20:33.139253	2025-07-19 02:20:33.139253
2586	518	3	2	2025-07-19 02:20:33.139253	2025-07-19 02:20:33.139253
2587	518	4	2	2025-07-19 02:20:33.139253	2025-07-19 02:20:33.139253
2588	518	5	2	2025-07-19 02:20:33.139253	2025-07-19 02:20:33.139253
2589	519	1	2	2025-07-19 02:20:33.353973	2025-07-19 02:20:33.353973
2590	519	2	2	2025-07-19 02:20:33.353973	2025-07-19 02:20:33.353973
2591	519	3	2	2025-07-19 02:20:33.353973	2025-07-19 02:20:33.353973
2592	519	4	2	2025-07-19 02:20:33.353973	2025-07-19 02:20:33.353973
2593	519	5	2	2025-07-19 02:20:33.353973	2025-07-19 02:20:33.353973
2594	520	1	2	2025-07-19 02:20:33.565348	2025-07-19 02:20:33.565348
2595	520	2	2	2025-07-19 02:20:33.565348	2025-07-19 02:20:33.565348
2596	520	3	2	2025-07-19 02:20:33.565348	2025-07-19 02:20:33.565348
2597	520	4	2	2025-07-19 02:20:33.565348	2025-07-19 02:20:33.565348
2598	520	5	2	2025-07-19 02:20:33.565348	2025-07-19 02:20:33.565348
2599	521	1	2	2025-07-19 02:20:33.743104	2025-07-19 02:20:33.743104
2600	521	2	2	2025-07-19 02:20:33.743104	2025-07-19 02:20:33.743104
2601	521	3	2	2025-07-19 02:20:33.743104	2025-07-19 02:20:33.743104
2602	521	4	2	2025-07-19 02:20:33.743104	2025-07-19 02:20:33.743104
2603	521	5	2	2025-07-19 02:20:33.743104	2025-07-19 02:20:33.743104
2604	522	1	2	2025-07-19 02:20:33.931846	2025-07-19 02:20:33.931846
2605	522	2	2	2025-07-19 02:20:33.931846	2025-07-19 02:20:33.931846
2606	522	3	2	2025-07-19 02:20:33.931846	2025-07-19 02:20:33.931846
2607	522	4	2	2025-07-19 02:20:33.931846	2025-07-19 02:20:33.931846
2608	522	5	2	2025-07-19 02:20:33.931846	2025-07-19 02:20:33.931846
2609	523	1	2	2025-07-19 02:20:34.130729	2025-07-19 02:20:34.130729
2610	523	2	2	2025-07-19 02:20:34.130729	2025-07-19 02:20:34.130729
2611	523	3	2	2025-07-19 02:20:34.130729	2025-07-19 02:20:34.130729
2612	523	4	2	2025-07-19 02:20:34.130729	2025-07-19 02:20:34.130729
2613	523	5	2	2025-07-19 02:20:34.130729	2025-07-19 02:20:34.130729
2614	524	1	2	2025-07-19 02:20:34.306068	2025-07-19 02:20:34.306068
2615	524	2	2	2025-07-19 02:20:34.306068	2025-07-19 02:20:34.306068
2616	524	3	2	2025-07-19 02:20:34.306068	2025-07-19 02:20:34.306068
2617	524	4	2	2025-07-19 02:20:34.306068	2025-07-19 02:20:34.306068
2618	524	5	2	2025-07-19 02:20:34.306068	2025-07-19 02:20:34.306068
2619	525	1	2	2025-07-19 02:20:34.478929	2025-07-19 02:20:34.478929
2620	525	2	2	2025-07-19 02:20:34.478929	2025-07-19 02:20:34.478929
2621	525	3	2	2025-07-19 02:20:34.478929	2025-07-19 02:20:34.478929
2622	525	4	2	2025-07-19 02:20:34.478929	2025-07-19 02:20:34.478929
2623	525	5	2	2025-07-19 02:20:34.478929	2025-07-19 02:20:34.478929
2624	526	1	2	2025-07-19 02:20:34.656176	2025-07-19 02:20:34.656176
2625	526	2	2	2025-07-19 02:20:34.656176	2025-07-19 02:20:34.656176
2626	526	3	2	2025-07-19 02:20:34.656176	2025-07-19 02:20:34.656176
2627	526	4	2	2025-07-19 02:20:34.656176	2025-07-19 02:20:34.656176
2628	526	5	2	2025-07-19 02:20:34.656176	2025-07-19 02:20:34.656176
2629	527	1	2	2025-07-19 02:20:34.833885	2025-07-19 02:20:34.833885
2630	527	2	2	2025-07-19 02:20:34.833885	2025-07-19 02:20:34.833885
2631	527	3	2	2025-07-19 02:20:34.833885	2025-07-19 02:20:34.833885
2632	527	4	2	2025-07-19 02:20:34.833885	2025-07-19 02:20:34.833885
2633	527	5	2	2025-07-19 02:20:34.833885	2025-07-19 02:20:34.833885
2634	528	1	2	2025-07-19 02:20:35.313149	2025-07-19 02:20:35.313149
2635	528	2	2	2025-07-19 02:20:35.313149	2025-07-19 02:20:35.313149
2636	528	3	2	2025-07-19 02:20:35.313149	2025-07-19 02:20:35.313149
2637	528	4	2	2025-07-19 02:20:35.313149	2025-07-19 02:20:35.313149
2638	528	5	2	2025-07-19 02:20:35.313149	2025-07-19 02:20:35.313149
2639	529	1	2	2025-07-19 02:20:35.523366	2025-07-19 02:20:35.523366
2640	529	2	2	2025-07-19 02:20:35.523366	2025-07-19 02:20:35.523366
2641	529	3	2	2025-07-19 02:20:35.523366	2025-07-19 02:20:35.523366
2642	529	4	2	2025-07-19 02:20:35.523366	2025-07-19 02:20:35.523366
2643	529	5	2	2025-07-19 02:20:35.523366	2025-07-19 02:20:35.523366
2644	530	1	2	2025-07-19 02:20:35.747236	2025-07-19 02:20:35.747236
2645	530	2	2	2025-07-19 02:20:35.747236	2025-07-19 02:20:35.747236
2646	530	3	2	2025-07-19 02:20:35.747236	2025-07-19 02:20:35.747236
2647	530	4	2	2025-07-19 02:20:35.747236	2025-07-19 02:20:35.747236
2648	530	5	2	2025-07-19 02:20:35.747236	2025-07-19 02:20:35.747236
2649	531	1	2	2025-07-19 02:20:35.915983	2025-07-19 02:20:35.915983
2650	531	2	2	2025-07-19 02:20:35.915983	2025-07-19 02:20:35.915983
2651	531	3	2	2025-07-19 02:20:35.915983	2025-07-19 02:20:35.915983
2652	531	4	2	2025-07-19 02:20:35.915983	2025-07-19 02:20:35.915983
2653	531	5	2	2025-07-19 02:20:35.915983	2025-07-19 02:20:35.915983
2654	532	1	2	2025-07-19 02:20:36.080997	2025-07-19 02:20:36.080997
2655	532	2	2	2025-07-19 02:20:36.080997	2025-07-19 02:20:36.080997
2656	532	3	2	2025-07-19 02:20:36.080997	2025-07-19 02:20:36.080997
2657	532	4	2	2025-07-19 02:20:36.080997	2025-07-19 02:20:36.080997
2658	532	5	2	2025-07-19 02:20:36.080997	2025-07-19 02:20:36.080997
2659	533	1	2	2025-07-19 02:20:36.251638	2025-07-19 02:20:36.251638
2660	533	2	2	2025-07-19 02:20:36.251638	2025-07-19 02:20:36.251638
2661	533	3	2	2025-07-19 02:20:36.251638	2025-07-19 02:20:36.251638
2662	533	4	2	2025-07-19 02:20:36.251638	2025-07-19 02:20:36.251638
2663	533	5	2	2025-07-19 02:20:36.251638	2025-07-19 02:20:36.251638
2664	534	1	2	2025-07-19 02:20:36.429326	2025-07-19 02:20:36.429326
2665	534	2	2	2025-07-19 02:20:36.429326	2025-07-19 02:20:36.429326
2666	534	3	2	2025-07-19 02:20:36.429326	2025-07-19 02:20:36.429326
2667	534	4	2	2025-07-19 02:20:36.429326	2025-07-19 02:20:36.429326
2668	534	5	2	2025-07-19 02:20:36.429326	2025-07-19 02:20:36.429326
2669	535	1	2	2025-07-19 02:20:36.600924	2025-07-19 02:20:36.600924
2670	535	2	2	2025-07-19 02:20:36.600924	2025-07-19 02:20:36.600924
2671	535	3	2	2025-07-19 02:20:36.600924	2025-07-19 02:20:36.600924
2672	535	4	2	2025-07-19 02:20:36.600924	2025-07-19 02:20:36.600924
2673	535	5	2	2025-07-19 02:20:36.600924	2025-07-19 02:20:36.600924
2674	536	1	2	2025-07-19 02:20:36.767209	2025-07-19 02:20:36.767209
2675	536	2	2	2025-07-19 02:20:36.767209	2025-07-19 02:20:36.767209
2676	536	3	2	2025-07-19 02:20:36.767209	2025-07-19 02:20:36.767209
2677	536	4	2	2025-07-19 02:20:36.767209	2025-07-19 02:20:36.767209
2678	536	5	2	2025-07-19 02:20:36.767209	2025-07-19 02:20:36.767209
2679	537	1	1	2025-07-19 02:20:36.989753	2025-07-19 02:20:36.989753
2680	537	2	1	2025-07-19 02:20:36.989753	2025-07-19 02:20:36.989753
2681	537	3	1	2025-07-19 02:20:36.989753	2025-07-19 02:20:36.989753
2682	537	4	1	2025-07-19 02:20:36.989753	2025-07-19 02:20:36.989753
2683	537	5	1	2025-07-19 02:20:36.989753	2025-07-19 02:20:36.989753
2684	538	1	2	2025-07-19 02:20:37.187511	2025-07-19 02:20:37.187511
2685	538	2	2	2025-07-19 02:20:37.187511	2025-07-19 02:20:37.187511
2686	538	3	2	2025-07-19 02:20:37.187511	2025-07-19 02:20:37.187511
2687	538	4	2	2025-07-19 02:20:37.187511	2025-07-19 02:20:37.187511
2688	538	5	2	2025-07-19 02:20:37.187511	2025-07-19 02:20:37.187511
2689	539	1	1	2025-07-19 02:20:37.360399	2025-07-19 02:20:37.360399
2690	539	2	1	2025-07-19 02:20:37.360399	2025-07-19 02:20:37.360399
2691	539	3	1	2025-07-19 02:20:37.360399	2025-07-19 02:20:37.360399
2692	539	4	1	2025-07-19 02:20:37.360399	2025-07-19 02:20:37.360399
2693	539	5	1	2025-07-19 02:20:37.360399	2025-07-19 02:20:37.360399
2694	540	1	1	2025-07-19 02:20:37.535613	2025-07-19 02:20:37.535613
2695	540	2	1	2025-07-19 02:20:37.535613	2025-07-19 02:20:37.535613
2696	540	3	1	2025-07-19 02:20:37.535613	2025-07-19 02:20:37.535613
2697	540	4	1	2025-07-19 02:20:37.535613	2025-07-19 02:20:37.535613
2698	540	5	1	2025-07-19 02:20:37.535613	2025-07-19 02:20:37.535613
2699	541	1	2	2025-07-19 02:20:37.69979	2025-07-19 02:20:37.69979
2700	541	2	2	2025-07-19 02:20:37.69979	2025-07-19 02:20:37.69979
2701	541	3	2	2025-07-19 02:20:37.69979	2025-07-19 02:20:37.69979
2702	541	4	2	2025-07-19 02:20:37.69979	2025-07-19 02:20:37.69979
2703	541	5	2	2025-07-19 02:20:37.69979	2025-07-19 02:20:37.69979
2704	542	1	2	2025-07-19 02:20:37.87579	2025-07-19 02:20:37.87579
2705	542	2	2	2025-07-19 02:20:37.87579	2025-07-19 02:20:37.87579
2706	542	3	2	2025-07-19 02:20:37.87579	2025-07-19 02:20:37.87579
2707	542	4	2	2025-07-19 02:20:37.87579	2025-07-19 02:20:37.87579
2708	542	5	2	2025-07-19 02:20:37.87579	2025-07-19 02:20:37.87579
2709	543	1	2	2025-07-19 02:20:38.04747	2025-07-19 02:20:38.04747
2710	543	2	2	2025-07-19 02:20:38.04747	2025-07-19 02:20:38.04747
2711	543	3	2	2025-07-19 02:20:38.04747	2025-07-19 02:20:38.04747
2712	543	4	2	2025-07-19 02:20:38.04747	2025-07-19 02:20:38.04747
2713	543	5	2	2025-07-19 02:20:38.04747	2025-07-19 02:20:38.04747
2714	544	1	2	2025-07-19 02:20:38.219582	2025-07-19 02:20:38.219582
2715	544	2	2	2025-07-19 02:20:38.219582	2025-07-19 02:20:38.219582
2716	544	3	2	2025-07-19 02:20:38.219582	2025-07-19 02:20:38.219582
2717	544	4	2	2025-07-19 02:20:38.219582	2025-07-19 02:20:38.219582
2718	544	5	2	2025-07-19 02:20:38.219582	2025-07-19 02:20:38.219582
2719	545	1	2	2025-07-19 02:20:38.413747	2025-07-19 02:20:38.413747
2720	545	2	2	2025-07-19 02:20:38.413747	2025-07-19 02:20:38.413747
2721	545	3	2	2025-07-19 02:20:38.413747	2025-07-19 02:20:38.413747
2722	545	4	2	2025-07-19 02:20:38.413747	2025-07-19 02:20:38.413747
2723	545	5	2	2025-07-19 02:20:38.413747	2025-07-19 02:20:38.413747
2724	546	1	2	2025-07-19 02:20:38.571648	2025-07-19 02:20:38.571648
2725	546	2	2	2025-07-19 02:20:38.571648	2025-07-19 02:20:38.571648
2726	546	3	2	2025-07-19 02:20:38.571648	2025-07-19 02:20:38.571648
2727	546	4	2	2025-07-19 02:20:38.571648	2025-07-19 02:20:38.571648
2728	546	5	2	2025-07-19 02:20:38.571648	2025-07-19 02:20:38.571648
2729	547	1	2	2025-07-19 02:20:38.748928	2025-07-19 02:20:38.748928
2730	547	2	2	2025-07-19 02:20:38.748928	2025-07-19 02:20:38.748928
2731	547	3	2	2025-07-19 02:20:38.748928	2025-07-19 02:20:38.748928
2732	547	4	2	2025-07-19 02:20:38.748928	2025-07-19 02:20:38.748928
2733	547	5	2	2025-07-19 02:20:38.748928	2025-07-19 02:20:38.748928
2734	548	1	2	2025-07-19 02:20:38.946042	2025-07-19 02:20:38.946042
2735	548	2	2	2025-07-19 02:20:38.946042	2025-07-19 02:20:38.946042
2736	548	3	2	2025-07-19 02:20:38.946042	2025-07-19 02:20:38.946042
2737	548	4	2	2025-07-19 02:20:38.946042	2025-07-19 02:20:38.946042
2738	548	5	2	2025-07-19 02:20:38.946042	2025-07-19 02:20:38.946042
2739	549	1	2	2025-07-19 02:20:39.169014	2025-07-19 02:20:39.169014
2740	549	2	2	2025-07-19 02:20:39.169014	2025-07-19 02:20:39.169014
2741	549	3	2	2025-07-19 02:20:39.169014	2025-07-19 02:20:39.169014
2742	549	4	2	2025-07-19 02:20:39.169014	2025-07-19 02:20:39.169014
2743	549	5	2	2025-07-19 02:20:39.169014	2025-07-19 02:20:39.169014
2744	550	1	2	2025-07-19 02:20:39.367758	2025-07-19 02:20:39.367758
2745	550	2	2	2025-07-19 02:20:39.367758	2025-07-19 02:20:39.367758
2746	550	3	2	2025-07-19 02:20:39.367758	2025-07-19 02:20:39.367758
2747	550	4	2	2025-07-19 02:20:39.367758	2025-07-19 02:20:39.367758
2748	550	5	2	2025-07-19 02:20:39.367758	2025-07-19 02:20:39.367758
2749	551	1	2	2025-07-19 02:20:39.548857	2025-07-19 02:20:39.548857
2750	551	2	2	2025-07-19 02:20:39.548857	2025-07-19 02:20:39.548857
2751	551	3	2	2025-07-19 02:20:39.548857	2025-07-19 02:20:39.548857
2752	551	4	2	2025-07-19 02:20:39.548857	2025-07-19 02:20:39.548857
2753	551	5	2	2025-07-19 02:20:39.548857	2025-07-19 02:20:39.548857
2754	552	1	2	2025-07-19 02:20:39.729063	2025-07-19 02:20:39.729063
2755	552	2	2	2025-07-19 02:20:39.729063	2025-07-19 02:20:39.729063
2756	552	3	2	2025-07-19 02:20:39.729063	2025-07-19 02:20:39.729063
2757	552	4	2	2025-07-19 02:20:39.729063	2025-07-19 02:20:39.729063
2758	552	5	2	2025-07-19 02:20:39.729063	2025-07-19 02:20:39.729063
2759	553	1	2	2025-07-19 02:20:39.891028	2025-07-19 02:20:39.891028
2760	553	2	2	2025-07-19 02:20:39.891028	2025-07-19 02:20:39.891028
2761	553	3	2	2025-07-19 02:20:39.891028	2025-07-19 02:20:39.891028
2762	553	4	2	2025-07-19 02:20:39.891028	2025-07-19 02:20:39.891028
2763	553	5	2	2025-07-19 02:20:39.891028	2025-07-19 02:20:39.891028
2764	554	1	2	2025-07-19 02:20:40.069646	2025-07-19 02:20:40.069646
2765	554	2	2	2025-07-19 02:20:40.069646	2025-07-19 02:20:40.069646
2766	554	3	2	2025-07-19 02:20:40.069646	2025-07-19 02:20:40.069646
2767	554	4	2	2025-07-19 02:20:40.069646	2025-07-19 02:20:40.069646
2768	554	5	2	2025-07-19 02:20:40.069646	2025-07-19 02:20:40.069646
2769	555	1	2	2025-07-19 02:20:40.24403	2025-07-19 02:20:40.24403
2770	555	2	2	2025-07-19 02:20:40.24403	2025-07-19 02:20:40.24403
2771	555	3	2	2025-07-19 02:20:40.24403	2025-07-19 02:20:40.24403
2772	555	4	2	2025-07-19 02:20:40.24403	2025-07-19 02:20:40.24403
2773	555	5	2	2025-07-19 02:20:40.24403	2025-07-19 02:20:40.24403
2774	556	1	2	2025-07-19 02:20:40.415637	2025-07-19 02:20:40.415637
2775	556	2	2	2025-07-19 02:20:40.415637	2025-07-19 02:20:40.415637
2776	556	3	2	2025-07-19 02:20:40.415637	2025-07-19 02:20:40.415637
2777	556	4	2	2025-07-19 02:20:40.415637	2025-07-19 02:20:40.415637
2778	556	5	2	2025-07-19 02:20:40.415637	2025-07-19 02:20:40.415637
2779	557	1	2	2025-07-19 02:20:40.576433	2025-07-19 02:20:40.576433
2780	557	2	2	2025-07-19 02:20:40.576433	2025-07-19 02:20:40.576433
2781	557	3	2	2025-07-19 02:20:40.576433	2025-07-19 02:20:40.576433
2782	557	4	2	2025-07-19 02:20:40.576433	2025-07-19 02:20:40.576433
2783	557	5	2	2025-07-19 02:20:40.576433	2025-07-19 02:20:40.576433
2784	558	1	2	2025-07-19 02:20:40.746433	2025-07-19 02:20:40.746433
2785	558	2	2	2025-07-19 02:20:40.746433	2025-07-19 02:20:40.746433
2786	558	3	2	2025-07-19 02:20:40.746433	2025-07-19 02:20:40.746433
2787	558	4	2	2025-07-19 02:20:40.746433	2025-07-19 02:20:40.746433
2788	558	5	2	2025-07-19 02:20:40.746433	2025-07-19 02:20:40.746433
2789	559	1	2	2025-07-19 02:20:40.909041	2025-07-19 02:20:40.909041
2790	559	2	2	2025-07-19 02:20:40.909041	2025-07-19 02:20:40.909041
2791	559	3	2	2025-07-19 02:20:40.909041	2025-07-19 02:20:40.909041
2792	559	4	2	2025-07-19 02:20:40.909041	2025-07-19 02:20:40.909041
2793	559	5	2	2025-07-19 02:20:40.909041	2025-07-19 02:20:40.909041
2794	560	1	2	2025-07-19 02:20:41.071855	2025-07-19 02:20:41.071855
2795	560	2	2	2025-07-19 02:20:41.071855	2025-07-19 02:20:41.071855
2796	560	3	2	2025-07-19 02:20:41.071855	2025-07-19 02:20:41.071855
2797	560	4	2	2025-07-19 02:20:41.071855	2025-07-19 02:20:41.071855
2798	560	5	2	2025-07-19 02:20:41.071855	2025-07-19 02:20:41.071855
2799	561	1	2	2025-07-19 02:20:41.240003	2025-07-19 02:20:41.240003
2800	561	2	2	2025-07-19 02:20:41.240003	2025-07-19 02:20:41.240003
2801	561	3	2	2025-07-19 02:20:41.240003	2025-07-19 02:20:41.240003
2802	561	4	2	2025-07-19 02:20:41.240003	2025-07-19 02:20:41.240003
2803	561	5	2	2025-07-19 02:20:41.240003	2025-07-19 02:20:41.240003
2804	562	1	2	2025-07-19 02:20:41.408165	2025-07-19 02:20:41.408165
2805	562	2	2	2025-07-19 02:20:41.408165	2025-07-19 02:20:41.408165
2806	562	3	2	2025-07-19 02:20:41.408165	2025-07-19 02:20:41.408165
2807	562	4	2	2025-07-19 02:20:41.408165	2025-07-19 02:20:41.408165
2808	562	5	2	2025-07-19 02:20:41.408165	2025-07-19 02:20:41.408165
2809	563	1	2	2025-07-19 02:20:41.569056	2025-07-19 02:20:41.569056
2810	563	2	2	2025-07-19 02:20:41.569056	2025-07-19 02:20:41.569056
2811	563	3	2	2025-07-19 02:20:41.569056	2025-07-19 02:20:41.569056
2812	563	4	2	2025-07-19 02:20:41.569056	2025-07-19 02:20:41.569056
2813	563	5	2	2025-07-19 02:20:41.569056	2025-07-19 02:20:41.569056
2814	564	1	2	2025-07-19 02:20:41.74096	2025-07-19 02:20:41.74096
2815	564	2	2	2025-07-19 02:20:41.74096	2025-07-19 02:20:41.74096
2816	564	3	2	2025-07-19 02:20:41.74096	2025-07-19 02:20:41.74096
2817	564	4	2	2025-07-19 02:20:41.74096	2025-07-19 02:20:41.74096
2818	564	5	2	2025-07-19 02:20:41.74096	2025-07-19 02:20:41.74096
2819	565	1	2	2025-07-19 02:20:41.913761	2025-07-19 02:20:41.913761
2820	565	2	2	2025-07-19 02:20:41.913761	2025-07-19 02:20:41.913761
2821	565	3	2	2025-07-19 02:20:41.913761	2025-07-19 02:20:41.913761
2822	565	4	2	2025-07-19 02:20:41.913761	2025-07-19 02:20:41.913761
2823	565	5	2	2025-07-19 02:20:41.913761	2025-07-19 02:20:41.913761
2824	566	1	2	2025-07-19 02:20:42.084061	2025-07-19 02:20:42.084061
2825	566	2	2	2025-07-19 02:20:42.084061	2025-07-19 02:20:42.084061
2826	566	3	2	2025-07-19 02:20:42.084061	2025-07-19 02:20:42.084061
2827	566	4	2	2025-07-19 02:20:42.084061	2025-07-19 02:20:42.084061
2828	566	5	2	2025-07-19 02:20:42.084061	2025-07-19 02:20:42.084061
2829	567	1	2	2025-07-19 02:20:42.274465	2025-07-19 02:20:42.274465
2830	567	2	2	2025-07-19 02:20:42.274465	2025-07-19 02:20:42.274465
2831	567	3	2	2025-07-19 02:20:42.274465	2025-07-19 02:20:42.274465
2832	567	4	2	2025-07-19 02:20:42.274465	2025-07-19 02:20:42.274465
2833	567	5	2	2025-07-19 02:20:42.274465	2025-07-19 02:20:42.274465
2834	568	1	2	2025-07-19 02:20:42.445069	2025-07-19 02:20:42.445069
2835	568	2	2	2025-07-19 02:20:42.445069	2025-07-19 02:20:42.445069
2836	568	3	2	2025-07-19 02:20:42.445069	2025-07-19 02:20:42.445069
2837	568	4	2	2025-07-19 02:20:42.445069	2025-07-19 02:20:42.445069
2838	568	5	2	2025-07-19 02:20:42.445069	2025-07-19 02:20:42.445069
2839	569	1	2	2025-07-19 02:20:42.608842	2025-07-19 02:20:42.608842
2840	569	2	2	2025-07-19 02:20:42.608842	2025-07-19 02:20:42.608842
2841	569	3	2	2025-07-19 02:20:42.608842	2025-07-19 02:20:42.608842
2842	569	4	2	2025-07-19 02:20:42.608842	2025-07-19 02:20:42.608842
2843	569	5	2	2025-07-19 02:20:42.608842	2025-07-19 02:20:42.608842
2844	570	1	2	2025-07-19 02:20:42.792902	2025-07-19 02:20:42.792902
2845	570	2	2	2025-07-19 02:20:42.792902	2025-07-19 02:20:42.792902
2846	570	3	2	2025-07-19 02:20:42.792902	2025-07-19 02:20:42.792902
2847	570	4	2	2025-07-19 02:20:42.792902	2025-07-19 02:20:42.792902
2848	570	5	2	2025-07-19 02:20:42.792902	2025-07-19 02:20:42.792902
2849	571	1	2	2025-07-19 02:20:42.967017	2025-07-19 02:20:42.967017
2850	571	2	2	2025-07-19 02:20:42.967017	2025-07-19 02:20:42.967017
2851	571	3	2	2025-07-19 02:20:42.967017	2025-07-19 02:20:42.967017
2852	571	4	2	2025-07-19 02:20:42.967017	2025-07-19 02:20:42.967017
2853	571	5	2	2025-07-19 02:20:42.967017	2025-07-19 02:20:42.967017
2854	572	1	2	2025-07-19 02:20:43.135234	2025-07-19 02:20:43.135234
2855	572	2	2	2025-07-19 02:20:43.135234	2025-07-19 02:20:43.135234
2856	572	3	2	2025-07-19 02:20:43.135234	2025-07-19 02:20:43.135234
2857	572	4	2	2025-07-19 02:20:43.135234	2025-07-19 02:20:43.135234
2858	572	5	2	2025-07-19 02:20:43.135234	2025-07-19 02:20:43.135234
2859	573	1	2	2025-07-19 02:20:43.336144	2025-07-19 02:20:43.336144
2860	573	2	2	2025-07-19 02:20:43.336144	2025-07-19 02:20:43.336144
2861	573	3	2	2025-07-19 02:20:43.336144	2025-07-19 02:20:43.336144
2862	573	4	2	2025-07-19 02:20:43.336144	2025-07-19 02:20:43.336144
2863	573	5	2	2025-07-19 02:20:43.336144	2025-07-19 02:20:43.336144
2864	574	1	2	2025-07-19 02:20:43.52711	2025-07-19 02:20:43.52711
2865	574	2	2	2025-07-19 02:20:43.52711	2025-07-19 02:20:43.52711
2866	574	3	2	2025-07-19 02:20:43.52711	2025-07-19 02:20:43.52711
2867	574	4	2	2025-07-19 02:20:43.52711	2025-07-19 02:20:43.52711
2868	574	5	2	2025-07-19 02:20:43.52711	2025-07-19 02:20:43.52711
2869	575	1	2	2025-07-19 02:20:43.691843	2025-07-19 02:20:43.691843
2870	575	2	2	2025-07-19 02:20:43.691843	2025-07-19 02:20:43.691843
2871	575	3	2	2025-07-19 02:20:43.691843	2025-07-19 02:20:43.691843
2872	575	4	2	2025-07-19 02:20:43.691843	2025-07-19 02:20:43.691843
2873	575	5	2	2025-07-19 02:20:43.691843	2025-07-19 02:20:43.691843
2874	576	1	2	2025-07-19 02:20:43.859196	2025-07-19 02:20:43.859196
2875	576	2	2	2025-07-19 02:20:43.859196	2025-07-19 02:20:43.859196
2876	576	3	2	2025-07-19 02:20:43.859196	2025-07-19 02:20:43.859196
2877	576	4	2	2025-07-19 02:20:43.859196	2025-07-19 02:20:43.859196
2878	576	5	2	2025-07-19 02:20:43.859196	2025-07-19 02:20:43.859196
2879	577	1	2	2025-07-19 02:20:44.021174	2025-07-19 02:20:44.021174
2880	577	2	2	2025-07-19 02:20:44.021174	2025-07-19 02:20:44.021174
2881	577	3	2	2025-07-19 02:20:44.021174	2025-07-19 02:20:44.021174
2882	577	4	2	2025-07-19 02:20:44.021174	2025-07-19 02:20:44.021174
2883	577	5	2	2025-07-19 02:20:44.021174	2025-07-19 02:20:44.021174
2884	578	1	2	2025-07-19 02:20:44.18529	2025-07-19 02:20:44.18529
2885	578	2	2	2025-07-19 02:20:44.18529	2025-07-19 02:20:44.18529
2886	578	3	2	2025-07-19 02:20:44.18529	2025-07-19 02:20:44.18529
2887	578	4	2	2025-07-19 02:20:44.18529	2025-07-19 02:20:44.18529
2888	578	5	2	2025-07-19 02:20:44.18529	2025-07-19 02:20:44.18529
2889	579	1	2	2025-07-19 02:20:44.347994	2025-07-19 02:20:44.347994
2890	579	2	2	2025-07-19 02:20:44.347994	2025-07-19 02:20:44.347994
2891	579	3	2	2025-07-19 02:20:44.347994	2025-07-19 02:20:44.347994
2892	579	4	2	2025-07-19 02:20:44.347994	2025-07-19 02:20:44.347994
2893	579	5	2	2025-07-19 02:20:44.347994	2025-07-19 02:20:44.347994
2894	580	1	2	2025-07-19 02:20:44.5097	2025-07-19 02:20:44.5097
2895	580	2	2	2025-07-19 02:20:44.5097	2025-07-19 02:20:44.5097
2896	580	3	2	2025-07-19 02:20:44.5097	2025-07-19 02:20:44.5097
2897	580	4	2	2025-07-19 02:20:44.5097	2025-07-19 02:20:44.5097
2898	580	5	2	2025-07-19 02:20:44.5097	2025-07-19 02:20:44.5097
2899	581	1	2	2025-07-19 02:20:44.676497	2025-07-19 02:20:44.676497
2900	581	2	2	2025-07-19 02:20:44.676497	2025-07-19 02:20:44.676497
2901	581	3	2	2025-07-19 02:20:44.676497	2025-07-19 02:20:44.676497
2902	581	4	2	2025-07-19 02:20:44.676497	2025-07-19 02:20:44.676497
2903	581	5	2	2025-07-19 02:20:44.676497	2025-07-19 02:20:44.676497
2904	582	1	2	2025-07-19 02:20:44.842007	2025-07-19 02:20:44.842007
2905	582	2	2	2025-07-19 02:20:44.842007	2025-07-19 02:20:44.842007
2906	582	3	2	2025-07-19 02:20:44.842007	2025-07-19 02:20:44.842007
2907	582	4	2	2025-07-19 02:20:44.842007	2025-07-19 02:20:44.842007
2908	582	5	2	2025-07-19 02:20:44.842007	2025-07-19 02:20:44.842007
2909	583	1	2	2025-07-19 02:20:45.019687	2025-07-19 02:20:45.019687
2910	583	2	2	2025-07-19 02:20:45.019687	2025-07-19 02:20:45.019687
2911	583	3	2	2025-07-19 02:20:45.019687	2025-07-19 02:20:45.019687
2912	583	4	2	2025-07-19 02:20:45.019687	2025-07-19 02:20:45.019687
2913	583	5	2	2025-07-19 02:20:45.019687	2025-07-19 02:20:45.019687
2914	584	1	2	2025-07-19 02:20:45.18938	2025-07-19 02:20:45.18938
2915	584	2	2	2025-07-19 02:20:45.18938	2025-07-19 02:20:45.18938
2916	584	3	2	2025-07-19 02:20:45.18938	2025-07-19 02:20:45.18938
2917	584	4	2	2025-07-19 02:20:45.18938	2025-07-19 02:20:45.18938
2918	584	5	2	2025-07-19 02:20:45.18938	2025-07-19 02:20:45.18938
2919	585	1	2	2025-07-19 02:20:45.359046	2025-07-19 02:20:45.359046
2920	585	2	2	2025-07-19 02:20:45.359046	2025-07-19 02:20:45.359046
2921	585	3	2	2025-07-19 02:20:45.359046	2025-07-19 02:20:45.359046
2922	585	4	2	2025-07-19 02:20:45.359046	2025-07-19 02:20:45.359046
2923	585	5	2	2025-07-19 02:20:45.359046	2025-07-19 02:20:45.359046
2924	586	1	2	2025-07-19 02:20:45.535366	2025-07-19 02:20:45.535366
2925	586	2	2	2025-07-19 02:20:45.535366	2025-07-19 02:20:45.535366
2926	586	3	2	2025-07-19 02:20:45.535366	2025-07-19 02:20:45.535366
2927	586	4	2	2025-07-19 02:20:45.535366	2025-07-19 02:20:45.535366
2928	586	5	2	2025-07-19 02:20:45.535366	2025-07-19 02:20:45.535366
2929	587	1	2	2025-07-19 02:20:45.712122	2025-07-19 02:20:45.712122
2930	587	2	2	2025-07-19 02:20:45.712122	2025-07-19 02:20:45.712122
2931	587	3	2	2025-07-19 02:20:45.712122	2025-07-19 02:20:45.712122
2932	587	4	2	2025-07-19 02:20:45.712122	2025-07-19 02:20:45.712122
2933	587	5	2	2025-07-19 02:20:45.712122	2025-07-19 02:20:45.712122
2934	588	1	2	2025-07-19 02:20:45.884217	2025-07-19 02:20:45.884217
2935	588	2	2	2025-07-19 02:20:45.884217	2025-07-19 02:20:45.884217
2936	588	3	2	2025-07-19 02:20:45.884217	2025-07-19 02:20:45.884217
2937	588	4	2	2025-07-19 02:20:45.884217	2025-07-19 02:20:45.884217
2938	588	5	2	2025-07-19 02:20:45.884217	2025-07-19 02:20:45.884217
2939	589	1	1	2025-07-19 02:20:46.044647	2025-07-19 02:20:46.044647
2940	589	2	1	2025-07-19 02:20:46.044647	2025-07-19 02:20:46.044647
2941	589	3	1	2025-07-19 02:20:46.044647	2025-07-19 02:20:46.044647
2942	589	4	1	2025-07-19 02:20:46.044647	2025-07-19 02:20:46.044647
2943	589	5	1	2025-07-19 02:20:46.044647	2025-07-19 02:20:46.044647
2944	590	1	2	2025-07-19 02:20:46.215873	2025-07-19 02:20:46.215873
2945	590	2	2	2025-07-19 02:20:46.215873	2025-07-19 02:20:46.215873
2946	590	3	2	2025-07-19 02:20:46.215873	2025-07-19 02:20:46.215873
2947	590	4	2	2025-07-19 02:20:46.215873	2025-07-19 02:20:46.215873
2948	590	5	2	2025-07-19 02:20:46.215873	2025-07-19 02:20:46.215873
2949	591	1	2	2025-07-19 02:20:46.397554	2025-07-19 02:20:46.397554
2950	591	2	2	2025-07-19 02:20:46.397554	2025-07-19 02:20:46.397554
2951	591	3	2	2025-07-19 02:20:46.397554	2025-07-19 02:20:46.397554
2952	591	4	2	2025-07-19 02:20:46.397554	2025-07-19 02:20:46.397554
2953	591	5	2	2025-07-19 02:20:46.397554	2025-07-19 02:20:46.397554
2954	592	1	2	2025-07-19 02:20:46.572282	2025-07-19 02:20:46.572282
2955	592	2	2	2025-07-19 02:20:46.572282	2025-07-19 02:20:46.572282
2956	592	3	2	2025-07-19 02:20:46.572282	2025-07-19 02:20:46.572282
2957	592	4	2	2025-07-19 02:20:46.572282	2025-07-19 02:20:46.572282
2958	592	5	2	2025-07-19 02:20:46.572282	2025-07-19 02:20:46.572282
2959	593	1	2	2025-07-19 02:20:46.7443	2025-07-19 02:20:46.7443
2960	593	2	2	2025-07-19 02:20:46.7443	2025-07-19 02:20:46.7443
2961	593	3	2	2025-07-19 02:20:46.7443	2025-07-19 02:20:46.7443
2962	593	4	2	2025-07-19 02:20:46.7443	2025-07-19 02:20:46.7443
2963	593	5	2	2025-07-19 02:20:46.7443	2025-07-19 02:20:46.7443
2964	594	1	2	2025-07-19 02:20:46.905737	2025-07-19 02:20:46.905737
2965	594	2	2	2025-07-19 02:20:46.905737	2025-07-19 02:20:46.905737
2966	594	3	2	2025-07-19 02:20:46.905737	2025-07-19 02:20:46.905737
2967	594	4	2	2025-07-19 02:20:46.905737	2025-07-19 02:20:46.905737
2968	594	5	2	2025-07-19 02:20:46.905737	2025-07-19 02:20:46.905737
2969	595	1	2	2025-07-19 02:20:47.080296	2025-07-19 02:20:47.080296
2970	595	2	2	2025-07-19 02:20:47.080296	2025-07-19 02:20:47.080296
2971	595	3	2	2025-07-19 02:20:47.080296	2025-07-19 02:20:47.080296
2972	595	4	2	2025-07-19 02:20:47.080296	2025-07-19 02:20:47.080296
2973	595	5	2	2025-07-19 02:20:47.080296	2025-07-19 02:20:47.080296
2974	596	1	2	2025-07-19 02:20:47.244434	2025-07-19 02:20:47.244434
2975	596	2	2	2025-07-19 02:20:47.244434	2025-07-19 02:20:47.244434
2976	596	3	2	2025-07-19 02:20:47.244434	2025-07-19 02:20:47.244434
2977	596	4	2	2025-07-19 02:20:47.244434	2025-07-19 02:20:47.244434
2978	596	5	2	2025-07-19 02:20:47.244434	2025-07-19 02:20:47.244434
2979	597	1	2	2025-07-19 02:20:47.416029	2025-07-19 02:20:47.416029
2980	597	2	2	2025-07-19 02:20:47.416029	2025-07-19 02:20:47.416029
2981	597	3	2	2025-07-19 02:20:47.416029	2025-07-19 02:20:47.416029
2982	597	4	2	2025-07-19 02:20:47.416029	2025-07-19 02:20:47.416029
2983	597	5	2	2025-07-19 02:20:47.416029	2025-07-19 02:20:47.416029
2984	598	1	2	2025-07-19 02:20:47.588207	2025-07-19 02:20:47.588207
2985	598	2	2	2025-07-19 02:20:47.588207	2025-07-19 02:20:47.588207
2986	598	3	2	2025-07-19 02:20:47.588207	2025-07-19 02:20:47.588207
2987	598	4	2	2025-07-19 02:20:47.588207	2025-07-19 02:20:47.588207
2988	598	5	2	2025-07-19 02:20:47.588207	2025-07-19 02:20:47.588207
2989	599	1	2	2025-07-19 02:20:47.768741	2025-07-19 02:20:47.768741
2990	599	2	2	2025-07-19 02:20:47.768741	2025-07-19 02:20:47.768741
2991	599	3	2	2025-07-19 02:20:47.768741	2025-07-19 02:20:47.768741
2992	599	4	2	2025-07-19 02:20:47.768741	2025-07-19 02:20:47.768741
2993	599	5	2	2025-07-19 02:20:47.768741	2025-07-19 02:20:47.768741
2994	600	1	2	2025-07-19 02:20:47.950193	2025-07-19 02:20:47.950193
2995	600	2	2	2025-07-19 02:20:47.950193	2025-07-19 02:20:47.950193
2996	600	3	2	2025-07-19 02:20:47.950193	2025-07-19 02:20:47.950193
2997	600	4	2	2025-07-19 02:20:47.950193	2025-07-19 02:20:47.950193
2998	600	5	2	2025-07-19 02:20:47.950193	2025-07-19 02:20:47.950193
2999	601	1	2	2025-07-19 02:20:48.159958	2025-07-19 02:20:48.159958
3000	601	2	2	2025-07-19 02:20:48.159958	2025-07-19 02:20:48.159958
3001	601	3	2	2025-07-19 02:20:48.159958	2025-07-19 02:20:48.159958
3002	601	4	2	2025-07-19 02:20:48.159958	2025-07-19 02:20:48.159958
3003	601	5	2	2025-07-19 02:20:48.159958	2025-07-19 02:20:48.159958
3004	602	1	2	2025-07-19 02:20:48.329324	2025-07-19 02:20:48.329324
3005	602	2	2	2025-07-19 02:20:48.329324	2025-07-19 02:20:48.329324
3006	602	3	2	2025-07-19 02:20:48.329324	2025-07-19 02:20:48.329324
3007	602	4	2	2025-07-19 02:20:48.329324	2025-07-19 02:20:48.329324
3008	602	5	2	2025-07-19 02:20:48.329324	2025-07-19 02:20:48.329324
3009	603	1	2	2025-07-19 02:20:48.488792	2025-07-19 02:20:48.488792
3010	603	2	2	2025-07-19 02:20:48.488792	2025-07-19 02:20:48.488792
3011	603	3	2	2025-07-19 02:20:48.488792	2025-07-19 02:20:48.488792
3012	603	4	2	2025-07-19 02:20:48.488792	2025-07-19 02:20:48.488792
3013	603	5	2	2025-07-19 02:20:48.488792	2025-07-19 02:20:48.488792
3014	604	1	2	2025-07-19 02:20:48.649763	2025-07-19 02:20:48.649763
3015	604	2	2	2025-07-19 02:20:48.649763	2025-07-19 02:20:48.649763
3016	604	3	2	2025-07-19 02:20:48.649763	2025-07-19 02:20:48.649763
3017	604	4	2	2025-07-19 02:20:48.649763	2025-07-19 02:20:48.649763
3018	604	5	2	2025-07-19 02:20:48.649763	2025-07-19 02:20:48.649763
3019	605	1	2	2025-07-19 02:20:48.816084	2025-07-19 02:20:48.816084
3020	605	2	2	2025-07-19 02:20:48.816084	2025-07-19 02:20:48.816084
3021	605	3	2	2025-07-19 02:20:48.816084	2025-07-19 02:20:48.816084
3022	605	4	2	2025-07-19 02:20:48.816084	2025-07-19 02:20:48.816084
3023	605	5	2	2025-07-19 02:20:48.816084	2025-07-19 02:20:48.816084
3024	606	1	2	2025-07-19 02:20:48.984764	2025-07-19 02:20:48.984764
3025	606	2	2	2025-07-19 02:20:48.984764	2025-07-19 02:20:48.984764
3026	606	3	2	2025-07-19 02:20:48.984764	2025-07-19 02:20:48.984764
3027	606	4	2	2025-07-19 02:20:48.984764	2025-07-19 02:20:48.984764
3028	606	5	2	2025-07-19 02:20:48.984764	2025-07-19 02:20:48.984764
3029	607	1	2	2025-07-19 02:20:49.166163	2025-07-19 02:20:49.166163
3030	607	2	2	2025-07-19 02:20:49.166163	2025-07-19 02:20:49.166163
3031	607	3	2	2025-07-19 02:20:49.166163	2025-07-19 02:20:49.166163
3032	607	4	2	2025-07-19 02:20:49.166163	2025-07-19 02:20:49.166163
3033	607	5	2	2025-07-19 02:20:49.166163	2025-07-19 02:20:49.166163
3034	608	1	2	2025-07-19 02:20:49.343751	2025-07-19 02:20:49.343751
3035	608	2	2	2025-07-19 02:20:49.343751	2025-07-19 02:20:49.343751
3036	608	3	2	2025-07-19 02:20:49.343751	2025-07-19 02:20:49.343751
3037	608	4	2	2025-07-19 02:20:49.343751	2025-07-19 02:20:49.343751
3038	608	5	2	2025-07-19 02:20:49.343751	2025-07-19 02:20:49.343751
3039	609	1	2	2025-07-19 02:20:49.547917	2025-07-19 02:20:49.547917
3040	609	2	2	2025-07-19 02:20:49.547917	2025-07-19 02:20:49.547917
3041	609	3	2	2025-07-19 02:20:49.547917	2025-07-19 02:20:49.547917
3042	609	4	2	2025-07-19 02:20:49.547917	2025-07-19 02:20:49.547917
3043	609	5	2	2025-07-19 02:20:49.547917	2025-07-19 02:20:49.547917
3044	610	1	2	2025-07-19 02:20:49.778768	2025-07-19 02:20:49.778768
3045	610	2	2	2025-07-19 02:20:49.778768	2025-07-19 02:20:49.778768
3046	610	3	2	2025-07-19 02:20:49.778768	2025-07-19 02:20:49.778768
3047	610	4	2	2025-07-19 02:20:49.778768	2025-07-19 02:20:49.778768
3048	610	5	2	2025-07-19 02:20:49.778768	2025-07-19 02:20:49.778768
3049	611	1	2	2025-07-19 02:20:49.943483	2025-07-19 02:20:49.943483
3050	611	2	2	2025-07-19 02:20:49.943483	2025-07-19 02:20:49.943483
3051	611	3	2	2025-07-19 02:20:49.943483	2025-07-19 02:20:49.943483
3052	611	4	2	2025-07-19 02:20:49.943483	2025-07-19 02:20:49.943483
3053	611	5	2	2025-07-19 02:20:49.943483	2025-07-19 02:20:49.943483
3054	612	1	2	2025-07-19 02:20:50.111812	2025-07-19 02:20:50.111812
3055	612	2	2	2025-07-19 02:20:50.111812	2025-07-19 02:20:50.111812
3056	612	3	2	2025-07-19 02:20:50.111812	2025-07-19 02:20:50.111812
3057	612	4	2	2025-07-19 02:20:50.111812	2025-07-19 02:20:50.111812
3058	612	5	2	2025-07-19 02:20:50.111812	2025-07-19 02:20:50.111812
3059	613	1	2	2025-07-19 02:20:50.285716	2025-07-19 02:20:50.285716
3060	613	2	2	2025-07-19 02:20:50.285716	2025-07-19 02:20:50.285716
3061	613	3	2	2025-07-19 02:20:50.285716	2025-07-19 02:20:50.285716
3062	613	4	2	2025-07-19 02:20:50.285716	2025-07-19 02:20:50.285716
3063	613	5	2	2025-07-19 02:20:50.285716	2025-07-19 02:20:50.285716
3064	614	1	2	2025-07-19 02:20:50.451806	2025-07-19 02:20:50.451806
3065	614	2	2	2025-07-19 02:20:50.451806	2025-07-19 02:20:50.451806
3066	614	3	2	2025-07-19 02:20:50.451806	2025-07-19 02:20:50.451806
3067	614	4	2	2025-07-19 02:20:50.451806	2025-07-19 02:20:50.451806
3068	614	5	2	2025-07-19 02:20:50.451806	2025-07-19 02:20:50.451806
3069	615	1	2	2025-07-19 02:20:50.618635	2025-07-19 02:20:50.618635
3070	615	2	2	2025-07-19 02:20:50.618635	2025-07-19 02:20:50.618635
3071	615	3	2	2025-07-19 02:20:50.618635	2025-07-19 02:20:50.618635
3072	615	4	2	2025-07-19 02:20:50.618635	2025-07-19 02:20:50.618635
3073	615	5	2	2025-07-19 02:20:50.618635	2025-07-19 02:20:50.618635
3074	616	1	2	2025-07-19 02:20:50.798417	2025-07-19 02:20:50.798417
3075	616	2	2	2025-07-19 02:20:50.798417	2025-07-19 02:20:50.798417
3076	616	3	2	2025-07-19 02:20:50.798417	2025-07-19 02:20:50.798417
3077	616	4	2	2025-07-19 02:20:50.798417	2025-07-19 02:20:50.798417
3078	616	5	2	2025-07-19 02:20:50.798417	2025-07-19 02:20:50.798417
3079	617	1	2	2025-07-19 02:20:50.965275	2025-07-19 02:20:50.965275
3080	617	2	2	2025-07-19 02:20:50.965275	2025-07-19 02:20:50.965275
3081	617	3	2	2025-07-19 02:20:50.965275	2025-07-19 02:20:50.965275
3082	617	4	2	2025-07-19 02:20:50.965275	2025-07-19 02:20:50.965275
3083	617	5	2	2025-07-19 02:20:50.965275	2025-07-19 02:20:50.965275
3084	618	1	2	2025-07-19 02:20:51.128726	2025-07-19 02:20:51.128726
3085	618	2	2	2025-07-19 02:20:51.128726	2025-07-19 02:20:51.128726
3086	618	3	2	2025-07-19 02:20:51.128726	2025-07-19 02:20:51.128726
3087	618	4	2	2025-07-19 02:20:51.128726	2025-07-19 02:20:51.128726
3088	618	5	2	2025-07-19 02:20:51.128726	2025-07-19 02:20:51.128726
3089	619	1	2	2025-07-19 02:20:51.308041	2025-07-19 02:20:51.308041
3090	619	2	2	2025-07-19 02:20:51.308041	2025-07-19 02:20:51.308041
3091	619	3	2	2025-07-19 02:20:51.308041	2025-07-19 02:20:51.308041
3092	619	4	2	2025-07-19 02:20:51.308041	2025-07-19 02:20:51.308041
3093	619	5	2	2025-07-19 02:20:51.308041	2025-07-19 02:20:51.308041
3094	620	1	2	2025-07-19 02:20:51.469078	2025-07-19 02:20:51.469078
3095	620	2	2	2025-07-19 02:20:51.469078	2025-07-19 02:20:51.469078
3096	620	3	2	2025-07-19 02:20:51.469078	2025-07-19 02:20:51.469078
3097	620	4	2	2025-07-19 02:20:51.469078	2025-07-19 02:20:51.469078
3098	620	5	2	2025-07-19 02:20:51.469078	2025-07-19 02:20:51.469078
3099	621	1	2	2025-07-19 02:20:51.635337	2025-07-19 02:20:51.635337
3100	621	2	2	2025-07-19 02:20:51.635337	2025-07-19 02:20:51.635337
3101	621	3	2	2025-07-19 02:20:51.635337	2025-07-19 02:20:51.635337
3102	621	4	2	2025-07-19 02:20:51.635337	2025-07-19 02:20:51.635337
3103	621	5	2	2025-07-19 02:20:51.635337	2025-07-19 02:20:51.635337
3104	622	1	2	2025-07-19 02:20:51.802183	2025-07-19 02:20:51.802183
3105	622	2	2	2025-07-19 02:20:51.802183	2025-07-19 02:20:51.802183
3106	622	3	2	2025-07-19 02:20:51.802183	2025-07-19 02:20:51.802183
3107	622	4	2	2025-07-19 02:20:51.802183	2025-07-19 02:20:51.802183
3108	622	5	2	2025-07-19 02:20:51.802183	2025-07-19 02:20:51.802183
3109	623	1	2	2025-07-19 02:20:51.973755	2025-07-19 02:20:51.973755
3110	623	2	2	2025-07-19 02:20:51.973755	2025-07-19 02:20:51.973755
3111	623	3	2	2025-07-19 02:20:51.973755	2025-07-19 02:20:51.973755
3112	623	4	2	2025-07-19 02:20:51.973755	2025-07-19 02:20:51.973755
3113	623	5	2	2025-07-19 02:20:51.973755	2025-07-19 02:20:51.973755
3114	624	1	2	2025-07-19 02:20:52.15775	2025-07-19 02:20:52.15775
3115	624	2	2	2025-07-19 02:20:52.15775	2025-07-19 02:20:52.15775
3116	624	3	2	2025-07-19 02:20:52.15775	2025-07-19 02:20:52.15775
3117	624	4	2	2025-07-19 02:20:52.15775	2025-07-19 02:20:52.15775
3118	624	5	2	2025-07-19 02:20:52.15775	2025-07-19 02:20:52.15775
3119	625	1	2	2025-07-19 02:20:52.354009	2025-07-19 02:20:52.354009
3120	625	2	2	2025-07-19 02:20:52.354009	2025-07-19 02:20:52.354009
3121	625	3	2	2025-07-19 02:20:52.354009	2025-07-19 02:20:52.354009
3122	625	4	2	2025-07-19 02:20:52.354009	2025-07-19 02:20:52.354009
3123	625	5	2	2025-07-19 02:20:52.354009	2025-07-19 02:20:52.354009
3124	626	1	2	2025-07-19 02:20:52.537644	2025-07-19 02:20:52.537644
3125	626	2	2	2025-07-19 02:20:52.537644	2025-07-19 02:20:52.537644
3126	626	3	2	2025-07-19 02:20:52.537644	2025-07-19 02:20:52.537644
3127	626	4	2	2025-07-19 02:20:52.537644	2025-07-19 02:20:52.537644
3128	626	5	2	2025-07-19 02:20:52.537644	2025-07-19 02:20:52.537644
3129	627	1	2	2025-07-19 02:20:52.7029	2025-07-19 02:20:52.7029
3130	627	2	2	2025-07-19 02:20:52.7029	2025-07-19 02:20:52.7029
3131	627	3	2	2025-07-19 02:20:52.7029	2025-07-19 02:20:52.7029
3132	627	4	2	2025-07-19 02:20:52.7029	2025-07-19 02:20:52.7029
3133	627	5	2	2025-07-19 02:20:52.7029	2025-07-19 02:20:52.7029
3134	628	1	2	2025-07-19 02:20:52.870943	2025-07-19 02:20:52.870943
3135	628	2	2	2025-07-19 02:20:52.870943	2025-07-19 02:20:52.870943
3136	628	3	2	2025-07-19 02:20:52.870943	2025-07-19 02:20:52.870943
3137	628	4	2	2025-07-19 02:20:52.870943	2025-07-19 02:20:52.870943
3138	628	5	2	2025-07-19 02:20:52.870943	2025-07-19 02:20:52.870943
3139	629	1	2	2025-07-19 02:20:53.039479	2025-07-19 02:20:53.039479
3140	629	2	2	2025-07-19 02:20:53.039479	2025-07-19 02:20:53.039479
3141	629	3	2	2025-07-19 02:20:53.039479	2025-07-19 02:20:53.039479
3142	629	4	2	2025-07-19 02:20:53.039479	2025-07-19 02:20:53.039479
3143	629	5	2	2025-07-19 02:20:53.039479	2025-07-19 02:20:53.039479
3144	630	1	2	2025-07-19 02:20:53.216322	2025-07-19 02:20:53.216322
3145	630	2	2	2025-07-19 02:20:53.216322	2025-07-19 02:20:53.216322
3146	630	3	2	2025-07-19 02:20:53.216322	2025-07-19 02:20:53.216322
3147	630	4	2	2025-07-19 02:20:53.216322	2025-07-19 02:20:53.216322
3148	630	5	2	2025-07-19 02:20:53.216322	2025-07-19 02:20:53.216322
3149	631	1	2	2025-07-19 02:20:53.395242	2025-07-19 02:20:53.395242
3150	631	2	2	2025-07-19 02:20:53.395242	2025-07-19 02:20:53.395242
3151	631	3	2	2025-07-19 02:20:53.395242	2025-07-19 02:20:53.395242
3152	631	4	2	2025-07-19 02:20:53.395242	2025-07-19 02:20:53.395242
3153	631	5	2	2025-07-19 02:20:53.395242	2025-07-19 02:20:53.395242
3154	632	1	2	2025-07-19 02:20:53.561822	2025-07-19 02:20:53.561822
3155	632	2	2	2025-07-19 02:20:53.561822	2025-07-19 02:20:53.561822
3156	632	3	2	2025-07-19 02:20:53.561822	2025-07-19 02:20:53.561822
3157	632	4	2	2025-07-19 02:20:53.561822	2025-07-19 02:20:53.561822
3158	632	5	2	2025-07-19 02:20:53.561822	2025-07-19 02:20:53.561822
3159	633	1	2	2025-07-19 02:20:53.723116	2025-07-19 02:20:53.723116
3160	633	2	2	2025-07-19 02:20:53.723116	2025-07-19 02:20:53.723116
3161	633	3	2	2025-07-19 02:20:53.723116	2025-07-19 02:20:53.723116
3162	633	4	2	2025-07-19 02:20:53.723116	2025-07-19 02:20:53.723116
3163	633	5	2	2025-07-19 02:20:53.723116	2025-07-19 02:20:53.723116
3164	634	1	2	2025-07-19 02:20:53.887282	2025-07-19 02:20:53.887282
3165	634	2	2	2025-07-19 02:20:53.887282	2025-07-19 02:20:53.887282
3166	634	3	2	2025-07-19 02:20:53.887282	2025-07-19 02:20:53.887282
3167	634	4	2	2025-07-19 02:20:53.887282	2025-07-19 02:20:53.887282
3168	634	5	2	2025-07-19 02:20:53.887282	2025-07-19 02:20:53.887282
3169	635	1	2	2025-07-19 02:20:54.058857	2025-07-19 02:20:54.058857
3170	635	2	2	2025-07-19 02:20:54.058857	2025-07-19 02:20:54.058857
3171	635	3	2	2025-07-19 02:20:54.058857	2025-07-19 02:20:54.058857
3172	635	4	2	2025-07-19 02:20:54.058857	2025-07-19 02:20:54.058857
3173	635	5	2	2025-07-19 02:20:54.058857	2025-07-19 02:20:54.058857
3174	636	1	2	2025-07-19 02:20:54.264939	2025-07-19 02:20:54.264939
3175	636	2	2	2025-07-19 02:20:54.264939	2025-07-19 02:20:54.264939
3176	636	3	2	2025-07-19 02:20:54.264939	2025-07-19 02:20:54.264939
3177	636	4	2	2025-07-19 02:20:54.264939	2025-07-19 02:20:54.264939
3178	636	5	2	2025-07-19 02:20:54.264939	2025-07-19 02:20:54.264939
3179	637	1	2	2025-07-19 02:20:54.482051	2025-07-19 02:20:54.482051
3180	637	2	2	2025-07-19 02:20:54.482051	2025-07-19 02:20:54.482051
3181	637	3	2	2025-07-19 02:20:54.482051	2025-07-19 02:20:54.482051
3182	637	4	2	2025-07-19 02:20:54.482051	2025-07-19 02:20:54.482051
3183	637	5	2	2025-07-19 02:20:54.482051	2025-07-19 02:20:54.482051
3184	638	1	2	2025-07-19 02:20:54.716607	2025-07-19 02:20:54.716607
3185	638	2	2	2025-07-19 02:20:54.716607	2025-07-19 02:20:54.716607
3186	638	3	2	2025-07-19 02:20:54.716607	2025-07-19 02:20:54.716607
3187	638	4	2	2025-07-19 02:20:54.716607	2025-07-19 02:20:54.716607
3188	638	5	2	2025-07-19 02:20:54.716607	2025-07-19 02:20:54.716607
3189	639	1	2	2025-07-19 02:20:54.876219	2025-07-19 02:20:54.876219
3190	639	2	2	2025-07-19 02:20:54.876219	2025-07-19 02:20:54.876219
3191	639	3	2	2025-07-19 02:20:54.876219	2025-07-19 02:20:54.876219
3192	639	4	2	2025-07-19 02:20:54.876219	2025-07-19 02:20:54.876219
3193	639	5	2	2025-07-19 02:20:54.876219	2025-07-19 02:20:54.876219
3194	640	1	2	2025-07-19 02:20:55.057741	2025-07-19 02:20:55.057741
3195	640	2	2	2025-07-19 02:20:55.057741	2025-07-19 02:20:55.057741
3196	640	3	2	2025-07-19 02:20:55.057741	2025-07-19 02:20:55.057741
3197	640	4	2	2025-07-19 02:20:55.057741	2025-07-19 02:20:55.057741
3198	640	5	2	2025-07-19 02:20:55.057741	2025-07-19 02:20:55.057741
3199	641	1	2	2025-07-19 02:20:55.227252	2025-07-19 02:20:55.227252
3200	641	2	2	2025-07-19 02:20:55.227252	2025-07-19 02:20:55.227252
3201	641	3	2	2025-07-19 02:20:55.227252	2025-07-19 02:20:55.227252
3202	641	4	2	2025-07-19 02:20:55.227252	2025-07-19 02:20:55.227252
3203	641	5	2	2025-07-19 02:20:55.227252	2025-07-19 02:20:55.227252
3204	642	1	2	2025-07-19 02:20:55.42543	2025-07-19 02:20:55.42543
3205	642	2	2	2025-07-19 02:20:55.42543	2025-07-19 02:20:55.42543
3206	642	3	2	2025-07-19 02:20:55.42543	2025-07-19 02:20:55.42543
3207	642	4	2	2025-07-19 02:20:55.42543	2025-07-19 02:20:55.42543
3208	642	5	2	2025-07-19 02:20:55.42543	2025-07-19 02:20:55.42543
3209	643	1	2	2025-07-19 02:20:55.614158	2025-07-19 02:20:55.614158
3210	643	2	2	2025-07-19 02:20:55.614158	2025-07-19 02:20:55.614158
3211	643	3	2	2025-07-19 02:20:55.614158	2025-07-19 02:20:55.614158
3212	643	4	2	2025-07-19 02:20:55.614158	2025-07-19 02:20:55.614158
3213	643	5	2	2025-07-19 02:20:55.614158	2025-07-19 02:20:55.614158
3214	644	1	2	2025-07-19 02:20:55.816709	2025-07-19 02:20:55.816709
3215	644	2	2	2025-07-19 02:20:55.816709	2025-07-19 02:20:55.816709
3216	644	3	2	2025-07-19 02:20:55.816709	2025-07-19 02:20:55.816709
3217	644	4	2	2025-07-19 02:20:55.816709	2025-07-19 02:20:55.816709
3218	644	5	2	2025-07-19 02:20:55.816709	2025-07-19 02:20:55.816709
3219	645	1	2	2025-07-19 02:20:56.006565	2025-07-19 02:20:56.006565
3220	645	2	2	2025-07-19 02:20:56.006565	2025-07-19 02:20:56.006565
3221	645	3	2	2025-07-19 02:20:56.006565	2025-07-19 02:20:56.006565
3222	645	4	2	2025-07-19 02:20:56.006565	2025-07-19 02:20:56.006565
3223	645	5	2	2025-07-19 02:20:56.006565	2025-07-19 02:20:56.006565
3224	646	1	2	2025-07-19 02:20:56.17728	2025-07-19 02:20:56.17728
3225	646	2	2	2025-07-19 02:20:56.17728	2025-07-19 02:20:56.17728
3226	646	3	2	2025-07-19 02:20:56.17728	2025-07-19 02:20:56.17728
3227	646	4	2	2025-07-19 02:20:56.17728	2025-07-19 02:20:56.17728
3228	646	5	2	2025-07-19 02:20:56.17728	2025-07-19 02:20:56.17728
3229	647	1	2	2025-07-19 02:20:56.346995	2025-07-19 02:20:56.346995
3230	647	2	2	2025-07-19 02:20:56.346995	2025-07-19 02:20:56.346995
3231	647	3	2	2025-07-19 02:20:56.346995	2025-07-19 02:20:56.346995
3232	647	4	2	2025-07-19 02:20:56.346995	2025-07-19 02:20:56.346995
3233	647	5	2	2025-07-19 02:20:56.346995	2025-07-19 02:20:56.346995
3234	648	1	2	2025-07-19 02:20:56.532177	2025-07-19 02:20:56.532177
3235	648	2	2	2025-07-19 02:20:56.532177	2025-07-19 02:20:56.532177
3236	648	3	2	2025-07-19 02:20:56.532177	2025-07-19 02:20:56.532177
3237	648	4	2	2025-07-19 02:20:56.532177	2025-07-19 02:20:56.532177
3238	648	5	2	2025-07-19 02:20:56.532177	2025-07-19 02:20:56.532177
3239	649	1	2	2025-07-19 02:20:56.694298	2025-07-19 02:20:56.694298
3240	649	2	2	2025-07-19 02:20:56.694298	2025-07-19 02:20:56.694298
3241	649	3	2	2025-07-19 02:20:56.694298	2025-07-19 02:20:56.694298
3242	649	4	2	2025-07-19 02:20:56.694298	2025-07-19 02:20:56.694298
3243	649	5	2	2025-07-19 02:20:56.694298	2025-07-19 02:20:56.694298
3244	650	1	2	2025-07-19 02:20:56.85282	2025-07-19 02:20:56.85282
3245	650	2	2	2025-07-19 02:20:56.85282	2025-07-19 02:20:56.85282
3246	650	3	2	2025-07-19 02:20:56.85282	2025-07-19 02:20:56.85282
3247	650	4	2	2025-07-19 02:20:56.85282	2025-07-19 02:20:56.85282
3248	650	5	2	2025-07-19 02:20:56.85282	2025-07-19 02:20:56.85282
3249	651	1	2	2025-07-19 02:20:57.025438	2025-07-19 02:20:57.025438
3250	651	2	2	2025-07-19 02:20:57.025438	2025-07-19 02:20:57.025438
3251	651	3	2	2025-07-19 02:20:57.025438	2025-07-19 02:20:57.025438
3252	651	4	2	2025-07-19 02:20:57.025438	2025-07-19 02:20:57.025438
3253	651	5	2	2025-07-19 02:20:57.025438	2025-07-19 02:20:57.025438
3254	652	1	2	2025-07-19 02:20:57.186844	2025-07-19 02:20:57.186844
3255	652	2	2	2025-07-19 02:20:57.186844	2025-07-19 02:20:57.186844
3256	652	3	2	2025-07-19 02:20:57.186844	2025-07-19 02:20:57.186844
3257	652	4	2	2025-07-19 02:20:57.186844	2025-07-19 02:20:57.186844
3258	652	5	2	2025-07-19 02:20:57.186844	2025-07-19 02:20:57.186844
3259	653	1	2	2025-07-19 02:20:57.349725	2025-07-19 02:20:57.349725
3260	653	2	2	2025-07-19 02:20:57.349725	2025-07-19 02:20:57.349725
3261	653	3	2	2025-07-19 02:20:57.349725	2025-07-19 02:20:57.349725
3262	653	4	2	2025-07-19 02:20:57.349725	2025-07-19 02:20:57.349725
3263	653	5	2	2025-07-19 02:20:57.349725	2025-07-19 02:20:57.349725
3264	654	1	2	2025-07-19 02:20:57.518695	2025-07-19 02:20:57.518695
3265	654	2	2	2025-07-19 02:20:57.518695	2025-07-19 02:20:57.518695
3266	654	3	2	2025-07-19 02:20:57.518695	2025-07-19 02:20:57.518695
3267	654	4	2	2025-07-19 02:20:57.518695	2025-07-19 02:20:57.518695
3268	654	5	2	2025-07-19 02:20:57.518695	2025-07-19 02:20:57.518695
3269	655	1	2	2025-07-19 02:20:57.688527	2025-07-19 02:20:57.688527
3270	655	2	2	2025-07-19 02:20:57.688527	2025-07-19 02:20:57.688527
3271	655	3	2	2025-07-19 02:20:57.688527	2025-07-19 02:20:57.688527
3272	655	4	2	2025-07-19 02:20:57.688527	2025-07-19 02:20:57.688527
3273	655	5	2	2025-07-19 02:20:57.688527	2025-07-19 02:20:57.688527
3274	656	1	2	2025-07-19 02:20:57.854714	2025-07-19 02:20:57.854714
3275	656	2	2	2025-07-19 02:20:57.854714	2025-07-19 02:20:57.854714
3276	656	3	2	2025-07-19 02:20:57.854714	2025-07-19 02:20:57.854714
3277	656	4	2	2025-07-19 02:20:57.854714	2025-07-19 02:20:57.854714
3278	656	5	2	2025-07-19 02:20:57.854714	2025-07-19 02:20:57.854714
3279	657	1	2	2025-07-19 02:20:58.060854	2025-07-19 02:20:58.060854
3280	657	2	2	2025-07-19 02:20:58.060854	2025-07-19 02:20:58.060854
3281	657	3	2	2025-07-19 02:20:58.060854	2025-07-19 02:20:58.060854
3282	657	4	2	2025-07-19 02:20:58.060854	2025-07-19 02:20:58.060854
3283	657	5	2	2025-07-19 02:20:58.060854	2025-07-19 02:20:58.060854
3284	658	1	2	2025-07-19 02:20:58.23729	2025-07-19 02:20:58.23729
3285	658	2	2	2025-07-19 02:20:58.23729	2025-07-19 02:20:58.23729
3286	658	3	2	2025-07-19 02:20:58.23729	2025-07-19 02:20:58.23729
3287	658	4	2	2025-07-19 02:20:58.23729	2025-07-19 02:20:58.23729
3288	658	5	2	2025-07-19 02:20:58.23729	2025-07-19 02:20:58.23729
3289	659	1	2	2025-07-19 02:20:58.411438	2025-07-19 02:20:58.411438
3290	659	2	2	2025-07-19 02:20:58.411438	2025-07-19 02:20:58.411438
3291	659	3	2	2025-07-19 02:20:58.411438	2025-07-19 02:20:58.411438
3292	659	4	2	2025-07-19 02:20:58.411438	2025-07-19 02:20:58.411438
3293	659	5	2	2025-07-19 02:20:58.411438	2025-07-19 02:20:58.411438
3294	660	1	2	2025-07-19 02:20:58.604828	2025-07-19 02:20:58.604828
3295	660	2	2	2025-07-19 02:20:58.604828	2025-07-19 02:20:58.604828
3296	660	3	2	2025-07-19 02:20:58.604828	2025-07-19 02:20:58.604828
3297	660	4	2	2025-07-19 02:20:58.604828	2025-07-19 02:20:58.604828
3298	660	5	2	2025-07-19 02:20:58.604828	2025-07-19 02:20:58.604828
3299	661	1	2	2025-07-19 02:20:58.787284	2025-07-19 02:20:58.787284
3300	661	2	2	2025-07-19 02:20:58.787284	2025-07-19 02:20:58.787284
3301	661	3	2	2025-07-19 02:20:58.787284	2025-07-19 02:20:58.787284
3302	661	4	2	2025-07-19 02:20:58.787284	2025-07-19 02:20:58.787284
3303	661	5	2	2025-07-19 02:20:58.787284	2025-07-19 02:20:58.787284
3304	662	1	2	2025-07-19 02:20:58.948542	2025-07-19 02:20:58.948542
3305	662	2	2	2025-07-19 02:20:58.948542	2025-07-19 02:20:58.948542
3306	662	3	2	2025-07-19 02:20:58.948542	2025-07-19 02:20:58.948542
3307	662	4	2	2025-07-19 02:20:58.948542	2025-07-19 02:20:58.948542
3308	662	5	2	2025-07-19 02:20:58.948542	2025-07-19 02:20:58.948542
3309	663	1	3	2025-07-19 02:20:59.122596	2025-07-19 02:20:59.122596
3310	663	2	3	2025-07-19 02:20:59.122596	2025-07-19 02:20:59.122596
3311	663	3	3	2025-07-19 02:20:59.122596	2025-07-19 02:20:59.122596
3312	663	4	3	2025-07-19 02:20:59.122596	2025-07-19 02:20:59.122596
3313	663	5	3	2025-07-19 02:20:59.122596	2025-07-19 02:20:59.122596
3314	664	1	2	2025-07-19 02:20:59.288249	2025-07-19 02:20:59.288249
3315	664	2	2	2025-07-19 02:20:59.288249	2025-07-19 02:20:59.288249
3316	664	3	2	2025-07-19 02:20:59.288249	2025-07-19 02:20:59.288249
3317	664	4	2	2025-07-19 02:20:59.288249	2025-07-19 02:20:59.288249
3318	664	5	2	2025-07-19 02:20:59.288249	2025-07-19 02:20:59.288249
3319	665	1	2	2025-07-19 02:20:59.570638	2025-07-19 02:20:59.570638
3320	665	2	2	2025-07-19 02:20:59.570638	2025-07-19 02:20:59.570638
3321	665	3	2	2025-07-19 02:20:59.570638	2025-07-19 02:20:59.570638
3322	665	4	2	2025-07-19 02:20:59.570638	2025-07-19 02:20:59.570638
3323	665	5	2	2025-07-19 02:20:59.570638	2025-07-19 02:20:59.570638
3324	666	1	2	2025-07-19 02:20:59.7245	2025-07-19 02:20:59.7245
3325	666	2	2	2025-07-19 02:20:59.7245	2025-07-19 02:20:59.7245
3326	666	3	2	2025-07-19 02:20:59.7245	2025-07-19 02:20:59.7245
3327	666	4	2	2025-07-19 02:20:59.7245	2025-07-19 02:20:59.7245
3328	666	5	2	2025-07-19 02:20:59.7245	2025-07-19 02:20:59.7245
3329	667	1	2	2025-07-19 02:20:59.888884	2025-07-19 02:20:59.888884
3330	667	2	2	2025-07-19 02:20:59.888884	2025-07-19 02:20:59.888884
3331	667	3	2	2025-07-19 02:20:59.888884	2025-07-19 02:20:59.888884
3332	667	4	2	2025-07-19 02:20:59.888884	2025-07-19 02:20:59.888884
3333	667	5	2	2025-07-19 02:20:59.888884	2025-07-19 02:20:59.888884
3334	668	1	2	2025-07-19 02:21:00.040884	2025-07-19 02:21:00.040884
3335	668	2	2	2025-07-19 02:21:00.040884	2025-07-19 02:21:00.040884
3336	668	3	2	2025-07-19 02:21:00.040884	2025-07-19 02:21:00.040884
3337	668	4	2	2025-07-19 02:21:00.040884	2025-07-19 02:21:00.040884
3338	668	5	2	2025-07-19 02:21:00.040884	2025-07-19 02:21:00.040884
3339	669	1	2	2025-07-19 02:21:00.209763	2025-07-19 02:21:00.209763
3340	669	2	2	2025-07-19 02:21:00.209763	2025-07-19 02:21:00.209763
3341	669	3	2	2025-07-19 02:21:00.209763	2025-07-19 02:21:00.209763
3342	669	4	2	2025-07-19 02:21:00.209763	2025-07-19 02:21:00.209763
3343	669	5	2	2025-07-19 02:21:00.209763	2025-07-19 02:21:00.209763
3344	670	1	2	2025-07-19 02:21:00.373722	2025-07-19 02:21:00.373722
3345	670	2	2	2025-07-19 02:21:00.373722	2025-07-19 02:21:00.373722
3346	670	3	2	2025-07-19 02:21:00.373722	2025-07-19 02:21:00.373722
3347	670	4	2	2025-07-19 02:21:00.373722	2025-07-19 02:21:00.373722
3348	670	5	2	2025-07-19 02:21:00.373722	2025-07-19 02:21:00.373722
3349	671	1	2	2025-07-19 02:21:00.528722	2025-07-19 02:21:00.528722
3350	671	2	2	2025-07-19 02:21:00.528722	2025-07-19 02:21:00.528722
3351	671	3	2	2025-07-19 02:21:00.528722	2025-07-19 02:21:00.528722
3352	671	4	2	2025-07-19 02:21:00.528722	2025-07-19 02:21:00.528722
3353	671	5	2	2025-07-19 02:21:00.528722	2025-07-19 02:21:00.528722
3354	672	1	1	2025-07-19 02:21:00.685678	2025-07-19 02:21:00.685678
3355	672	2	1	2025-07-19 02:21:00.685678	2025-07-19 02:21:00.685678
3356	672	3	1	2025-07-19 02:21:00.685678	2025-07-19 02:21:00.685678
3357	672	4	1	2025-07-19 02:21:00.685678	2025-07-19 02:21:00.685678
3358	672	5	1	2025-07-19 02:21:00.685678	2025-07-19 02:21:00.685678
3359	673	1	2	2025-07-19 02:21:00.837795	2025-07-19 02:21:00.837795
3360	673	2	2	2025-07-19 02:21:00.837795	2025-07-19 02:21:00.837795
3361	673	3	2	2025-07-19 02:21:00.837795	2025-07-19 02:21:00.837795
3362	673	4	2	2025-07-19 02:21:00.837795	2025-07-19 02:21:00.837795
3363	673	5	2	2025-07-19 02:21:00.837795	2025-07-19 02:21:00.837795
3364	674	1	2	2025-07-19 02:21:00.997175	2025-07-19 02:21:00.997175
3365	674	2	2	2025-07-19 02:21:00.997175	2025-07-19 02:21:00.997175
3366	674	3	2	2025-07-19 02:21:00.997175	2025-07-19 02:21:00.997175
3367	674	4	2	2025-07-19 02:21:00.997175	2025-07-19 02:21:00.997175
3368	674	5	2	2025-07-19 02:21:00.997175	2025-07-19 02:21:00.997175
3369	675	1	1	2025-07-19 02:21:01.152882	2025-07-19 02:21:01.152882
3370	675	2	1	2025-07-19 02:21:01.152882	2025-07-19 02:21:01.152882
3371	675	3	1	2025-07-19 02:21:01.152882	2025-07-19 02:21:01.152882
3372	675	4	1	2025-07-19 02:21:01.152882	2025-07-19 02:21:01.152882
3373	675	5	1	2025-07-19 02:21:01.152882	2025-07-19 02:21:01.152882
3374	676	1	2	2025-07-19 02:21:01.312881	2025-07-19 02:21:01.312881
3375	676	2	2	2025-07-19 02:21:01.312881	2025-07-19 02:21:01.312881
3376	676	3	2	2025-07-19 02:21:01.312881	2025-07-19 02:21:01.312881
3377	676	4	2	2025-07-19 02:21:01.312881	2025-07-19 02:21:01.312881
3378	676	5	2	2025-07-19 02:21:01.312881	2025-07-19 02:21:01.312881
3379	677	1	2	2025-07-19 02:21:01.545213	2025-07-19 02:21:01.545213
3380	677	2	2	2025-07-19 02:21:01.545213	2025-07-19 02:21:01.545213
3381	677	3	2	2025-07-19 02:21:01.545213	2025-07-19 02:21:01.545213
3382	677	4	2	2025-07-19 02:21:01.545213	2025-07-19 02:21:01.545213
3383	677	5	2	2025-07-19 02:21:01.545213	2025-07-19 02:21:01.545213
3384	678	1	2	2025-07-19 02:21:01.814646	2025-07-19 02:21:01.814646
3385	678	2	2	2025-07-19 02:21:01.814646	2025-07-19 02:21:01.814646
3386	678	3	2	2025-07-19 02:21:01.814646	2025-07-19 02:21:01.814646
3387	678	4	2	2025-07-19 02:21:01.814646	2025-07-19 02:21:01.814646
3388	678	5	2	2025-07-19 02:21:01.814646	2025-07-19 02:21:01.814646
3389	679	1	2	2025-07-19 02:21:02.068594	2025-07-19 02:21:02.068594
3390	679	2	2	2025-07-19 02:21:02.068594	2025-07-19 02:21:02.068594
3391	679	3	2	2025-07-19 02:21:02.068594	2025-07-19 02:21:02.068594
3392	679	4	2	2025-07-19 02:21:02.068594	2025-07-19 02:21:02.068594
3393	679	5	2	2025-07-19 02:21:02.068594	2025-07-19 02:21:02.068594
3394	680	1	2	2025-07-19 02:21:02.253482	2025-07-19 02:21:02.253482
3395	680	2	2	2025-07-19 02:21:02.253482	2025-07-19 02:21:02.253482
3396	680	3	2	2025-07-19 02:21:02.253482	2025-07-19 02:21:02.253482
3397	680	4	2	2025-07-19 02:21:02.253482	2025-07-19 02:21:02.253482
3398	680	5	2	2025-07-19 02:21:02.253482	2025-07-19 02:21:02.253482
3399	681	1	2	2025-07-19 02:21:02.408944	2025-07-19 02:21:02.408944
3400	681	2	2	2025-07-19 02:21:02.408944	2025-07-19 02:21:02.408944
3401	681	3	2	2025-07-19 02:21:02.408944	2025-07-19 02:21:02.408944
3402	681	4	2	2025-07-19 02:21:02.408944	2025-07-19 02:21:02.408944
3403	681	5	2	2025-07-19 02:21:02.408944	2025-07-19 02:21:02.408944
3404	682	1	2	2025-07-19 02:21:02.570211	2025-07-19 02:21:02.570211
3405	682	2	2	2025-07-19 02:21:02.570211	2025-07-19 02:21:02.570211
3406	682	3	2	2025-07-19 02:21:02.570211	2025-07-19 02:21:02.570211
3407	682	4	2	2025-07-19 02:21:02.570211	2025-07-19 02:21:02.570211
3408	682	5	2	2025-07-19 02:21:02.570211	2025-07-19 02:21:02.570211
3409	683	1	2	2025-07-19 02:21:02.792342	2025-07-19 02:21:02.792342
3410	683	2	2	2025-07-19 02:21:02.792342	2025-07-19 02:21:02.792342
3411	683	3	2	2025-07-19 02:21:02.792342	2025-07-19 02:21:02.792342
3412	683	4	2	2025-07-19 02:21:02.792342	2025-07-19 02:21:02.792342
3413	683	5	2	2025-07-19 02:21:02.792342	2025-07-19 02:21:02.792342
3414	684	1	2	2025-07-19 02:21:02.982702	2025-07-19 02:21:02.982702
3415	684	2	2	2025-07-19 02:21:02.982702	2025-07-19 02:21:02.982702
3416	684	3	2	2025-07-19 02:21:02.982702	2025-07-19 02:21:02.982702
3417	684	4	2	2025-07-19 02:21:02.982702	2025-07-19 02:21:02.982702
3418	684	5	2	2025-07-19 02:21:02.982702	2025-07-19 02:21:02.982702
3419	685	1	2	2025-07-19 02:21:03.255539	2025-07-19 02:21:03.255539
3420	685	2	2	2025-07-19 02:21:03.255539	2025-07-19 02:21:03.255539
3421	685	3	2	2025-07-19 02:21:03.255539	2025-07-19 02:21:03.255539
3422	685	4	2	2025-07-19 02:21:03.255539	2025-07-19 02:21:03.255539
3423	685	5	2	2025-07-19 02:21:03.255539	2025-07-19 02:21:03.255539
3424	686	1	2	2025-07-19 02:21:03.635411	2025-07-19 02:21:03.635411
3425	686	2	2	2025-07-19 02:21:03.635411	2025-07-19 02:21:03.635411
3426	686	3	2	2025-07-19 02:21:03.635411	2025-07-19 02:21:03.635411
3427	686	4	2	2025-07-19 02:21:03.635411	2025-07-19 02:21:03.635411
3428	686	5	2	2025-07-19 02:21:03.635411	2025-07-19 02:21:03.635411
3429	687	1	2	2025-07-19 02:21:03.984629	2025-07-19 02:21:03.984629
3430	687	2	2	2025-07-19 02:21:03.984629	2025-07-19 02:21:03.984629
3431	687	3	2	2025-07-19 02:21:03.984629	2025-07-19 02:21:03.984629
3432	687	4	2	2025-07-19 02:21:03.984629	2025-07-19 02:21:03.984629
3433	687	5	2	2025-07-19 02:21:03.984629	2025-07-19 02:21:03.984629
3434	688	1	2	2025-07-19 02:21:04.171487	2025-07-19 02:21:04.171487
3435	688	2	2	2025-07-19 02:21:04.171487	2025-07-19 02:21:04.171487
3436	688	3	2	2025-07-19 02:21:04.171487	2025-07-19 02:21:04.171487
3437	688	4	2	2025-07-19 02:21:04.171487	2025-07-19 02:21:04.171487
3438	688	5	2	2025-07-19 02:21:04.171487	2025-07-19 02:21:04.171487
3439	689	1	2	2025-07-19 02:21:04.336917	2025-07-19 02:21:04.336917
3440	689	2	2	2025-07-19 02:21:04.336917	2025-07-19 02:21:04.336917
3441	689	3	2	2025-07-19 02:21:04.336917	2025-07-19 02:21:04.336917
3442	689	4	2	2025-07-19 02:21:04.336917	2025-07-19 02:21:04.336917
3443	689	5	2	2025-07-19 02:21:04.336917	2025-07-19 02:21:04.336917
3444	690	1	2	2025-07-19 02:21:04.506851	2025-07-19 02:21:04.506851
3445	690	2	2	2025-07-19 02:21:04.506851	2025-07-19 02:21:04.506851
3446	690	3	2	2025-07-19 02:21:04.506851	2025-07-19 02:21:04.506851
3447	690	4	2	2025-07-19 02:21:04.506851	2025-07-19 02:21:04.506851
3448	690	5	2	2025-07-19 02:21:04.506851	2025-07-19 02:21:04.506851
3449	691	1	2	2025-07-19 02:21:04.662715	2025-07-19 02:21:04.662715
3450	691	2	2	2025-07-19 02:21:04.662715	2025-07-19 02:21:04.662715
3451	691	3	2	2025-07-19 02:21:04.662715	2025-07-19 02:21:04.662715
3452	691	4	2	2025-07-19 02:21:04.662715	2025-07-19 02:21:04.662715
3453	691	5	2	2025-07-19 02:21:04.662715	2025-07-19 02:21:04.662715
3454	692	1	2	2025-07-19 02:21:04.813092	2025-07-19 02:21:04.813092
3455	692	2	2	2025-07-19 02:21:04.813092	2025-07-19 02:21:04.813092
3456	692	3	2	2025-07-19 02:21:04.813092	2025-07-19 02:21:04.813092
3457	692	4	2	2025-07-19 02:21:04.813092	2025-07-19 02:21:04.813092
3458	692	5	2	2025-07-19 02:21:04.813092	2025-07-19 02:21:04.813092
3459	693	1	2	2025-07-19 02:21:04.974875	2025-07-19 02:21:04.974875
3460	693	2	2	2025-07-19 02:21:04.974875	2025-07-19 02:21:04.974875
3461	693	3	2	2025-07-19 02:21:04.974875	2025-07-19 02:21:04.974875
3462	693	4	2	2025-07-19 02:21:04.974875	2025-07-19 02:21:04.974875
3463	693	5	2	2025-07-19 02:21:04.974875	2025-07-19 02:21:04.974875
3464	694	1	2	2025-07-19 02:21:05.12402	2025-07-19 02:21:05.12402
3465	694	2	2	2025-07-19 02:21:05.12402	2025-07-19 02:21:05.12402
3466	694	3	2	2025-07-19 02:21:05.12402	2025-07-19 02:21:05.12402
3467	694	4	2	2025-07-19 02:21:05.12402	2025-07-19 02:21:05.12402
3468	694	5	2	2025-07-19 02:21:05.12402	2025-07-19 02:21:05.12402
3469	695	1	2	2025-07-19 02:21:05.277853	2025-07-19 02:21:05.277853
3470	695	2	2	2025-07-19 02:21:05.277853	2025-07-19 02:21:05.277853
3471	695	3	2	2025-07-19 02:21:05.277853	2025-07-19 02:21:05.277853
3472	695	4	2	2025-07-19 02:21:05.277853	2025-07-19 02:21:05.277853
3473	695	5	2	2025-07-19 02:21:05.277853	2025-07-19 02:21:05.277853
3474	696	1	2	2025-07-19 02:21:05.433673	2025-07-19 02:21:05.433673
3475	696	2	2	2025-07-19 02:21:05.433673	2025-07-19 02:21:05.433673
3476	696	3	2	2025-07-19 02:21:05.433673	2025-07-19 02:21:05.433673
3477	696	4	2	2025-07-19 02:21:05.433673	2025-07-19 02:21:05.433673
3478	696	5	2	2025-07-19 02:21:05.433673	2025-07-19 02:21:05.433673
3479	697	1	2	2025-07-19 02:21:05.585443	2025-07-19 02:21:05.585443
3480	697	2	2	2025-07-19 02:21:05.585443	2025-07-19 02:21:05.585443
3481	697	3	2	2025-07-19 02:21:05.585443	2025-07-19 02:21:05.585443
3482	697	4	2	2025-07-19 02:21:05.585443	2025-07-19 02:21:05.585443
3483	697	5	2	2025-07-19 02:21:05.585443	2025-07-19 02:21:05.585443
3484	698	1	2	2025-07-19 02:21:05.754546	2025-07-19 02:21:05.754546
3485	698	2	2	2025-07-19 02:21:05.754546	2025-07-19 02:21:05.754546
3486	698	3	2	2025-07-19 02:21:05.754546	2025-07-19 02:21:05.754546
3487	698	4	2	2025-07-19 02:21:05.754546	2025-07-19 02:21:05.754546
3488	698	5	2	2025-07-19 02:21:05.754546	2025-07-19 02:21:05.754546
3489	699	1	2	2025-07-19 02:21:05.928897	2025-07-19 02:21:05.928897
3490	699	2	2	2025-07-19 02:21:05.928897	2025-07-19 02:21:05.928897
3491	699	3	2	2025-07-19 02:21:05.928897	2025-07-19 02:21:05.928897
3492	699	4	2	2025-07-19 02:21:05.928897	2025-07-19 02:21:05.928897
3493	699	5	2	2025-07-19 02:21:05.928897	2025-07-19 02:21:05.928897
3494	700	1	2	2025-07-19 02:21:06.100441	2025-07-19 02:21:06.100441
3495	700	2	2	2025-07-19 02:21:06.100441	2025-07-19 02:21:06.100441
3496	700	3	2	2025-07-19 02:21:06.100441	2025-07-19 02:21:06.100441
3497	700	4	2	2025-07-19 02:21:06.100441	2025-07-19 02:21:06.100441
3498	700	5	2	2025-07-19 02:21:06.100441	2025-07-19 02:21:06.100441
3499	701	1	2	2025-07-19 02:21:06.273144	2025-07-19 02:21:06.273144
3500	701	2	2	2025-07-19 02:21:06.273144	2025-07-19 02:21:06.273144
3501	701	3	2	2025-07-19 02:21:06.273144	2025-07-19 02:21:06.273144
3502	701	4	2	2025-07-19 02:21:06.273144	2025-07-19 02:21:06.273144
3503	701	5	2	2025-07-19 02:21:06.273144	2025-07-19 02:21:06.273144
3504	702	1	2	2025-07-19 02:21:06.432908	2025-07-19 02:21:06.432908
3505	702	2	2	2025-07-19 02:21:06.432908	2025-07-19 02:21:06.432908
3506	702	3	2	2025-07-19 02:21:06.432908	2025-07-19 02:21:06.432908
3507	702	4	2	2025-07-19 02:21:06.432908	2025-07-19 02:21:06.432908
3508	702	5	2	2025-07-19 02:21:06.432908	2025-07-19 02:21:06.432908
3509	703	1	2	2025-07-19 02:21:06.587602	2025-07-19 02:21:06.587602
3510	703	2	2	2025-07-19 02:21:06.587602	2025-07-19 02:21:06.587602
3511	703	3	2	2025-07-19 02:21:06.587602	2025-07-19 02:21:06.587602
3512	703	4	2	2025-07-19 02:21:06.587602	2025-07-19 02:21:06.587602
3513	703	5	2	2025-07-19 02:21:06.587602	2025-07-19 02:21:06.587602
3514	704	1	2	2025-07-19 02:21:06.752376	2025-07-19 02:21:06.752376
3515	704	2	2	2025-07-19 02:21:06.752376	2025-07-19 02:21:06.752376
3516	704	3	2	2025-07-19 02:21:06.752376	2025-07-19 02:21:06.752376
3517	704	4	2	2025-07-19 02:21:06.752376	2025-07-19 02:21:06.752376
3518	704	5	2	2025-07-19 02:21:06.752376	2025-07-19 02:21:06.752376
3519	705	1	2	2025-07-19 02:21:06.900325	2025-07-19 02:21:06.900325
3520	705	2	2	2025-07-19 02:21:06.900325	2025-07-19 02:21:06.900325
3521	705	3	2	2025-07-19 02:21:06.900325	2025-07-19 02:21:06.900325
3522	705	4	2	2025-07-19 02:21:06.900325	2025-07-19 02:21:06.900325
3523	705	5	2	2025-07-19 02:21:06.900325	2025-07-19 02:21:06.900325
3524	706	1	2	2025-07-19 02:21:07.056158	2025-07-19 02:21:07.056158
3525	706	2	2	2025-07-19 02:21:07.056158	2025-07-19 02:21:07.056158
3526	706	3	2	2025-07-19 02:21:07.056158	2025-07-19 02:21:07.056158
3527	706	4	2	2025-07-19 02:21:07.056158	2025-07-19 02:21:07.056158
3528	706	5	2	2025-07-19 02:21:07.056158	2025-07-19 02:21:07.056158
3529	707	1	2	2025-07-19 02:21:07.20896	2025-07-19 02:21:07.20896
3530	707	2	2	2025-07-19 02:21:07.20896	2025-07-19 02:21:07.20896
3531	707	3	2	2025-07-19 02:21:07.20896	2025-07-19 02:21:07.20896
3532	707	4	2	2025-07-19 02:21:07.20896	2025-07-19 02:21:07.20896
3533	707	5	2	2025-07-19 02:21:07.20896	2025-07-19 02:21:07.20896
3534	708	1	2	2025-07-19 02:21:07.363847	2025-07-19 02:21:07.363847
3535	708	2	2	2025-07-19 02:21:07.363847	2025-07-19 02:21:07.363847
3536	708	3	2	2025-07-19 02:21:07.363847	2025-07-19 02:21:07.363847
3537	708	4	2	2025-07-19 02:21:07.363847	2025-07-19 02:21:07.363847
3538	708	5	2	2025-07-19 02:21:07.363847	2025-07-19 02:21:07.363847
3539	709	1	2	2025-07-19 02:21:07.512514	2025-07-19 02:21:07.512514
3540	709	2	2	2025-07-19 02:21:07.512514	2025-07-19 02:21:07.512514
3541	709	3	2	2025-07-19 02:21:07.512514	2025-07-19 02:21:07.512514
3542	709	4	2	2025-07-19 02:21:07.512514	2025-07-19 02:21:07.512514
3543	709	5	2	2025-07-19 02:21:07.512514	2025-07-19 02:21:07.512514
3544	710	1	2	2025-07-19 02:21:07.678417	2025-07-19 02:21:07.678417
3545	710	2	2	2025-07-19 02:21:07.678417	2025-07-19 02:21:07.678417
3546	710	3	2	2025-07-19 02:21:07.678417	2025-07-19 02:21:07.678417
3547	710	4	2	2025-07-19 02:21:07.678417	2025-07-19 02:21:07.678417
3548	710	5	2	2025-07-19 02:21:07.678417	2025-07-19 02:21:07.678417
3549	711	1	2	2025-07-19 02:21:07.843929	2025-07-19 02:21:07.843929
3550	711	2	2	2025-07-19 02:21:07.843929	2025-07-19 02:21:07.843929
3551	711	3	2	2025-07-19 02:21:07.843929	2025-07-19 02:21:07.843929
3552	711	4	2	2025-07-19 02:21:07.843929	2025-07-19 02:21:07.843929
3553	711	5	2	2025-07-19 02:21:07.843929	2025-07-19 02:21:07.843929
3554	712	1	2	2025-07-19 02:21:07.990992	2025-07-19 02:21:07.990992
3555	712	2	2	2025-07-19 02:21:07.990992	2025-07-19 02:21:07.990992
3556	712	3	2	2025-07-19 02:21:07.990992	2025-07-19 02:21:07.990992
3557	712	4	2	2025-07-19 02:21:07.990992	2025-07-19 02:21:07.990992
3558	712	5	2	2025-07-19 02:21:07.990992	2025-07-19 02:21:07.990992
3559	713	1	2	2025-07-19 02:21:08.18198	2025-07-19 02:21:08.18198
3560	713	2	2	2025-07-19 02:21:08.18198	2025-07-19 02:21:08.18198
3561	713	3	2	2025-07-19 02:21:08.18198	2025-07-19 02:21:08.18198
3562	713	4	2	2025-07-19 02:21:08.18198	2025-07-19 02:21:08.18198
3563	713	5	2	2025-07-19 02:21:08.18198	2025-07-19 02:21:08.18198
3564	714	1	2	2025-07-19 02:21:08.350219	2025-07-19 02:21:08.350219
3565	714	2	2	2025-07-19 02:21:08.350219	2025-07-19 02:21:08.350219
3566	714	3	2	2025-07-19 02:21:08.350219	2025-07-19 02:21:08.350219
3567	714	4	2	2025-07-19 02:21:08.350219	2025-07-19 02:21:08.350219
3568	714	5	2	2025-07-19 02:21:08.350219	2025-07-19 02:21:08.350219
3569	715	1	2	2025-07-19 02:21:08.504312	2025-07-19 02:21:08.504312
3570	715	2	2	2025-07-19 02:21:08.504312	2025-07-19 02:21:08.504312
3571	715	3	2	2025-07-19 02:21:08.504312	2025-07-19 02:21:08.504312
3572	715	4	2	2025-07-19 02:21:08.504312	2025-07-19 02:21:08.504312
3573	715	5	2	2025-07-19 02:21:08.504312	2025-07-19 02:21:08.504312
3574	716	1	2	2025-07-19 02:21:08.659857	2025-07-19 02:21:08.659857
3575	716	2	2	2025-07-19 02:21:08.659857	2025-07-19 02:21:08.659857
3576	716	3	2	2025-07-19 02:21:08.659857	2025-07-19 02:21:08.659857
3577	716	4	2	2025-07-19 02:21:08.659857	2025-07-19 02:21:08.659857
3578	716	5	2	2025-07-19 02:21:08.659857	2025-07-19 02:21:08.659857
3579	717	1	2	2025-07-19 02:21:08.826807	2025-07-19 02:21:08.826807
3580	717	2	2	2025-07-19 02:21:08.826807	2025-07-19 02:21:08.826807
3581	717	3	2	2025-07-19 02:21:08.826807	2025-07-19 02:21:08.826807
3582	717	4	2	2025-07-19 02:21:08.826807	2025-07-19 02:21:08.826807
3583	717	5	2	2025-07-19 02:21:08.826807	2025-07-19 02:21:08.826807
3584	718	1	2	2025-07-19 02:21:08.971953	2025-07-19 02:21:08.971953
3585	718	2	2	2025-07-19 02:21:08.971953	2025-07-19 02:21:08.971953
3586	718	3	2	2025-07-19 02:21:08.971953	2025-07-19 02:21:08.971953
3587	718	4	2	2025-07-19 02:21:08.971953	2025-07-19 02:21:08.971953
3588	718	5	2	2025-07-19 02:21:08.971953	2025-07-19 02:21:08.971953
3589	719	1	2	2025-07-19 02:21:09.125077	2025-07-19 02:21:09.125077
3590	719	2	2	2025-07-19 02:21:09.125077	2025-07-19 02:21:09.125077
3591	719	3	2	2025-07-19 02:21:09.125077	2025-07-19 02:21:09.125077
3592	719	4	2	2025-07-19 02:21:09.125077	2025-07-19 02:21:09.125077
3593	719	5	2	2025-07-19 02:21:09.125077	2025-07-19 02:21:09.125077
3594	720	1	2	2025-07-19 02:21:09.277771	2025-07-19 02:21:09.277771
3595	720	2	2	2025-07-19 02:21:09.277771	2025-07-19 02:21:09.277771
3596	720	3	2	2025-07-19 02:21:09.277771	2025-07-19 02:21:09.277771
3597	720	4	2	2025-07-19 02:21:09.277771	2025-07-19 02:21:09.277771
3598	720	5	2	2025-07-19 02:21:09.277771	2025-07-19 02:21:09.277771
3599	721	1	2	2025-07-19 02:21:09.429122	2025-07-19 02:21:09.429122
3600	721	2	2	2025-07-19 02:21:09.429122	2025-07-19 02:21:09.429122
3601	721	3	2	2025-07-19 02:21:09.429122	2025-07-19 02:21:09.429122
3602	721	4	2	2025-07-19 02:21:09.429122	2025-07-19 02:21:09.429122
3603	721	5	2	2025-07-19 02:21:09.429122	2025-07-19 02:21:09.429122
3604	722	1	2	2025-07-19 02:21:09.586268	2025-07-19 02:21:09.586268
3605	722	2	2	2025-07-19 02:21:09.586268	2025-07-19 02:21:09.586268
3606	722	3	2	2025-07-19 02:21:09.586268	2025-07-19 02:21:09.586268
3607	722	4	2	2025-07-19 02:21:09.586268	2025-07-19 02:21:09.586268
3608	722	5	2	2025-07-19 02:21:09.586268	2025-07-19 02:21:09.586268
3609	723	1	2	2025-07-19 02:21:09.733514	2025-07-19 02:21:09.733514
3610	723	2	2	2025-07-19 02:21:09.733514	2025-07-19 02:21:09.733514
3611	723	3	2	2025-07-19 02:21:09.733514	2025-07-19 02:21:09.733514
3612	723	4	2	2025-07-19 02:21:09.733514	2025-07-19 02:21:09.733514
3613	723	5	2	2025-07-19 02:21:09.733514	2025-07-19 02:21:09.733514
3614	724	1	2	2025-07-19 02:21:09.885198	2025-07-19 02:21:09.885198
3615	724	2	2	2025-07-19 02:21:09.885198	2025-07-19 02:21:09.885198
3616	724	3	2	2025-07-19 02:21:09.885198	2025-07-19 02:21:09.885198
3617	724	4	2	2025-07-19 02:21:09.885198	2025-07-19 02:21:09.885198
3618	724	5	2	2025-07-19 02:21:09.885198	2025-07-19 02:21:09.885198
3619	725	1	2	2025-07-19 02:21:10.035053	2025-07-19 02:21:10.035053
3620	725	2	2	2025-07-19 02:21:10.035053	2025-07-19 02:21:10.035053
3621	725	3	2	2025-07-19 02:21:10.035053	2025-07-19 02:21:10.035053
3622	725	4	2	2025-07-19 02:21:10.035053	2025-07-19 02:21:10.035053
3623	725	5	2	2025-07-19 02:21:10.035053	2025-07-19 02:21:10.035053
3624	726	1	2	2025-07-19 02:21:10.203631	2025-07-19 02:21:10.203631
3625	726	2	2	2025-07-19 02:21:10.203631	2025-07-19 02:21:10.203631
3626	726	3	2	2025-07-19 02:21:10.203631	2025-07-19 02:21:10.203631
3627	726	4	2	2025-07-19 02:21:10.203631	2025-07-19 02:21:10.203631
3628	726	5	2	2025-07-19 02:21:10.203631	2025-07-19 02:21:10.203631
3629	727	1	2	2025-07-19 02:21:10.361369	2025-07-19 02:21:10.361369
3630	727	2	2	2025-07-19 02:21:10.361369	2025-07-19 02:21:10.361369
3631	727	3	2	2025-07-19 02:21:10.361369	2025-07-19 02:21:10.361369
3632	727	4	2	2025-07-19 02:21:10.361369	2025-07-19 02:21:10.361369
3633	727	5	2	2025-07-19 02:21:10.361369	2025-07-19 02:21:10.361369
3634	728	1	2	2025-07-19 02:21:10.532532	2025-07-19 02:21:10.532532
3635	728	2	2	2025-07-19 02:21:10.532532	2025-07-19 02:21:10.532532
3636	728	3	2	2025-07-19 02:21:10.532532	2025-07-19 02:21:10.532532
3637	728	4	2	2025-07-19 02:21:10.532532	2025-07-19 02:21:10.532532
3638	728	5	2	2025-07-19 02:21:10.532532	2025-07-19 02:21:10.532532
3639	729	1	2	2025-07-19 02:21:10.724935	2025-07-19 02:21:10.724935
3640	729	2	2	2025-07-19 02:21:10.724935	2025-07-19 02:21:10.724935
3641	729	3	2	2025-07-19 02:21:10.724935	2025-07-19 02:21:10.724935
3642	729	4	2	2025-07-19 02:21:10.724935	2025-07-19 02:21:10.724935
3643	729	5	2	2025-07-19 02:21:10.724935	2025-07-19 02:21:10.724935
3644	730	1	2	2025-07-19 02:21:10.918131	2025-07-19 02:21:10.918131
3645	730	2	2	2025-07-19 02:21:10.918131	2025-07-19 02:21:10.918131
3646	730	3	2	2025-07-19 02:21:10.918131	2025-07-19 02:21:10.918131
3647	730	4	2	2025-07-19 02:21:10.918131	2025-07-19 02:21:10.918131
3648	730	5	2	2025-07-19 02:21:10.918131	2025-07-19 02:21:10.918131
3649	731	1	2	2025-07-19 02:21:11.104797	2025-07-19 02:21:11.104797
3650	731	2	2	2025-07-19 02:21:11.104797	2025-07-19 02:21:11.104797
3651	731	3	2	2025-07-19 02:21:11.104797	2025-07-19 02:21:11.104797
3652	731	4	2	2025-07-19 02:21:11.104797	2025-07-19 02:21:11.104797
3653	731	5	2	2025-07-19 02:21:11.104797	2025-07-19 02:21:11.104797
3654	732	1	2	2025-07-19 02:21:11.253518	2025-07-19 02:21:11.253518
3655	732	2	2	2025-07-19 02:21:11.253518	2025-07-19 02:21:11.253518
3656	732	3	2	2025-07-19 02:21:11.253518	2025-07-19 02:21:11.253518
3657	732	4	2	2025-07-19 02:21:11.253518	2025-07-19 02:21:11.253518
3658	732	5	2	2025-07-19 02:21:11.253518	2025-07-19 02:21:11.253518
3659	733	1	2	2025-07-19 02:21:11.424871	2025-07-19 02:21:11.424871
3660	733	2	2	2025-07-19 02:21:11.424871	2025-07-19 02:21:11.424871
3661	733	3	2	2025-07-19 02:21:11.424871	2025-07-19 02:21:11.424871
3662	733	4	2	2025-07-19 02:21:11.424871	2025-07-19 02:21:11.424871
3663	733	5	2	2025-07-19 02:21:11.424871	2025-07-19 02:21:11.424871
3664	734	1	2	2025-07-19 02:21:11.575628	2025-07-19 02:21:11.575628
3665	734	2	2	2025-07-19 02:21:11.575628	2025-07-19 02:21:11.575628
3666	734	3	2	2025-07-19 02:21:11.575628	2025-07-19 02:21:11.575628
3667	734	4	2	2025-07-19 02:21:11.575628	2025-07-19 02:21:11.575628
3668	734	5	2	2025-07-19 02:21:11.575628	2025-07-19 02:21:11.575628
3669	735	1	2	2025-07-19 02:21:11.727706	2025-07-19 02:21:11.727706
3670	735	2	2	2025-07-19 02:21:11.727706	2025-07-19 02:21:11.727706
3671	735	3	2	2025-07-19 02:21:11.727706	2025-07-19 02:21:11.727706
3672	735	4	2	2025-07-19 02:21:11.727706	2025-07-19 02:21:11.727706
3673	735	5	2	2025-07-19 02:21:11.727706	2025-07-19 02:21:11.727706
3674	736	1	2	2025-07-19 02:21:11.881537	2025-07-19 02:21:11.881537
3675	736	2	2	2025-07-19 02:21:11.881537	2025-07-19 02:21:11.881537
3676	736	3	2	2025-07-19 02:21:11.881537	2025-07-19 02:21:11.881537
3677	736	4	2	2025-07-19 02:21:11.881537	2025-07-19 02:21:11.881537
3678	736	5	2	2025-07-19 02:21:11.881537	2025-07-19 02:21:11.881537
3679	737	1	2	2025-07-19 02:21:12.046177	2025-07-19 02:21:12.046177
3680	737	2	2	2025-07-19 02:21:12.046177	2025-07-19 02:21:12.046177
3681	737	3	2	2025-07-19 02:21:12.046177	2025-07-19 02:21:12.046177
3682	737	4	2	2025-07-19 02:21:12.046177	2025-07-19 02:21:12.046177
3683	737	5	2	2025-07-19 02:21:12.046177	2025-07-19 02:21:12.046177
3684	738	1	2	2025-07-19 02:21:12.203621	2025-07-19 02:21:12.203621
3685	738	2	2	2025-07-19 02:21:12.203621	2025-07-19 02:21:12.203621
3686	738	3	2	2025-07-19 02:21:12.203621	2025-07-19 02:21:12.203621
3687	738	4	2	2025-07-19 02:21:12.203621	2025-07-19 02:21:12.203621
3688	738	5	2	2025-07-19 02:21:12.203621	2025-07-19 02:21:12.203621
3689	739	1	2	2025-07-19 02:21:12.367178	2025-07-19 02:21:12.367178
3690	739	2	2	2025-07-19 02:21:12.367178	2025-07-19 02:21:12.367178
3691	739	3	2	2025-07-19 02:21:12.367178	2025-07-19 02:21:12.367178
3692	739	4	2	2025-07-19 02:21:12.367178	2025-07-19 02:21:12.367178
3693	739	5	2	2025-07-19 02:21:12.367178	2025-07-19 02:21:12.367178
3694	740	1	2	2025-07-19 02:21:12.527452	2025-07-19 02:21:12.527452
3695	740	2	2	2025-07-19 02:21:12.527452	2025-07-19 02:21:12.527452
3696	740	3	2	2025-07-19 02:21:12.527452	2025-07-19 02:21:12.527452
3697	740	4	2	2025-07-19 02:21:12.527452	2025-07-19 02:21:12.527452
3698	740	5	2	2025-07-19 02:21:12.527452	2025-07-19 02:21:12.527452
3699	741	1	2	2025-07-19 02:21:12.677364	2025-07-19 02:21:12.677364
3700	741	2	2	2025-07-19 02:21:12.677364	2025-07-19 02:21:12.677364
3701	741	3	2	2025-07-19 02:21:12.677364	2025-07-19 02:21:12.677364
3702	741	4	2	2025-07-19 02:21:12.677364	2025-07-19 02:21:12.677364
3703	741	5	2	2025-07-19 02:21:12.677364	2025-07-19 02:21:12.677364
3704	742	1	2	2025-07-19 02:21:12.833146	2025-07-19 02:21:12.833146
3705	742	2	2	2025-07-19 02:21:12.833146	2025-07-19 02:21:12.833146
3706	742	3	2	2025-07-19 02:21:12.833146	2025-07-19 02:21:12.833146
3707	742	4	2	2025-07-19 02:21:12.833146	2025-07-19 02:21:12.833146
3708	742	5	2	2025-07-19 02:21:12.833146	2025-07-19 02:21:12.833146
3709	743	1	2	2025-07-19 02:21:12.985608	2025-07-19 02:21:12.985608
3710	743	2	2	2025-07-19 02:21:12.985608	2025-07-19 02:21:12.985608
3711	743	3	2	2025-07-19 02:21:12.985608	2025-07-19 02:21:12.985608
3712	743	4	2	2025-07-19 02:21:12.985608	2025-07-19 02:21:12.985608
3713	743	5	2	2025-07-19 02:21:12.985608	2025-07-19 02:21:12.985608
3714	744	1	2	2025-07-19 02:21:13.134901	2025-07-19 02:21:13.134901
3715	744	2	2	2025-07-19 02:21:13.134901	2025-07-19 02:21:13.134901
3716	744	3	2	2025-07-19 02:21:13.134901	2025-07-19 02:21:13.134901
3717	744	4	2	2025-07-19 02:21:13.134901	2025-07-19 02:21:13.134901
3718	744	5	2	2025-07-19 02:21:13.134901	2025-07-19 02:21:13.134901
3719	745	1	2	2025-07-19 02:21:13.312876	2025-07-19 02:21:13.312876
3720	745	2	2	2025-07-19 02:21:13.312876	2025-07-19 02:21:13.312876
3721	745	3	2	2025-07-19 02:21:13.312876	2025-07-19 02:21:13.312876
3722	745	4	2	2025-07-19 02:21:13.312876	2025-07-19 02:21:13.312876
3723	745	5	2	2025-07-19 02:21:13.312876	2025-07-19 02:21:13.312876
3724	746	1	5	2025-07-19 02:21:13.466156	2025-07-19 02:21:13.466156
3725	746	2	5	2025-07-19 02:21:13.466156	2025-07-19 02:21:13.466156
3726	746	3	5	2025-07-19 02:21:13.466156	2025-07-19 02:21:13.466156
3727	746	4	5	2025-07-19 02:21:13.466156	2025-07-19 02:21:13.466156
3728	746	5	5	2025-07-19 02:21:13.466156	2025-07-19 02:21:13.466156
3729	747	1	2	2025-07-19 02:21:13.623965	2025-07-19 02:21:13.623965
3730	747	2	2	2025-07-19 02:21:13.623965	2025-07-19 02:21:13.623965
3731	747	3	2	2025-07-19 02:21:13.623965	2025-07-19 02:21:13.623965
3732	747	4	2	2025-07-19 02:21:13.623965	2025-07-19 02:21:13.623965
3733	747	5	2	2025-07-19 02:21:13.623965	2025-07-19 02:21:13.623965
3734	748	1	2	2025-07-19 02:21:13.789869	2025-07-19 02:21:13.789869
3735	748	2	2	2025-07-19 02:21:13.789869	2025-07-19 02:21:13.789869
3736	748	3	2	2025-07-19 02:21:13.789869	2025-07-19 02:21:13.789869
3737	748	4	2	2025-07-19 02:21:13.789869	2025-07-19 02:21:13.789869
3738	748	5	2	2025-07-19 02:21:13.789869	2025-07-19 02:21:13.789869
3739	749	1	2	2025-07-19 02:21:13.94535	2025-07-19 02:21:13.94535
3740	749	2	2	2025-07-19 02:21:13.94535	2025-07-19 02:21:13.94535
3741	749	3	2	2025-07-19 02:21:13.94535	2025-07-19 02:21:13.94535
3742	749	4	2	2025-07-19 02:21:13.94535	2025-07-19 02:21:13.94535
3743	749	5	2	2025-07-19 02:21:13.94535	2025-07-19 02:21:13.94535
3744	750	1	2	2025-07-19 02:21:14.103243	2025-07-19 02:21:14.103243
3745	750	2	2	2025-07-19 02:21:14.103243	2025-07-19 02:21:14.103243
3746	750	3	2	2025-07-19 02:21:14.103243	2025-07-19 02:21:14.103243
3747	750	4	2	2025-07-19 02:21:14.103243	2025-07-19 02:21:14.103243
3748	750	5	2	2025-07-19 02:21:14.103243	2025-07-19 02:21:14.103243
3749	751	1	2	2025-07-19 02:21:14.269239	2025-07-19 02:21:14.269239
3750	751	2	2	2025-07-19 02:21:14.269239	2025-07-19 02:21:14.269239
3751	751	3	2	2025-07-19 02:21:14.269239	2025-07-19 02:21:14.269239
3752	751	4	2	2025-07-19 02:21:14.269239	2025-07-19 02:21:14.269239
3753	751	5	2	2025-07-19 02:21:14.269239	2025-07-19 02:21:14.269239
3754	752	1	2	2025-07-19 02:21:14.418568	2025-07-19 02:21:14.418568
3755	752	2	2	2025-07-19 02:21:14.418568	2025-07-19 02:21:14.418568
3756	752	3	2	2025-07-19 02:21:14.418568	2025-07-19 02:21:14.418568
3757	752	4	2	2025-07-19 02:21:14.418568	2025-07-19 02:21:14.418568
3758	752	5	2	2025-07-19 02:21:14.418568	2025-07-19 02:21:14.418568
3759	753	1	2	2025-07-19 02:21:14.57092	2025-07-19 02:21:14.57092
3760	753	2	2	2025-07-19 02:21:14.57092	2025-07-19 02:21:14.57092
3761	753	3	2	2025-07-19 02:21:14.57092	2025-07-19 02:21:14.57092
3762	753	4	2	2025-07-19 02:21:14.57092	2025-07-19 02:21:14.57092
3763	753	5	2	2025-07-19 02:21:14.57092	2025-07-19 02:21:14.57092
3764	754	1	2	2025-07-19 02:21:14.721868	2025-07-19 02:21:14.721868
3765	754	2	2	2025-07-19 02:21:14.721868	2025-07-19 02:21:14.721868
3766	754	3	2	2025-07-19 02:21:14.721868	2025-07-19 02:21:14.721868
3767	754	4	2	2025-07-19 02:21:14.721868	2025-07-19 02:21:14.721868
3768	754	5	2	2025-07-19 02:21:14.721868	2025-07-19 02:21:14.721868
3769	755	1	2	2025-07-19 02:21:14.884156	2025-07-19 02:21:14.884156
3770	755	2	2	2025-07-19 02:21:14.884156	2025-07-19 02:21:14.884156
3771	755	3	2	2025-07-19 02:21:14.884156	2025-07-19 02:21:14.884156
3772	755	4	2	2025-07-19 02:21:14.884156	2025-07-19 02:21:14.884156
3773	755	5	2	2025-07-19 02:21:14.884156	2025-07-19 02:21:14.884156
3774	756	1	2	2025-07-19 02:21:15.036085	2025-07-19 02:21:15.036085
3775	756	2	2	2025-07-19 02:21:15.036085	2025-07-19 02:21:15.036085
3776	756	3	2	2025-07-19 02:21:15.036085	2025-07-19 02:21:15.036085
3777	756	4	2	2025-07-19 02:21:15.036085	2025-07-19 02:21:15.036085
3778	756	5	2	2025-07-19 02:21:15.036085	2025-07-19 02:21:15.036085
3779	757	1	2	2025-07-19 02:21:15.185091	2025-07-19 02:21:15.185091
3780	757	2	2	2025-07-19 02:21:15.185091	2025-07-19 02:21:15.185091
3781	757	3	2	2025-07-19 02:21:15.185091	2025-07-19 02:21:15.185091
3782	757	4	2	2025-07-19 02:21:15.185091	2025-07-19 02:21:15.185091
3783	757	5	2	2025-07-19 02:21:15.185091	2025-07-19 02:21:15.185091
3784	758	1	2	2025-07-19 02:21:15.332638	2025-07-19 02:21:15.332638
3785	758	2	2	2025-07-19 02:21:15.332638	2025-07-19 02:21:15.332638
3786	758	3	2	2025-07-19 02:21:15.332638	2025-07-19 02:21:15.332638
3787	758	4	2	2025-07-19 02:21:15.332638	2025-07-19 02:21:15.332638
3788	758	5	2	2025-07-19 02:21:15.332638	2025-07-19 02:21:15.332638
3789	759	1	2	2025-07-19 02:21:15.535997	2025-07-19 02:21:15.535997
3790	759	2	2	2025-07-19 02:21:15.535997	2025-07-19 02:21:15.535997
3791	759	3	2	2025-07-19 02:21:15.535997	2025-07-19 02:21:15.535997
3792	759	4	2	2025-07-19 02:21:15.535997	2025-07-19 02:21:15.535997
3793	759	5	2	2025-07-19 02:21:15.535997	2025-07-19 02:21:15.535997
3794	760	1	2	2025-07-19 02:21:15.683767	2025-07-19 02:21:15.683767
3795	760	2	2	2025-07-19 02:21:15.683767	2025-07-19 02:21:15.683767
3796	760	3	2	2025-07-19 02:21:15.683767	2025-07-19 02:21:15.683767
3797	760	4	2	2025-07-19 02:21:15.683767	2025-07-19 02:21:15.683767
3798	760	5	2	2025-07-19 02:21:15.683767	2025-07-19 02:21:15.683767
3799	761	1	2	2025-07-19 02:21:15.835926	2025-07-19 02:21:15.835926
3800	761	2	2	2025-07-19 02:21:15.835926	2025-07-19 02:21:15.835926
3801	761	3	2	2025-07-19 02:21:15.835926	2025-07-19 02:21:15.835926
3802	761	4	2	2025-07-19 02:21:15.835926	2025-07-19 02:21:15.835926
3803	761	5	2	2025-07-19 02:21:15.835926	2025-07-19 02:21:15.835926
3804	762	1	2	2025-07-19 02:21:16.003653	2025-07-19 02:21:16.003653
3805	762	2	2	2025-07-19 02:21:16.003653	2025-07-19 02:21:16.003653
3806	762	3	2	2025-07-19 02:21:16.003653	2025-07-19 02:21:16.003653
3807	762	4	2	2025-07-19 02:21:16.003653	2025-07-19 02:21:16.003653
3808	762	5	2	2025-07-19 02:21:16.003653	2025-07-19 02:21:16.003653
3809	763	1	2	2025-07-19 02:21:16.158333	2025-07-19 02:21:16.158333
3810	763	2	2	2025-07-19 02:21:16.158333	2025-07-19 02:21:16.158333
3811	763	3	2	2025-07-19 02:21:16.158333	2025-07-19 02:21:16.158333
3812	763	4	2	2025-07-19 02:21:16.158333	2025-07-19 02:21:16.158333
3813	763	5	2	2025-07-19 02:21:16.158333	2025-07-19 02:21:16.158333
3814	764	1	2	2025-07-19 02:21:16.311602	2025-07-19 02:21:16.311602
3815	764	2	2	2025-07-19 02:21:16.311602	2025-07-19 02:21:16.311602
3816	764	3	2	2025-07-19 02:21:16.311602	2025-07-19 02:21:16.311602
3817	764	4	2	2025-07-19 02:21:16.311602	2025-07-19 02:21:16.311602
3818	764	5	2	2025-07-19 02:21:16.311602	2025-07-19 02:21:16.311602
3819	765	1	2	2025-07-19 02:21:16.467762	2025-07-19 02:21:16.467762
3820	765	2	2	2025-07-19 02:21:16.467762	2025-07-19 02:21:16.467762
3821	765	3	2	2025-07-19 02:21:16.467762	2025-07-19 02:21:16.467762
3822	765	4	2	2025-07-19 02:21:16.467762	2025-07-19 02:21:16.467762
3823	765	5	2	2025-07-19 02:21:16.467762	2025-07-19 02:21:16.467762
3824	766	1	2	2025-07-19 02:21:16.61311	2025-07-19 02:21:16.61311
3825	766	2	2	2025-07-19 02:21:16.61311	2025-07-19 02:21:16.61311
3826	766	3	2	2025-07-19 02:21:16.61311	2025-07-19 02:21:16.61311
3827	766	4	2	2025-07-19 02:21:16.61311	2025-07-19 02:21:16.61311
3828	766	5	2	2025-07-19 02:21:16.61311	2025-07-19 02:21:16.61311
3829	767	1	2	2025-07-19 02:21:16.766645	2025-07-19 02:21:16.766645
3830	767	2	2	2025-07-19 02:21:16.766645	2025-07-19 02:21:16.766645
3831	767	3	2	2025-07-19 02:21:16.766645	2025-07-19 02:21:16.766645
3832	767	4	2	2025-07-19 02:21:16.766645	2025-07-19 02:21:16.766645
3833	767	5	2	2025-07-19 02:21:16.766645	2025-07-19 02:21:16.766645
3834	768	1	2	2025-07-19 02:21:16.913247	2025-07-19 02:21:16.913247
3835	768	2	2	2025-07-19 02:21:16.913247	2025-07-19 02:21:16.913247
3836	768	3	2	2025-07-19 02:21:16.913247	2025-07-19 02:21:16.913247
3837	768	4	2	2025-07-19 02:21:16.913247	2025-07-19 02:21:16.913247
3838	768	5	2	2025-07-19 02:21:16.913247	2025-07-19 02:21:16.913247
3839	769	1	2	2025-07-19 02:21:17.079064	2025-07-19 02:21:17.079064
3840	769	2	2	2025-07-19 02:21:17.079064	2025-07-19 02:21:17.079064
3841	769	3	2	2025-07-19 02:21:17.079064	2025-07-19 02:21:17.079064
3842	769	4	2	2025-07-19 02:21:17.079064	2025-07-19 02:21:17.079064
3843	769	5	2	2025-07-19 02:21:17.079064	2025-07-19 02:21:17.079064
3844	770	1	2	2025-07-19 02:21:17.236429	2025-07-19 02:21:17.236429
3845	770	2	2	2025-07-19 02:21:17.236429	2025-07-19 02:21:17.236429
3846	770	3	2	2025-07-19 02:21:17.236429	2025-07-19 02:21:17.236429
3847	770	4	2	2025-07-19 02:21:17.236429	2025-07-19 02:21:17.236429
3848	770	5	2	2025-07-19 02:21:17.236429	2025-07-19 02:21:17.236429
3849	771	1	2	2025-07-19 02:21:17.419171	2025-07-19 02:21:17.419171
3850	771	2	2	2025-07-19 02:21:17.419171	2025-07-19 02:21:17.419171
3851	771	3	2	2025-07-19 02:21:17.419171	2025-07-19 02:21:17.419171
3852	771	4	2	2025-07-19 02:21:17.419171	2025-07-19 02:21:17.419171
3853	771	5	2	2025-07-19 02:21:17.419171	2025-07-19 02:21:17.419171
3854	772	1	2	2025-07-19 02:21:17.572427	2025-07-19 02:21:17.572427
3855	772	2	2	2025-07-19 02:21:17.572427	2025-07-19 02:21:17.572427
3856	772	3	2	2025-07-19 02:21:17.572427	2025-07-19 02:21:17.572427
3857	772	4	2	2025-07-19 02:21:17.572427	2025-07-19 02:21:17.572427
3858	772	5	2	2025-07-19 02:21:17.572427	2025-07-19 02:21:17.572427
3859	773	1	2	2025-07-19 02:21:17.733511	2025-07-19 02:21:17.733511
3860	773	2	2	2025-07-19 02:21:17.733511	2025-07-19 02:21:17.733511
3861	773	3	2	2025-07-19 02:21:17.733511	2025-07-19 02:21:17.733511
3862	773	4	2	2025-07-19 02:21:17.733511	2025-07-19 02:21:17.733511
3863	773	5	2	2025-07-19 02:21:17.733511	2025-07-19 02:21:17.733511
3864	774	1	2	2025-07-19 02:21:17.886007	2025-07-19 02:21:17.886007
3865	774	2	2	2025-07-19 02:21:17.886007	2025-07-19 02:21:17.886007
3866	774	3	2	2025-07-19 02:21:17.886007	2025-07-19 02:21:17.886007
3867	774	4	2	2025-07-19 02:21:17.886007	2025-07-19 02:21:17.886007
3868	774	5	2	2025-07-19 02:21:17.886007	2025-07-19 02:21:17.886007
3869	775	1	2	2025-07-19 02:21:18.0333	2025-07-19 02:21:18.0333
3870	775	2	2	2025-07-19 02:21:18.0333	2025-07-19 02:21:18.0333
3871	775	3	2	2025-07-19 02:21:18.0333	2025-07-19 02:21:18.0333
3872	775	4	2	2025-07-19 02:21:18.0333	2025-07-19 02:21:18.0333
3873	775	5	2	2025-07-19 02:21:18.0333	2025-07-19 02:21:18.0333
3874	776	1	2	2025-07-19 02:21:18.207739	2025-07-19 02:21:18.207739
3875	776	2	2	2025-07-19 02:21:18.207739	2025-07-19 02:21:18.207739
3876	776	3	2	2025-07-19 02:21:18.207739	2025-07-19 02:21:18.207739
3877	776	4	2	2025-07-19 02:21:18.207739	2025-07-19 02:21:18.207739
3878	776	5	2	2025-07-19 02:21:18.207739	2025-07-19 02:21:18.207739
3879	777	1	2	2025-07-19 02:21:18.386902	2025-07-19 02:21:18.386902
3880	777	2	2	2025-07-19 02:21:18.386902	2025-07-19 02:21:18.386902
3881	777	3	2	2025-07-19 02:21:18.386902	2025-07-19 02:21:18.386902
3882	777	4	2	2025-07-19 02:21:18.386902	2025-07-19 02:21:18.386902
3883	777	5	2	2025-07-19 02:21:18.386902	2025-07-19 02:21:18.386902
3884	778	1	2	2025-07-19 02:21:18.57769	2025-07-19 02:21:18.57769
3885	778	2	2	2025-07-19 02:21:18.57769	2025-07-19 02:21:18.57769
3886	778	3	2	2025-07-19 02:21:18.57769	2025-07-19 02:21:18.57769
3887	778	4	2	2025-07-19 02:21:18.57769	2025-07-19 02:21:18.57769
3888	778	5	2	2025-07-19 02:21:18.57769	2025-07-19 02:21:18.57769
3889	779	1	2	2025-07-19 02:21:18.756636	2025-07-19 02:21:18.756636
3890	779	2	2	2025-07-19 02:21:18.756636	2025-07-19 02:21:18.756636
3891	779	3	2	2025-07-19 02:21:18.756636	2025-07-19 02:21:18.756636
3892	779	4	2	2025-07-19 02:21:18.756636	2025-07-19 02:21:18.756636
3893	779	5	2	2025-07-19 02:21:18.756636	2025-07-19 02:21:18.756636
3894	780	1	2	2025-07-19 02:21:18.909758	2025-07-19 02:21:18.909758
3895	780	2	2	2025-07-19 02:21:18.909758	2025-07-19 02:21:18.909758
3896	780	3	2	2025-07-19 02:21:18.909758	2025-07-19 02:21:18.909758
3897	780	4	2	2025-07-19 02:21:18.909758	2025-07-19 02:21:18.909758
3898	780	5	2	2025-07-19 02:21:18.909758	2025-07-19 02:21:18.909758
3899	781	1	2	2025-07-19 02:21:19.060167	2025-07-19 02:21:19.060167
3900	781	2	2	2025-07-19 02:21:19.060167	2025-07-19 02:21:19.060167
3901	781	3	2	2025-07-19 02:21:19.060167	2025-07-19 02:21:19.060167
3902	781	4	2	2025-07-19 02:21:19.060167	2025-07-19 02:21:19.060167
3903	781	5	2	2025-07-19 02:21:19.060167	2025-07-19 02:21:19.060167
3904	782	1	2	2025-07-19 02:21:19.215548	2025-07-19 02:21:19.215548
3905	782	2	2	2025-07-19 02:21:19.215548	2025-07-19 02:21:19.215548
3906	782	3	2	2025-07-19 02:21:19.215548	2025-07-19 02:21:19.215548
3907	782	4	2	2025-07-19 02:21:19.215548	2025-07-19 02:21:19.215548
3908	782	5	2	2025-07-19 02:21:19.215548	2025-07-19 02:21:19.215548
3909	783	1	2	2025-07-19 02:21:19.384588	2025-07-19 02:21:19.384588
3910	783	2	2	2025-07-19 02:21:19.384588	2025-07-19 02:21:19.384588
3911	783	3	2	2025-07-19 02:21:19.384588	2025-07-19 02:21:19.384588
3912	783	4	2	2025-07-19 02:21:19.384588	2025-07-19 02:21:19.384588
3913	783	5	2	2025-07-19 02:21:19.384588	2025-07-19 02:21:19.384588
3914	784	1	2	2025-07-19 02:21:19.537453	2025-07-19 02:21:19.537453
3915	784	2	2	2025-07-19 02:21:19.537453	2025-07-19 02:21:19.537453
3916	784	3	2	2025-07-19 02:21:19.537453	2025-07-19 02:21:19.537453
3917	784	4	2	2025-07-19 02:21:19.537453	2025-07-19 02:21:19.537453
3918	784	5	2	2025-07-19 02:21:19.537453	2025-07-19 02:21:19.537453
3919	785	1	2	2025-07-19 02:21:19.695827	2025-07-19 02:21:19.695827
3920	785	2	2	2025-07-19 02:21:19.695827	2025-07-19 02:21:19.695827
3921	785	3	2	2025-07-19 02:21:19.695827	2025-07-19 02:21:19.695827
3922	785	4	2	2025-07-19 02:21:19.695827	2025-07-19 02:21:19.695827
3923	785	5	2	2025-07-19 02:21:19.695827	2025-07-19 02:21:19.695827
3924	786	1	2	2025-07-19 02:21:19.847363	2025-07-19 02:21:19.847363
3925	786	2	2	2025-07-19 02:21:19.847363	2025-07-19 02:21:19.847363
3926	786	3	2	2025-07-19 02:21:19.847363	2025-07-19 02:21:19.847363
3927	786	4	2	2025-07-19 02:21:19.847363	2025-07-19 02:21:19.847363
3928	786	5	2	2025-07-19 02:21:19.847363	2025-07-19 02:21:19.847363
3929	787	1	2	2025-07-19 02:21:20.002916	2025-07-19 02:21:20.002916
3930	787	2	2	2025-07-19 02:21:20.002916	2025-07-19 02:21:20.002916
3931	787	3	2	2025-07-19 02:21:20.002916	2025-07-19 02:21:20.002916
3932	787	4	2	2025-07-19 02:21:20.002916	2025-07-19 02:21:20.002916
3933	787	5	2	2025-07-19 02:21:20.002916	2025-07-19 02:21:20.002916
3934	788	1	2	2025-07-19 02:21:20.159393	2025-07-19 02:21:20.159393
3935	788	2	2	2025-07-19 02:21:20.159393	2025-07-19 02:21:20.159393
3936	788	3	2	2025-07-19 02:21:20.159393	2025-07-19 02:21:20.159393
3937	788	4	2	2025-07-19 02:21:20.159393	2025-07-19 02:21:20.159393
3938	788	5	2	2025-07-19 02:21:20.159393	2025-07-19 02:21:20.159393
3939	789	1	2	2025-07-19 02:21:20.306197	2025-07-19 02:21:20.306197
3940	789	2	2	2025-07-19 02:21:20.306197	2025-07-19 02:21:20.306197
3941	789	3	2	2025-07-19 02:21:20.306197	2025-07-19 02:21:20.306197
3942	789	4	2	2025-07-19 02:21:20.306197	2025-07-19 02:21:20.306197
3943	789	5	2	2025-07-19 02:21:20.306197	2025-07-19 02:21:20.306197
3944	790	1	2	2025-07-19 02:21:20.465242	2025-07-19 02:21:20.465242
3945	790	2	2	2025-07-19 02:21:20.465242	2025-07-19 02:21:20.465242
3946	790	3	2	2025-07-19 02:21:20.465242	2025-07-19 02:21:20.465242
3947	790	4	2	2025-07-19 02:21:20.465242	2025-07-19 02:21:20.465242
3948	790	5	2	2025-07-19 02:21:20.465242	2025-07-19 02:21:20.465242
3949	791	1	2	2025-07-19 02:21:20.620105	2025-07-19 02:21:20.620105
3950	791	2	2	2025-07-19 02:21:20.620105	2025-07-19 02:21:20.620105
3951	791	3	2	2025-07-19 02:21:20.620105	2025-07-19 02:21:20.620105
3952	791	4	2	2025-07-19 02:21:20.620105	2025-07-19 02:21:20.620105
3953	791	5	2	2025-07-19 02:21:20.620105	2025-07-19 02:21:20.620105
3954	792	1	2	2025-07-19 02:21:20.768332	2025-07-19 02:21:20.768332
3955	792	2	2	2025-07-19 02:21:20.768332	2025-07-19 02:21:20.768332
3956	792	3	2	2025-07-19 02:21:20.768332	2025-07-19 02:21:20.768332
3957	792	4	2	2025-07-19 02:21:20.768332	2025-07-19 02:21:20.768332
3958	792	5	2	2025-07-19 02:21:20.768332	2025-07-19 02:21:20.768332
3959	793	1	2	2025-07-19 02:21:20.924663	2025-07-19 02:21:20.924663
3960	793	2	2	2025-07-19 02:21:20.924663	2025-07-19 02:21:20.924663
3961	793	3	2	2025-07-19 02:21:20.924663	2025-07-19 02:21:20.924663
3962	793	4	2	2025-07-19 02:21:20.924663	2025-07-19 02:21:20.924663
3963	793	5	2	2025-07-19 02:21:20.924663	2025-07-19 02:21:20.924663
3964	794	1	2	2025-07-19 02:21:21.083345	2025-07-19 02:21:21.083345
3965	794	2	2	2025-07-19 02:21:21.083345	2025-07-19 02:21:21.083345
3966	794	3	2	2025-07-19 02:21:21.083345	2025-07-19 02:21:21.083345
3967	794	4	2	2025-07-19 02:21:21.083345	2025-07-19 02:21:21.083345
3968	794	5	2	2025-07-19 02:21:21.083345	2025-07-19 02:21:21.083345
3969	795	1	2	2025-07-19 02:21:21.233398	2025-07-19 02:21:21.233398
3970	795	2	2	2025-07-19 02:21:21.233398	2025-07-19 02:21:21.233398
3971	795	3	2	2025-07-19 02:21:21.233398	2025-07-19 02:21:21.233398
3972	795	4	2	2025-07-19 02:21:21.233398	2025-07-19 02:21:21.233398
3973	795	5	2	2025-07-19 02:21:21.233398	2025-07-19 02:21:21.233398
3974	796	1	2	2025-07-19 02:21:21.391666	2025-07-19 02:21:21.391666
3975	796	2	2	2025-07-19 02:21:21.391666	2025-07-19 02:21:21.391666
3976	796	3	2	2025-07-19 02:21:21.391666	2025-07-19 02:21:21.391666
3977	796	4	2	2025-07-19 02:21:21.391666	2025-07-19 02:21:21.391666
3978	796	5	2	2025-07-19 02:21:21.391666	2025-07-19 02:21:21.391666
3979	797	1	2	2025-07-19 02:21:21.540911	2025-07-19 02:21:21.540911
3980	797	2	2	2025-07-19 02:21:21.540911	2025-07-19 02:21:21.540911
3981	797	3	2	2025-07-19 02:21:21.540911	2025-07-19 02:21:21.540911
3982	797	4	2	2025-07-19 02:21:21.540911	2025-07-19 02:21:21.540911
3983	797	5	2	2025-07-19 02:21:21.540911	2025-07-19 02:21:21.540911
3984	798	1	2	2025-07-19 02:21:21.691104	2025-07-19 02:21:21.691104
3985	798	2	2	2025-07-19 02:21:21.691104	2025-07-19 02:21:21.691104
3986	798	3	2	2025-07-19 02:21:21.691104	2025-07-19 02:21:21.691104
3987	798	4	2	2025-07-19 02:21:21.691104	2025-07-19 02:21:21.691104
3988	798	5	2	2025-07-19 02:21:21.691104	2025-07-19 02:21:21.691104
3989	799	1	2	2025-07-19 02:21:21.840772	2025-07-19 02:21:21.840772
3990	799	2	2	2025-07-19 02:21:21.840772	2025-07-19 02:21:21.840772
3991	799	3	2	2025-07-19 02:21:21.840772	2025-07-19 02:21:21.840772
3992	799	4	2	2025-07-19 02:21:21.840772	2025-07-19 02:21:21.840772
3993	799	5	2	2025-07-19 02:21:21.840772	2025-07-19 02:21:21.840772
3994	800	1	2	2025-07-19 02:21:21.98996	2025-07-19 02:21:21.98996
3995	800	2	2	2025-07-19 02:21:21.98996	2025-07-19 02:21:21.98996
3996	800	3	2	2025-07-19 02:21:21.98996	2025-07-19 02:21:21.98996
3997	800	4	2	2025-07-19 02:21:21.98996	2025-07-19 02:21:21.98996
3998	800	5	2	2025-07-19 02:21:21.98996	2025-07-19 02:21:21.98996
3999	801	1	2	2025-07-19 02:21:22.155857	2025-07-19 02:21:22.155857
4000	801	2	2	2025-07-19 02:21:22.155857	2025-07-19 02:21:22.155857
4001	801	3	2	2025-07-19 02:21:22.155857	2025-07-19 02:21:22.155857
4002	801	4	2	2025-07-19 02:21:22.155857	2025-07-19 02:21:22.155857
4003	801	5	2	2025-07-19 02:21:22.155857	2025-07-19 02:21:22.155857
4004	802	1	2	2025-07-19 02:21:22.306075	2025-07-19 02:21:22.306075
4005	802	2	2	2025-07-19 02:21:22.306075	2025-07-19 02:21:22.306075
4006	802	3	2	2025-07-19 02:21:22.306075	2025-07-19 02:21:22.306075
4007	802	4	2	2025-07-19 02:21:22.306075	2025-07-19 02:21:22.306075
4008	802	5	2	2025-07-19 02:21:22.306075	2025-07-19 02:21:22.306075
4009	803	1	2	2025-07-19 02:21:22.467318	2025-07-19 02:21:22.467318
4010	803	2	2	2025-07-19 02:21:22.467318	2025-07-19 02:21:22.467318
4011	803	3	2	2025-07-19 02:21:22.467318	2025-07-19 02:21:22.467318
4012	803	4	2	2025-07-19 02:21:22.467318	2025-07-19 02:21:22.467318
4013	803	5	2	2025-07-19 02:21:22.467318	2025-07-19 02:21:22.467318
4014	804	1	2	2025-07-19 02:21:22.620562	2025-07-19 02:21:22.620562
4015	804	2	2	2025-07-19 02:21:22.620562	2025-07-19 02:21:22.620562
4016	804	3	2	2025-07-19 02:21:22.620562	2025-07-19 02:21:22.620562
4017	804	4	2	2025-07-19 02:21:22.620562	2025-07-19 02:21:22.620562
4018	804	5	2	2025-07-19 02:21:22.620562	2025-07-19 02:21:22.620562
4019	805	1	2	2025-07-19 02:21:22.774046	2025-07-19 02:21:22.774046
4020	805	2	2	2025-07-19 02:21:22.774046	2025-07-19 02:21:22.774046
4021	805	3	2	2025-07-19 02:21:22.774046	2025-07-19 02:21:22.774046
4022	805	4	2	2025-07-19 02:21:22.774046	2025-07-19 02:21:22.774046
4023	805	5	2	2025-07-19 02:21:22.774046	2025-07-19 02:21:22.774046
4024	806	1	2	2025-07-19 02:21:22.930037	2025-07-19 02:21:22.930037
4025	806	2	2	2025-07-19 02:21:22.930037	2025-07-19 02:21:22.930037
4026	806	3	2	2025-07-19 02:21:22.930037	2025-07-19 02:21:22.930037
4027	806	4	2	2025-07-19 02:21:22.930037	2025-07-19 02:21:22.930037
4028	806	5	2	2025-07-19 02:21:22.930037	2025-07-19 02:21:22.930037
4029	807	1	2	2025-07-19 02:21:23.085685	2025-07-19 02:21:23.085685
4030	807	2	2	2025-07-19 02:21:23.085685	2025-07-19 02:21:23.085685
4031	807	3	2	2025-07-19 02:21:23.085685	2025-07-19 02:21:23.085685
4032	807	4	2	2025-07-19 02:21:23.085685	2025-07-19 02:21:23.085685
4033	807	5	2	2025-07-19 02:21:23.085685	2025-07-19 02:21:23.085685
4034	808	1	2	2025-07-19 02:21:23.236698	2025-07-19 02:21:23.236698
4035	808	2	2	2025-07-19 02:21:23.236698	2025-07-19 02:21:23.236698
4036	808	3	2	2025-07-19 02:21:23.236698	2025-07-19 02:21:23.236698
4037	808	4	2	2025-07-19 02:21:23.236698	2025-07-19 02:21:23.236698
4038	808	5	2	2025-07-19 02:21:23.236698	2025-07-19 02:21:23.236698
4039	809	1	2	2025-07-19 02:21:23.398908	2025-07-19 02:21:23.398908
4040	809	2	2	2025-07-19 02:21:23.398908	2025-07-19 02:21:23.398908
4041	809	3	2	2025-07-19 02:21:23.398908	2025-07-19 02:21:23.398908
4042	809	4	2	2025-07-19 02:21:23.398908	2025-07-19 02:21:23.398908
4043	809	5	2	2025-07-19 02:21:23.398908	2025-07-19 02:21:23.398908
4044	810	1	2	2025-07-19 02:21:23.59329	2025-07-19 02:21:23.59329
4045	810	2	2	2025-07-19 02:21:23.59329	2025-07-19 02:21:23.59329
4046	810	3	2	2025-07-19 02:21:23.59329	2025-07-19 02:21:23.59329
4047	810	4	2	2025-07-19 02:21:23.59329	2025-07-19 02:21:23.59329
4048	810	5	2	2025-07-19 02:21:23.59329	2025-07-19 02:21:23.59329
4049	811	1	2	2025-07-19 02:21:23.808186	2025-07-19 02:21:23.808186
4050	811	2	2	2025-07-19 02:21:23.808186	2025-07-19 02:21:23.808186
4051	811	3	2	2025-07-19 02:21:23.808186	2025-07-19 02:21:23.808186
4052	811	4	2	2025-07-19 02:21:23.808186	2025-07-19 02:21:23.808186
4053	811	5	2	2025-07-19 02:21:23.808186	2025-07-19 02:21:23.808186
4054	812	1	2	2025-07-19 02:21:24.149056	2025-07-19 02:21:24.149056
4055	812	2	2	2025-07-19 02:21:24.149056	2025-07-19 02:21:24.149056
4056	812	3	2	2025-07-19 02:21:24.149056	2025-07-19 02:21:24.149056
4057	812	4	2	2025-07-19 02:21:24.149056	2025-07-19 02:21:24.149056
4058	812	5	2	2025-07-19 02:21:24.149056	2025-07-19 02:21:24.149056
4059	813	1	2	2025-07-19 02:21:24.306746	2025-07-19 02:21:24.306746
4060	813	2	2	2025-07-19 02:21:24.306746	2025-07-19 02:21:24.306746
4061	813	3	2	2025-07-19 02:21:24.306746	2025-07-19 02:21:24.306746
4062	813	4	2	2025-07-19 02:21:24.306746	2025-07-19 02:21:24.306746
4063	813	5	2	2025-07-19 02:21:24.306746	2025-07-19 02:21:24.306746
4064	814	1	2	2025-07-19 02:21:24.454967	2025-07-19 02:21:24.454967
4065	814	2	2	2025-07-19 02:21:24.454967	2025-07-19 02:21:24.454967
4066	814	3	2	2025-07-19 02:21:24.454967	2025-07-19 02:21:24.454967
4067	814	4	2	2025-07-19 02:21:24.454967	2025-07-19 02:21:24.454967
4068	814	5	2	2025-07-19 02:21:24.454967	2025-07-19 02:21:24.454967
4069	815	1	2	2025-07-19 02:21:24.606916	2025-07-19 02:21:24.606916
4070	815	2	2	2025-07-19 02:21:24.606916	2025-07-19 02:21:24.606916
4071	815	3	2	2025-07-19 02:21:24.606916	2025-07-19 02:21:24.606916
4072	815	4	2	2025-07-19 02:21:24.606916	2025-07-19 02:21:24.606916
4073	815	5	2	2025-07-19 02:21:24.606916	2025-07-19 02:21:24.606916
4074	816	1	2	2025-07-19 02:21:24.766839	2025-07-19 02:21:24.766839
4075	816	2	2	2025-07-19 02:21:24.766839	2025-07-19 02:21:24.766839
4076	816	3	2	2025-07-19 02:21:24.766839	2025-07-19 02:21:24.766839
4077	816	4	2	2025-07-19 02:21:24.766839	2025-07-19 02:21:24.766839
4078	816	5	2	2025-07-19 02:21:24.766839	2025-07-19 02:21:24.766839
4079	817	1	2	2025-07-19 02:21:24.922215	2025-07-19 02:21:24.922215
4080	817	2	2	2025-07-19 02:21:24.922215	2025-07-19 02:21:24.922215
4081	817	3	2	2025-07-19 02:21:24.922215	2025-07-19 02:21:24.922215
4082	817	4	2	2025-07-19 02:21:24.922215	2025-07-19 02:21:24.922215
4083	817	5	2	2025-07-19 02:21:24.922215	2025-07-19 02:21:24.922215
4084	818	1	2	2025-07-19 02:21:25.077307	2025-07-19 02:21:25.077307
4085	818	2	2	2025-07-19 02:21:25.077307	2025-07-19 02:21:25.077307
4086	818	3	2	2025-07-19 02:21:25.077307	2025-07-19 02:21:25.077307
4087	818	4	2	2025-07-19 02:21:25.077307	2025-07-19 02:21:25.077307
4088	818	5	2	2025-07-19 02:21:25.077307	2025-07-19 02:21:25.077307
4089	819	1	2	2025-07-19 02:21:25.23416	2025-07-19 02:21:25.23416
4090	819	2	2	2025-07-19 02:21:25.23416	2025-07-19 02:21:25.23416
4091	819	3	2	2025-07-19 02:21:25.23416	2025-07-19 02:21:25.23416
4092	819	4	2	2025-07-19 02:21:25.23416	2025-07-19 02:21:25.23416
4093	819	5	2	2025-07-19 02:21:25.23416	2025-07-19 02:21:25.23416
4094	820	1	2	2025-07-19 02:21:25.386447	2025-07-19 02:21:25.386447
4095	820	2	2	2025-07-19 02:21:25.386447	2025-07-19 02:21:25.386447
4096	820	3	2	2025-07-19 02:21:25.386447	2025-07-19 02:21:25.386447
4097	820	4	2	2025-07-19 02:21:25.386447	2025-07-19 02:21:25.386447
4098	820	5	2	2025-07-19 02:21:25.386447	2025-07-19 02:21:25.386447
4099	821	1	2	2025-07-19 02:21:25.54875	2025-07-19 02:21:25.54875
4100	821	2	2	2025-07-19 02:21:25.54875	2025-07-19 02:21:25.54875
4101	821	3	2	2025-07-19 02:21:25.54875	2025-07-19 02:21:25.54875
4102	821	4	2	2025-07-19 02:21:25.54875	2025-07-19 02:21:25.54875
4103	821	5	2	2025-07-19 02:21:25.54875	2025-07-19 02:21:25.54875
4104	822	1	2	2025-07-19 02:21:25.704778	2025-07-19 02:21:25.704778
4105	822	2	2	2025-07-19 02:21:25.704778	2025-07-19 02:21:25.704778
4106	822	3	2	2025-07-19 02:21:25.704778	2025-07-19 02:21:25.704778
4107	822	4	2	2025-07-19 02:21:25.704778	2025-07-19 02:21:25.704778
4108	822	5	2	2025-07-19 02:21:25.704778	2025-07-19 02:21:25.704778
4109	823	1	2	2025-07-19 02:21:25.923983	2025-07-19 02:21:25.923983
4110	823	2	2	2025-07-19 02:21:25.923983	2025-07-19 02:21:25.923983
4111	823	3	2	2025-07-19 02:21:25.923983	2025-07-19 02:21:25.923983
4112	823	4	2	2025-07-19 02:21:25.923983	2025-07-19 02:21:25.923983
4113	823	5	2	2025-07-19 02:21:25.923983	2025-07-19 02:21:25.923983
4114	824	1	2	2025-07-19 02:21:26.107971	2025-07-19 02:21:26.107971
4115	824	2	2	2025-07-19 02:21:26.107971	2025-07-19 02:21:26.107971
4116	824	3	2	2025-07-19 02:21:26.107971	2025-07-19 02:21:26.107971
4117	824	4	2	2025-07-19 02:21:26.107971	2025-07-19 02:21:26.107971
4118	824	5	2	2025-07-19 02:21:26.107971	2025-07-19 02:21:26.107971
4119	825	1	2	2025-07-19 02:21:26.298946	2025-07-19 02:21:26.298946
4120	825	2	2	2025-07-19 02:21:26.298946	2025-07-19 02:21:26.298946
4121	825	3	2	2025-07-19 02:21:26.298946	2025-07-19 02:21:26.298946
4122	825	4	2	2025-07-19 02:21:26.298946	2025-07-19 02:21:26.298946
4123	825	5	2	2025-07-19 02:21:26.298946	2025-07-19 02:21:26.298946
4124	826	1	2	2025-07-19 02:21:26.479357	2025-07-19 02:21:26.479357
4125	826	2	2	2025-07-19 02:21:26.479357	2025-07-19 02:21:26.479357
4126	826	3	2	2025-07-19 02:21:26.479357	2025-07-19 02:21:26.479357
4127	826	4	2	2025-07-19 02:21:26.479357	2025-07-19 02:21:26.479357
4128	826	5	2	2025-07-19 02:21:26.479357	2025-07-19 02:21:26.479357
4129	827	1	2	2025-07-19 02:21:26.647518	2025-07-19 02:21:26.647518
4130	827	2	2	2025-07-19 02:21:26.647518	2025-07-19 02:21:26.647518
4131	827	3	2	2025-07-19 02:21:26.647518	2025-07-19 02:21:26.647518
4132	827	4	2	2025-07-19 02:21:26.647518	2025-07-19 02:21:26.647518
4133	827	5	2	2025-07-19 02:21:26.647518	2025-07-19 02:21:26.647518
4134	828	1	2	2025-07-19 02:21:26.811204	2025-07-19 02:21:26.811204
4135	828	2	2	2025-07-19 02:21:26.811204	2025-07-19 02:21:26.811204
4136	828	3	2	2025-07-19 02:21:26.811204	2025-07-19 02:21:26.811204
4137	828	4	2	2025-07-19 02:21:26.811204	2025-07-19 02:21:26.811204
4138	828	5	2	2025-07-19 02:21:26.811204	2025-07-19 02:21:26.811204
4139	829	1	2	2025-07-19 02:21:26.972468	2025-07-19 02:21:26.972468
4140	829	2	2	2025-07-19 02:21:26.972468	2025-07-19 02:21:26.972468
4141	829	3	2	2025-07-19 02:21:26.972468	2025-07-19 02:21:26.972468
4142	829	4	2	2025-07-19 02:21:26.972468	2025-07-19 02:21:26.972468
4143	829	5	2	2025-07-19 02:21:26.972468	2025-07-19 02:21:26.972468
4144	830	1	2	2025-07-19 02:21:27.143583	2025-07-19 02:21:27.143583
4145	830	2	2	2025-07-19 02:21:27.143583	2025-07-19 02:21:27.143583
4146	830	3	2	2025-07-19 02:21:27.143583	2025-07-19 02:21:27.143583
4147	830	4	2	2025-07-19 02:21:27.143583	2025-07-19 02:21:27.143583
4148	830	5	2	2025-07-19 02:21:27.143583	2025-07-19 02:21:27.143583
4149	831	1	2	2025-07-19 02:21:27.305216	2025-07-19 02:21:27.305216
4150	831	2	2	2025-07-19 02:21:27.305216	2025-07-19 02:21:27.305216
4151	831	3	2	2025-07-19 02:21:27.305216	2025-07-19 02:21:27.305216
4152	831	4	2	2025-07-19 02:21:27.305216	2025-07-19 02:21:27.305216
4153	831	5	2	2025-07-19 02:21:27.305216	2025-07-19 02:21:27.305216
4154	832	1	2	2025-07-19 02:21:27.465761	2025-07-19 02:21:27.465761
4155	832	2	2	2025-07-19 02:21:27.465761	2025-07-19 02:21:27.465761
4156	832	3	2	2025-07-19 02:21:27.465761	2025-07-19 02:21:27.465761
4157	832	4	2	2025-07-19 02:21:27.465761	2025-07-19 02:21:27.465761
4158	832	5	2	2025-07-19 02:21:27.465761	2025-07-19 02:21:27.465761
4159	833	1	2	2025-07-19 02:21:27.631554	2025-07-19 02:21:27.631554
4160	833	2	2	2025-07-19 02:21:27.631554	2025-07-19 02:21:27.631554
4161	833	3	2	2025-07-19 02:21:27.631554	2025-07-19 02:21:27.631554
4162	833	4	2	2025-07-19 02:21:27.631554	2025-07-19 02:21:27.631554
4163	833	5	2	2025-07-19 02:21:27.631554	2025-07-19 02:21:27.631554
4164	834	1	2	2025-07-19 02:21:27.814097	2025-07-19 02:21:27.814097
4165	834	2	2	2025-07-19 02:21:27.814097	2025-07-19 02:21:27.814097
4166	834	3	2	2025-07-19 02:21:27.814097	2025-07-19 02:21:27.814097
4167	834	4	2	2025-07-19 02:21:27.814097	2025-07-19 02:21:27.814097
4168	834	5	2	2025-07-19 02:21:27.814097	2025-07-19 02:21:27.814097
4169	835	1	2	2025-07-19 02:21:27.975553	2025-07-19 02:21:27.975553
4170	835	2	2	2025-07-19 02:21:27.975553	2025-07-19 02:21:27.975553
4171	835	3	2	2025-07-19 02:21:27.975553	2025-07-19 02:21:27.975553
4172	835	4	2	2025-07-19 02:21:27.975553	2025-07-19 02:21:27.975553
4173	835	5	2	2025-07-19 02:21:27.975553	2025-07-19 02:21:27.975553
4174	836	1	2	2025-07-19 02:21:28.140078	2025-07-19 02:21:28.140078
4175	836	2	2	2025-07-19 02:21:28.140078	2025-07-19 02:21:28.140078
4176	836	3	2	2025-07-19 02:21:28.140078	2025-07-19 02:21:28.140078
4177	836	4	2	2025-07-19 02:21:28.140078	2025-07-19 02:21:28.140078
4178	836	5	2	2025-07-19 02:21:28.140078	2025-07-19 02:21:28.140078
4179	837	1	2	2025-07-19 02:21:28.300248	2025-07-19 02:21:28.300248
4180	837	2	2	2025-07-19 02:21:28.300248	2025-07-19 02:21:28.300248
4181	837	3	2	2025-07-19 02:21:28.300248	2025-07-19 02:21:28.300248
4182	837	4	2	2025-07-19 02:21:28.300248	2025-07-19 02:21:28.300248
4183	837	5	2	2025-07-19 02:21:28.300248	2025-07-19 02:21:28.300248
4184	838	1	2	2025-07-19 02:21:28.462894	2025-07-19 02:21:28.462894
4185	838	2	2	2025-07-19 02:21:28.462894	2025-07-19 02:21:28.462894
4186	838	3	2	2025-07-19 02:21:28.462894	2025-07-19 02:21:28.462894
4187	838	4	2	2025-07-19 02:21:28.462894	2025-07-19 02:21:28.462894
4188	838	5	2	2025-07-19 02:21:28.462894	2025-07-19 02:21:28.462894
4189	839	1	2	2025-07-19 02:21:28.626807	2025-07-19 02:21:28.626807
4190	839	2	2	2025-07-19 02:21:28.626807	2025-07-19 02:21:28.626807
4191	839	3	2	2025-07-19 02:21:28.626807	2025-07-19 02:21:28.626807
4192	839	4	2	2025-07-19 02:21:28.626807	2025-07-19 02:21:28.626807
4193	839	5	2	2025-07-19 02:21:28.626807	2025-07-19 02:21:28.626807
4194	840	1	2	2025-07-19 02:21:28.785921	2025-07-19 02:21:28.785921
4195	840	2	2	2025-07-19 02:21:28.785921	2025-07-19 02:21:28.785921
4196	840	3	2	2025-07-19 02:21:28.785921	2025-07-19 02:21:28.785921
4197	840	4	2	2025-07-19 02:21:28.785921	2025-07-19 02:21:28.785921
4198	840	5	2	2025-07-19 02:21:28.785921	2025-07-19 02:21:28.785921
4199	841	1	2	2025-07-19 02:21:28.952926	2025-07-19 02:21:28.952926
4200	841	2	2	2025-07-19 02:21:28.952926	2025-07-19 02:21:28.952926
4201	841	3	2	2025-07-19 02:21:28.952926	2025-07-19 02:21:28.952926
4202	841	4	2	2025-07-19 02:21:28.952926	2025-07-19 02:21:28.952926
4203	841	5	2	2025-07-19 02:21:28.952926	2025-07-19 02:21:28.952926
4204	842	1	2	2025-07-19 02:21:29.12025	2025-07-19 02:21:29.12025
4205	842	2	2	2025-07-19 02:21:29.12025	2025-07-19 02:21:29.12025
4206	842	3	2	2025-07-19 02:21:29.12025	2025-07-19 02:21:29.12025
4207	842	4	2	2025-07-19 02:21:29.12025	2025-07-19 02:21:29.12025
4208	842	5	2	2025-07-19 02:21:29.12025	2025-07-19 02:21:29.12025
4209	843	1	2	2025-07-19 02:21:29.288508	2025-07-19 02:21:29.288508
4210	843	2	2	2025-07-19 02:21:29.288508	2025-07-19 02:21:29.288508
4211	843	3	2	2025-07-19 02:21:29.288508	2025-07-19 02:21:29.288508
4212	843	4	2	2025-07-19 02:21:29.288508	2025-07-19 02:21:29.288508
4213	843	5	2	2025-07-19 02:21:29.288508	2025-07-19 02:21:29.288508
4214	844	1	2	2025-07-19 02:21:29.451857	2025-07-19 02:21:29.451857
4215	844	2	2	2025-07-19 02:21:29.451857	2025-07-19 02:21:29.451857
4216	844	3	2	2025-07-19 02:21:29.451857	2025-07-19 02:21:29.451857
4217	844	4	2	2025-07-19 02:21:29.451857	2025-07-19 02:21:29.451857
4218	844	5	2	2025-07-19 02:21:29.451857	2025-07-19 02:21:29.451857
4219	845	1	2	2025-07-19 02:21:29.61963	2025-07-19 02:21:29.61963
4220	845	2	2	2025-07-19 02:21:29.61963	2025-07-19 02:21:29.61963
4221	845	3	2	2025-07-19 02:21:29.61963	2025-07-19 02:21:29.61963
4222	845	4	2	2025-07-19 02:21:29.61963	2025-07-19 02:21:29.61963
4223	845	5	2	2025-07-19 02:21:29.61963	2025-07-19 02:21:29.61963
4224	846	1	2	2025-07-19 02:21:29.785927	2025-07-19 02:21:29.785927
4225	846	2	2	2025-07-19 02:21:29.785927	2025-07-19 02:21:29.785927
4226	846	3	2	2025-07-19 02:21:29.785927	2025-07-19 02:21:29.785927
4227	846	4	2	2025-07-19 02:21:29.785927	2025-07-19 02:21:29.785927
4228	846	5	2	2025-07-19 02:21:29.785927	2025-07-19 02:21:29.785927
4229	847	1	2	2025-07-19 02:21:29.961321	2025-07-19 02:21:29.961321
4230	847	2	2	2025-07-19 02:21:29.961321	2025-07-19 02:21:29.961321
4231	847	3	2	2025-07-19 02:21:29.961321	2025-07-19 02:21:29.961321
4232	847	4	2	2025-07-19 02:21:29.961321	2025-07-19 02:21:29.961321
4233	847	5	2	2025-07-19 02:21:29.961321	2025-07-19 02:21:29.961321
4234	848	1	2	2025-07-19 02:21:30.130794	2025-07-19 02:21:30.130794
4235	848	2	2	2025-07-19 02:21:30.130794	2025-07-19 02:21:30.130794
4236	848	3	2	2025-07-19 02:21:30.130794	2025-07-19 02:21:30.130794
4237	848	4	2	2025-07-19 02:21:30.130794	2025-07-19 02:21:30.130794
4238	848	5	2	2025-07-19 02:21:30.130794	2025-07-19 02:21:30.130794
4239	849	1	2	2025-07-19 02:21:30.298167	2025-07-19 02:21:30.298167
4240	849	2	2	2025-07-19 02:21:30.298167	2025-07-19 02:21:30.298167
4241	849	3	2	2025-07-19 02:21:30.298167	2025-07-19 02:21:30.298167
4242	849	4	2	2025-07-19 02:21:30.298167	2025-07-19 02:21:30.298167
4243	849	5	2	2025-07-19 02:21:30.298167	2025-07-19 02:21:30.298167
4244	850	1	2	2025-07-19 02:21:30.47408	2025-07-19 02:21:30.47408
4245	850	2	2	2025-07-19 02:21:30.47408	2025-07-19 02:21:30.47408
4246	850	3	2	2025-07-19 02:21:30.47408	2025-07-19 02:21:30.47408
4247	850	4	2	2025-07-19 02:21:30.47408	2025-07-19 02:21:30.47408
4248	850	5	2	2025-07-19 02:21:30.47408	2025-07-19 02:21:30.47408
4249	851	1	2	2025-07-19 02:21:30.632069	2025-07-19 02:21:30.632069
4250	851	2	2	2025-07-19 02:21:30.632069	2025-07-19 02:21:30.632069
4251	851	3	2	2025-07-19 02:21:30.632069	2025-07-19 02:21:30.632069
4252	851	4	2	2025-07-19 02:21:30.632069	2025-07-19 02:21:30.632069
4253	851	5	2	2025-07-19 02:21:30.632069	2025-07-19 02:21:30.632069
4254	852	1	2	2025-07-19 02:21:30.814423	2025-07-19 02:21:30.814423
4255	852	2	2	2025-07-19 02:21:30.814423	2025-07-19 02:21:30.814423
4256	852	3	2	2025-07-19 02:21:30.814423	2025-07-19 02:21:30.814423
4257	852	4	2	2025-07-19 02:21:30.814423	2025-07-19 02:21:30.814423
4258	852	5	2	2025-07-19 02:21:30.814423	2025-07-19 02:21:30.814423
4259	853	1	2	2025-07-19 02:21:30.988046	2025-07-19 02:21:30.988046
4260	853	2	2	2025-07-19 02:21:30.988046	2025-07-19 02:21:30.988046
4261	853	3	2	2025-07-19 02:21:30.988046	2025-07-19 02:21:30.988046
4262	853	4	2	2025-07-19 02:21:30.988046	2025-07-19 02:21:30.988046
4263	853	5	2	2025-07-19 02:21:30.988046	2025-07-19 02:21:30.988046
4264	854	1	2	2025-07-19 02:21:31.154793	2025-07-19 02:21:31.154793
4265	854	2	2	2025-07-19 02:21:31.154793	2025-07-19 02:21:31.154793
4266	854	3	2	2025-07-19 02:21:31.154793	2025-07-19 02:21:31.154793
4267	854	4	2	2025-07-19 02:21:31.154793	2025-07-19 02:21:31.154793
4268	854	5	2	2025-07-19 02:21:31.154793	2025-07-19 02:21:31.154793
4269	855	1	2	2025-07-19 02:21:31.331119	2025-07-19 02:21:31.331119
4270	855	2	2	2025-07-19 02:21:31.331119	2025-07-19 02:21:31.331119
4271	855	3	2	2025-07-19 02:21:31.331119	2025-07-19 02:21:31.331119
4272	855	4	2	2025-07-19 02:21:31.331119	2025-07-19 02:21:31.331119
4273	855	5	2	2025-07-19 02:21:31.331119	2025-07-19 02:21:31.331119
4274	856	1	2	2025-07-19 02:21:31.496856	2025-07-19 02:21:31.496856
4275	856	2	2	2025-07-19 02:21:31.496856	2025-07-19 02:21:31.496856
4276	856	3	2	2025-07-19 02:21:31.496856	2025-07-19 02:21:31.496856
4277	856	4	2	2025-07-19 02:21:31.496856	2025-07-19 02:21:31.496856
4278	856	5	2	2025-07-19 02:21:31.496856	2025-07-19 02:21:31.496856
4279	857	1	2	2025-07-19 02:21:31.65569	2025-07-19 02:21:31.65569
4280	857	2	2	2025-07-19 02:21:31.65569	2025-07-19 02:21:31.65569
4281	857	3	2	2025-07-19 02:21:31.65569	2025-07-19 02:21:31.65569
4282	857	4	2	2025-07-19 02:21:31.65569	2025-07-19 02:21:31.65569
4283	857	5	2	2025-07-19 02:21:31.65569	2025-07-19 02:21:31.65569
4284	858	1	2	2025-07-19 02:21:31.819263	2025-07-19 02:21:31.819263
4285	858	2	2	2025-07-19 02:21:31.819263	2025-07-19 02:21:31.819263
4286	858	3	2	2025-07-19 02:21:31.819263	2025-07-19 02:21:31.819263
4287	858	4	2	2025-07-19 02:21:31.819263	2025-07-19 02:21:31.819263
4288	858	5	2	2025-07-19 02:21:31.819263	2025-07-19 02:21:31.819263
4289	859	1	2	2025-07-19 02:21:31.979352	2025-07-19 02:21:31.979352
4290	859	2	2	2025-07-19 02:21:31.979352	2025-07-19 02:21:31.979352
4291	859	3	2	2025-07-19 02:21:31.979352	2025-07-19 02:21:31.979352
4292	859	4	2	2025-07-19 02:21:31.979352	2025-07-19 02:21:31.979352
4293	859	5	2	2025-07-19 02:21:31.979352	2025-07-19 02:21:31.979352
4294	860	1	2	2025-07-19 02:21:32.141258	2025-07-19 02:21:32.141258
4295	860	2	2	2025-07-19 02:21:32.141258	2025-07-19 02:21:32.141258
4296	860	3	2	2025-07-19 02:21:32.141258	2025-07-19 02:21:32.141258
4297	860	4	2	2025-07-19 02:21:32.141258	2025-07-19 02:21:32.141258
4298	860	5	2	2025-07-19 02:21:32.141258	2025-07-19 02:21:32.141258
4299	861	1	2	2025-07-19 02:21:32.304169	2025-07-19 02:21:32.304169
4300	861	2	2	2025-07-19 02:21:32.304169	2025-07-19 02:21:32.304169
4301	861	3	2	2025-07-19 02:21:32.304169	2025-07-19 02:21:32.304169
4302	861	4	2	2025-07-19 02:21:32.304169	2025-07-19 02:21:32.304169
4303	861	5	2	2025-07-19 02:21:32.304169	2025-07-19 02:21:32.304169
4304	862	1	2	2025-07-19 02:21:32.465837	2025-07-19 02:21:32.465837
4305	862	2	2	2025-07-19 02:21:32.465837	2025-07-19 02:21:32.465837
4306	862	3	2	2025-07-19 02:21:32.465837	2025-07-19 02:21:32.465837
4307	862	4	2	2025-07-19 02:21:32.465837	2025-07-19 02:21:32.465837
4308	862	5	2	2025-07-19 02:21:32.465837	2025-07-19 02:21:32.465837
4309	863	1	2	2025-07-19 02:21:32.62597	2025-07-19 02:21:32.62597
4310	863	2	2	2025-07-19 02:21:32.62597	2025-07-19 02:21:32.62597
4311	863	3	2	2025-07-19 02:21:32.62597	2025-07-19 02:21:32.62597
4312	863	4	2	2025-07-19 02:21:32.62597	2025-07-19 02:21:32.62597
4313	863	5	2	2025-07-19 02:21:32.62597	2025-07-19 02:21:32.62597
4314	864	1	2	2025-07-19 02:21:32.788946	2025-07-19 02:21:32.788946
4315	864	2	2	2025-07-19 02:21:32.788946	2025-07-19 02:21:32.788946
4316	864	3	2	2025-07-19 02:21:32.788946	2025-07-19 02:21:32.788946
4317	864	4	2	2025-07-19 02:21:32.788946	2025-07-19 02:21:32.788946
4318	864	5	2	2025-07-19 02:21:32.788946	2025-07-19 02:21:32.788946
4319	865	1	2	2025-07-19 02:21:33.178391	2025-07-19 02:21:33.178391
4320	865	2	2	2025-07-19 02:21:33.178391	2025-07-19 02:21:33.178391
4321	865	3	2	2025-07-19 02:21:33.178391	2025-07-19 02:21:33.178391
4322	865	4	2	2025-07-19 02:21:33.178391	2025-07-19 02:21:33.178391
4323	865	5	2	2025-07-19 02:21:33.178391	2025-07-19 02:21:33.178391
4324	866	1	2	2025-07-19 02:21:33.628518	2025-07-19 02:21:33.628518
4325	866	2	2	2025-07-19 02:21:33.628518	2025-07-19 02:21:33.628518
4326	866	3	2	2025-07-19 02:21:33.628518	2025-07-19 02:21:33.628518
4327	866	4	2	2025-07-19 02:21:33.628518	2025-07-19 02:21:33.628518
4328	866	5	2	2025-07-19 02:21:33.628518	2025-07-19 02:21:33.628518
4329	867	1	2	2025-07-19 02:21:33.951703	2025-07-19 02:21:33.951703
4330	867	2	2	2025-07-19 02:21:33.951703	2025-07-19 02:21:33.951703
4331	867	3	2	2025-07-19 02:21:33.951703	2025-07-19 02:21:33.951703
4332	867	4	2	2025-07-19 02:21:33.951703	2025-07-19 02:21:33.951703
4333	867	5	2	2025-07-19 02:21:33.951703	2025-07-19 02:21:33.951703
4334	868	1	2	2025-07-19 02:21:34.137413	2025-07-19 02:21:34.137413
4335	868	2	2	2025-07-19 02:21:34.137413	2025-07-19 02:21:34.137413
4336	868	3	2	2025-07-19 02:21:34.137413	2025-07-19 02:21:34.137413
4337	868	4	2	2025-07-19 02:21:34.137413	2025-07-19 02:21:34.137413
4338	868	5	2	2025-07-19 02:21:34.137413	2025-07-19 02:21:34.137413
4339	869	1	2	2025-07-19 02:21:34.322555	2025-07-19 02:21:34.322555
4340	869	2	2	2025-07-19 02:21:34.322555	2025-07-19 02:21:34.322555
4341	869	3	2	2025-07-19 02:21:34.322555	2025-07-19 02:21:34.322555
4342	869	4	2	2025-07-19 02:21:34.322555	2025-07-19 02:21:34.322555
4343	869	5	2	2025-07-19 02:21:34.322555	2025-07-19 02:21:34.322555
4344	870	1	2	2025-07-19 02:21:34.483377	2025-07-19 02:21:34.483377
4345	870	2	2	2025-07-19 02:21:34.483377	2025-07-19 02:21:34.483377
4346	870	3	2	2025-07-19 02:21:34.483377	2025-07-19 02:21:34.483377
4347	870	4	2	2025-07-19 02:21:34.483377	2025-07-19 02:21:34.483377
4348	870	5	2	2025-07-19 02:21:34.483377	2025-07-19 02:21:34.483377
4349	871	1	2	2025-07-19 02:21:34.644286	2025-07-19 02:21:34.644286
4350	871	2	2	2025-07-19 02:21:34.644286	2025-07-19 02:21:34.644286
4351	871	3	2	2025-07-19 02:21:34.644286	2025-07-19 02:21:34.644286
4352	871	4	2	2025-07-19 02:21:34.644286	2025-07-19 02:21:34.644286
4353	871	5	2	2025-07-19 02:21:34.644286	2025-07-19 02:21:34.644286
4354	872	1	2	2025-07-19 02:21:34.824442	2025-07-19 02:21:34.824442
4355	872	2	2	2025-07-19 02:21:34.824442	2025-07-19 02:21:34.824442
4356	872	3	2	2025-07-19 02:21:34.824442	2025-07-19 02:21:34.824442
4357	872	4	2	2025-07-19 02:21:34.824442	2025-07-19 02:21:34.824442
4358	872	5	2	2025-07-19 02:21:34.824442	2025-07-19 02:21:34.824442
4359	873	1	2	2025-07-19 02:21:34.98956	2025-07-19 02:21:34.98956
4360	873	2	2	2025-07-19 02:21:34.98956	2025-07-19 02:21:34.98956
4361	873	3	2	2025-07-19 02:21:34.98956	2025-07-19 02:21:34.98956
4362	873	4	2	2025-07-19 02:21:34.98956	2025-07-19 02:21:34.98956
4363	873	5	2	2025-07-19 02:21:34.98956	2025-07-19 02:21:34.98956
4364	874	1	2	2025-07-19 02:21:35.147373	2025-07-19 02:21:35.147373
4365	874	2	2	2025-07-19 02:21:35.147373	2025-07-19 02:21:35.147373
4366	874	3	2	2025-07-19 02:21:35.147373	2025-07-19 02:21:35.147373
4367	874	4	2	2025-07-19 02:21:35.147373	2025-07-19 02:21:35.147373
4368	874	5	2	2025-07-19 02:21:35.147373	2025-07-19 02:21:35.147373
4369	875	1	2	2025-07-19 02:21:35.303622	2025-07-19 02:21:35.303622
4370	875	2	2	2025-07-19 02:21:35.303622	2025-07-19 02:21:35.303622
4371	875	3	2	2025-07-19 02:21:35.303622	2025-07-19 02:21:35.303622
4372	875	4	2	2025-07-19 02:21:35.303622	2025-07-19 02:21:35.303622
4373	875	5	2	2025-07-19 02:21:35.303622	2025-07-19 02:21:35.303622
4374	876	1	2	2025-07-19 02:21:35.468006	2025-07-19 02:21:35.468006
4375	876	2	2	2025-07-19 02:21:35.468006	2025-07-19 02:21:35.468006
4376	876	3	2	2025-07-19 02:21:35.468006	2025-07-19 02:21:35.468006
4377	876	4	2	2025-07-19 02:21:35.468006	2025-07-19 02:21:35.468006
4378	876	5	2	2025-07-19 02:21:35.468006	2025-07-19 02:21:35.468006
4379	877	1	2	2025-07-19 02:21:35.642585	2025-07-19 02:21:35.642585
4380	877	2	2	2025-07-19 02:21:35.642585	2025-07-19 02:21:35.642585
4381	877	3	2	2025-07-19 02:21:35.642585	2025-07-19 02:21:35.642585
4382	877	4	2	2025-07-19 02:21:35.642585	2025-07-19 02:21:35.642585
4383	877	5	2	2025-07-19 02:21:35.642585	2025-07-19 02:21:35.642585
4384	878	1	2	2025-07-19 02:21:35.875596	2025-07-19 02:21:35.875596
4385	878	2	2	2025-07-19 02:21:35.875596	2025-07-19 02:21:35.875596
4386	878	3	2	2025-07-19 02:21:35.875596	2025-07-19 02:21:35.875596
4387	878	4	2	2025-07-19 02:21:35.875596	2025-07-19 02:21:35.875596
4388	878	5	2	2025-07-19 02:21:35.875596	2025-07-19 02:21:35.875596
4389	879	1	2	2025-07-19 02:21:36.032527	2025-07-19 02:21:36.032527
4390	879	2	2	2025-07-19 02:21:36.032527	2025-07-19 02:21:36.032527
4391	879	3	2	2025-07-19 02:21:36.032527	2025-07-19 02:21:36.032527
4392	879	4	2	2025-07-19 02:21:36.032527	2025-07-19 02:21:36.032527
4393	879	5	2	2025-07-19 02:21:36.032527	2025-07-19 02:21:36.032527
4394	880	1	2	2025-07-19 02:21:36.190882	2025-07-19 02:21:36.190882
4395	880	2	2	2025-07-19 02:21:36.190882	2025-07-19 02:21:36.190882
4396	880	3	2	2025-07-19 02:21:36.190882	2025-07-19 02:21:36.190882
4397	880	4	2	2025-07-19 02:21:36.190882	2025-07-19 02:21:36.190882
4398	880	5	2	2025-07-19 02:21:36.190882	2025-07-19 02:21:36.190882
4399	881	1	2	2025-07-19 02:21:36.368724	2025-07-19 02:21:36.368724
4400	881	2	2	2025-07-19 02:21:36.368724	2025-07-19 02:21:36.368724
4401	881	3	2	2025-07-19 02:21:36.368724	2025-07-19 02:21:36.368724
4402	881	4	2	2025-07-19 02:21:36.368724	2025-07-19 02:21:36.368724
4403	881	5	2	2025-07-19 02:21:36.368724	2025-07-19 02:21:36.368724
4404	882	1	2	2025-07-19 02:21:36.537964	2025-07-19 02:21:36.537964
4405	882	2	2	2025-07-19 02:21:36.537964	2025-07-19 02:21:36.537964
4406	882	3	2	2025-07-19 02:21:36.537964	2025-07-19 02:21:36.537964
4407	882	4	2	2025-07-19 02:21:36.537964	2025-07-19 02:21:36.537964
4408	882	5	2	2025-07-19 02:21:36.537964	2025-07-19 02:21:36.537964
4409	883	1	2	2025-07-19 02:21:36.702891	2025-07-19 02:21:36.702891
4410	883	2	2	2025-07-19 02:21:36.702891	2025-07-19 02:21:36.702891
4411	883	3	2	2025-07-19 02:21:36.702891	2025-07-19 02:21:36.702891
4412	883	4	2	2025-07-19 02:21:36.702891	2025-07-19 02:21:36.702891
4413	883	5	2	2025-07-19 02:21:36.702891	2025-07-19 02:21:36.702891
4414	884	1	2	2025-07-19 02:21:36.874307	2025-07-19 02:21:36.874307
4415	884	2	2	2025-07-19 02:21:36.874307	2025-07-19 02:21:36.874307
4416	884	3	2	2025-07-19 02:21:36.874307	2025-07-19 02:21:36.874307
4417	884	4	2	2025-07-19 02:21:36.874307	2025-07-19 02:21:36.874307
4418	884	5	2	2025-07-19 02:21:36.874307	2025-07-19 02:21:36.874307
4419	885	1	2	2025-07-19 02:21:37.053301	2025-07-19 02:21:37.053301
4420	885	2	2	2025-07-19 02:21:37.053301	2025-07-19 02:21:37.053301
4421	885	3	2	2025-07-19 02:21:37.053301	2025-07-19 02:21:37.053301
4422	885	4	2	2025-07-19 02:21:37.053301	2025-07-19 02:21:37.053301
4423	885	5	2	2025-07-19 02:21:37.053301	2025-07-19 02:21:37.053301
4424	886	1	2	2025-07-19 02:21:37.210481	2025-07-19 02:21:37.210481
4425	886	2	2	2025-07-19 02:21:37.210481	2025-07-19 02:21:37.210481
4426	886	3	2	2025-07-19 02:21:37.210481	2025-07-19 02:21:37.210481
4427	886	4	2	2025-07-19 02:21:37.210481	2025-07-19 02:21:37.210481
4428	886	5	2	2025-07-19 02:21:37.210481	2025-07-19 02:21:37.210481
4429	887	1	2	2025-07-19 02:21:37.376418	2025-07-19 02:21:37.376418
4430	887	2	2	2025-07-19 02:21:37.376418	2025-07-19 02:21:37.376418
4431	887	3	2	2025-07-19 02:21:37.376418	2025-07-19 02:21:37.376418
4432	887	4	2	2025-07-19 02:21:37.376418	2025-07-19 02:21:37.376418
4433	887	5	2	2025-07-19 02:21:37.376418	2025-07-19 02:21:37.376418
4434	888	1	2	2025-07-19 02:21:37.542499	2025-07-19 02:21:37.542499
4435	888	2	2	2025-07-19 02:21:37.542499	2025-07-19 02:21:37.542499
4436	888	3	2	2025-07-19 02:21:37.542499	2025-07-19 02:21:37.542499
4437	888	4	2	2025-07-19 02:21:37.542499	2025-07-19 02:21:37.542499
4438	888	5	2	2025-07-19 02:21:37.542499	2025-07-19 02:21:37.542499
4439	889	1	2	2025-07-19 02:21:37.711881	2025-07-19 02:21:37.711881
4440	889	2	2	2025-07-19 02:21:37.711881	2025-07-19 02:21:37.711881
4441	889	3	2	2025-07-19 02:21:37.711881	2025-07-19 02:21:37.711881
4442	889	4	2	2025-07-19 02:21:37.711881	2025-07-19 02:21:37.711881
4443	889	5	2	2025-07-19 02:21:37.711881	2025-07-19 02:21:37.711881
4444	890	1	2	2025-07-19 02:21:37.874006	2025-07-19 02:21:37.874006
4445	890	2	2	2025-07-19 02:21:37.874006	2025-07-19 02:21:37.874006
4446	890	3	2	2025-07-19 02:21:37.874006	2025-07-19 02:21:37.874006
4447	890	4	2	2025-07-19 02:21:37.874006	2025-07-19 02:21:37.874006
4448	890	5	2	2025-07-19 02:21:37.874006	2025-07-19 02:21:37.874006
4449	891	1	2	2025-07-19 02:21:38.042809	2025-07-19 02:21:38.042809
4450	891	2	2	2025-07-19 02:21:38.042809	2025-07-19 02:21:38.042809
4451	891	3	2	2025-07-19 02:21:38.042809	2025-07-19 02:21:38.042809
4452	891	4	2	2025-07-19 02:21:38.042809	2025-07-19 02:21:38.042809
4453	891	5	2	2025-07-19 02:21:38.042809	2025-07-19 02:21:38.042809
4454	892	1	2	2025-07-19 02:21:38.200847	2025-07-19 02:21:38.200847
4455	892	2	2	2025-07-19 02:21:38.200847	2025-07-19 02:21:38.200847
4456	892	3	2	2025-07-19 02:21:38.200847	2025-07-19 02:21:38.200847
4457	892	4	2	2025-07-19 02:21:38.200847	2025-07-19 02:21:38.200847
4458	892	5	2	2025-07-19 02:21:38.200847	2025-07-19 02:21:38.200847
4459	893	1	2	2025-07-19 02:21:38.387916	2025-07-19 02:21:38.387916
4460	893	2	2	2025-07-19 02:21:38.387916	2025-07-19 02:21:38.387916
4461	893	3	2	2025-07-19 02:21:38.387916	2025-07-19 02:21:38.387916
4462	893	4	2	2025-07-19 02:21:38.387916	2025-07-19 02:21:38.387916
4463	893	5	2	2025-07-19 02:21:38.387916	2025-07-19 02:21:38.387916
4464	894	1	2	2025-07-19 02:21:38.54515	2025-07-19 02:21:38.54515
4465	894	2	2	2025-07-19 02:21:38.54515	2025-07-19 02:21:38.54515
4466	894	3	2	2025-07-19 02:21:38.54515	2025-07-19 02:21:38.54515
4467	894	4	2	2025-07-19 02:21:38.54515	2025-07-19 02:21:38.54515
4468	894	5	2	2025-07-19 02:21:38.54515	2025-07-19 02:21:38.54515
4469	895	1	2	2025-07-19 02:21:38.706589	2025-07-19 02:21:38.706589
4470	895	2	2	2025-07-19 02:21:38.706589	2025-07-19 02:21:38.706589
4471	895	3	2	2025-07-19 02:21:38.706589	2025-07-19 02:21:38.706589
4472	895	4	2	2025-07-19 02:21:38.706589	2025-07-19 02:21:38.706589
4473	895	5	2	2025-07-19 02:21:38.706589	2025-07-19 02:21:38.706589
4474	896	1	2	2025-07-19 02:21:38.869433	2025-07-19 02:21:38.869433
4475	896	2	2	2025-07-19 02:21:38.869433	2025-07-19 02:21:38.869433
4476	896	3	2	2025-07-19 02:21:38.869433	2025-07-19 02:21:38.869433
4477	896	4	2	2025-07-19 02:21:38.869433	2025-07-19 02:21:38.869433
4478	896	5	2	2025-07-19 02:21:38.869433	2025-07-19 02:21:38.869433
4479	897	1	2	2025-07-19 02:21:39.037134	2025-07-19 02:21:39.037134
4480	897	2	2	2025-07-19 02:21:39.037134	2025-07-19 02:21:39.037134
4481	897	3	2	2025-07-19 02:21:39.037134	2025-07-19 02:21:39.037134
4482	897	4	2	2025-07-19 02:21:39.037134	2025-07-19 02:21:39.037134
4483	897	5	2	2025-07-19 02:21:39.037134	2025-07-19 02:21:39.037134
4484	898	1	3	2025-07-20 17:42:53.462892	2025-07-20 17:42:53.462892
4485	898	2	3	2025-07-20 17:42:53.462892	2025-07-20 17:42:53.462892
4486	899	1	2	2025-07-20 17:49:35.605159	2025-07-20 17:49:35.605159
4487	899	2	2	2025-07-20 17:49:35.605159	2025-07-20 17:49:35.605159
4488	900	1	4	2025-07-21 07:41:09.714704	2025-07-21 07:41:09.714704
4489	900	2	3	2025-07-21 07:41:09.714704	2025-07-21 07:41:09.714704
4490	900	3	1	2025-07-21 07:41:09.714704	2025-07-21 07:41:09.714704
4491	900	5	2	2025-07-21 07:41:09.714704	2025-07-21 07:41:09.714704
4492	901	1	1	2025-07-21 07:41:38.047736	2025-07-21 07:41:38.047736
4493	901	2	1	2025-07-21 07:41:38.047736	2025-07-21 07:41:38.047736
4494	901	3	1	2025-07-21 07:41:38.047736	2025-07-21 07:41:38.047736
4495	902	1	1	2025-07-21 07:42:21.115541	2025-07-21 07:42:21.115541
4496	902	2	1	2025-07-21 07:42:21.115541	2025-07-21 07:42:21.115541
4497	902	4	2	2025-07-21 07:42:21.115541	2025-07-21 07:42:21.115541
4498	902	5	2	2025-07-21 07:42:21.115541	2025-07-21 07:42:21.115541
4499	903	1	4	2025-07-21 07:43:00.824356	2025-07-21 07:43:00.824356
4500	903	3	5	2025-07-21 07:43:00.824356	2025-07-21 07:43:00.824356
4501	903	4	6	2025-07-21 07:43:00.824356	2025-07-21 07:43:00.824356
4502	903	5	10	2025-07-21 07:43:00.824356	2025-07-21 07:43:00.824356
4503	904	1	2	2025-07-21 07:45:31.794541	2025-07-21 07:45:31.794541
4504	904	4	2	2025-07-21 07:45:31.794541	2025-07-21 07:45:31.794541
4505	904	5	1	2025-07-21 07:45:31.794541	2025-07-21 07:45:31.794541
4506	905	1	2	2025-07-21 07:46:33.953666	2025-07-21 07:46:33.953666
4507	905	2	1	2025-07-21 07:46:33.953666	2025-07-21 07:46:33.953666
4508	905	3	2	2025-07-21 07:46:33.953666	2025-07-21 07:46:33.953666
4509	905	5	1	2025-07-21 07:46:33.953666	2025-07-21 07:46:33.953666
4510	906	1	1	2025-07-21 07:52:40.632231	2025-07-21 07:52:40.632231
4511	906	3	2	2025-07-21 07:52:40.632231	2025-07-21 07:52:40.632231
4512	907	1	1	2025-07-21 07:52:43.182079	2025-07-21 07:52:43.182079
4513	907	2	2	2025-07-21 07:52:43.182079	2025-07-21 07:52:43.182079
4514	907	4	1	2025-07-21 07:52:43.182079	2025-07-21 07:52:43.182079
4515	907	5	2	2025-07-21 07:52:43.182079	2025-07-21 07:52:43.182079
4516	908	3	1	2025-07-21 07:52:45.750561	2025-07-21 07:52:45.750561
4517	908	4	2	2025-07-21 07:52:45.750561	2025-07-21 07:52:45.750561
4518	908	5	2	2025-07-21 07:52:45.750561	2025-07-21 07:52:45.750561
4519	909	1	2	2025-07-21 07:52:48.258317	2025-07-21 07:52:48.258317
4520	909	3	1	2025-07-21 07:52:48.258317	2025-07-21 07:52:48.258317
4521	910	1	3	2025-07-21 07:52:50.877478	2025-07-21 07:52:50.877478
4522	910	2	1	2025-07-21 07:52:50.877478	2025-07-21 07:52:50.877478
4523	910	3	2	2025-07-21 07:52:50.877478	2025-07-21 07:52:50.877478
4524	910	4	2	2025-07-21 07:52:50.877478	2025-07-21 07:52:50.877478
4525	910	5	1	2025-07-21 07:52:50.877478	2025-07-21 07:52:50.877478
4526	911	3	1	2025-07-21 07:52:53.412759	2025-07-21 07:52:53.412759
4527	911	4	1	2025-07-21 07:52:53.412759	2025-07-21 07:52:53.412759
4528	911	5	3	2025-07-21 07:52:53.412759	2025-07-21 07:52:53.412759
4529	912	1	1	2025-07-21 07:52:55.995291	2025-07-21 07:52:55.995291
4530	912	5	1	2025-07-21 07:52:55.995291	2025-07-21 07:52:55.995291
4531	913	4	2	2025-07-21 07:52:58.526451	2025-07-21 07:52:58.526451
4532	914	1	3	2025-07-21 07:53:01.029873	2025-07-21 07:53:01.029873
4533	914	2	2	2025-07-21 07:53:01.029873	2025-07-21 07:53:01.029873
4534	914	3	2	2025-07-21 07:53:01.029873	2025-07-21 07:53:01.029873
4535	914	4	1	2025-07-21 07:53:01.029873	2025-07-21 07:53:01.029873
4536	914	5	2	2025-07-21 07:53:01.029873	2025-07-21 07:53:01.029873
4537	915	1	1	2025-07-21 07:53:03.570901	2025-07-21 07:53:03.570901
4538	915	3	1	2025-07-21 07:53:03.570901	2025-07-21 07:53:03.570901
4539	915	4	2	2025-07-21 07:53:03.570901	2025-07-21 07:53:03.570901
4540	915	5	1	2025-07-21 07:53:03.570901	2025-07-21 07:53:03.570901
4541	916	1	2	2025-07-21 08:30:06.412893	2025-07-21 08:30:06.412893
4542	916	2	3	2025-07-21 08:30:06.412893	2025-07-21 08:30:06.412893
4543	916	3	3	2025-07-21 08:30:06.412893	2025-07-21 08:30:06.412893
4544	916	4	3	2025-07-21 08:30:06.412893	2025-07-21 08:30:06.412893
\.


--
-- TOC entry 3972 (class 0 OID 17320)
-- Dependencies: 334
-- Data for Name: penagihan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penagihan (id_penagihan, id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada, diperbarui_pada) FROM stdin;
3	74	300000.00	Cash	f	2025-07-21 07:41:08.830118	2025-07-21 07:41:08.830118
4	73	90000.00	Cash	f	2025-07-21 07:41:37.183972	2025-07-21 07:41:37.183972
5	92	180000.00	Cash	f	2025-07-21 07:42:20.255442	2025-07-21 07:42:20.255442
6	97	750000.00	Cash	f	2025-07-21 07:42:59.9772	2025-07-21 07:42:59.9772
7	93	150000.00	Cash	f	2025-07-21 07:45:30.982199	2025-07-21 07:45:30.982199
8	75	180000.00	Cash	f	2025-07-21 07:46:33.116653	2025-07-21 07:46:33.116653
9	86	90000.00	Cash	f	2025-07-21 07:52:39.796366	2025-07-21 07:52:39.796366
10	81	180000.00	Cash	f	2025-07-21 07:52:42.354277	2025-07-21 07:52:42.354277
11	33	150000.00	Cash	f	2025-07-21 07:52:44.926352	2025-07-21 07:52:44.926352
12	9	90000.00	Cash	f	2025-07-21 07:52:47.445091	2025-07-21 07:52:47.445091
13	10	270000.00	Cash	f	2025-07-21 07:52:49.98114	2025-07-21 07:52:49.98114
14	51	150000.00	Cash	f	2025-07-21 07:52:52.597443	2025-07-21 07:52:52.597443
15	160	60000.00	Cash	f	2025-07-21 07:52:55.143551	2025-07-21 07:52:55.143551
16	144	60000.00	Cash	f	2025-07-21 07:52:57.700865	2025-07-21 07:52:57.700865
17	143	300000.00	Cash	f	2025-07-21 07:53:00.201203	2025-07-21 07:53:00.201203
18	145	150000.00	Cash	f	2025-07-21 07:53:02.756873	2025-07-21 07:53:02.756873
\.


--
-- TOC entry 3968 (class 0 OID 17305)
-- Dependencies: 330
-- Data for Name: pengiriman; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pengiriman (id_pengiriman, id_toko, tanggal_kirim, dibuat_pada, diperbarui_pada, id_bulk_pengiriman) FROM stdin;
1	1	2025-07-19	2025-07-19 02:19:03.018054	2025-07-19 02:19:03.018054	\N
2	2	2025-07-19	2025-07-19 02:19:03.184461	2025-07-19 02:19:03.184461	\N
3	3	2025-07-19	2025-07-19 02:19:03.352862	2025-07-19 02:19:03.352862	\N
4	4	2025-07-19	2025-07-19 02:19:03.53156	2025-07-19 02:19:03.53156	\N
5	5	2025-07-19	2025-07-19 02:19:03.698997	2025-07-19 02:19:03.698997	\N
6	6	2025-07-19	2025-07-19 02:19:03.87656	2025-07-19 02:19:03.87656	\N
7	7	2025-07-19	2025-07-19 02:19:04.047631	2025-07-19 02:19:04.047631	\N
8	8	2025-07-19	2025-07-19 02:19:04.207638	2025-07-19 02:19:04.207638	\N
9	9	2025-07-19	2025-07-19 02:19:04.372727	2025-07-19 02:19:04.372727	\N
10	10	2025-07-19	2025-07-19 02:19:04.533185	2025-07-19 02:19:04.533185	\N
11	11	2025-07-19	2025-07-19 02:19:04.711979	2025-07-19 02:19:04.711979	\N
12	12	2025-07-19	2025-07-19 02:19:04.87855	2025-07-19 02:19:04.87855	\N
13	13	2025-07-19	2025-07-19 02:19:05.037183	2025-07-19 02:19:05.037183	\N
14	14	2025-07-19	2025-07-19 02:19:05.245946	2025-07-19 02:19:05.245946	\N
15	15	2025-07-19	2025-07-19 02:19:05.405531	2025-07-19 02:19:05.405531	\N
16	16	2025-07-19	2025-07-19 02:19:05.570178	2025-07-19 02:19:05.570178	\N
17	17	2025-07-19	2025-07-19 02:19:05.741504	2025-07-19 02:19:05.741504	\N
18	18	2025-07-19	2025-07-19 02:19:05.889405	2025-07-19 02:19:05.889405	\N
19	19	2025-07-19	2025-07-19 02:19:06.038513	2025-07-19 02:19:06.038513	\N
20	20	2025-07-19	2025-07-19 02:19:06.208814	2025-07-19 02:19:06.208814	\N
21	21	2025-07-19	2025-07-19 02:19:06.36093	2025-07-19 02:19:06.36093	\N
22	22	2025-07-19	2025-07-19 02:19:06.517236	2025-07-19 02:19:06.517236	\N
23	23	2025-07-19	2025-07-19 02:19:06.695789	2025-07-19 02:19:06.695789	\N
24	24	2025-07-19	2025-07-19 02:19:06.857804	2025-07-19 02:19:06.857804	\N
25	25	2025-07-19	2025-07-19 02:19:07.014324	2025-07-19 02:19:07.014324	\N
26	26	2025-07-19	2025-07-19 02:19:07.172904	2025-07-19 02:19:07.172904	\N
27	27	2025-07-19	2025-07-19 02:19:07.32836	2025-07-19 02:19:07.32836	\N
28	28	2025-07-19	2025-07-19 02:19:07.50253	2025-07-19 02:19:07.50253	\N
29	29	2025-07-19	2025-07-19 02:19:07.662549	2025-07-19 02:19:07.662549	\N
30	30	2025-07-19	2025-07-19 02:19:07.815992	2025-07-19 02:19:07.815992	\N
31	31	2025-07-19	2025-07-19 02:19:07.976209	2025-07-19 02:19:07.976209	\N
32	32	2025-07-19	2025-07-19 02:19:08.137824	2025-07-19 02:19:08.137824	\N
33	33	2025-07-19	2025-07-19 02:19:08.297857	2025-07-19 02:19:08.297857	\N
34	34	2025-07-19	2025-07-19 02:19:08.466602	2025-07-19 02:19:08.466602	\N
35	35	2025-07-19	2025-07-19 02:19:08.624734	2025-07-19 02:19:08.624734	\N
36	36	2025-07-19	2025-07-19 02:19:08.782478	2025-07-19 02:19:08.782478	\N
37	37	2025-07-19	2025-07-19 02:19:08.926502	2025-07-19 02:19:08.926502	\N
38	38	2025-07-19	2025-07-19 02:19:09.085887	2025-07-19 02:19:09.085887	\N
39	39	2025-07-19	2025-07-19 02:19:09.240965	2025-07-19 02:19:09.240965	\N
40	40	2025-07-19	2025-07-19 02:19:09.390602	2025-07-19 02:19:09.390602	\N
41	41	2025-07-19	2025-07-19 02:19:09.542649	2025-07-19 02:19:09.542649	\N
42	42	2025-07-19	2025-07-19 02:19:09.692202	2025-07-19 02:19:09.692202	\N
43	43	2025-07-19	2025-07-19 02:19:09.838396	2025-07-19 02:19:09.838396	\N
44	44	2025-07-19	2025-07-19 02:19:09.989874	2025-07-19 02:19:09.989874	\N
45	45	2025-07-19	2025-07-19 02:19:10.142591	2025-07-19 02:19:10.142591	\N
46	46	2025-07-19	2025-07-19 02:19:10.295798	2025-07-19 02:19:10.295798	\N
47	47	2025-07-19	2025-07-19 02:19:10.447325	2025-07-19 02:19:10.447325	\N
48	48	2025-07-19	2025-07-19 02:19:10.604205	2025-07-19 02:19:10.604205	\N
49	49	2025-07-19	2025-07-19 02:19:10.76077	2025-07-19 02:19:10.76077	\N
50	50	2025-07-19	2025-07-19 02:19:10.911049	2025-07-19 02:19:10.911049	\N
51	51	2025-07-19	2025-07-19 02:19:11.067991	2025-07-19 02:19:11.067991	\N
52	52	2025-07-19	2025-07-19 02:19:11.219806	2025-07-19 02:19:11.219806	\N
53	53	2025-07-19	2025-07-19 02:19:11.376467	2025-07-19 02:19:11.376467	\N
54	54	2025-07-19	2025-07-19 02:19:11.534179	2025-07-19 02:19:11.534179	\N
55	55	2025-07-19	2025-07-19 02:19:11.682249	2025-07-19 02:19:11.682249	\N
56	56	2025-07-19	2025-07-19 02:19:11.830628	2025-07-19 02:19:11.830628	\N
57	57	2025-07-19	2025-07-19 02:19:11.998789	2025-07-19 02:19:11.998789	\N
58	58	2025-07-19	2025-07-19 02:19:12.153251	2025-07-19 02:19:12.153251	\N
59	59	2025-07-19	2025-07-19 02:19:12.308726	2025-07-19 02:19:12.308726	\N
60	60	2025-07-19	2025-07-19 02:19:12.45947	2025-07-19 02:19:12.45947	\N
61	61	2025-07-19	2025-07-19 02:19:12.614449	2025-07-19 02:19:12.614449	\N
62	62	2025-07-19	2025-07-19 02:19:12.77206	2025-07-19 02:19:12.77206	\N
63	63	2025-07-19	2025-07-19 02:19:12.924287	2025-07-19 02:19:12.924287	\N
64	64	2025-07-19	2025-07-19 02:19:13.079611	2025-07-19 02:19:13.079611	\N
65	65	2025-07-19	2025-07-19 02:19:13.237164	2025-07-19 02:19:13.237164	\N
66	66	2025-07-19	2025-07-19 02:19:13.414539	2025-07-19 02:19:13.414539	\N
67	67	2025-07-19	2025-07-19 02:19:13.576369	2025-07-19 02:19:13.576369	\N
68	68	2025-07-19	2025-07-19 02:19:13.730128	2025-07-19 02:19:13.730128	\N
69	69	2025-07-19	2025-07-19 02:19:13.90119	2025-07-19 02:19:13.90119	\N
70	70	2025-07-19	2025-07-19 02:19:14.068791	2025-07-19 02:19:14.068791	\N
71	71	2025-07-19	2025-07-19 02:19:14.219844	2025-07-19 02:19:14.219844	\N
72	72	2025-07-19	2025-07-19 02:19:14.369885	2025-07-19 02:19:14.369885	\N
73	73	2025-07-19	2025-07-19 02:19:14.524373	2025-07-19 02:19:14.524373	\N
74	74	2025-07-19	2025-07-19 02:19:14.689426	2025-07-19 02:19:14.689426	\N
75	75	2025-07-19	2025-07-19 02:19:14.857343	2025-07-19 02:19:14.857343	\N
76	76	2025-07-19	2025-07-19 02:19:15.037794	2025-07-19 02:19:15.037794	\N
77	77	2025-07-19	2025-07-19 02:19:15.196228	2025-07-19 02:19:15.196228	\N
78	78	2025-07-19	2025-07-19 02:19:15.348239	2025-07-19 02:19:15.348239	\N
79	79	2025-07-19	2025-07-19 02:19:15.500452	2025-07-19 02:19:15.500452	\N
80	80	2025-07-19	2025-07-19 02:19:15.650388	2025-07-19 02:19:15.650388	\N
81	81	2025-07-19	2025-07-19 02:19:15.796003	2025-07-19 02:19:15.796003	\N
82	82	2025-07-19	2025-07-19 02:19:15.972198	2025-07-19 02:19:15.972198	\N
83	83	2025-07-19	2025-07-19 02:19:16.136524	2025-07-19 02:19:16.136524	\N
84	84	2025-07-19	2025-07-19 02:19:16.299172	2025-07-19 02:19:16.299172	\N
85	85	2025-07-19	2025-07-19 02:19:16.447617	2025-07-19 02:19:16.447617	\N
86	86	2025-07-19	2025-07-19 02:19:16.597421	2025-07-19 02:19:16.597421	\N
87	87	2025-07-19	2025-07-19 02:19:16.755017	2025-07-19 02:19:16.755017	\N
88	88	2025-07-19	2025-07-19 02:19:16.905541	2025-07-19 02:19:16.905541	\N
89	89	2025-07-19	2025-07-19 02:19:17.066265	2025-07-19 02:19:17.066265	\N
90	90	2025-07-19	2025-07-19 02:19:17.216285	2025-07-19 02:19:17.216285	\N
91	91	2025-07-19	2025-07-19 02:19:17.37522	2025-07-19 02:19:17.37522	\N
92	92	2025-07-19	2025-07-19 02:19:17.53654	2025-07-19 02:19:17.53654	\N
93	93	2025-07-19	2025-07-19 02:19:17.692771	2025-07-19 02:19:17.692771	\N
94	94	2025-07-19	2025-07-19 02:19:17.84557	2025-07-19 02:19:17.84557	\N
95	95	2025-07-19	2025-07-19 02:19:17.999375	2025-07-19 02:19:17.999375	\N
96	96	2025-07-19	2025-07-19 02:19:18.151981	2025-07-19 02:19:18.151981	\N
97	97	2025-07-19	2025-07-19 02:19:18.302709	2025-07-19 02:19:18.302709	\N
98	98	2025-07-19	2025-07-19 02:19:18.454567	2025-07-19 02:19:18.454567	\N
99	99	2025-07-19	2025-07-19 02:19:18.615727	2025-07-19 02:19:18.615727	\N
100	100	2025-07-19	2025-07-19 02:19:18.782172	2025-07-19 02:19:18.782172	\N
101	101	2025-07-19	2025-07-19 02:19:18.958535	2025-07-19 02:19:18.958535	\N
102	102	2025-07-19	2025-07-19 02:19:19.135114	2025-07-19 02:19:19.135114	\N
103	103	2025-07-19	2025-07-19 02:19:19.293241	2025-07-19 02:19:19.293241	\N
104	104	2025-07-19	2025-07-19 02:19:19.44298	2025-07-19 02:19:19.44298	\N
105	105	2025-07-19	2025-07-19 02:19:19.598354	2025-07-19 02:19:19.598354	\N
106	106	2025-07-19	2025-07-19 02:19:19.758133	2025-07-19 02:19:19.758133	\N
107	107	2025-07-19	2025-07-19 02:19:19.911226	2025-07-19 02:19:19.911226	\N
108	108	2025-07-19	2025-07-19 02:19:20.064078	2025-07-19 02:19:20.064078	\N
109	109	2025-07-19	2025-07-19 02:19:20.238756	2025-07-19 02:19:20.238756	\N
110	110	2025-07-19	2025-07-19 02:19:20.410764	2025-07-19 02:19:20.410764	\N
111	111	2025-07-19	2025-07-19 02:19:20.560886	2025-07-19 02:19:20.560886	\N
112	112	2025-07-19	2025-07-19 02:19:20.714606	2025-07-19 02:19:20.714606	\N
113	113	2025-07-19	2025-07-19 02:19:20.94457	2025-07-19 02:19:20.94457	\N
114	114	2025-07-19	2025-07-19 02:19:21.098835	2025-07-19 02:19:21.098835	\N
115	115	2025-07-19	2025-07-19 02:19:21.257567	2025-07-19 02:19:21.257567	\N
116	116	2025-07-19	2025-07-19 02:19:21.407264	2025-07-19 02:19:21.407264	\N
117	117	2025-07-19	2025-07-19 02:19:21.590423	2025-07-19 02:19:21.590423	\N
118	118	2025-07-19	2025-07-19 02:19:21.768177	2025-07-19 02:19:21.768177	\N
119	119	2025-07-19	2025-07-19 02:19:21.975819	2025-07-19 02:19:21.975819	\N
120	120	2025-07-19	2025-07-19 02:19:22.131357	2025-07-19 02:19:22.131357	\N
121	121	2025-07-19	2025-07-19 02:19:22.285923	2025-07-19 02:19:22.285923	\N
122	122	2025-07-19	2025-07-19 02:19:22.431388	2025-07-19 02:19:22.431388	\N
123	123	2025-07-19	2025-07-19 02:19:22.585866	2025-07-19 02:19:22.585866	\N
124	124	2025-07-19	2025-07-19 02:19:22.737109	2025-07-19 02:19:22.737109	\N
125	125	2025-07-19	2025-07-19 02:19:22.905001	2025-07-19 02:19:22.905001	\N
126	126	2025-07-19	2025-07-19 02:19:23.097389	2025-07-19 02:19:23.097389	\N
127	127	2025-07-19	2025-07-19 02:19:23.268762	2025-07-19 02:19:23.268762	\N
128	128	2025-07-19	2025-07-19 02:19:23.447607	2025-07-19 02:19:23.447607	\N
129	129	2025-07-19	2025-07-19 02:19:23.600747	2025-07-19 02:19:23.600747	\N
130	130	2025-07-19	2025-07-19 02:19:23.763339	2025-07-19 02:19:23.763339	\N
131	131	2025-07-19	2025-07-19 02:19:23.925582	2025-07-19 02:19:23.925582	\N
132	132	2025-07-19	2025-07-19 02:19:24.08037	2025-07-19 02:19:24.08037	\N
133	133	2025-07-19	2025-07-19 02:19:24.241006	2025-07-19 02:19:24.241006	\N
134	134	2025-07-19	2025-07-19 02:19:24.404272	2025-07-19 02:19:24.404272	\N
135	135	2025-07-19	2025-07-19 02:19:24.566709	2025-07-19 02:19:24.566709	\N
136	136	2025-07-19	2025-07-19 02:19:24.729686	2025-07-19 02:19:24.729686	\N
137	137	2025-07-19	2025-07-19 02:19:24.891283	2025-07-19 02:19:24.891283	\N
138	138	2025-07-19	2025-07-19 02:19:25.043559	2025-07-19 02:19:25.043559	\N
139	139	2025-07-19	2025-07-19 02:19:25.193015	2025-07-19 02:19:25.193015	\N
140	140	2025-07-19	2025-07-19 02:19:25.344733	2025-07-19 02:19:25.344733	\N
141	141	2025-07-19	2025-07-19 02:19:25.512018	2025-07-19 02:19:25.512018	\N
142	142	2025-07-19	2025-07-19 02:19:25.669155	2025-07-19 02:19:25.669155	\N
143	143	2025-07-19	2025-07-19 02:19:25.82377	2025-07-19 02:19:25.82377	\N
144	144	2025-07-19	2025-07-19 02:19:25.974428	2025-07-19 02:19:25.974428	\N
145	145	2025-07-19	2025-07-19 02:19:26.123971	2025-07-19 02:19:26.123971	\N
146	146	2025-07-19	2025-07-19 02:19:26.277059	2025-07-19 02:19:26.277059	\N
147	147	2025-07-19	2025-07-19 02:19:26.425923	2025-07-19 02:19:26.425923	\N
148	148	2025-07-19	2025-07-19 02:19:26.60163	2025-07-19 02:19:26.60163	\N
149	149	2025-07-19	2025-07-19 02:19:26.764762	2025-07-19 02:19:26.764762	\N
150	150	2025-07-19	2025-07-19 02:19:26.915551	2025-07-19 02:19:26.915551	\N
151	151	2025-07-19	2025-07-19 02:19:27.076689	2025-07-19 02:19:27.076689	\N
152	152	2025-07-19	2025-07-19 02:19:27.230272	2025-07-19 02:19:27.230272	\N
153	153	2025-07-19	2025-07-19 02:19:27.378392	2025-07-19 02:19:27.378392	\N
154	154	2025-07-19	2025-07-19 02:19:27.527769	2025-07-19 02:19:27.527769	\N
155	155	2025-07-19	2025-07-19 02:19:27.687004	2025-07-19 02:19:27.687004	\N
156	156	2025-07-19	2025-07-19 02:19:27.858914	2025-07-19 02:19:27.858914	\N
157	157	2025-07-19	2025-07-19 02:19:28.011137	2025-07-19 02:19:28.011137	\N
158	158	2025-07-19	2025-07-19 02:19:28.169334	2025-07-19 02:19:28.169334	\N
159	159	2025-07-19	2025-07-19 02:19:28.333188	2025-07-19 02:19:28.333188	\N
160	160	2025-07-19	2025-07-19 02:19:28.482085	2025-07-19 02:19:28.482085	\N
161	161	2025-07-19	2025-07-19 02:19:28.665187	2025-07-19 02:19:28.665187	\N
162	162	2025-07-19	2025-07-19 02:19:28.82127	2025-07-19 02:19:28.82127	\N
163	163	2025-07-19	2025-07-19 02:19:28.972926	2025-07-19 02:19:28.972926	\N
164	164	2025-07-19	2025-07-19 02:19:29.160731	2025-07-19 02:19:29.160731	\N
165	165	2025-07-19	2025-07-19 02:19:29.3147	2025-07-19 02:19:29.3147	\N
166	166	2025-07-19	2025-07-19 02:19:29.462929	2025-07-19 02:19:29.462929	\N
167	167	2025-07-19	2025-07-19 02:19:29.6184	2025-07-19 02:19:29.6184	\N
168	168	2025-07-19	2025-07-19 02:19:29.767607	2025-07-19 02:19:29.767607	\N
169	169	2025-07-19	2025-07-19 02:19:29.946842	2025-07-19 02:19:29.946842	\N
170	170	2025-07-19	2025-07-19 02:19:30.11233	2025-07-19 02:19:30.11233	\N
171	171	2025-07-19	2025-07-19 02:19:30.263348	2025-07-19 02:19:30.263348	\N
172	172	2025-07-19	2025-07-19 02:19:30.41374	2025-07-19 02:19:30.41374	\N
173	173	2025-07-19	2025-07-19 02:19:30.56552	2025-07-19 02:19:30.56552	\N
174	174	2025-07-19	2025-07-19 02:19:30.717064	2025-07-19 02:19:30.717064	\N
175	175	2025-07-19	2025-07-19 02:19:30.876859	2025-07-19 02:19:30.876859	\N
176	176	2025-07-19	2025-07-19 02:19:31.031436	2025-07-19 02:19:31.031436	\N
177	177	2025-07-19	2025-07-19 02:19:31.202761	2025-07-19 02:19:31.202761	\N
178	178	2025-07-19	2025-07-19 02:19:31.363537	2025-07-19 02:19:31.363537	\N
179	179	2025-07-19	2025-07-19 02:19:31.530928	2025-07-19 02:19:31.530928	\N
180	180	2025-07-19	2025-07-19 02:19:31.689666	2025-07-19 02:19:31.689666	\N
181	181	2025-07-19	2025-07-19 02:19:31.840025	2025-07-19 02:19:31.840025	\N
182	182	2025-07-19	2025-07-19 02:19:32.00433	2025-07-19 02:19:32.00433	\N
183	183	2025-07-19	2025-07-19 02:19:32.176173	2025-07-19 02:19:32.176173	\N
184	184	2025-07-19	2025-07-19 02:19:32.329152	2025-07-19 02:19:32.329152	\N
185	185	2025-07-19	2025-07-19 02:19:32.481538	2025-07-19 02:19:32.481538	\N
186	186	2025-07-19	2025-07-19 02:19:32.628737	2025-07-19 02:19:32.628737	\N
187	187	2025-07-19	2025-07-19 02:19:32.80105	2025-07-19 02:19:32.80105	\N
188	188	2025-07-19	2025-07-19 02:19:32.969505	2025-07-19 02:19:32.969505	\N
189	189	2025-07-19	2025-07-19 02:19:33.124176	2025-07-19 02:19:33.124176	\N
190	190	2025-07-19	2025-07-19 02:19:33.277767	2025-07-19 02:19:33.277767	\N
191	191	2025-07-19	2025-07-19 02:19:33.427439	2025-07-19 02:19:33.427439	\N
192	192	2025-07-19	2025-07-19 02:19:33.576555	2025-07-19 02:19:33.576555	\N
193	193	2025-07-19	2025-07-19 02:19:33.72155	2025-07-19 02:19:33.72155	\N
194	194	2025-07-19	2025-07-19 02:19:33.8784	2025-07-19 02:19:33.8784	\N
195	195	2025-07-19	2025-07-19 02:19:34.032654	2025-07-19 02:19:34.032654	\N
196	196	2025-07-19	2025-07-19 02:19:34.189309	2025-07-19 02:19:34.189309	\N
197	197	2025-07-19	2025-07-19 02:19:34.33863	2025-07-19 02:19:34.33863	\N
198	198	2025-07-19	2025-07-19 02:19:34.496809	2025-07-19 02:19:34.496809	\N
199	199	2025-07-19	2025-07-19 02:19:34.704184	2025-07-19 02:19:34.704184	\N
200	200	2025-07-19	2025-07-19 02:19:34.859648	2025-07-19 02:19:34.859648	\N
201	201	2025-07-19	2025-07-19 02:19:35.008761	2025-07-19 02:19:35.008761	\N
202	202	2025-07-19	2025-07-19 02:19:35.165621	2025-07-19 02:19:35.165621	\N
203	203	2025-07-19	2025-07-19 02:19:35.312684	2025-07-19 02:19:35.312684	\N
204	204	2025-07-19	2025-07-19 02:19:35.459847	2025-07-19 02:19:35.459847	\N
205	205	2025-07-19	2025-07-19 02:19:35.619742	2025-07-19 02:19:35.619742	\N
206	206	2025-07-19	2025-07-19 02:19:35.774127	2025-07-19 02:19:35.774127	\N
207	207	2025-07-19	2025-07-19 02:19:35.927374	2025-07-19 02:19:35.927374	\N
208	208	2025-07-19	2025-07-19 02:19:36.076456	2025-07-19 02:19:36.076456	\N
209	209	2025-07-19	2025-07-19 02:19:36.232905	2025-07-19 02:19:36.232905	\N
210	210	2025-07-19	2025-07-19 02:19:36.384135	2025-07-19 02:19:36.384135	\N
211	211	2025-07-19	2025-07-19 02:19:36.559953	2025-07-19 02:19:36.559953	\N
212	212	2025-07-19	2025-07-19 02:19:36.709376	2025-07-19 02:19:36.709376	\N
213	213	2025-07-19	2025-07-19 02:19:36.852987	2025-07-19 02:19:36.852987	\N
214	214	2025-07-19	2025-07-19 02:19:37.017942	2025-07-19 02:19:37.017942	\N
215	215	2025-07-19	2025-07-19 02:19:37.163442	2025-07-19 02:19:37.163442	\N
216	216	2025-07-19	2025-07-19 02:19:37.317741	2025-07-19 02:19:37.317741	\N
217	217	2025-07-19	2025-07-19 02:19:37.476504	2025-07-19 02:19:37.476504	\N
218	218	2025-07-19	2025-07-19 02:19:37.634926	2025-07-19 02:19:37.634926	\N
219	219	2025-07-19	2025-07-19 02:19:37.785825	2025-07-19 02:19:37.785825	\N
220	220	2025-07-19	2025-07-19 02:19:37.937478	2025-07-19 02:19:37.937478	\N
221	221	2025-07-19	2025-07-19 02:19:38.090377	2025-07-19 02:19:38.090377	\N
222	222	2025-07-19	2025-07-19 02:19:38.234526	2025-07-19 02:19:38.234526	\N
223	223	2025-07-19	2025-07-19 02:19:38.37918	2025-07-19 02:19:38.37918	\N
224	224	2025-07-19	2025-07-19 02:19:38.533534	2025-07-19 02:19:38.533534	\N
225	225	2025-07-19	2025-07-19 02:19:38.685259	2025-07-19 02:19:38.685259	\N
226	226	2025-07-19	2025-07-19 02:19:38.83945	2025-07-19 02:19:38.83945	\N
227	227	2025-07-19	2025-07-19 02:19:38.985749	2025-07-19 02:19:38.985749	\N
228	228	2025-07-19	2025-07-19 02:19:39.13207	2025-07-19 02:19:39.13207	\N
229	229	2025-07-19	2025-07-19 02:19:39.279636	2025-07-19 02:19:39.279636	\N
230	230	2025-07-19	2025-07-19 02:19:39.469355	2025-07-19 02:19:39.469355	\N
231	231	2025-07-19	2025-07-19 02:19:39.615598	2025-07-19 02:19:39.615598	\N
232	232	2025-07-19	2025-07-19 02:19:39.757534	2025-07-19 02:19:39.757534	\N
233	233	2025-07-19	2025-07-19 02:19:39.918595	2025-07-19 02:19:39.918595	\N
234	234	2025-07-19	2025-07-19 02:19:40.083488	2025-07-19 02:19:40.083488	\N
235	235	2025-07-19	2025-07-19 02:19:40.234067	2025-07-19 02:19:40.234067	\N
236	236	2025-07-19	2025-07-19 02:19:40.384297	2025-07-19 02:19:40.384297	\N
237	237	2025-07-19	2025-07-19 02:19:40.541871	2025-07-19 02:19:40.541871	\N
238	238	2025-07-19	2025-07-19 02:19:40.69013	2025-07-19 02:19:40.69013	\N
239	239	2025-07-19	2025-07-19 02:19:40.844172	2025-07-19 02:19:40.844172	\N
240	240	2025-07-19	2025-07-19 02:19:40.99159	2025-07-19 02:19:40.99159	\N
241	241	2025-07-19	2025-07-19 02:19:41.143591	2025-07-19 02:19:41.143591	\N
242	242	2025-07-19	2025-07-19 02:19:41.292061	2025-07-19 02:19:41.292061	\N
243	243	2025-07-19	2025-07-19 02:19:41.446564	2025-07-19 02:19:41.446564	\N
244	244	2025-07-19	2025-07-19 02:19:41.592646	2025-07-19 02:19:41.592646	\N
245	245	2025-07-19	2025-07-19 02:19:41.738612	2025-07-19 02:19:41.738612	\N
246	246	2025-07-19	2025-07-19 02:19:41.890298	2025-07-19 02:19:41.890298	\N
247	247	2025-07-19	2025-07-19 02:19:42.049479	2025-07-19 02:19:42.049479	\N
248	248	2025-07-19	2025-07-19 02:19:42.213069	2025-07-19 02:19:42.213069	\N
249	249	2025-07-19	2025-07-19 02:19:42.367112	2025-07-19 02:19:42.367112	\N
250	250	2025-07-19	2025-07-19 02:19:42.528953	2025-07-19 02:19:42.528953	\N
251	251	2025-07-19	2025-07-19 02:19:42.675445	2025-07-19 02:19:42.675445	\N
252	252	2025-07-19	2025-07-19 02:19:42.828998	2025-07-19 02:19:42.828998	\N
253	253	2025-07-19	2025-07-19 02:19:42.992941	2025-07-19 02:19:42.992941	\N
254	254	2025-07-19	2025-07-19 02:19:43.14082	2025-07-19 02:19:43.14082	\N
255	255	2025-07-19	2025-07-19 02:19:43.306367	2025-07-19 02:19:43.306367	\N
256	256	2025-07-19	2025-07-19 02:19:43.462135	2025-07-19 02:19:43.462135	\N
257	257	2025-07-19	2025-07-19 02:19:43.611662	2025-07-19 02:19:43.611662	\N
258	258	2025-07-19	2025-07-19 02:19:43.783379	2025-07-19 02:19:43.783379	\N
259	259	2025-07-19	2025-07-19 02:19:43.952576	2025-07-19 02:19:43.952576	\N
260	260	2025-07-19	2025-07-19 02:19:44.112928	2025-07-19 02:19:44.112928	\N
261	261	2025-07-19	2025-07-19 02:19:44.326035	2025-07-19 02:19:44.326035	\N
262	262	2025-07-19	2025-07-19 02:19:44.488485	2025-07-19 02:19:44.488485	\N
263	263	2025-07-19	2025-07-19 02:19:44.66373	2025-07-19 02:19:44.66373	\N
264	264	2025-07-19	2025-07-19 02:19:44.838725	2025-07-19 02:19:44.838725	\N
265	265	2025-07-19	2025-07-19 02:19:45.002493	2025-07-19 02:19:45.002493	\N
266	266	2025-07-19	2025-07-19 02:19:45.168815	2025-07-19 02:19:45.168815	\N
267	267	2025-07-19	2025-07-19 02:19:45.326994	2025-07-19 02:19:45.326994	\N
268	268	2025-07-19	2025-07-19 02:19:45.481342	2025-07-19 02:19:45.481342	\N
269	269	2025-07-19	2025-07-19 02:19:45.642501	2025-07-19 02:19:45.642501	\N
270	270	2025-07-19	2025-07-19 02:19:45.812405	2025-07-19 02:19:45.812405	\N
271	271	2025-07-19	2025-07-19 02:19:45.992134	2025-07-19 02:19:45.992134	\N
272	272	2025-07-19	2025-07-19 02:19:46.153472	2025-07-19 02:19:46.153472	\N
273	273	2025-07-19	2025-07-19 02:19:46.308953	2025-07-19 02:19:46.308953	\N
274	274	2025-07-19	2025-07-19 02:19:46.47549	2025-07-19 02:19:46.47549	\N
275	275	2025-07-19	2025-07-19 02:19:46.675021	2025-07-19 02:19:46.675021	\N
276	276	2025-07-19	2025-07-19 02:19:46.833538	2025-07-19 02:19:46.833538	\N
277	277	2025-07-19	2025-07-19 02:19:47.005613	2025-07-19 02:19:47.005613	\N
278	278	2025-07-19	2025-07-19 02:19:47.169183	2025-07-19 02:19:47.169183	\N
279	279	2025-07-19	2025-07-19 02:19:47.332717	2025-07-19 02:19:47.332717	\N
280	280	2025-07-19	2025-07-19 02:19:47.499187	2025-07-19 02:19:47.499187	\N
281	281	2025-07-19	2025-07-19 02:19:47.650319	2025-07-19 02:19:47.650319	\N
282	282	2025-07-19	2025-07-19 02:19:47.811677	2025-07-19 02:19:47.811677	\N
283	283	2025-07-19	2025-07-19 02:19:47.97268	2025-07-19 02:19:47.97268	\N
284	284	2025-07-19	2025-07-19 02:19:48.136142	2025-07-19 02:19:48.136142	\N
285	285	2025-07-19	2025-07-19 02:19:48.301284	2025-07-19 02:19:48.301284	\N
286	286	2025-07-19	2025-07-19 02:19:48.465574	2025-07-19 02:19:48.465574	\N
287	287	2025-07-19	2025-07-19 02:19:48.620458	2025-07-19 02:19:48.620458	\N
288	288	2025-07-19	2025-07-19 02:19:48.780852	2025-07-19 02:19:48.780852	\N
289	289	2025-07-19	2025-07-19 02:19:48.939614	2025-07-19 02:19:48.939614	\N
290	290	2025-07-19	2025-07-19 02:19:49.095206	2025-07-19 02:19:49.095206	\N
291	291	2025-07-19	2025-07-19 02:19:49.262601	2025-07-19 02:19:49.262601	\N
292	292	2025-07-19	2025-07-19 02:19:49.430187	2025-07-19 02:19:49.430187	\N
293	293	2025-07-19	2025-07-19 02:19:49.589745	2025-07-19 02:19:49.589745	\N
294	294	2025-07-19	2025-07-19 02:19:49.766808	2025-07-19 02:19:49.766808	\N
295	295	2025-07-19	2025-07-19 02:19:49.951841	2025-07-19 02:19:49.951841	\N
296	296	2025-07-19	2025-07-19 02:19:50.116528	2025-07-19 02:19:50.116528	\N
297	297	2025-07-19	2025-07-19 02:19:50.289294	2025-07-19 02:19:50.289294	\N
298	298	2025-07-19	2025-07-19 02:19:50.446811	2025-07-19 02:19:50.446811	\N
299	299	2025-07-19	2025-07-19 02:19:50.614383	2025-07-19 02:19:50.614383	\N
300	300	2025-07-19	2025-07-19 02:19:50.778745	2025-07-19 02:19:50.778745	\N
301	301	2025-07-19	2025-07-19 02:19:50.933003	2025-07-19 02:19:50.933003	\N
302	302	2025-07-19	2025-07-19 02:19:51.093543	2025-07-19 02:19:51.093543	\N
303	303	2025-07-19	2025-07-19 02:19:51.311181	2025-07-19 02:19:51.311181	\N
304	304	2025-07-19	2025-07-19 02:19:51.533042	2025-07-19 02:19:51.533042	\N
305	305	2025-07-19	2025-07-19 02:19:51.786477	2025-07-19 02:19:51.786477	\N
306	306	2025-07-19	2025-07-19 02:19:51.987834	2025-07-19 02:19:51.987834	\N
307	307	2025-07-19	2025-07-19 02:19:52.14878	2025-07-19 02:19:52.14878	\N
308	308	2025-07-19	2025-07-19 02:19:52.319183	2025-07-19 02:19:52.319183	\N
309	309	2025-07-19	2025-07-19 02:19:52.472543	2025-07-19 02:19:52.472543	\N
310	310	2025-07-19	2025-07-19 02:19:52.629116	2025-07-19 02:19:52.629116	\N
311	311	2025-07-19	2025-07-19 02:19:52.795503	2025-07-19 02:19:52.795503	\N
312	312	2025-07-19	2025-07-19 02:19:52.986777	2025-07-19 02:19:52.986777	\N
313	313	2025-07-19	2025-07-19 02:19:53.205776	2025-07-19 02:19:53.205776	\N
314	314	2025-07-19	2025-07-19 02:19:53.371312	2025-07-19 02:19:53.371312	\N
315	315	2025-07-19	2025-07-19 02:19:53.538047	2025-07-19 02:19:53.538047	\N
316	316	2025-07-19	2025-07-19 02:19:53.700396	2025-07-19 02:19:53.700396	\N
317	317	2025-07-19	2025-07-19 02:19:53.860381	2025-07-19 02:19:53.860381	\N
318	318	2025-07-19	2025-07-19 02:19:54.0202	2025-07-19 02:19:54.0202	\N
319	319	2025-07-19	2025-07-19 02:19:54.193062	2025-07-19 02:19:54.193062	\N
320	320	2025-07-19	2025-07-19 02:19:54.360517	2025-07-19 02:19:54.360517	\N
321	321	2025-07-19	2025-07-19 02:19:54.519107	2025-07-19 02:19:54.519107	\N
322	322	2025-07-19	2025-07-19 02:19:54.688536	2025-07-19 02:19:54.688536	\N
323	323	2025-07-19	2025-07-19 02:19:54.850635	2025-07-19 02:19:54.850635	\N
324	324	2025-07-19	2025-07-19 02:19:55.032352	2025-07-19 02:19:55.032352	\N
325	325	2025-07-19	2025-07-19 02:19:55.19672	2025-07-19 02:19:55.19672	\N
326	326	2025-07-19	2025-07-19 02:19:55.359958	2025-07-19 02:19:55.359958	\N
327	327	2025-07-19	2025-07-19 02:19:55.51948	2025-07-19 02:19:55.51948	\N
328	328	2025-07-19	2025-07-19 02:19:55.685672	2025-07-19 02:19:55.685672	\N
329	329	2025-07-19	2025-07-19 02:19:55.859538	2025-07-19 02:19:55.859538	\N
330	330	2025-07-19	2025-07-19 02:19:56.029735	2025-07-19 02:19:56.029735	\N
331	331	2025-07-19	2025-07-19 02:19:56.187333	2025-07-19 02:19:56.187333	\N
332	332	2025-07-19	2025-07-19 02:19:56.349823	2025-07-19 02:19:56.349823	\N
333	333	2025-07-19	2025-07-19 02:19:56.625549	2025-07-19 02:19:56.625549	\N
334	334	2025-07-19	2025-07-19 02:19:56.82464	2025-07-19 02:19:56.82464	\N
335	335	2025-07-19	2025-07-19 02:19:57.035433	2025-07-19 02:19:57.035433	\N
336	336	2025-07-19	2025-07-19 02:19:57.272933	2025-07-19 02:19:57.272933	\N
337	337	2025-07-19	2025-07-19 02:19:57.473117	2025-07-19 02:19:57.473117	\N
338	338	2025-07-19	2025-07-19 02:19:57.678599	2025-07-19 02:19:57.678599	\N
339	339	2025-07-19	2025-07-19 02:19:57.879905	2025-07-19 02:19:57.879905	\N
340	340	2025-07-19	2025-07-19 02:19:58.086666	2025-07-19 02:19:58.086666	\N
341	341	2025-07-19	2025-07-19 02:19:58.306326	2025-07-19 02:19:58.306326	\N
342	342	2025-07-19	2025-07-19 02:19:58.509741	2025-07-19 02:19:58.509741	\N
343	343	2025-07-19	2025-07-19 02:19:58.722047	2025-07-19 02:19:58.722047	\N
344	344	2025-07-19	2025-07-19 02:19:58.934153	2025-07-19 02:19:58.934153	\N
345	345	2025-07-19	2025-07-19 02:19:59.130672	2025-07-19 02:19:59.130672	\N
346	346	2025-07-19	2025-07-19 02:19:59.322721	2025-07-19 02:19:59.322721	\N
347	347	2025-07-19	2025-07-19 02:19:59.524789	2025-07-19 02:19:59.524789	\N
348	348	2025-07-19	2025-07-19 02:19:59.699296	2025-07-19 02:19:59.699296	\N
349	349	2025-07-19	2025-07-19 02:19:59.885288	2025-07-19 02:19:59.885288	\N
350	350	2025-07-19	2025-07-19 02:20:00.068802	2025-07-19 02:20:00.068802	\N
351	351	2025-07-19	2025-07-19 02:20:00.255779	2025-07-19 02:20:00.255779	\N
352	352	2025-07-19	2025-07-19 02:20:00.429714	2025-07-19 02:20:00.429714	\N
353	353	2025-07-19	2025-07-19 02:20:00.609138	2025-07-19 02:20:00.609138	\N
354	354	2025-07-19	2025-07-19 02:20:00.788159	2025-07-19 02:20:00.788159	\N
355	355	2025-07-19	2025-07-19 02:20:00.980679	2025-07-19 02:20:00.980679	\N
356	356	2025-07-19	2025-07-19 02:20:01.151144	2025-07-19 02:20:01.151144	\N
357	357	2025-07-19	2025-07-19 02:20:01.330893	2025-07-19 02:20:01.330893	\N
358	358	2025-07-19	2025-07-19 02:20:01.531021	2025-07-19 02:20:01.531021	\N
359	359	2025-07-19	2025-07-19 02:20:01.729959	2025-07-19 02:20:01.729959	\N
360	360	2025-07-19	2025-07-19 02:20:01.913076	2025-07-19 02:20:01.913076	\N
361	361	2025-07-19	2025-07-19 02:20:02.128344	2025-07-19 02:20:02.128344	\N
362	362	2025-07-19	2025-07-19 02:20:02.727811	2025-07-19 02:20:02.727811	\N
363	363	2025-07-19	2025-07-19 02:20:03.061558	2025-07-19 02:20:03.061558	\N
364	364	2025-07-19	2025-07-19 02:20:03.253716	2025-07-19 02:20:03.253716	\N
365	365	2025-07-19	2025-07-19 02:20:03.458449	2025-07-19 02:20:03.458449	\N
366	366	2025-07-19	2025-07-19 02:20:03.680554	2025-07-19 02:20:03.680554	\N
367	367	2025-07-19	2025-07-19 02:20:03.88562	2025-07-19 02:20:03.88562	\N
368	368	2025-07-19	2025-07-19 02:20:04.102244	2025-07-19 02:20:04.102244	\N
369	369	2025-07-19	2025-07-19 02:20:04.436585	2025-07-19 02:20:04.436585	\N
370	370	2025-07-19	2025-07-19 02:20:04.637062	2025-07-19 02:20:04.637062	\N
371	371	2025-07-19	2025-07-19 02:20:04.825379	2025-07-19 02:20:04.825379	\N
372	372	2025-07-19	2025-07-19 02:20:05.01517	2025-07-19 02:20:05.01517	\N
373	373	2025-07-19	2025-07-19 02:20:05.201989	2025-07-19 02:20:05.201989	\N
374	374	2025-07-19	2025-07-19 02:20:05.386233	2025-07-19 02:20:05.386233	\N
375	375	2025-07-19	2025-07-19 02:20:05.572198	2025-07-19 02:20:05.572198	\N
376	376	2025-07-19	2025-07-19 02:20:05.747823	2025-07-19 02:20:05.747823	\N
377	377	2025-07-19	2025-07-19 02:20:05.926087	2025-07-19 02:20:05.926087	\N
378	378	2025-07-19	2025-07-19 02:20:06.113885	2025-07-19 02:20:06.113885	\N
379	379	2025-07-19	2025-07-19 02:20:06.292714	2025-07-19 02:20:06.292714	\N
380	380	2025-07-19	2025-07-19 02:20:06.481233	2025-07-19 02:20:06.481233	\N
381	381	2025-07-19	2025-07-19 02:20:06.658961	2025-07-19 02:20:06.658961	\N
382	382	2025-07-19	2025-07-19 02:20:06.859663	2025-07-19 02:20:06.859663	\N
383	383	2025-07-19	2025-07-19 02:20:07.047372	2025-07-19 02:20:07.047372	\N
384	384	2025-07-19	2025-07-19 02:20:07.229968	2025-07-19 02:20:07.229968	\N
385	385	2025-07-19	2025-07-19 02:20:07.417813	2025-07-19 02:20:07.417813	\N
386	386	2025-07-19	2025-07-19 02:20:07.628844	2025-07-19 02:20:07.628844	\N
387	387	2025-07-19	2025-07-19 02:20:07.851153	2025-07-19 02:20:07.851153	\N
388	388	2025-07-19	2025-07-19 02:20:08.050107	2025-07-19 02:20:08.050107	\N
389	389	2025-07-19	2025-07-19 02:20:08.275352	2025-07-19 02:20:08.275352	\N
390	390	2025-07-19	2025-07-19 02:20:08.489969	2025-07-19 02:20:08.489969	\N
391	391	2025-07-19	2025-07-19 02:20:08.676698	2025-07-19 02:20:08.676698	\N
392	392	2025-07-19	2025-07-19 02:20:08.866554	2025-07-19 02:20:08.866554	\N
393	393	2025-07-19	2025-07-19 02:20:09.046401	2025-07-19 02:20:09.046401	\N
394	394	2025-07-19	2025-07-19 02:20:09.239992	2025-07-19 02:20:09.239992	\N
395	395	2025-07-19	2025-07-19 02:20:09.427627	2025-07-19 02:20:09.427627	\N
396	396	2025-07-19	2025-07-19 02:20:09.613662	2025-07-19 02:20:09.613662	\N
397	397	2025-07-19	2025-07-19 02:20:09.793425	2025-07-19 02:20:09.793425	\N
398	398	2025-07-19	2025-07-19 02:20:09.975711	2025-07-19 02:20:09.975711	\N
399	399	2025-07-19	2025-07-19 02:20:10.162425	2025-07-19 02:20:10.162425	\N
400	400	2025-07-19	2025-07-19 02:20:10.351404	2025-07-19 02:20:10.351404	\N
401	401	2025-07-19	2025-07-19 02:20:10.536028	2025-07-19 02:20:10.536028	\N
402	402	2025-07-19	2025-07-19 02:20:10.722642	2025-07-19 02:20:10.722642	\N
403	403	2025-07-19	2025-07-19 02:20:10.971534	2025-07-19 02:20:10.971534	\N
404	404	2025-07-19	2025-07-19 02:20:11.164407	2025-07-19 02:20:11.164407	\N
405	405	2025-07-19	2025-07-19 02:20:11.360104	2025-07-19 02:20:11.360104	\N
406	406	2025-07-19	2025-07-19 02:20:11.560917	2025-07-19 02:20:11.560917	\N
407	407	2025-07-19	2025-07-19 02:20:11.737684	2025-07-19 02:20:11.737684	\N
408	408	2025-07-19	2025-07-19 02:20:11.918709	2025-07-19 02:20:11.918709	\N
409	409	2025-07-19	2025-07-19 02:20:12.12773	2025-07-19 02:20:12.12773	\N
410	410	2025-07-19	2025-07-19 02:20:12.319904	2025-07-19 02:20:12.319904	\N
411	411	2025-07-19	2025-07-19 02:20:12.520941	2025-07-19 02:20:12.520941	\N
412	412	2025-07-19	2025-07-19 02:20:12.700635	2025-07-19 02:20:12.700635	\N
413	413	2025-07-19	2025-07-19 02:20:12.884028	2025-07-19 02:20:12.884028	\N
414	414	2025-07-19	2025-07-19 02:20:13.05945	2025-07-19 02:20:13.05945	\N
415	415	2025-07-19	2025-07-19 02:20:13.239507	2025-07-19 02:20:13.239507	\N
416	416	2025-07-19	2025-07-19 02:20:13.439477	2025-07-19 02:20:13.439477	\N
417	417	2025-07-19	2025-07-19 02:20:13.650834	2025-07-19 02:20:13.650834	\N
418	418	2025-07-19	2025-07-19 02:20:13.835034	2025-07-19 02:20:13.835034	\N
419	419	2025-07-19	2025-07-19 02:20:14.017027	2025-07-19 02:20:14.017027	\N
420	420	2025-07-19	2025-07-19 02:20:14.214531	2025-07-19 02:20:14.214531	\N
421	421	2025-07-19	2025-07-19 02:20:14.385222	2025-07-19 02:20:14.385222	\N
422	422	2025-07-19	2025-07-19 02:20:14.568498	2025-07-19 02:20:14.568498	\N
423	423	2025-07-19	2025-07-19 02:20:14.758002	2025-07-19 02:20:14.758002	\N
424	424	2025-07-19	2025-07-19 02:20:14.945644	2025-07-19 02:20:14.945644	\N
425	425	2025-07-19	2025-07-19 02:20:15.129371	2025-07-19 02:20:15.129371	\N
426	426	2025-07-19	2025-07-19 02:20:15.40437	2025-07-19 02:20:15.40437	\N
427	427	2025-07-19	2025-07-19 02:20:15.769529	2025-07-19 02:20:15.769529	\N
428	428	2025-07-19	2025-07-19 02:20:16.039444	2025-07-19 02:20:16.039444	\N
429	429	2025-07-19	2025-07-19 02:20:16.222808	2025-07-19 02:20:16.222808	\N
430	430	2025-07-19	2025-07-19 02:20:16.404598	2025-07-19 02:20:16.404598	\N
431	431	2025-07-19	2025-07-19 02:20:16.578303	2025-07-19 02:20:16.578303	\N
432	432	2025-07-19	2025-07-19 02:20:16.752048	2025-07-19 02:20:16.752048	\N
433	433	2025-07-19	2025-07-19 02:20:16.933157	2025-07-19 02:20:16.933157	\N
434	434	2025-07-19	2025-07-19 02:20:17.119444	2025-07-19 02:20:17.119444	\N
435	435	2025-07-19	2025-07-19 02:20:17.30214	2025-07-19 02:20:17.30214	\N
436	436	2025-07-19	2025-07-19 02:20:17.483792	2025-07-19 02:20:17.483792	\N
437	437	2025-07-19	2025-07-19 02:20:17.686274	2025-07-19 02:20:17.686274	\N
438	438	2025-07-19	2025-07-19 02:20:17.868004	2025-07-19 02:20:17.868004	\N
439	439	2025-07-19	2025-07-19 02:20:18.042401	2025-07-19 02:20:18.042401	\N
440	440	2025-07-19	2025-07-19 02:20:18.225902	2025-07-19 02:20:18.225902	\N
441	441	2025-07-19	2025-07-19 02:20:18.398953	2025-07-19 02:20:18.398953	\N
442	442	2025-07-19	2025-07-19 02:20:18.583147	2025-07-19 02:20:18.583147	\N
443	443	2025-07-19	2025-07-19 02:20:18.76418	2025-07-19 02:20:18.76418	\N
444	444	2025-07-19	2025-07-19 02:20:18.935988	2025-07-19 02:20:18.935988	\N
445	445	2025-07-19	2025-07-19 02:20:19.114663	2025-07-19 02:20:19.114663	\N
446	446	2025-07-19	2025-07-19 02:20:19.288773	2025-07-19 02:20:19.288773	\N
447	447	2025-07-19	2025-07-19 02:20:19.46725	2025-07-19 02:20:19.46725	\N
448	448	2025-07-19	2025-07-19 02:20:19.645238	2025-07-19 02:20:19.645238	\N
449	449	2025-07-19	2025-07-19 02:20:19.861355	2025-07-19 02:20:19.861355	\N
450	450	2025-07-19	2025-07-19 02:20:20.072383	2025-07-19 02:20:20.072383	\N
451	451	2025-07-19	2025-07-19 02:20:20.327512	2025-07-19 02:20:20.327512	\N
452	452	2025-07-19	2025-07-19 02:20:20.509418	2025-07-19 02:20:20.509418	\N
453	453	2025-07-19	2025-07-19 02:20:20.701763	2025-07-19 02:20:20.701763	\N
454	454	2025-07-19	2025-07-19 02:20:20.919526	2025-07-19 02:20:20.919526	\N
455	455	2025-07-19	2025-07-19 02:20:21.168901	2025-07-19 02:20:21.168901	\N
456	456	2025-07-19	2025-07-19 02:20:21.367299	2025-07-19 02:20:21.367299	\N
457	457	2025-07-19	2025-07-19 02:20:21.590297	2025-07-19 02:20:21.590297	\N
458	458	2025-07-19	2025-07-19 02:20:21.766486	2025-07-19 02:20:21.766486	\N
459	459	2025-07-19	2025-07-19 02:20:21.949712	2025-07-19 02:20:21.949712	\N
460	460	2025-07-19	2025-07-19 02:20:22.186857	2025-07-19 02:20:22.186857	\N
461	461	2025-07-19	2025-07-19 02:20:22.360908	2025-07-19 02:20:22.360908	\N
462	462	2025-07-19	2025-07-19 02:20:22.56295	2025-07-19 02:20:22.56295	\N
463	463	2025-07-19	2025-07-19 02:20:22.748439	2025-07-19 02:20:22.748439	\N
464	464	2025-07-19	2025-07-19 02:20:22.931261	2025-07-19 02:20:22.931261	\N
465	465	2025-07-19	2025-07-19 02:20:23.105344	2025-07-19 02:20:23.105344	\N
466	466	2025-07-19	2025-07-19 02:20:23.28726	2025-07-19 02:20:23.28726	\N
467	467	2025-07-19	2025-07-19 02:20:23.462065	2025-07-19 02:20:23.462065	\N
468	468	2025-07-19	2025-07-19 02:20:23.642472	2025-07-19 02:20:23.642472	\N
469	469	2025-07-19	2025-07-19 02:20:23.824759	2025-07-19 02:20:23.824759	\N
470	470	2025-07-19	2025-07-19 02:20:23.999213	2025-07-19 02:20:23.999213	\N
471	471	2025-07-19	2025-07-19 02:20:24.181892	2025-07-19 02:20:24.181892	\N
472	472	2025-07-19	2025-07-19 02:20:24.353386	2025-07-19 02:20:24.353386	\N
473	473	2025-07-19	2025-07-19 02:20:24.540589	2025-07-19 02:20:24.540589	\N
474	474	2025-07-19	2025-07-19 02:20:24.717692	2025-07-19 02:20:24.717692	\N
475	475	2025-07-19	2025-07-19 02:20:24.89331	2025-07-19 02:20:24.89331	\N
476	476	2025-07-19	2025-07-19 02:20:25.081843	2025-07-19 02:20:25.081843	\N
477	477	2025-07-19	2025-07-19 02:20:25.258696	2025-07-19 02:20:25.258696	\N
478	478	2025-07-19	2025-07-19 02:20:25.440165	2025-07-19 02:20:25.440165	\N
479	479	2025-07-19	2025-07-19 02:20:25.639947	2025-07-19 02:20:25.639947	\N
480	480	2025-07-19	2025-07-19 02:20:25.829263	2025-07-19 02:20:25.829263	\N
481	481	2025-07-19	2025-07-19 02:20:26.013045	2025-07-19 02:20:26.013045	\N
482	482	2025-07-19	2025-07-19 02:20:26.209756	2025-07-19 02:20:26.209756	\N
483	483	2025-07-19	2025-07-19 02:20:26.384161	2025-07-19 02:20:26.384161	\N
484	484	2025-07-19	2025-07-19 02:20:26.569333	2025-07-19 02:20:26.569333	\N
485	485	2025-07-19	2025-07-19 02:20:26.763268	2025-07-19 02:20:26.763268	\N
486	486	2025-07-19	2025-07-19 02:20:26.966942	2025-07-19 02:20:26.966942	\N
487	487	2025-07-19	2025-07-19 02:20:27.193463	2025-07-19 02:20:27.193463	\N
488	488	2025-07-19	2025-07-19 02:20:27.382781	2025-07-19 02:20:27.382781	\N
489	489	2025-07-19	2025-07-19 02:20:27.567638	2025-07-19 02:20:27.567638	\N
490	490	2025-07-19	2025-07-19 02:20:27.756313	2025-07-19 02:20:27.756313	\N
491	491	2025-07-19	2025-07-19 02:20:27.936544	2025-07-19 02:20:27.936544	\N
492	492	2025-07-19	2025-07-19 02:20:28.112931	2025-07-19 02:20:28.112931	\N
493	493	2025-07-19	2025-07-19 02:20:28.291709	2025-07-19 02:20:28.291709	\N
494	494	2025-07-19	2025-07-19 02:20:28.476628	2025-07-19 02:20:28.476628	\N
495	495	2025-07-19	2025-07-19 02:20:28.664535	2025-07-19 02:20:28.664535	\N
496	496	2025-07-19	2025-07-19 02:20:28.850127	2025-07-19 02:20:28.850127	\N
497	497	2025-07-19	2025-07-19 02:20:29.033625	2025-07-19 02:20:29.033625	\N
498	498	2025-07-19	2025-07-19 02:20:29.216548	2025-07-19 02:20:29.216548	\N
499	499	2025-07-19	2025-07-19 02:20:29.397312	2025-07-19 02:20:29.397312	\N
500	500	2025-07-19	2025-07-19 02:20:29.583522	2025-07-19 02:20:29.583522	\N
501	501	2025-07-19	2025-07-19 02:20:29.764538	2025-07-19 02:20:29.764538	\N
502	502	2025-07-19	2025-07-19 02:20:29.94917	2025-07-19 02:20:29.94917	\N
503	503	2025-07-19	2025-07-19 02:20:30.139699	2025-07-19 02:20:30.139699	\N
504	504	2025-07-19	2025-07-19 02:20:30.31526	2025-07-19 02:20:30.31526	\N
505	505	2025-07-19	2025-07-19 02:20:30.507733	2025-07-19 02:20:30.507733	\N
506	506	2025-07-19	2025-07-19 02:20:30.710919	2025-07-19 02:20:30.710919	\N
507	507	2025-07-19	2025-07-19 02:20:30.898342	2025-07-19 02:20:30.898342	\N
508	508	2025-07-19	2025-07-19 02:20:31.072639	2025-07-19 02:20:31.072639	\N
509	509	2025-07-19	2025-07-19 02:20:31.264441	2025-07-19 02:20:31.264441	\N
510	510	2025-07-19	2025-07-19 02:20:31.476327	2025-07-19 02:20:31.476327	\N
511	511	2025-07-19	2025-07-19 02:20:31.657599	2025-07-19 02:20:31.657599	\N
512	512	2025-07-19	2025-07-19 02:20:31.850876	2025-07-19 02:20:31.850876	\N
513	513	2025-07-19	2025-07-19 02:20:32.038151	2025-07-19 02:20:32.038151	\N
514	514	2025-07-19	2025-07-19 02:20:32.232659	2025-07-19 02:20:32.232659	\N
515	515	2025-07-19	2025-07-19 02:20:32.432069	2025-07-19 02:20:32.432069	\N
516	516	2025-07-19	2025-07-19 02:20:32.606348	2025-07-19 02:20:32.606348	\N
517	517	2025-07-19	2025-07-19 02:20:32.794963	2025-07-19 02:20:32.794963	\N
518	518	2025-07-19	2025-07-19 02:20:33.068465	2025-07-19 02:20:33.068465	\N
519	519	2025-07-19	2025-07-19 02:20:33.289467	2025-07-19 02:20:33.289467	\N
520	520	2025-07-19	2025-07-19 02:20:33.50331	2025-07-19 02:20:33.50331	\N
521	521	2025-07-19	2025-07-19 02:20:33.686496	2025-07-19 02:20:33.686496	\N
522	522	2025-07-19	2025-07-19 02:20:33.874109	2025-07-19 02:20:33.874109	\N
523	523	2025-07-19	2025-07-19 02:20:34.072151	2025-07-19 02:20:34.072151	\N
524	524	2025-07-19	2025-07-19 02:20:34.246765	2025-07-19 02:20:34.246765	\N
525	525	2025-07-19	2025-07-19 02:20:34.422596	2025-07-19 02:20:34.422596	\N
526	526	2025-07-19	2025-07-19 02:20:34.597373	2025-07-19 02:20:34.597373	\N
527	527	2025-07-19	2025-07-19 02:20:34.771456	2025-07-19 02:20:34.771456	\N
528	528	2025-07-19	2025-07-19 02:20:34.959271	2025-07-19 02:20:34.959271	\N
529	529	2025-07-19	2025-07-19 02:20:35.467611	2025-07-19 02:20:35.467611	\N
530	530	2025-07-19	2025-07-19 02:20:35.681688	2025-07-19 02:20:35.681688	\N
531	531	2025-07-19	2025-07-19 02:20:35.856944	2025-07-19 02:20:35.856944	\N
532	532	2025-07-19	2025-07-19 02:20:36.027794	2025-07-19 02:20:36.027794	\N
533	533	2025-07-19	2025-07-19 02:20:36.197336	2025-07-19 02:20:36.197336	\N
534	534	2025-07-19	2025-07-19 02:20:36.367296	2025-07-19 02:20:36.367296	\N
535	535	2025-07-19	2025-07-19 02:20:36.545557	2025-07-19 02:20:36.545557	\N
536	536	2025-07-19	2025-07-19 02:20:36.715042	2025-07-19 02:20:36.715042	\N
537	537	2025-07-19	2025-07-19 02:20:36.934132	2025-07-19 02:20:36.934132	\N
538	538	2025-07-19	2025-07-19 02:20:37.13131	2025-07-19 02:20:37.13131	\N
539	539	2025-07-19	2025-07-19 02:20:37.298676	2025-07-19 02:20:37.298676	\N
540	540	2025-07-19	2025-07-19 02:20:37.472371	2025-07-19 02:20:37.472371	\N
541	541	2025-07-19	2025-07-19 02:20:37.646204	2025-07-19 02:20:37.646204	\N
542	542	2025-07-19	2025-07-19 02:20:37.819799	2025-07-19 02:20:37.819799	\N
543	543	2025-07-19	2025-07-19 02:20:37.988145	2025-07-19 02:20:37.988145	\N
544	544	2025-07-19	2025-07-19 02:20:38.16645	2025-07-19 02:20:38.16645	\N
545	545	2025-07-19	2025-07-19 02:20:38.361628	2025-07-19 02:20:38.361628	\N
546	546	2025-07-19	2025-07-19 02:20:38.518396	2025-07-19 02:20:38.518396	\N
547	547	2025-07-19	2025-07-19 02:20:38.681533	2025-07-19 02:20:38.681533	\N
548	548	2025-07-19	2025-07-19 02:20:38.87745	2025-07-19 02:20:38.87745	\N
549	549	2025-07-19	2025-07-19 02:20:39.0889	2025-07-19 02:20:39.0889	\N
550	550	2025-07-19	2025-07-19 02:20:39.316039	2025-07-19 02:20:39.316039	\N
551	551	2025-07-19	2025-07-19 02:20:39.487618	2025-07-19 02:20:39.487618	\N
552	552	2025-07-19	2025-07-19 02:20:39.668373	2025-07-19 02:20:39.668373	\N
553	553	2025-07-19	2025-07-19 02:20:39.836558	2025-07-19 02:20:39.836558	\N
554	554	2025-07-19	2025-07-19 02:20:40.013551	2025-07-19 02:20:40.013551	\N
555	555	2025-07-19	2025-07-19 02:20:40.188782	2025-07-19 02:20:40.188782	\N
556	556	2025-07-19	2025-07-19 02:20:40.35896	2025-07-19 02:20:40.35896	\N
557	557	2025-07-19	2025-07-19 02:20:40.523159	2025-07-19 02:20:40.523159	\N
558	558	2025-07-19	2025-07-19 02:20:40.690718	2025-07-19 02:20:40.690718	\N
559	559	2025-07-19	2025-07-19 02:20:40.854588	2025-07-19 02:20:40.854588	\N
560	560	2025-07-19	2025-07-19 02:20:41.018161	2025-07-19 02:20:41.018161	\N
561	561	2025-07-19	2025-07-19 02:20:41.185511	2025-07-19 02:20:41.185511	\N
562	562	2025-07-19	2025-07-19 02:20:41.352621	2025-07-19 02:20:41.352621	\N
563	563	2025-07-19	2025-07-19 02:20:41.515253	2025-07-19 02:20:41.515253	\N
564	564	2025-07-19	2025-07-19 02:20:41.678866	2025-07-19 02:20:41.678866	\N
565	565	2025-07-19	2025-07-19 02:20:41.856371	2025-07-19 02:20:41.856371	\N
566	566	2025-07-19	2025-07-19 02:20:42.027515	2025-07-19 02:20:42.027515	\N
567	567	2025-07-19	2025-07-19 02:20:42.213674	2025-07-19 02:20:42.213674	\N
568	568	2025-07-19	2025-07-19 02:20:42.393378	2025-07-19 02:20:42.393378	\N
569	569	2025-07-19	2025-07-19 02:20:42.553677	2025-07-19 02:20:42.553677	\N
570	570	2025-07-19	2025-07-19 02:20:42.735889	2025-07-19 02:20:42.735889	\N
571	571	2025-07-19	2025-07-19 02:20:42.904053	2025-07-19 02:20:42.904053	\N
572	572	2025-07-19	2025-07-19 02:20:43.080399	2025-07-19 02:20:43.080399	\N
573	573	2025-07-19	2025-07-19 02:20:43.269465	2025-07-19 02:20:43.269465	\N
574	574	2025-07-19	2025-07-19 02:20:43.452537	2025-07-19 02:20:43.452537	\N
575	575	2025-07-19	2025-07-19 02:20:43.63545	2025-07-19 02:20:43.63545	\N
576	576	2025-07-19	2025-07-19 02:20:43.806137	2025-07-19 02:20:43.806137	\N
577	577	2025-07-19	2025-07-19 02:20:43.968529	2025-07-19 02:20:43.968529	\N
578	578	2025-07-19	2025-07-19 02:20:44.129391	2025-07-19 02:20:44.129391	\N
579	579	2025-07-19	2025-07-19 02:20:44.29198	2025-07-19 02:20:44.29198	\N
580	580	2025-07-19	2025-07-19 02:20:44.453681	2025-07-19 02:20:44.453681	\N
581	581	2025-07-19	2025-07-19 02:20:44.622148	2025-07-19 02:20:44.622148	\N
582	582	2025-07-19	2025-07-19 02:20:44.785942	2025-07-19 02:20:44.785942	\N
583	583	2025-07-19	2025-07-19 02:20:44.95304	2025-07-19 02:20:44.95304	\N
584	584	2025-07-19	2025-07-19 02:20:45.134986	2025-07-19 02:20:45.134986	\N
585	585	2025-07-19	2025-07-19 02:20:45.30293	2025-07-19 02:20:45.30293	\N
586	586	2025-07-19	2025-07-19 02:20:45.481572	2025-07-19 02:20:45.481572	\N
587	587	2025-07-19	2025-07-19 02:20:45.657445	2025-07-19 02:20:45.657445	\N
588	588	2025-07-19	2025-07-19 02:20:45.830864	2025-07-19 02:20:45.830864	\N
589	589	2025-07-19	2025-07-19 02:20:45.992331	2025-07-19 02:20:45.992331	\N
590	590	2025-07-19	2025-07-19 02:20:46.159147	2025-07-19 02:20:46.159147	\N
591	591	2025-07-19	2025-07-19 02:20:46.328557	2025-07-19 02:20:46.328557	\N
592	592	2025-07-19	2025-07-19 02:20:46.51713	2025-07-19 02:20:46.51713	\N
593	593	2025-07-19	2025-07-19 02:20:46.68362	2025-07-19 02:20:46.68362	\N
594	594	2025-07-19	2025-07-19 02:20:46.852038	2025-07-19 02:20:46.852038	\N
595	595	2025-07-19	2025-07-19 02:20:47.020972	2025-07-19 02:20:47.020972	\N
596	596	2025-07-19	2025-07-19 02:20:47.186089	2025-07-19 02:20:47.186089	\N
597	597	2025-07-19	2025-07-19 02:20:47.356762	2025-07-19 02:20:47.356762	\N
598	598	2025-07-19	2025-07-19 02:20:47.526931	2025-07-19 02:20:47.526931	\N
599	599	2025-07-19	2025-07-19 02:20:47.705061	2025-07-19 02:20:47.705061	\N
600	600	2025-07-19	2025-07-19 02:20:47.888047	2025-07-19 02:20:47.888047	\N
601	601	2025-07-19	2025-07-19 02:20:48.09653	2025-07-19 02:20:48.09653	\N
602	602	2025-07-19	2025-07-19 02:20:48.274253	2025-07-19 02:20:48.274253	\N
603	603	2025-07-19	2025-07-19 02:20:48.435425	2025-07-19 02:20:48.435425	\N
604	604	2025-07-19	2025-07-19 02:20:48.596165	2025-07-19 02:20:48.596165	\N
605	605	2025-07-19	2025-07-19 02:20:48.759024	2025-07-19 02:20:48.759024	\N
606	606	2025-07-19	2025-07-19 02:20:48.923978	2025-07-19 02:20:48.923978	\N
607	607	2025-07-19	2025-07-19 02:20:49.110486	2025-07-19 02:20:49.110486	\N
608	608	2025-07-19	2025-07-19 02:20:49.287039	2025-07-19 02:20:49.287039	\N
609	609	2025-07-19	2025-07-19 02:20:49.479529	2025-07-19 02:20:49.479529	\N
610	610	2025-07-19	2025-07-19 02:20:49.695858	2025-07-19 02:20:49.695858	\N
611	611	2025-07-19	2025-07-19 02:20:49.890196	2025-07-19 02:20:49.890196	\N
612	612	2025-07-19	2025-07-19 02:20:50.056185	2025-07-19 02:20:50.056185	\N
613	613	2025-07-19	2025-07-19 02:20:50.2271	2025-07-19 02:20:50.2271	\N
614	614	2025-07-19	2025-07-19 02:20:50.396722	2025-07-19 02:20:50.396722	\N
615	615	2025-07-19	2025-07-19 02:20:50.5638	2025-07-19 02:20:50.5638	\N
616	616	2025-07-19	2025-07-19 02:20:50.727836	2025-07-19 02:20:50.727836	\N
617	617	2025-07-19	2025-07-19 02:20:50.911146	2025-07-19 02:20:50.911146	\N
618	618	2025-07-19	2025-07-19 02:20:51.073519	2025-07-19 02:20:51.073519	\N
619	619	2025-07-19	2025-07-19 02:20:51.248498	2025-07-19 02:20:51.248498	\N
620	620	2025-07-19	2025-07-19 02:20:51.416268	2025-07-19 02:20:51.416268	\N
621	621	2025-07-19	2025-07-19 02:20:51.574464	2025-07-19 02:20:51.574464	\N
622	622	2025-07-19	2025-07-19 02:20:51.747528	2025-07-19 02:20:51.747528	\N
623	623	2025-07-19	2025-07-19 02:20:51.920215	2025-07-19 02:20:51.920215	\N
624	624	2025-07-19	2025-07-19 02:20:52.09542	2025-07-19 02:20:52.09542	\N
625	625	2025-07-19	2025-07-19 02:20:52.277512	2025-07-19 02:20:52.277512	\N
626	626	2025-07-19	2025-07-19 02:20:52.482312	2025-07-19 02:20:52.482312	\N
627	627	2025-07-19	2025-07-19 02:20:52.645219	2025-07-19 02:20:52.645219	\N
628	628	2025-07-19	2025-07-19 02:20:52.813727	2025-07-19 02:20:52.813727	\N
629	629	2025-07-19	2025-07-19 02:20:52.98471	2025-07-19 02:20:52.98471	\N
630	630	2025-07-19	2025-07-19 02:20:53.157903	2025-07-19 02:20:53.157903	\N
631	631	2025-07-19	2025-07-19 02:20:53.338092	2025-07-19 02:20:53.338092	\N
632	632	2025-07-19	2025-07-19 02:20:53.505061	2025-07-19 02:20:53.505061	\N
633	633	2025-07-19	2025-07-19 02:20:53.670333	2025-07-19 02:20:53.670333	\N
634	634	2025-07-19	2025-07-19 02:20:53.83326	2025-07-19 02:20:53.83326	\N
635	635	2025-07-19	2025-07-19 02:20:53.996858	2025-07-19 02:20:53.996858	\N
636	636	2025-07-19	2025-07-19 02:20:54.192799	2025-07-19 02:20:54.192799	\N
637	637	2025-07-19	2025-07-19 02:20:54.427684	2025-07-19 02:20:54.427684	\N
638	638	2025-07-19	2025-07-19 02:20:54.661201	2025-07-19 02:20:54.661201	\N
639	639	2025-07-19	2025-07-19 02:20:54.821604	2025-07-19 02:20:54.821604	\N
640	640	2025-07-19	2025-07-19 02:20:55.001594	2025-07-19 02:20:55.001594	\N
641	641	2025-07-19	2025-07-19 02:20:55.16501	2025-07-19 02:20:55.16501	\N
642	642	2025-07-19	2025-07-19 02:20:55.353849	2025-07-19 02:20:55.353849	\N
643	643	2025-07-19	2025-07-19 02:20:55.544628	2025-07-19 02:20:55.544628	\N
644	644	2025-07-19	2025-07-19 02:20:55.741569	2025-07-19 02:20:55.741569	\N
645	645	2025-07-19	2025-07-19 02:20:55.954033	2025-07-19 02:20:55.954033	\N
646	646	2025-07-19	2025-07-19 02:20:56.122959	2025-07-19 02:20:56.122959	\N
647	647	2025-07-19	2025-07-19 02:20:56.290993	2025-07-19 02:20:56.290993	\N
648	648	2025-07-19	2025-07-19 02:20:56.47214	2025-07-19 02:20:56.47214	\N
649	649	2025-07-19	2025-07-19 02:20:56.641742	2025-07-19 02:20:56.641742	\N
650	650	2025-07-19	2025-07-19 02:20:56.800979	2025-07-19 02:20:56.800979	\N
651	651	2025-07-19	2025-07-19 02:20:56.972921	2025-07-19 02:20:56.972921	\N
652	652	2025-07-19	2025-07-19 02:20:57.131177	2025-07-19 02:20:57.131177	\N
653	653	2025-07-19	2025-07-19 02:20:57.297625	2025-07-19 02:20:57.297625	\N
654	654	2025-07-19	2025-07-19 02:20:57.466089	2025-07-19 02:20:57.466089	\N
655	655	2025-07-19	2025-07-19 02:20:57.631267	2025-07-19 02:20:57.631267	\N
656	656	2025-07-19	2025-07-19 02:20:57.797996	2025-07-19 02:20:57.797996	\N
657	657	2025-07-19	2025-07-19 02:20:57.995103	2025-07-19 02:20:57.995103	\N
658	658	2025-07-19	2025-07-19 02:20:58.178548	2025-07-19 02:20:58.178548	\N
659	659	2025-07-19	2025-07-19 02:20:58.355442	2025-07-19 02:20:58.355442	\N
660	660	2025-07-19	2025-07-19 02:20:58.547836	2025-07-19 02:20:58.547836	\N
661	661	2025-07-19	2025-07-19 02:20:58.72954	2025-07-19 02:20:58.72954	\N
662	662	2025-07-19	2025-07-19 02:20:58.896076	2025-07-19 02:20:58.896076	\N
663	663	2025-07-19	2025-07-19 02:20:59.065743	2025-07-19 02:20:59.065743	\N
664	664	2025-07-19	2025-07-19 02:20:59.234668	2025-07-19 02:20:59.234668	\N
665	665	2025-07-19	2025-07-19 02:20:59.516592	2025-07-19 02:20:59.516592	\N
666	666	2025-07-19	2025-07-19 02:20:59.671291	2025-07-19 02:20:59.671291	\N
667	667	2025-07-19	2025-07-19 02:20:59.834793	2025-07-19 02:20:59.834793	\N
668	668	2025-07-19	2025-07-19 02:20:59.990312	2025-07-19 02:20:59.990312	\N
669	669	2025-07-19	2025-07-19 02:21:00.151942	2025-07-19 02:21:00.151942	\N
670	670	2025-07-19	2025-07-19 02:21:00.322329	2025-07-19 02:21:00.322329	\N
671	671	2025-07-19	2025-07-19 02:21:00.478974	2025-07-19 02:21:00.478974	\N
672	672	2025-07-19	2025-07-19 02:21:00.631329	2025-07-19 02:21:00.631329	\N
673	673	2025-07-19	2025-07-19 02:21:00.787728	2025-07-19 02:21:00.787728	\N
674	674	2025-07-19	2025-07-19 02:21:00.946961	2025-07-19 02:21:00.946961	\N
675	675	2025-07-19	2025-07-19 02:21:01.099455	2025-07-19 02:21:01.099455	\N
676	676	2025-07-19	2025-07-19 02:21:01.264414	2025-07-19 02:21:01.264414	\N
677	677	2025-07-19	2025-07-19 02:21:01.46043	2025-07-19 02:21:01.46043	\N
678	678	2025-07-19	2025-07-19 02:21:01.721503	2025-07-19 02:21:01.721503	\N
679	679	2025-07-19	2025-07-19 02:21:01.985218	2025-07-19 02:21:01.985218	\N
680	680	2025-07-19	2025-07-19 02:21:02.202709	2025-07-19 02:21:02.202709	\N
681	681	2025-07-19	2025-07-19 02:21:02.357269	2025-07-19 02:21:02.357269	\N
682	682	2025-07-19	2025-07-19 02:21:02.509097	2025-07-19 02:21:02.509097	\N
683	683	2025-07-19	2025-07-19 02:21:02.741637	2025-07-19 02:21:02.741637	\N
684	684	2025-07-19	2025-07-19 02:21:02.917257	2025-07-19 02:21:02.917257	\N
685	685	2025-07-19	2025-07-19 02:21:03.117147	2025-07-19 02:21:03.117147	\N
686	686	2025-07-19	2025-07-19 02:21:03.514958	2025-07-19 02:21:03.514958	\N
687	687	2025-07-19	2025-07-19 02:21:03.86737	2025-07-19 02:21:03.86737	\N
688	688	2025-07-19	2025-07-19 02:21:04.12269	2025-07-19 02:21:04.12269	\N
689	689	2025-07-19	2025-07-19 02:21:04.284205	2025-07-19 02:21:04.284205	\N
690	690	2025-07-19	2025-07-19 02:21:04.448319	2025-07-19 02:21:04.448319	\N
691	691	2025-07-19	2025-07-19 02:21:04.614154	2025-07-19 02:21:04.614154	\N
692	692	2025-07-19	2025-07-19 02:21:04.76396	2025-07-19 02:21:04.76396	\N
693	693	2025-07-19	2025-07-19 02:21:04.922757	2025-07-19 02:21:04.922757	\N
694	694	2025-07-19	2025-07-19 02:21:05.075968	2025-07-19 02:21:05.075968	\N
695	695	2025-07-19	2025-07-19 02:21:05.226347	2025-07-19 02:21:05.226347	\N
696	696	2025-07-19	2025-07-19 02:21:05.380252	2025-07-19 02:21:05.380252	\N
697	697	2025-07-19	2025-07-19 02:21:05.535387	2025-07-19 02:21:05.535387	\N
698	698	2025-07-19	2025-07-19 02:21:05.705251	2025-07-19 02:21:05.705251	\N
699	699	2025-07-19	2025-07-19 02:21:05.861296	2025-07-19 02:21:05.861296	\N
700	700	2025-07-19	2025-07-19 02:21:06.031058	2025-07-19 02:21:06.031058	\N
701	701	2025-07-19	2025-07-19 02:21:06.200386	2025-07-19 02:21:06.200386	\N
702	702	2025-07-19	2025-07-19 02:21:06.38155	2025-07-19 02:21:06.38155	\N
703	703	2025-07-19	2025-07-19 02:21:06.536041	2025-07-19 02:21:06.536041	\N
704	704	2025-07-19	2025-07-19 02:21:06.700904	2025-07-19 02:21:06.700904	\N
705	705	2025-07-19	2025-07-19 02:21:06.849705	2025-07-19 02:21:06.849705	\N
706	706	2025-07-19	2025-07-19 02:21:07.004064	2025-07-19 02:21:07.004064	\N
707	707	2025-07-19	2025-07-19 02:21:07.158687	2025-07-19 02:21:07.158687	\N
708	708	2025-07-19	2025-07-19 02:21:07.313088	2025-07-19 02:21:07.313088	\N
709	709	2025-07-19	2025-07-19 02:21:07.463644	2025-07-19 02:21:07.463644	\N
710	710	2025-07-19	2025-07-19 02:21:07.627544	2025-07-19 02:21:07.627544	\N
711	711	2025-07-19	2025-07-19 02:21:07.793808	2025-07-19 02:21:07.793808	\N
712	712	2025-07-19	2025-07-19 02:21:07.941415	2025-07-19 02:21:07.941415	\N
713	713	2025-07-19	2025-07-19 02:21:08.127295	2025-07-19 02:21:08.127295	\N
714	714	2025-07-19	2025-07-19 02:21:08.294644	2025-07-19 02:21:08.294644	\N
715	715	2025-07-19	2025-07-19 02:21:08.453328	2025-07-19 02:21:08.453328	\N
716	716	2025-07-19	2025-07-19 02:21:08.61068	2025-07-19 02:21:08.61068	\N
717	717	2025-07-19	2025-07-19 02:21:08.776653	2025-07-19 02:21:08.776653	\N
718	718	2025-07-19	2025-07-19 02:21:08.922707	2025-07-19 02:21:08.922707	\N
719	719	2025-07-19	2025-07-19 02:21:09.071588	2025-07-19 02:21:09.071588	\N
720	720	2025-07-19	2025-07-19 02:21:09.226625	2025-07-19 02:21:09.226625	\N
721	721	2025-07-19	2025-07-19 02:21:09.379183	2025-07-19 02:21:09.379183	\N
722	722	2025-07-19	2025-07-19 02:21:09.530871	2025-07-19 02:21:09.530871	\N
723	723	2025-07-19	2025-07-19 02:21:09.684577	2025-07-19 02:21:09.684577	\N
724	724	2025-07-19	2025-07-19 02:21:09.832194	2025-07-19 02:21:09.832194	\N
725	725	2025-07-19	2025-07-19 02:21:09.987203	2025-07-19 02:21:09.987203	\N
726	726	2025-07-19	2025-07-19 02:21:10.15035	2025-07-19 02:21:10.15035	\N
727	727	2025-07-19	2025-07-19 02:21:10.306995	2025-07-19 02:21:10.306995	\N
728	728	2025-07-19	2025-07-19 02:21:10.476154	2025-07-19 02:21:10.476154	\N
729	729	2025-07-19	2025-07-19 02:21:10.662274	2025-07-19 02:21:10.662274	\N
730	730	2025-07-19	2025-07-19 02:21:10.857982	2025-07-19 02:21:10.857982	\N
731	731	2025-07-19	2025-07-19 02:21:11.051768	2025-07-19 02:21:11.051768	\N
732	732	2025-07-19	2025-07-19 02:21:11.20566	2025-07-19 02:21:11.20566	\N
733	733	2025-07-19	2025-07-19 02:21:11.372334	2025-07-19 02:21:11.372334	\N
734	734	2025-07-19	2025-07-19 02:21:11.525365	2025-07-19 02:21:11.525365	\N
735	735	2025-07-19	2025-07-19 02:21:11.676874	2025-07-19 02:21:11.676874	\N
736	736	2025-07-19	2025-07-19 02:21:11.832918	2025-07-19 02:21:11.832918	\N
737	737	2025-07-19	2025-07-19 02:21:11.989709	2025-07-19 02:21:11.989709	\N
738	738	2025-07-19	2025-07-19 02:21:12.153446	2025-07-19 02:21:12.153446	\N
739	739	2025-07-19	2025-07-19 02:21:12.318073	2025-07-19 02:21:12.318073	\N
740	740	2025-07-19	2025-07-19 02:21:12.472509	2025-07-19 02:21:12.472509	\N
741	741	2025-07-19	2025-07-19 02:21:12.628035	2025-07-19 02:21:12.628035	\N
742	742	2025-07-19	2025-07-19 02:21:12.783238	2025-07-19 02:21:12.783238	\N
743	743	2025-07-19	2025-07-19 02:21:12.935078	2025-07-19 02:21:12.935078	\N
744	744	2025-07-19	2025-07-19 02:21:13.08603	2025-07-19 02:21:13.08603	\N
745	745	2025-07-19	2025-07-19 02:21:13.256897	2025-07-19 02:21:13.256897	\N
746	746	2025-07-19	2025-07-19 02:21:13.412079	2025-07-19 02:21:13.412079	\N
747	747	2025-07-19	2025-07-19 02:21:13.566072	2025-07-19 02:21:13.566072	\N
748	748	2025-07-19	2025-07-19 02:21:13.735118	2025-07-19 02:21:13.735118	\N
749	749	2025-07-19	2025-07-19 02:21:13.888841	2025-07-19 02:21:13.888841	\N
750	750	2025-07-19	2025-07-19 02:21:14.05151	2025-07-19 02:21:14.05151	\N
751	751	2025-07-19	2025-07-19 02:21:14.208755	2025-07-19 02:21:14.208755	\N
752	752	2025-07-19	2025-07-19 02:21:14.368134	2025-07-19 02:21:14.368134	\N
753	753	2025-07-19	2025-07-19 02:21:14.521046	2025-07-19 02:21:14.521046	\N
754	754	2025-07-19	2025-07-19 02:21:14.671271	2025-07-19 02:21:14.671271	\N
755	755	2025-07-19	2025-07-19 02:21:14.833608	2025-07-19 02:21:14.833608	\N
756	756	2025-07-19	2025-07-19 02:21:14.98792	2025-07-19 02:21:14.98792	\N
757	757	2025-07-19	2025-07-19 02:21:15.134872	2025-07-19 02:21:15.134872	\N
758	758	2025-07-19	2025-07-19 02:21:15.285319	2025-07-19 02:21:15.285319	\N
759	759	2025-07-19	2025-07-19 02:21:15.487537	2025-07-19 02:21:15.487537	\N
760	760	2025-07-19	2025-07-19 02:21:15.63564	2025-07-19 02:21:15.63564	\N
761	761	2025-07-19	2025-07-19 02:21:15.786815	2025-07-19 02:21:15.786815	\N
762	762	2025-07-19	2025-07-19 02:21:15.949946	2025-07-19 02:21:15.949946	\N
763	763	2025-07-19	2025-07-19 02:21:16.109068	2025-07-19 02:21:16.109068	\N
764	764	2025-07-19	2025-07-19 02:21:16.260889	2025-07-19 02:21:16.260889	\N
765	765	2025-07-19	2025-07-19 02:21:16.416466	2025-07-19 02:21:16.416466	\N
766	766	2025-07-19	2025-07-19 02:21:16.565797	2025-07-19 02:21:16.565797	\N
767	767	2025-07-19	2025-07-19 02:21:16.712597	2025-07-19 02:21:16.712597	\N
768	768	2025-07-19	2025-07-19 02:21:16.862195	2025-07-19 02:21:16.862195	\N
769	769	2025-07-19	2025-07-19 02:21:17.023454	2025-07-19 02:21:17.023454	\N
770	770	2025-07-19	2025-07-19 02:21:17.185074	2025-07-19 02:21:17.185074	\N
771	771	2025-07-19	2025-07-19 02:21:17.342188	2025-07-19 02:21:17.342188	\N
772	772	2025-07-19	2025-07-19 02:21:17.519734	2025-07-19 02:21:17.519734	\N
773	773	2025-07-19	2025-07-19 02:21:17.679914	2025-07-19 02:21:17.679914	\N
774	774	2025-07-19	2025-07-19 02:21:17.832846	2025-07-19 02:21:17.832846	\N
775	775	2025-07-19	2025-07-19 02:21:17.984401	2025-07-19 02:21:17.984401	\N
776	776	2025-07-19	2025-07-19 02:21:18.149524	2025-07-19 02:21:18.149524	\N
777	777	2025-07-19	2025-07-19 02:21:18.32972	2025-07-19 02:21:18.32972	\N
778	778	2025-07-19	2025-07-19 02:21:18.514927	2025-07-19 02:21:18.514927	\N
779	779	2025-07-19	2025-07-19 02:21:18.701938	2025-07-19 02:21:18.701938	\N
780	780	2025-07-19	2025-07-19 02:21:18.858253	2025-07-19 02:21:18.858253	\N
781	781	2025-07-19	2025-07-19 02:21:19.007666	2025-07-19 02:21:19.007666	\N
782	782	2025-07-19	2025-07-19 02:21:19.164959	2025-07-19 02:21:19.164959	\N
783	783	2025-07-19	2025-07-19 02:21:19.321618	2025-07-19 02:21:19.321618	\N
784	784	2025-07-19	2025-07-19 02:21:19.487562	2025-07-19 02:21:19.487562	\N
785	785	2025-07-19	2025-07-19 02:21:19.639531	2025-07-19 02:21:19.639531	\N
786	786	2025-07-19	2025-07-19 02:21:19.798915	2025-07-19 02:21:19.798915	\N
787	787	2025-07-19	2025-07-19 02:21:19.95018	2025-07-19 02:21:19.95018	\N
788	788	2025-07-19	2025-07-19 02:21:20.10919	2025-07-19 02:21:20.10919	\N
789	789	2025-07-19	2025-07-19 02:21:20.25792	2025-07-19 02:21:20.25792	\N
790	790	2025-07-19	2025-07-19 02:21:20.408585	2025-07-19 02:21:20.408585	\N
791	791	2025-07-19	2025-07-19 02:21:20.568118	2025-07-19 02:21:20.568118	\N
792	792	2025-07-19	2025-07-19 02:21:20.716825	2025-07-19 02:21:20.716825	\N
793	793	2025-07-19	2025-07-19 02:21:20.869032	2025-07-19 02:21:20.869032	\N
794	794	2025-07-19	2025-07-19 02:21:21.024869	2025-07-19 02:21:21.024869	\N
795	795	2025-07-19	2025-07-19 02:21:21.184019	2025-07-19 02:21:21.184019	\N
796	796	2025-07-19	2025-07-19 02:21:21.334508	2025-07-19 02:21:21.334508	\N
797	797	2025-07-19	2025-07-19 02:21:21.491198	2025-07-19 02:21:21.491198	\N
798	798	2025-07-19	2025-07-19 02:21:21.641522	2025-07-19 02:21:21.641522	\N
799	799	2025-07-19	2025-07-19 02:21:21.789153	2025-07-19 02:21:21.789153	\N
800	800	2025-07-19	2025-07-19 02:21:21.941122	2025-07-19 02:21:21.941122	\N
801	801	2025-07-19	2025-07-19 02:21:22.102372	2025-07-19 02:21:22.102372	\N
802	802	2025-07-19	2025-07-19 02:21:22.255131	2025-07-19 02:21:22.255131	\N
803	803	2025-07-19	2025-07-19 02:21:22.408214	2025-07-19 02:21:22.408214	\N
804	804	2025-07-19	2025-07-19 02:21:22.572412	2025-07-19 02:21:22.572412	\N
805	805	2025-07-19	2025-07-19 02:21:22.726279	2025-07-19 02:21:22.726279	\N
806	806	2025-07-19	2025-07-19 02:21:22.880124	2025-07-19 02:21:22.880124	\N
807	807	2025-07-19	2025-07-19 02:21:23.03052	2025-07-19 02:21:23.03052	\N
808	808	2025-07-19	2025-07-19 02:21:23.186836	2025-07-19 02:21:23.186836	\N
809	809	2025-07-19	2025-07-19 02:21:23.343306	2025-07-19 02:21:23.343306	\N
810	810	2025-07-19	2025-07-19 02:21:23.52621	2025-07-19 02:21:23.52621	\N
811	811	2025-07-19	2025-07-19 02:21:23.732502	2025-07-19 02:21:23.732502	\N
812	812	2025-07-19	2025-07-19 02:21:24.022265	2025-07-19 02:21:24.022265	\N
813	813	2025-07-19	2025-07-19 02:21:24.253922	2025-07-19 02:21:24.253922	\N
814	814	2025-07-19	2025-07-19 02:21:24.406752	2025-07-19 02:21:24.406752	\N
815	815	2025-07-19	2025-07-19 02:21:24.552858	2025-07-19 02:21:24.552858	\N
816	816	2025-07-19	2025-07-19 02:21:24.714541	2025-07-19 02:21:24.714541	\N
817	817	2025-07-19	2025-07-19 02:21:24.871822	2025-07-19 02:21:24.871822	\N
818	818	2025-07-19	2025-07-19 02:21:25.026485	2025-07-19 02:21:25.026485	\N
819	819	2025-07-19	2025-07-19 02:21:25.181511	2025-07-19 02:21:25.181511	\N
820	820	2025-07-19	2025-07-19 02:21:25.338037	2025-07-19 02:21:25.338037	\N
821	821	2025-07-19	2025-07-19 02:21:25.488996	2025-07-19 02:21:25.488996	\N
822	822	2025-07-19	2025-07-19 02:21:25.656395	2025-07-19 02:21:25.656395	\N
823	823	2025-07-19	2025-07-19 02:21:25.855197	2025-07-19 02:21:25.855197	\N
824	824	2025-07-19	2025-07-19 02:21:26.047518	2025-07-19 02:21:26.047518	\N
825	825	2025-07-19	2025-07-19 02:21:26.235686	2025-07-19 02:21:26.235686	\N
826	826	2025-07-19	2025-07-19 02:21:26.425318	2025-07-19 02:21:26.425318	\N
827	827	2025-07-19	2025-07-19 02:21:26.59517	2025-07-19 02:21:26.59517	\N
828	828	2025-07-19	2025-07-19 02:21:26.757031	2025-07-19 02:21:26.757031	\N
829	829	2025-07-19	2025-07-19 02:21:26.92097	2025-07-19 02:21:26.92097	\N
830	830	2025-07-19	2025-07-19 02:21:27.084315	2025-07-19 02:21:27.084315	\N
831	831	2025-07-19	2025-07-19 02:21:27.252334	2025-07-19 02:21:27.252334	\N
832	832	2025-07-19	2025-07-19 02:21:27.412328	2025-07-19 02:21:27.412328	\N
833	833	2025-07-19	2025-07-19 02:21:27.57748	2025-07-19 02:21:27.57748	\N
834	834	2025-07-19	2025-07-19 02:21:27.75661	2025-07-19 02:21:27.75661	\N
835	835	2025-07-19	2025-07-19 02:21:27.922396	2025-07-19 02:21:27.922396	\N
836	836	2025-07-19	2025-07-19 02:21:28.088047	2025-07-19 02:21:28.088047	\N
837	837	2025-07-19	2025-07-19 02:21:28.246405	2025-07-19 02:21:28.246405	\N
838	838	2025-07-19	2025-07-19 02:21:28.408376	2025-07-19 02:21:28.408376	\N
839	839	2025-07-19	2025-07-19 02:21:28.573759	2025-07-19 02:21:28.573759	\N
840	840	2025-07-19	2025-07-19 02:21:28.730354	2025-07-19 02:21:28.730354	\N
841	841	2025-07-19	2025-07-19 02:21:28.899378	2025-07-19 02:21:28.899378	\N
842	842	2025-07-19	2025-07-19 02:21:29.063227	2025-07-19 02:21:29.063227	\N
843	843	2025-07-19	2025-07-19 02:21:29.234184	2025-07-19 02:21:29.234184	\N
844	844	2025-07-19	2025-07-19 02:21:29.398162	2025-07-19 02:21:29.398162	\N
845	845	2025-07-19	2025-07-19 02:21:29.56589	2025-07-19 02:21:29.56589	\N
846	846	2025-07-19	2025-07-19 02:21:29.729207	2025-07-19 02:21:29.729207	\N
847	847	2025-07-19	2025-07-19 02:21:29.908962	2025-07-19 02:21:29.908962	\N
848	848	2025-07-19	2025-07-19 02:21:30.077463	2025-07-19 02:21:30.077463	\N
849	849	2025-07-19	2025-07-19 02:21:30.243301	2025-07-19 02:21:30.243301	\N
850	850	2025-07-19	2025-07-19 02:21:30.41417	2025-07-19 02:21:30.41417	\N
851	851	2025-07-19	2025-07-19 02:21:30.582044	2025-07-19 02:21:30.582044	\N
852	852	2025-07-19	2025-07-19 02:21:30.753351	2025-07-19 02:21:30.753351	\N
853	853	2025-07-19	2025-07-19 02:21:30.932714	2025-07-19 02:21:30.932714	\N
854	854	2025-07-19	2025-07-19 02:21:31.097029	2025-07-19 02:21:31.097029	\N
855	855	2025-07-19	2025-07-19 02:21:31.277184	2025-07-19 02:21:31.277184	\N
856	856	2025-07-19	2025-07-19 02:21:31.443166	2025-07-19 02:21:31.443166	\N
857	857	2025-07-19	2025-07-19 02:21:31.602977	2025-07-19 02:21:31.602977	\N
858	858	2025-07-19	2025-07-19 02:21:31.767584	2025-07-19 02:21:31.767584	\N
859	859	2025-07-19	2025-07-19 02:21:31.924851	2025-07-19 02:21:31.924851	\N
860	860	2025-07-19	2025-07-19 02:21:32.086515	2025-07-19 02:21:32.086515	\N
861	861	2025-07-19	2025-07-19 02:21:32.251508	2025-07-19 02:21:32.251508	\N
862	862	2025-07-19	2025-07-19 02:21:32.412828	2025-07-19 02:21:32.412828	\N
863	863	2025-07-19	2025-07-19 02:21:32.571893	2025-07-19 02:21:32.571893	\N
864	864	2025-07-19	2025-07-19 02:21:32.735347	2025-07-19 02:21:32.735347	\N
865	865	2025-07-19	2025-07-19 02:21:33.029717	2025-07-19 02:21:33.029717	\N
866	866	2025-07-19	2025-07-19 02:21:33.482273	2025-07-19 02:21:33.482273	\N
867	867	2025-07-19	2025-07-19 02:21:33.882924	2025-07-19 02:21:33.882924	\N
868	868	2025-07-19	2025-07-19 02:21:34.077082	2025-07-19 02:21:34.077082	\N
869	869	2025-07-19	2025-07-19 02:21:34.269088	2025-07-19 02:21:34.269088	\N
870	870	2025-07-19	2025-07-19 02:21:34.431339	2025-07-19 02:21:34.431339	\N
871	871	2025-07-19	2025-07-19 02:21:34.589163	2025-07-19 02:21:34.589163	\N
872	872	2025-07-19	2025-07-19 02:21:34.77249	2025-07-19 02:21:34.77249	\N
873	873	2025-07-19	2025-07-19 02:21:34.936865	2025-07-19 02:21:34.936865	\N
874	874	2025-07-19	2025-07-19 02:21:35.095756	2025-07-19 02:21:35.095756	\N
875	875	2025-07-19	2025-07-19 02:21:35.251838	2025-07-19 02:21:35.251838	\N
876	876	2025-07-19	2025-07-19 02:21:35.410167	2025-07-19 02:21:35.410167	\N
877	877	2025-07-19	2025-07-19 02:21:35.589711	2025-07-19 02:21:35.589711	\N
878	878	2025-07-19	2025-07-19 02:21:35.771791	2025-07-19 02:21:35.771791	\N
879	879	2025-07-19	2025-07-19 02:21:35.979052	2025-07-19 02:21:35.979052	\N
880	880	2025-07-19	2025-07-19 02:21:36.138026	2025-07-19 02:21:36.138026	\N
881	881	2025-07-19	2025-07-19 02:21:36.313544	2025-07-19 02:21:36.313544	\N
882	882	2025-07-19	2025-07-19 02:21:36.480235	2025-07-19 02:21:36.480235	\N
883	883	2025-07-19	2025-07-19 02:21:36.642079	2025-07-19 02:21:36.642079	\N
884	884	2025-07-19	2025-07-19 02:21:36.820406	2025-07-19 02:21:36.820406	\N
885	885	2025-07-19	2025-07-19 02:21:36.997642	2025-07-19 02:21:36.997642	\N
886	886	2025-07-19	2025-07-19 02:21:37.158161	2025-07-19 02:21:37.158161	\N
887	887	2025-07-19	2025-07-19 02:21:37.324348	2025-07-19 02:21:37.324348	\N
888	888	2025-07-19	2025-07-19 02:21:37.485864	2025-07-19 02:21:37.485864	\N
889	889	2025-07-19	2025-07-19 02:21:37.65567	2025-07-19 02:21:37.65567	\N
890	890	2025-07-19	2025-07-19 02:21:37.821809	2025-07-19 02:21:37.821809	\N
891	891	2025-07-19	2025-07-19 02:21:37.987476	2025-07-19 02:21:37.987476	\N
892	892	2025-07-19	2025-07-19 02:21:38.14939	2025-07-19 02:21:38.14939	\N
893	893	2025-07-19	2025-07-19 02:21:38.325388	2025-07-19 02:21:38.325388	\N
894	894	2025-07-19	2025-07-19 02:21:38.492898	2025-07-19 02:21:38.492898	\N
895	895	2025-07-19	2025-07-19 02:21:38.653931	2025-07-19 02:21:38.653931	\N
896	896	2025-07-19	2025-07-19 02:21:38.812728	2025-07-19 02:21:38.812728	\N
897	897	2025-07-19	2025-07-19 02:21:38.983618	2025-07-19 02:21:38.983618	\N
898	12	2025-07-20	2025-07-20 17:42:53.372089	2025-07-20 17:42:53.372089	\N
899	730	2025-07-20	2025-07-20 17:49:35.533882	2025-07-20 17:49:35.533882	\N
900	74	2025-07-21	2025-07-21 07:41:09.439113	2025-07-21 07:41:09.439113	\N
901	73	2025-07-21	2025-07-21 07:41:37.766632	2025-07-21 07:41:37.766632	\N
902	92	2025-07-21	2025-07-21 07:42:20.828967	2025-07-21 07:42:20.828967	\N
903	97	2025-07-21	2025-07-21 07:43:00.547914	2025-07-21 07:43:00.547914	\N
904	93	2025-07-21	2025-07-21 07:45:31.528304	2025-07-21 07:45:31.528304	\N
905	75	2025-07-21	2025-07-21 07:46:33.684495	2025-07-21 07:46:33.684495	\N
906	86	2025-07-21	2025-07-21 07:52:40.356007	2025-07-21 07:52:40.356007	\N
907	81	2025-07-21	2025-07-21 07:52:42.903442	2025-07-21 07:52:42.903442	\N
908	33	2025-07-21	2025-07-21 07:52:45.489816	2025-07-21 07:52:45.489816	\N
909	9	2025-07-21	2025-07-21 07:52:47.992243	2025-07-21 07:52:47.992243	\N
910	10	2025-07-21	2025-07-21 07:52:50.608334	2025-07-21 07:52:50.608334	\N
911	51	2025-07-21	2025-07-21 07:52:53.151485	2025-07-21 07:52:53.151485	\N
912	160	2025-07-21	2025-07-21 07:52:55.693517	2025-07-21 07:52:55.693517	\N
913	144	2025-07-21	2025-07-21 07:52:58.250452	2025-07-21 07:52:58.250452	\N
914	143	2025-07-21	2025-07-21 07:53:00.769542	2025-07-21 07:53:00.769542	\N
915	145	2025-07-21	2025-07-21 07:53:03.319396	2025-07-21 07:53:03.319396	\N
916	730	2025-07-21	2025-07-21 08:30:06.122239	2025-07-21 08:30:06.122239	\N
\.


--
-- TOC entry 3976 (class 0 OID 17339)
-- Dependencies: 338
-- Data for Name: potongan_penagihan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.potongan_penagihan (id_potongan, id_penagihan, jumlah_potongan, alasan, dibuat_pada, diperbarui_pada) FROM stdin;
\.


--
-- TOC entry 3962 (class 0 OID 17276)
-- Dependencies: 324
-- Data for Name: produk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produk (id_produk, nama_produk, harga_satuan, status_produk, dibuat_pada, diperbarui_pada, is_priority, priority_order) FROM stdin;
1	SMOOTH LOVE	30000.00	t	2025-07-19 02:10:24.799052	2025-07-19 02:10:24.799052	t	1
2	MR LOVER	30000.00	t	2025-07-19 02:10:58.683807	2025-07-19 02:10:58.683807	t	2
3	LUNCY	30000.00	t	2025-07-19 02:11:28.151108	2025-07-19 02:11:28.151108	t	3
4	LUNCY AMETHYIS	30000.00	t	2025-07-19 02:11:45.696261	2025-07-19 02:11:45.696261	t	4
5	SCADAL WOMEN	30000.00	t	2025-07-19 02:12:03.704533	2025-07-19 02:12:03.704533	t	5
\.


--
-- TOC entry 3960 (class 0 OID 17268)
-- Dependencies: 322
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id_sales, nama_sales, nomor_telepon, status_aktif, dibuat_pada, diperbarui_pada) FROM stdin;
1	EDWIN	+62 819-1843-8876	t	2025-07-19 02:19:02.886714	2025-07-19 02:19:02.886714
4	EKO	+62 857-9036-9287	t	2025-07-19 02:20:36.824057	2025-07-19 02:20:36.824057
2	HUDA	+62 889-9123-4553	t	2025-07-19 02:19:34.599927	2025-07-19 02:19:34.599927
3	MAMAN	+62 822-2962-2229	t	2025-07-19 02:20:10.849686	2025-07-19 02:20:10.849686
5	YOGA	+62 856-0750-4779	t	2025-07-19 02:21:15.38579	2025-07-19 02:21:15.38579
\.


--
-- TOC entry 3978 (class 0 OID 17349)
-- Dependencies: 340
-- Data for Name: setoran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.setoran (id_setoran, total_setoran, penerima_setoran, dibuat_pada, diperbarui_pada) FROM stdin;
\.


--
-- TOC entry 3983 (class 0 OID 17645)
-- Dependencies: 348
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_logs (id, log_type, message, created_at) FROM stdin;
1	mv_refresh	Pengiriman aggregates materialized view refreshed	2025-07-19 15:49:42.671825
\.


--
-- TOC entry 3964 (class 0 OID 17286)
-- Dependencies: 326
-- Data for Name: toko; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.toko (id_toko, id_sales, nama_toko, kecamatan, kabupaten, link_gmaps, status_toko, dibuat_pada, diperbarui_pada, no_telepon) FROM stdin;
1	1	KURNIA AJI MANDIRI	PANEKAN	MAGETAN	https://maps.app.goo.gl/tmTpSNQ22dxM7Jea6	t	2025-07-19 02:19:02.954519	2025-07-19 02:19:02.954519	6289525452816
2	1	AL MUBAROK 1	PANEKAN	MAGETAN	https://maps.app.goo.gl/7z2zgFCtFbMvkP7r7	t	2025-07-19 02:19:03.122339	2025-07-19 02:19:03.122339	6285847802631
3	1	AL MUBAROK 2	PANEKAN	MAGETAN	https://maps.app.goo.gl/Km4XTTk4CraqNPAS7	t	2025-07-19 02:19:03.290757	2025-07-19 02:19:03.290757	6281357892594
4	1	ADA MART	PANEKAN	MAGETAN	https://maps.app.goo.gl/QY7oNV2ZHf8Kb4ys8	t	2025-07-19 02:19:03.471366	2025-07-19 02:19:03.471366	6282337724917
5	1	AFA SKIN	PANEKAN	MAGETAN	https://maps.app.goo.gl/3xceENF299pxbyzY7	t	2025-07-19 02:19:03.636148	2025-07-19 02:19:03.636148	6285748633314
6	1	INDO MOLL	PANEKAN	MAGETAN	https://maps.app.goo.gl/i2ybL4hEDthxpDSP6	t	2025-07-19 02:19:03.814289	2025-07-19 02:19:03.814289	6282193721032
7	1	KAISAR 999 PST	SIDOREJO	MAGETAN	https://maps.app.goo.gl/Am1dndWbQujLNdXX6	t	2025-07-19 02:19:03.986075	2025-07-19 02:19:03.986075	6285607928237
8	1	KAISAR 999 WATES	PANEKAN	MAGETAN	https://maps.app.goo.gl/2A53EgWAPHafnXhV9	t	2025-07-19 02:19:04.157533	2025-07-19 02:19:04.157533	6285607928237
9	1	CHEERY KOSMETIK TERUNG	PANEKAN	MAGETAN	https://maps.app.goo.gl/xMKDAM7wctmYzFY8A	t	2025-07-19 02:19:04.323068	2025-07-19 02:19:04.323068	6281232389653
10	1	ARE YOU	MAGETAN	MAGETAN	https://maps.app.goo.gl/DSYsYJk75DNywbMAA	t	2025-07-19 02:19:04.479932	2025-07-19 02:19:04.479932	6285231298145
12	1	ABIMART 2 TERUNG	PANEKAN	MAGETAN	https://maps.app.goo.gl/kyz95VFDGdVGMJkT8	t	2025-07-19 02:19:04.829469	2025-07-19 02:19:04.829469	62851506200031
13	1	KAISAR ABADI	PANEKAN	MAGETAN	https://maps.app.goo.gl/ZjfGRW9GN37QL52A8	t	2025-07-19 02:19:04.98312	2025-07-19 02:19:04.98312	62895395667370
14	1	ALFANA SIDOWAYAH	PANEKAN	MAGETAN	https://maps.app.goo.gl/cTcSUM5K4gZtUUAC6	t	2025-07-19 02:19:05.194711	2025-07-19 02:19:05.194711	6285736100148
15	1	TOKO RISMA BULUGUNUNG	PLAOSAN	MAGETAN	https://maps.app.goo.gl/RKZtV8YxMCKVGHJU8	t	2025-07-19 02:19:05.35409	2025-07-19 02:19:05.35409	6285107021102
16	1	SASA BEAUTY BULUGUNUNG	PLAOSAN	MAGETAN	https://maps.app.goo.gl/ikhvxJKsk6XwhCTg7	t	2025-07-19 02:19:05.520381	2025-07-19 02:19:05.520381	6285649333627
17	1	LIMASARI MART	PLAOSAN	MAGETAN	https://maps.app.goo.gl/iqc2fowrP3eDFkbc9	t	2025-07-19 02:19:05.689346	2025-07-19 02:19:05.689346	6285854252233
18	1	SRC HASNA CANDIREJO	MAGETAN	MAGETAN	https://maps.app.goo.gl/cCVM5SH3Rqnc1tRA9	t	2025-07-19 02:19:05.83939	2025-07-19 02:19:05.83939	6281231619873
19	1	ALMIRA MART	BENDO	MAGETAN	https://maps.app.goo.gl/eq2MPKNdx4d2fN1r5	t	2025-07-19 02:19:05.990531	2025-07-19 02:19:05.990531	6282252530191
20	1	PRIANDRA MJOPURNO	NGARIBOYO	MAGETAN	https://maps.app.goo.gl/1GiPFbPgPPon2jBX8	t	2025-07-19 02:19:06.143036	2025-07-19 02:19:06.143036	6281282655387
21	1	HAMDALLAH NGRINI	NGARIBOYO	MAGETAN	https://maps.app.goo.gl/BU4nk2STTXfHYGxD6	t	2025-07-19 02:19:06.314074	2025-07-19 02:19:06.314074	6285234406566
22	1	NONA KOSMETIK NGRINI	PARANG	MAGETAN	https://maps.app.goo.gl/5Lo5SsGKuEEwcL4N6	t	2025-07-19 02:19:06.462635	2025-07-19 02:19:06.462635	6282333504311
23	1	RENES MART KRAJAN	PARANG	MAGETAN	https://maps.app.goo.gl/h1sJdr3X83i1BDuD9	t	2025-07-19 02:19:06.643334	2025-07-19 02:19:06.643334	6285248294099
24	1	VALEN MART	KAWEDANAN	MAGETAN	https://maps.app.goo.gl/7QfF6WFxz6iMs7C57	t	2025-07-19 02:19:06.807504	2025-07-19 02:19:06.807504	6282231553458
25	1	TOKO ABY	BENDO	MAGETAN	https://maps.app.goo.gl/pYxdN91n35DAvGaD9	t	2025-07-19 02:19:06.962057	2025-07-19 02:19:06.962057	6285336072037
26	1	SURAIYA	NGUNTORONADI	MAGETAN	https://maps.app.goo.gl/GjqLDRRAACs1qowd6	t	2025-07-19 02:19:07.112539	2025-07-19 02:19:07.112539	6281216263826
27	1	DESI MART	MAOSPATI	MAGETAN	https://maps.app.goo.gl/BZSKrWS8gKf4uRPZ9?g_st=aw	t	2025-07-19 02:19:07.274154	2025-07-19 02:19:07.274154	6285746633741
28	1	SUMBER KEMASAN	MAOSPATI	MAGETAN	https://maps.app.goo.gl/zbASgpwvfiQjT3JCA	t	2025-07-19 02:19:07.442678	2025-07-19 02:19:07.442678	6281216097999
29	1	D JATI	BARAT	MAGETAN	https://maps.app.goo.gl/AzBLqDQ66NgRf2kn6	t	2025-07-19 02:19:07.609864	2025-07-19 02:19:07.609864	6282237807783
30	1	TOKO KEMBAR	PLAOSAN	MAGETAN	https://maps.app.goo.gl/7RayMG8mS3nsvPcL6?g_st=aw	t	2025-07-19 02:19:07.762982	2025-07-19 02:19:07.762982	6285707050472
31	1	ELLA MART	PARANG	MAGETAN	https://maps.app.goo.gl/K2U7af4V3JMHB59n8	t	2025-07-19 02:19:07.924757	2025-07-19 02:19:07.924757	6282231149946
32	1	ANA KOSMETIK	PARANG	MAGETAN	https://maps.app.goo.gl/1rm34giBLg2jgNDE6	t	2025-07-19 02:19:08.079137	2025-07-19 02:19:08.079137	6285708506925
33	1	TOKO CHARESYO SIMATAN	PANEKAN	MAGETAN	https://maps.app.goo.gl/V4jKG83kcqXXhCvZ9	t	2025-07-19 02:19:08.245129	2025-07-19 02:19:08.245129	6282142587831
34	1	TOM MART	TAKERAN	MAGETAN	https://maps.app.goo.gl/MHfRw44sx1iG1SnN9	t	2025-07-19 02:19:08.413001	2025-07-19 02:19:08.413001	\N
35	1	TOKO MARNO	NGUNTORONADI	MAGETAN	https://maps.app.goo.gl/vDRWhx9HK2A6Kzkg9	t	2025-07-19 02:19:08.573699	2025-07-19 02:19:08.573699	\N
36	1	SENNA BEAUTY	BENDO	MAGETAN	https://maps.app.goo.gl/NsABueU2PnvYknjL9	t	2025-07-19 02:19:08.726646	2025-07-19 02:19:08.726646	6289696298254
37	1	ARTA MART	BENDO	MAGETAN	https://maps.app.goo.gl/RxfGRwWW3Vwkff1e8	t	2025-07-19 02:19:08.878223	2025-07-19 02:19:08.878223	6285150619360
38	1	SRC NUR HAYATI POJOK	KAWEDANAN	MAGETAN	https://maps.app.goo.gl/ShVUcibXw7knKxMj8	t	2025-07-19 02:19:09.032259	2025-07-19 02:19:09.032259	\N
39	1	BERKAH HOFA PETUNGREJO	NGUNTORONADI	MAGETAN	https://maps.app.goo.gl/JBfgg2cSi7ya1Bte7	t	2025-07-19 02:19:09.190485	2025-07-19 02:19:09.190485	6285707942070
40	1	BERKAH	NGUNTORONADI	MAGETAN	https://maps.app.goo.gl/ShVUcibXw7knKxMj8	t	2025-07-19 02:19:09.341092	2025-07-19 02:19:09.341092	6281234924672
41	1	SRC MENIK	TAKERAN	MAGETAN	https://maps.app.goo.gl/QutMZGmTVq6KQ3rk7	t	2025-07-19 02:19:09.493091	2025-07-19 02:19:09.493091	\N
42	1	BONAZA CEPOKO	PANEKAN	MAGETAN	https://maps.app.goo.gl/mq6wYxc5cnAP6SQm6	t	2025-07-19 02:19:09.638963	2025-07-19 02:19:09.638963	\N
43	1	GLOW UP	MAOSPATI	MAGETAN	https://maps.app.goo.gl/2zVoYkzW5T2By46NA	t	2025-07-19 02:19:09.788152	2025-07-19 02:19:09.788152	628979527773
45	1	MULIA ABADI	MILANGASRI	MAGETAN	https://maps.app.goo.gl/8T3sL4LEd7eiA9BLA	t	2025-07-19 02:19:10.092503	2025-07-19 02:19:10.092503	6285851327488
46	1	AMMAR JAYA	NGUNTORONADI	MAGETAN	https://maps.app.goo.gl/9TSnzGExX2VqYAN87	t	2025-07-19 02:19:10.246129	2025-07-19 02:19:10.246129	6281259790495
47	1	RUMAH CANTIK BRIYAN	GORANG-GARENG	MAGETAN	https://maps.app.goo.gl/pYLZignb7o8QFfH27	t	2025-07-19 02:19:10.396639	2025-07-19 02:19:10.396639	6288200928812
48	1	KARUNIA PUTRA	MILANGASRI	MAGETAN	https://maps.app.goo.gl/wazrZfNrxfzMRyQ47	t	2025-07-19 02:19:10.553918	2025-07-19 02:19:10.553918	6281553025710
49	1	TOKO ADRELIANO	CEPOKO	MAGETAN	https://maps.app.goo.gl/idMMGCjzXBEL6yRw9	t	2025-07-19 02:19:10.709279	2025-07-19 02:19:10.709279	6285752434521
50	1	YUDI MART	MAOSPATI	MAGETAN	https://maps.app.goo.gl/tjCshFFtbWZpA4rH6	t	2025-07-19 02:19:10.860861	2025-07-19 02:19:10.860861	6285735157537
51	1	SUMBER MAKMUR	SUKOMORO	MAGETAN	https://maps.app.goo.gl/J2tLCQcsY5fZKCPp9	t	2025-07-19 02:19:11.018822	2025-07-19 02:19:11.018822	6285730106683
52	1	TOKO JENK DIAN	GORANG-GARENG	MAGETAN	https://maps.app.goo.gl/C3u7f9kEtfWfGwvE8	t	2025-07-19 02:19:11.169516	2025-07-19 02:19:11.169516	6282320002939
53	1	FAIZYA KOSMETIK	LEMBEYAN	MAGETAN	https://maps.app.goo.gl/4HnaJZTT12YZbqJq6	t	2025-07-19 02:19:11.328712	2025-07-19 02:19:11.328712	6281235630171
54	1	TOKO EL FATH	PANEKAN	MAGETAN	https://maps.app.goo.gl/X2bAmvJELHfp82KX7	t	2025-07-19 02:19:11.484736	2025-07-19 02:19:11.484736	6285655681928
55	1	TOKO META	MAGETAN	MAGETAN	https://maps.app.goo.gl/h6ezEfD5M5BH8v6V9	t	2025-07-19 02:19:11.632801	2025-07-19 02:19:11.632801	6285853377558
56	1	TOKO VINSMART	PONCOL	MAGETAN	https://maps.app.goo.gl/v6DnMPH4uNbm2hdW7	t	2025-07-19 02:19:11.776947	2025-07-19 02:19:11.776947	\N
11	1	ABIMART KAUMAN	MAGETAN	MAGETAN	https://maps.app.goo.gl/tVktPjvFBMdehU1M7	t	2025-07-19 02:19:04.657167	2025-07-19 02:19:04.657167	62895395071440
57	1	GROCERRY MINIMARKET	SIDOREJO	MAGETAN	https://maps.app.goo.gl/UtB1NfkeQ8GfxFq57	t	2025-07-19 02:19:11.945772	2025-07-19 02:19:11.945772	6285649485351
58	1	TALES MART	SUKOMORO	MAGETAN	https://maps.app.goo.gl/3bQs8ocyZ75eUoUUA	t	2025-07-19 02:19:12.10146	2025-07-19 02:19:12.10146	6285795737953
59	1	TOKO NABILA SYIFA	PLAOSAN	MAGETAN	https://maps.app.goo.gl/5xzjzdustYhPs7xH8	t	2025-07-19 02:19:12.258396	2025-07-19 02:19:12.258396	6283851588701
60	1	TOKO NAURA	PONCOL	MAGETAN	https://maps.app.goo.gl/NN36XNERyENkTQg56	t	2025-07-19 02:19:12.410849	2025-07-19 02:19:12.410849	6285854421355
61	1	MAKMUR MART	PONCOL	MAGETAN	https://maps.app.goo.gl/XwusefidXTNAs1WD7	t	2025-07-19 02:19:12.565288	2025-07-19 02:19:12.565288	6282257863040
62	1	SARI RASA BEAUTY	PARANG	MAGETAN	https://maps.app.goo.gl/STkYsh9gEpxpxKY39	t	2025-07-19 02:19:12.720462	2025-07-19 02:19:12.720462	6285745535490
63	1	CHANTIKA SHOP	TAKERAN	MAGETAN	https://maps.app.goo.gl/nFELVUKgFCLVfNeG6	t	2025-07-19 02:19:12.873016	2025-07-19 02:19:12.873016	6285852167557
64	1	NDN MART	PANEKAN	MAGETAN	https://maps.app.goo.gl/5MhGKhHSkCzvaMtc7	t	2025-07-19 02:19:13.029408	2025-07-19 02:19:13.029408	6282144649199
65	1	TOKO MBAK SURTI	PANEKAN	MAGETAN	https://maps.app.goo.gl/g9CHb3tT6AK1STG47	t	2025-07-19 02:19:13.188746	2025-07-19 02:19:13.188746	6285816881933
66	1	AL MAHYRA MART	MAOSPATI	MAGETAN	https://maps.app.goo.gl/qcgZ63u5i7C8RpJp6	t	2025-07-19 02:19:13.357787	2025-07-19 02:19:13.357787	6285606616438
67	1	RUMAH CANTIK BRIYAN 2	BARAT	MAGETAN	https://maps.app.goo.gl/RGRPetga7nSmHKWb8	t	2025-07-19 02:19:13.525859	2025-07-19 02:19:13.525859	62881036585300
68	1	AL MAHYRA MANGUN	PANEKAN	MAGETAN	https://maps.app.goo.gl/kG2ihQHvbqCcZqci8	t	2025-07-19 02:19:13.679813	2025-07-19 02:19:13.679813	6285730707244
69	1	ANA KOSMETIK 2	LEMBEYAN	MAGETAN	https://maps.app.goo.gl/5m7VewAQNCmHNeFt8	t	2025-07-19 02:19:13.842098	2025-07-19 02:19:13.842098	6285746182620
70	1	LARAIA SHOP	BARAT	MAGETAN	https://maps.app.goo.gl/2SdC1UemfMPPMW4a7	t	2025-07-19 02:19:14.017857	2025-07-19 02:19:14.017857	6285607579036
71	1	TOKO VITA	NGUNTORONADI	MAGETAN	https://maps.app.goo.gl/SexEkB3wXfkCTptb9	t	2025-07-19 02:19:14.169417	2025-07-19 02:19:14.169417	\N
72	1	MITRA SWALAYAN	KEBONSARI	MADIUN	https://maps.app.goo.gl/4GsnB1hi6sofyHoB8	t	2025-07-19 02:19:14.316479	2025-07-19 02:19:14.316479	6281333380458
73	1	UD ABID	KEBONSARI	MADIUN	https://maps.app.goo.gl/4XsiW2k83rgGhmuHA	t	2025-07-19 02:19:14.471554	2025-07-19 02:19:14.471554	6282337117356
74	1	ZAKIYA BEAUTY	KEBONSARI	MADIUN	https://maps.app.goo.gl/UZta7eVPrPLNfxtP8	t	2025-07-19 02:19:14.636948	2025-07-19 02:19:14.636948	6289619571217
75	1	GARON MART	CARUBAN	MADIUN	https://maps.app.goo.gl/ySqixJTwAjZ1F6wYA	t	2025-07-19 02:19:14.800646	2025-07-19 02:19:14.800646	6281133337878
76	1	SRC NADIRA	BALEREJO	MADIUN	https://maps.app.goo.gl/omyc48AWMvVYt7Mq5	t	2025-07-19 02:19:14.975082	2025-07-19 02:19:14.975082	6287860362154
77	1	SAHABAT PINTAR	CARUBAN	MADIUN	https://maps.app.goo.gl/d83u73Z1CCUQ5D1F8	t	2025-07-19 02:19:15.145664	2025-07-19 02:19:15.145664	6282214309990
78	1	RK MART	CARUBAN	MADIUN	https://maps.app.goo.gl/3cQy1EU5ZgVeKtyt6	t	2025-07-19 02:19:15.297353	2025-07-19 02:19:15.297353	6285857502593
79	1	ANEKA JAYA	BALEREJO	MADIUN	https://maps.app.goo.gl/yrg6nFirruo2NFm26	t	2025-07-19 02:19:15.450157	2025-07-19 02:19:15.450157	6282137756213
80	1	RAKA MART	KEBONSARI	MADIUN	https://maps.app.goo.gl/oB1kCyiUEYXmnUmR7	t	2025-07-19 02:19:15.600104	2025-07-19 02:19:15.600104	6282337000189
81	1	NANDA SHOP	DIMONG	MADIUN	https://maps.app.goo.gl/mYzWEXosT56AJcBi9	t	2025-07-19 02:19:15.747229	2025-07-19 02:19:15.747229	6281515732836
82	1	INDAH LESTARI	NGADIREJO	MADIUN	https://maps.app.goo.gl/rNKi8WvKKLgEekcN9	t	2025-07-19 02:19:15.905139	2025-07-19 02:19:15.905139	6283175556671
83	1	TUNAS TAMA	WONOASRI	MADIUN	https://maps.app.goo.gl/4dHiX  1ZUm2MWDE1m6	t	2025-07-19 02:19:16.088217	2025-07-19 02:19:16.088217	6282288084721
84	1	ALIYA SHOP	SIDOMULYO	MADIUN	https://maps.app.goo.gl/a8KgcbjeH7H1uEn79	t	2025-07-19 02:19:16.247148	2025-07-19 02:19:16.247148	6287781540231
85	1	MAY SHOP	WONOASRI	MADIUN	https://maps.app.goo.gl/cz9rig19VZKguWyq5	t	2025-07-19 02:19:16.398729	2025-07-19 02:19:16.398729	6285648048905
86	1	TOKO INDAH	DIMONG	MADIUN	https://maps.app.goo.gl/B1drvekgP6M2dvzx7	t	2025-07-19 02:19:16.546922	2025-07-19 02:19:16.546922	628990867061
87	1	MBS MART	JIWAN	MADIUN	https://maps.app.goo.gl/uv1JR1QKtr84HyvP8	t	2025-07-19 02:19:16.699577	2025-07-19 02:19:16.699577	6282131343860
88	1	MB BEAUTY	MADIUN	MADIUN	https://maps.app.goo.gl/zPtQK8noVxpE3nvZ6	t	2025-07-19 02:19:16.854898	2025-07-19 02:19:16.854898	6281363806628
89	1	YOHANA SHOP	DIMONG	MADIUN	https://maps.app.goo.gl/VqBxxAWFbdpGszoU8	t	2025-07-19 02:19:17.009033	2025-07-19 02:19:17.009033	6285852534864
90	1	NU  MART	BALEREJO	MADIUN	https://maps.app.goo.gl/wZCqkmgvFzJHLi2P9	t	2025-07-19 02:19:17.165805	2025-07-19 02:19:17.165805	6282322627731
91	1	TOKO SUPIATUN	KEBONSARI	MADIUN	https://maps.app.goo.gl/KuMHQksdstATP2FL6	t	2025-07-19 02:19:17.320304	2025-07-19 02:19:17.320304	6281259653830
92	1	SRC PURWATI	KEBONSARI	MADIUN	https://maps.app.goo.gl/Rg3uecDYCm12wR5R8	t	2025-07-19 02:19:17.482705	2025-07-19 02:19:17.482705	6281217516619
93	1	VILLSHOP	DOLOPO	MADIUN	https://maps.app.goo.gl/HM1gvFuD8D3UnPYX9	t	2025-07-19 02:19:17.63759	2025-07-19 02:19:17.63759	6282230158747
94	1	TOKO ABI JAYA	DOLOPO	MADIUN	https://maps.app.goo.gl/cr2ZtgYg9t4wsFpw9	t	2025-07-19 02:19:17.792344	2025-07-19 02:19:17.792344	6281335742690
95	1	TOKO BUDI BAROKAH	DOLOPO	MADIUN	https://maps.app.goo.gl/tNPBurfwR5vZVTiA6	t	2025-07-19 02:19:17.949078	2025-07-19 02:19:17.949078	6281529561511
96	1	TOKO TULUS SEMPULUR	SINGGAHAN	MADIUN	https://maps.app.goo.gl/gdBf6koRSPgjsVbY6	t	2025-07-19 02:19:18.102858	2025-07-19 02:19:18.102858	628125929787
97	1	EDWI.ID	DOLOPO	MADIUN	https://maps.app.goo.gl/rDJw9yBnnYg6Cfaf9	t	2025-07-19 02:19:18.253905	2025-07-19 02:19:18.253905	6285338712857
98	1	APOTEK IZZATI	GEGER	MADIUN	https://maps.app.goo.gl/979Dpus29VbHG95S9	t	2025-07-19 02:19:18.403717	2025-07-19 02:19:18.403717	62895367348661
99	1	SUMBER REJEKI	MANGUHARJO	MADIUN	https://maps.app.goo.gl/YvKvRc6uGNyzjBZc6	t	2025-07-19 02:19:18.563354	2025-07-19 02:19:18.563354	62895397166015
100	1	NIKMA SEMBAKO	DOLOPO	MADIUN	https://maps.app.goo.gl/SjhF3paPPR8vaGox9	t	2025-07-19 02:19:18.729225	2025-07-19 02:19:18.729225	6281555360360
101	1	TOKO MODELIS	DOLOPO	MADIUN	https://maps.app.goo.gl/yfGUVWuHqq4AN13u6	t	2025-07-19 02:19:18.891094	2025-07-19 02:19:18.891094	6281335200245
102	1	TOKO PAK HARTOYO	DOLOPO	MADIUN	https://maps.app.goo.gl/ZhM94cDz27w89tdx6	t	2025-07-19 02:19:19.082244	2025-07-19 02:19:19.082244	6285755360129
103	1	TOKO MBAK WIWIK	DOLOPO	MADIUN	https://maps.app.goo.gl/t4HnogdJ7xEkYaSS7	t	2025-07-19 02:19:19.240523	2025-07-19 02:19:19.240523	6285330526252
104	1	INTEN COLLECTION	DOLOPO	MADIUN	https://maps.app.goo.gl/M4tPUugd9JmRzrrn9	t	2025-07-19 02:19:19.39164	2025-07-19 02:19:19.39164	6282116187757
105	1	TOKO BUDI	DOLOPO	MADIUN	https://maps.app.goo.gl/PQYE41A3swR4wg7y5	t	2025-07-19 02:19:19.547606	2025-07-19 02:19:19.547606	6283845244685
106	1	AMARTA MART	DOLOPO	MADIUN	https://maps.app.goo.gl/kHHZ6H4gbiwraqgz8	t	2025-07-19 02:19:19.708418	2025-07-19 02:19:19.708418	6285755335544
107	1	TOKO DARMINI	DOLOPO	MADIUN	https://maps.app.goo.gl/ERQ5qzr985cXtoCW7	t	2025-07-19 02:19:19.863048	2025-07-19 02:19:19.863048	6281232200201
108	1	TOKO MUMTAZ	DOLOPO	MADIUN	https://maps.app.goo.gl/eJLbZ52nmttdSdar9	t	2025-07-19 02:19:20.013126	2025-07-19 02:19:20.013126	6281234428131
109	1	SRC DIRA	GEGER	MADIUN	https://maps.app.goo.gl/1F5E9EsbRE4PJ9rv8	t	2025-07-19 02:19:20.172539	2025-07-19 02:19:20.172539	6283845287323
110	1	SRC MIA	DOLOPO	MADIUN	https://maps.app.goo.gl/Fk5istJyVAP6fQ8Z9	t	2025-07-19 02:19:20.358462	2025-07-19 02:19:20.358462	6281216660903
111	1	AR BEAUTY	KEBONSARI	MADIUN	https://maps.app.goo.gl/4X5s8MJizd5SUG5v8	t	2025-07-19 02:19:20.510436	2025-07-19 02:19:20.510436	6281330443452
112	1	FOTOCOPY GRIYA	KEBONSARI	MADIUN	https://maps.app.goo.gl/cvubiHHpij8pf1HV8	t	2025-07-19 02:19:20.663317	2025-07-19 02:19:20.663317	6282338419143
113	1	APOTEK BINAR	DOLOPO	MADIUN	https://maps.app.goo.gl/ZNti8rU5RGSryMTo7	t	2025-07-19 02:19:20.874807	2025-07-19 02:19:20.874807	6285779643933
114	1	SRC YANI	DOLOPO	MADIUN	https://maps.app.goo.gl/GdmE5aAwfXRCT6u99	t	2025-07-19 02:19:21.047611	2025-07-19 02:19:21.047611	6285707817010
115	1	APOTIK ZAM ZAM	DOLOPO	MADIUN	https://maps.app.goo.gl/wX4Wwb4JD59EifW37	t	2025-07-19 02:19:21.205622	2025-07-19 02:19:21.205622	6282234491999
116	1	SRC ANDIK	DOLOPO	MADIUN	https://maps.app.goo.gl/ZvXzqkZGmbmuPsZG6	t	2025-07-19 02:19:21.357552	2025-07-19 02:19:21.357552	\N
117	1	GR GROSIR	DOLOPO	MADIUN	https://maps.app.goo.gl/FsfKfNazVDxqBhed7	t	2025-07-19 02:19:21.512859	2025-07-19 02:19:21.512859	6285746746169
118	1	TOKO KARTINI	DOLOPO	MADIUN	https://maps.app.goo.gl/D7XrchyoFBhtbbdRA	t	2025-07-19 02:19:21.714166	2025-07-19 02:19:21.714166	6282242179828
119	1	MM BAHETRA	KARTOHARJO	MADIUN	https://maps.app.goo.gl/aaVRHe53MGYyvxWA6	t	2025-07-19 02:19:21.921672	2025-07-19 02:19:21.921672	\N
120	1	TOKO AMANAH	MANGUHARJO	MADIUN	https://maps.app.goo.gl/Txr8tfBRvXaMN7iL9	t	2025-07-19 02:19:22.082795	2025-07-19 02:19:22.082795	\N
121	1	MUBAROK MARKET	MANGUHARJO	MADIUN	https://maps.app.goo.gl/3sa1G91zfVVUFXKr8	t	2025-07-19 02:19:22.233213	2025-07-19 02:19:22.233213	\N
122	1	TOKO MAPAN	TAMAN	MADIUN	https://maps.app.goo.gl/TQYVWcucqiPSYXtt9	t	2025-07-19 02:19:22.383683	2025-07-19 02:19:22.383683	\N
123	1	TOKO ERZATTA	MANGUHARJO	MADIUN	https://maps.app.goo.gl/DDbhG1sHeScWWFLA9	t	2025-07-19 02:19:22.533764	2025-07-19 02:19:22.533764	\N
124	1	TOKO MAHKOTA	MANGUHARJO	MADIUN	https://maps.app.goo.gl/oEiQjA9RNYRjkfVj9	t	2025-07-19 02:19:22.685779	2025-07-19 02:19:22.685779	\N
125	1	TOKO MADURA ZAKI JAYA	MANGUHARJO	MADIUN	https://maps.app.goo.gl/HLYhCvCyQV4Xpi9X7	t	2025-07-19 02:19:22.845001	2025-07-19 02:19:22.845001	\N
126	1	PINKY STORE	JIWAN	MADIUN	https://maps.app.goo.gl/8tixiA5AgdYh5M1c9	t	2025-07-19 02:19:23.034628	2025-07-19 02:19:23.034628	\N
127	1	TOKO MA'ASYUNA	JIWAN	MADIUN	https://maps.app.goo.gl/Ri9oLs4i2L6hsj8G6	t	2025-07-19 02:19:23.213897	2025-07-19 02:19:23.213897	\N
128	1	HE MART	GONDANG	NGAWI	https://maps.app.goo.gl/5yGvY8udGfarLe3i9	t	2025-07-19 02:19:23.376287	2025-07-19 02:19:23.376287	6288212551934
129	1	SHERI KOSMETIK	GONDANG	NGAWI	https://maps.app.goo.gl/BbtMYGLZdPwKF165A	t	2025-07-19 02:19:23.549883	2025-07-19 02:19:23.549883	6282329517950
130	1	AULIA MART	WIDODAREN	NGAWI	https://maps.app.goo.gl/7yw6GAE7CNJVZAy2A	t	2025-07-19 02:19:23.708352	2025-07-19 02:19:23.708352	6285808172349
131	1	TOKO LESTARI	NGRAMBE	NGAWI	https://maps.app.goo.gl/KobmshrNxXPYn8vYA	t	2025-07-19 02:19:23.872843	2025-07-19 02:19:23.872843	6285806354249
132	1	QUEEN STORE BEAUTY	NGRAMBE	NGAWI	https://maps.app.goo.gl/t8URbzTmVhgZnxtc7	t	2025-07-19 02:19:24.028669	2025-07-19 02:19:24.028669	6281259934787
133	1	SWALAYAN SURYA	NGRAMBE	NGAWI	https://maps.app.goo.gl/xWv59foqMVd2TvEQ9	t	2025-07-19 02:19:24.184979	2025-07-19 02:19:24.184979	6281235144593
134	1	ADHIA MART	PARON	NGAWI	https://maps.app.goo.gl/CtWDP4XUdqiXeVLE8	t	2025-07-19 02:19:24.348321	2025-07-19 02:19:24.348321	6281259600101
135	1	SRC RAHMA	JOGOROGO	NGAWI	https://maps.app.goo.gl/FzMcHMWWGjLJwbgT7	t	2025-07-19 02:19:24.51037	2025-07-19 02:19:24.51037	6285259560702
136	1	TOKO LUMAYAN	JOGOROGO	NGAWI	https://maps.app.goo.gl/K6MKvEvMNDLA7fDo8	t	2025-07-19 02:19:24.676361	2025-07-19 02:19:24.676361	6281297249570
137	1	SRC MITRA BARU	SINE	NGAWI	https://maps.app.goo.gl/QkPTw6SEPbvfr7ps5	t	2025-07-19 02:19:24.842373	2025-07-19 02:19:24.842373	6282335222052
138	1	TOKO KOMPLIT JAYA	SINE	NGAWI	https://maps.app.goo.gl/StU2rfo7gVRMTdLb7	t	2025-07-19 02:19:24.991511	2025-07-19 02:19:24.991511	6281235885070
139	1	LOLLY AKSESORIS	SINE	NGAWI	https://maps.app.goo.gl/Np1nN5VT4W4WHgw89	t	2025-07-19 02:19:25.145892	2025-07-19 02:19:25.145892	6285179886175
140	1	SRC GAYATRI 2	SINE	NGAWI	https://maps.app.goo.gl/FhsLVAGcA9JCsHrg6	t	2025-07-19 02:19:25.295366	2025-07-19 02:19:25.295366	6281359117791
141	1	BEE MART	SINE	NGAWI	https://maps.app.goo.gl/qJBDKSn3UZ1zo4Um7	t	2025-07-19 02:19:25.445131	2025-07-19 02:19:25.445131	6285607908315
142	1	WAHYU CELL	MANTINGAN	NGAWI	https://maps.app.goo.gl/iavuSewokcLFvfWa7	t	2025-07-19 02:19:25.62063	2025-07-19 02:19:25.62063	6285229346835
143	1	DERA BEAUTY KOSMETIK	MANTINGAN	NGAWI	https://maps.app.goo.gl/aGcYKPJKmXL9Lv668	t	2025-07-19 02:19:25.773182	2025-07-19 02:19:25.773182	6281548015574
144	1	DERA BEAUTY KOSMETIK	MANTINGAN	NGAWI	https://maps.app.goo.gl/ieb7yokMoh5V3fpD6	t	2025-07-19 02:19:25.924584	2025-07-19 02:19:25.924584	6281548015574
145	1	MAY KOSMETIK	MANTINGAN	NGAWI	https://maps.app.goo.gl/kaqFHBaAgUKosB948	t	2025-07-19 02:19:26.07468	2025-07-19 02:19:26.07468	62882007650534
146	1	ZURA KOSMETIK	MANTINGAN	NGAWI	https://maps.app.goo.gl/f5ABsLL9uE8So4NV7	t	2025-07-19 02:19:26.225019	2025-07-19 02:19:26.225019	6282330991204
147	1	MARWAH MART	NGRAMBE	NGAWI	https://maps.app.goo.gl/TH7FVN9uSZQSRK2F8	t	2025-07-19 02:19:26.376688	2025-07-19 02:19:26.376688	6282257287221
148	1	LEY'S BEAUTY	WIDODAREN	NGAWI	https://maps.app.goo.gl/4kNQfTCWHPgkgn5x7	t	2025-07-19 02:19:26.532761	2025-07-19 02:19:26.532761	6282124024017
149	1	ANUGERAH KOSMETIK	WIDODAREN	NGAWI	https://maps.app.goo.gl/MW7CCTzAowtgQQxW7	t	2025-07-19 02:19:26.714347	2025-07-19 02:19:26.714347	62895331250625
150	1	SRC ENDRA SEJATI	WIDODAREN	NGAWI	https://maps.app.goo.gl/pw3kCRqkW6UWx7nw6	t	2025-07-19 02:19:26.866957	2025-07-19 02:19:26.866957	6285648963037
151	1	R MART	NGRAMBE	NGAWI	https://maps.app.goo.gl/RStqmjZRi2xcoWJQ7	t	2025-07-19 02:19:27.018764	2025-07-19 02:19:27.018764	6281239202090
152	1	TRI WAIDYUNI	JOGOROGO	NGAWI	https://maps.app.goo.gl/abeBJdKMukGsrcCZ8	t	2025-07-19 02:19:27.181301	2025-07-19 02:19:27.181301	\N
153	1	ALLE MART	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/2nadN3UBa8o8skEx9	t	2025-07-19 02:19:27.329337	2025-07-19 02:19:27.329337	6285233884000
154	1	SRC RINDU	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/B9JTBWg4bkffGYQ7A	t	2025-07-19 02:19:27.478759	2025-07-19 02:19:27.478759	6281335667322
155	1	ALILA COUNTER	PARON	NGAWI	https://maps.app.goo.gl/gt68Zsja6STLr5Hg6	t	2025-07-19 02:19:27.631283	2025-07-19 02:19:27.631283	6281226160452
156	1	SHAFA CELLULAR	JOGOROGO	NGAWI	https://maps.app.goo.gl/FxvRghhPQE1R54rAA	t	2025-07-19 02:19:27.800487	2025-07-19 02:19:27.800487	6285933853111
157	1	QTA MART	JOGOROGO	NGAWI	https://maps.app.goo.gl/Dm1CsuJHYjuwyd3A8	t	2025-07-19 02:19:27.96054	2025-07-19 02:19:27.96054	6281654944634
158	1	SRC MARYATI	JOGOROGO	NGAWI	https://maps.app.goo.gl/pvxVyNhHBd7viRxo7	t	2025-07-19 02:19:28.115342	2025-07-19 02:19:28.115342	6285853122714
159	1	SHAFA MART	JOGOROGO	NGAWI	https://maps.app.goo.gl/J4tFf1EpAd1qNL2Q8	t	2025-07-19 02:19:28.275838	2025-07-19 02:19:28.275838	6281235120119
160	1	MONGGO MAMPIR	NGRAMBE	NGAWI	https://maps.app.goo.gl/jXaDRM9wPg2pbuER7	t	2025-07-19 02:19:28.433519	2025-07-19 02:19:28.433519	6281217251524
161	1	TOKO DEVA	NGRAMBE	NGAWI	https://maps.app.goo.gl/p8hw3hxWZt6dGuw37	t	2025-07-19 02:19:28.583942	2025-07-19 02:19:28.583942	6281231876058
162	1	ZENDIT MART	NGRAMBE	NGAWI	https://maps.app.goo.gl/2mR6nj9VnBwEkeWQ6	t	2025-07-19 02:19:28.771271	2025-07-19 02:19:28.771271	6285807257102
163	1	MUALLAFAH	WIDODAREN	NGAWI	https://maps.app.goo.gl/At1pMbZp9MH1FttC9	t	2025-07-19 02:19:28.919789	2025-07-19 02:19:28.919789	6285852586505
164	1	LALA MART	WIDODAREN	NGAWI	https://maps.app.goo.gl/Ptyx3ewJH9ymxVwi7	t	2025-07-19 02:19:29.104007	2025-07-19 02:19:29.104007	6282229799671
165	1	TOKO ANYAR	WIDODAREN	NGAWI	https://maps.app.goo.gl/FtVmGYoB1QUnqHHn7	t	2025-07-19 02:19:29.264704	2025-07-19 02:19:29.264704	6282230078893
166	1	TOKO SAK TITAHE	WIDODAREN	NGAWI	https://maps.app.goo.gl/t1TAYdCX4rCe1uyC7	t	2025-07-19 02:19:29.41275	2025-07-19 02:19:29.41275	6281074459333
167	1	TOKO WIWIK	WIDODAREN	NGAWI	https://maps.app.goo.gl/UvKDfPGvzA1PxAuG8	t	2025-07-19 02:19:29.567776	2025-07-19 02:19:29.567776	6285334069642
168	1	TOKO ENI	WIDODAREN	NGAWI	https://maps.app.goo.gl/s56PcPwixdX1oare9	t	2025-07-19 02:19:29.71843	2025-07-19 02:19:29.71843	6281336593567
169	1	TOKO NANIK	WIDODAREN	NGAWI	https://maps.app.goo.gl/TPpPTNARdwcLzgAK9	t	2025-07-19 02:19:29.897316	2025-07-19 02:19:29.897316	62882009315632
170	1	TOKO BUDIMAN	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/tiLP9cQBPNEeo7uP6	t	2025-07-19 02:19:30.05556	2025-07-19 02:19:30.05556	6285645858775
171	1	TOKO LARIS	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/o47FeJnQjSz6Hu1v9	t	2025-07-19 02:19:30.210152	2025-07-19 02:19:30.210152	6285259666297
172	1	DIAN MARLINA	WIDODAREN	NGAWI	https://maps.app.goo.gl/jJ3bsm2yjDaNrkNf7	t	2025-07-19 02:19:30.363616	2025-07-19 02:19:30.363616	62821690383
173	1	KURNIA/YUDI	WIDODAREN	NGAWI	https://maps.app.goo.gl/Q2YpcJeyq5BAEQAW8	t	2025-07-19 02:19:30.514649	2025-07-19 02:19:30.514649	6285546103779
174	1	BU TITIK	WIDODAREN	NGAWI	https://maps.app.goo.gl/KkxyjDvqsDByyzdG8	t	2025-07-19 02:19:30.668823	2025-07-19 02:19:30.668823	6281231906148
175	1	VIOLA SALON	WIDODAREN	NGAWI	https://maps.app.goo.gl/hKcsmcDsxVs3EGJo6	t	2025-07-19 02:19:30.822398	2025-07-19 02:19:30.822398	6288235627994
176	1	SRC BAKDINAH	WIDODAREN	NGAWI	https://maps.app.goo.gl/q93tWkMcZQ37YfDF9	t	2025-07-19 02:19:30.980254	2025-07-19 02:19:30.980254	6285233602678
177	1	TOKO DEVA	NGRAMBE	NGAWI	https://maps.app.goo.gl/dmT8MGubX9avrqNQ8	t	2025-07-19 02:19:31.143048	2025-07-19 02:19:31.143048	6282334406872
178	1	YULI ASIH	WIDODAREN	NGAWI	https://maps.app.goo.gl/Wxytg1AoiU43fceJ7	t	2025-07-19 02:19:31.311543	2025-07-19 02:19:31.311543	6281335225722
179	1	WINA	WIDODAREN	NGAWI	https://maps.app.goo.gl/w9wThP7RjFa1GyLq8	t	2025-07-19 02:19:31.476371	2025-07-19 02:19:31.476371	6287739980181
180	1	TOKO DUA PUTRI	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/P4ZVLGfqWaekyG1Y6	t	2025-07-19 02:19:31.640012	2025-07-19 02:19:31.640012	6285735416079
181	1	BUDI CELL	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/5RjUGPFxEfokdEez6	t	2025-07-19 02:19:31.790605	2025-07-19 02:19:31.790605	6282245552366
182	1	GATOT PRIYONO BRILINK	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/oRWFEiYWjhcRLLk4A	t	2025-07-19 02:19:31.946775	2025-07-19 02:19:31.946775	6282142997027
183	1	SRC IMA	NGRAMBE	NGAWI	https://maps.app.goo.gl/oJz3vLT9S4nwvT9b9	t	2025-07-19 02:19:32.125679	2025-07-19 02:19:32.125679	6281234207757
184	1	SCR IKA	WIDODAREN	NGAWI	https://maps.app.goo.gl/QXpnC7wM6t5rrd7g8	t	2025-07-19 02:19:32.275256	2025-07-19 02:19:32.275256	6285607238657
185	1	PINK MART	JOGOROGO	NGAWI	https://maps.app.goo.gl/uoGbZCu82rEE7oeK8	t	2025-07-19 02:19:32.434167	2025-07-19 02:19:32.434167	6285233835234
186	1	TOKO NANIK	NGRAMBE	NGAWI	https://maps.app.goo.gl/rgTXzFtSfas5iB1SA	t	2025-07-19 02:19:32.575169	2025-07-19 02:19:32.575169	6282245593668
187	1	TOKO NANING	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/YzNQwLHXsyktgBFh6	t	2025-07-19 02:19:32.733485	2025-07-19 02:19:32.733485	6285719048856
188	1	TOKO ABADI	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/ANJ2jWEXNdHAVHRv8	t	2025-07-19 02:19:32.918214	2025-07-19 02:19:32.918214	6282382441100
189	1	LARIST JAYA	WIDODAREN	NGAWI	https://maps.app.goo.gl/AQ33H4aFn3vLPv9A6	t	2025-07-19 02:19:33.071721	2025-07-19 02:19:33.071721	6285176903197
190	1	MM LIA	PARON	NGAWI	https://maps.app.goo.gl/RZV9aMR76mh3TBhA9	t	2025-07-19 02:19:33.226134	2025-07-19 02:19:33.226134	6281230141904
191	1	CAHAYA MULIA MART	WIDODAREN	NGAWI	https://maps.app.goo.gl/LWJ9mpkVKdD9Zicx7	t	2025-07-19 02:19:33.375188	2025-07-19 02:19:33.375188	6281335658098
192	1	TOKO NANIK	JOGOROGO	NGAWI	https://maps.app.goo.gl/HQuKugfNrpKemh7G8	t	2025-07-19 02:19:33.525282	2025-07-19 02:19:33.525282	6282245593668
193	1	V KOSMETIK	WIDODAREN	NGAWI	https://maps.app.goo.gl/meV78kTKmwsemEiV8	t	2025-07-19 02:19:33.673906	2025-07-19 02:19:33.673906	6281336671824
194	1	INKHA MART	WIDODAREN	NGAWI	https://maps.app.goo.gl/Aog6A6R7sBTjdg4o9	t	2025-07-19 02:19:33.829221	2025-07-19 02:19:33.829221	6285655835035
195	1	ANINDA MART	NGRAMBE	NGAWI	https://maps.app.goo.gl/JgH5XoBSDG27trMi7	t	2025-07-19 02:19:33.977005	2025-07-19 02:19:33.977005	628708306460
196	1	TOKO MONICA	SINE	NGAWI	https://maps.app.goo.gl/N5pPqi3RDWkypZRF6	t	2025-07-19 02:19:34.143126	2025-07-19 02:19:34.143126	6285731666064
197	1	VYA CELL	KEDUNGGALAR	NGAWI	https://maps.app.goo.gl/LcHa5X1X7GgeKS4y7	t	2025-07-19 02:19:34.287396	2025-07-19 02:19:34.287396	6285649023322
198	1	TOKO ADIT	WIDODAREN	NGAWI	https://maps.app.goo.gl/iXmB1u2a8JMATyYw7	t	2025-07-19 02:19:34.441934	2025-07-19 02:19:34.441934	6282332315491
199	2	CAHAYA CELL	MADIUN	MADIUN	https://maps.app.goo.gl/6Fcy8GG4mQoXTxVT7	t	2025-07-19 02:19:34.654263	2025-07-19 02:19:34.654263	628983718086
200	2	TOKO SINAR	SAWAHAN	MADIUN	https://maps.app.goo.gl/8Zkmp22dJTopdY5Z9	t	2025-07-19 02:19:34.806546	2025-07-19 02:19:34.806546	6281217773818
201	2	TOKO SUBULUSSALAM	MANGUHARJO	MADIUN	https://maps.app.goo.gl/vvJLuohJ2KAHGyMVA	t	2025-07-19 02:19:34.958804	2025-07-19 02:19:34.958804	6285732755150
202	2	TOKO KLIK PAY	TAMAN	MADIUN	https://maps.app.goo.gl/6NVJNNZb9K5ieaCy8	t	2025-07-19 02:19:35.11392	2025-07-19 02:19:35.11392	6282330554444
203	2	TOKO  PLANET DATA	JIWAN	MADIUN	https://maps.app.goo.gl/4tbfvdU9ASZLjGZW6	t	2025-07-19 02:19:35.264289	2025-07-19 02:19:35.264289	6283866615777
204	2	WALMART	SAWAHAN	MADIUN	https://maps.app.goo.gl/DRhKDr9AZQSbde1M8	t	2025-07-19 02:19:35.411943	2025-07-19 02:19:35.411943	6285732131983
205	2	HELLO SKIN	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/PrpTCwriNVz1kXv16	t	2025-07-19 02:19:35.57059	2025-07-19 02:19:35.57059	6281338610751
206	2	RYAN CELL	MADIUN	MADIUN	https://maps.app.goo.gl/q86yVsMYEnvSJbKUA	t	2025-07-19 02:19:35.723936	2025-07-19 02:19:35.723936	6285748835758
207	2	MULIA ABADI	SAWAHAN	MADIUN	https://maps.app.goo.gl/P416jPoSaFPrYvqJA	t	2025-07-19 02:19:35.874313	2025-07-19 02:19:35.874313	6281270420840
208	2	TOKO BU SITI	SAWAHAN	MADIUN	https://maps.app.goo.gl/tkmrDi4uea8tremf9	t	2025-07-19 02:19:36.029269	2025-07-19 02:19:36.029269	6285812383312
209	2	TOKO SUKSES	SAWAHAN	MADIUN	https://maps.app.goo.gl/tFC7Yt57XTse3PFx6	t	2025-07-19 02:19:36.182021	2025-07-19 02:19:36.182021	6289654769597
210	2	CANTIQUE BY NADIA	SAWAHAN	MADIUN	https://maps.app.goo.gl/qvzx2fV2FWZhYMdH8	t	2025-07-19 02:19:36.33292	2025-07-19 02:19:36.33292	6285708570212
211	2	TOKO YUDISTIRA	SAWAHAN	MADIUN	https://maps.app.goo.gl/GHH814NGWeadfbkM7	t	2025-07-19 02:19:36.510957	2025-07-19 02:19:36.510957	6285607772888
212	2	TOKO ZAHRA	SAWAHAN	MADIUN	https://maps.app.goo.gl/xTcPo7hnhbM2tzao8	t	2025-07-19 02:19:36.660272	2025-07-19 02:19:36.660272	6285230566380
213	2	TOKO ARINA	SAWAHAN	MADIUN	https://maps.app.goo.gl/2mvTkQ38Mr6BC4Sa7	t	2025-07-19 02:19:36.804857	2025-07-19 02:19:36.804857	6282333456669
214	2	TOKO JAYA MURAH 2	JIWAN	MADIUN	https://maps.app.goo.gl/1oy1XSTUhoC8wrsy5	t	2025-07-19 02:19:36.969691	2025-07-19 02:19:36.969691	6285708755953
215	2	TOKO BU LULUK	JIWAN	MADIUN	https://maps.app.goo.gl/gLuTBpJJv1vtJ4NKA	t	2025-07-19 02:19:37.114136	2025-07-19 02:19:37.114136	6285791418981
216	2	TOKO BAROKAH	MANGUHARJO	MADIUN	https://maps.app.goo.gl/CAmtCqHnLd4fgnyEA	t	2025-07-19 02:19:37.267206	2025-07-19 02:19:37.267206	6282142106294
217	2	TOKO JAYA MURAH 1	SAWAHAN	MADIUN	https://maps.app.goo.gl/xUPL8fq4RTUMi43U8	t	2025-07-19 02:19:37.420835	2025-07-19 02:19:37.420835	6285708755953
218	2	GENTONG CELL 2	BALEREJO	MADIUN	https://maps.app.goo.gl/ow2rYL49qEgHCbGT9	t	2025-07-19 02:19:37.583207	2025-07-19 02:19:37.583207	6285733388883
219	2	TOKO KAROMAH	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/jhSz9MNeTbkiYT1F9	t	2025-07-19 02:19:37.734889	2025-07-19 02:19:37.734889	6285749159127
220	2	HELLO PHONE	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/gTAgKsvsfpjTKDyb8	t	2025-07-19 02:19:37.886175	2025-07-19 02:19:37.886175	6285852852055
221	2	PIRAMYD BRILINK	BALEREJO	MADIUN	https://maps.app.goo.gl/CbQhVVi816y1PLro9	t	2025-07-19 02:19:38.041846	2025-07-19 02:19:38.041846	62895395999995
222	2	SABILA MART	SAWAHAN	MADIUN	https://maps.app.goo.gl/EiZ6YCnGebwFzymo6	t	2025-07-19 02:19:38.18704	2025-07-19 02:19:38.18704	6281945483475
223	2	TOKO ASI	KARTOHARJO	MADIUN	https://maps.app.goo.gl/Bd4QtuyodVQC11gg7	t	2025-07-19 02:19:38.329996	2025-07-19 02:19:38.329996	6285736533995
224	2	SRC SRI	JIWAN	MADIUN	https://maps.app.goo.gl/Npdqax77FDcjn6oW8	t	2025-07-19 02:19:38.482879	2025-07-19 02:19:38.482879	6285736386536
225	2	TOKO MUTIARA	KARTOHARJO	MADIUN	https://maps.app.goo.gl/efsKBPJ12LAt3R6G8	t	2025-07-19 02:19:38.636284	2025-07-19 02:19:38.636284	6289634010653
226	2	TOKO KUSUMA	KARTOHARJO	MADIUN	https://maps.app.goo.gl/PzwVJU1GNmfcSGK27	t	2025-07-19 02:19:38.79059	2025-07-19 02:19:38.79059	6287848556655
227	2	SEVEN SHOP	MADIUN	MADIUN	https://maps.app.goo.gl/4akc4bTcbWr8D5bG7	t	2025-07-19 02:19:38.938238	2025-07-19 02:19:38.938238	6281235244236
228	2	TOKO ABIMANYU	SAWAHAN	MADIUN	https://maps.app.goo.gl/HCNheRaZuF8Yrxaf8	t	2025-07-19 02:19:39.082804	2025-07-19 02:19:39.082804	6281335083618
229	2	TOKO SS	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/x8HL7aVwBjT4Sjfp6	t	2025-07-19 02:19:39.230476	2025-07-19 02:19:39.230476	6285755427544
230	2	POST PHONE	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/M8X2vnaQBA9zmFoGA	t	2025-07-19 02:19:39.421235	2025-07-19 02:19:39.421235	6285648520799
231	2	VANILLA SHOP	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/cB9yubAYmjJy7KaG7	t	2025-07-19 02:19:39.56475	2025-07-19 02:19:39.56475	6285646545657
232	2	TOKO SANEA	SARADAN	MADIUN	https://maps.app.goo.gl/nM8A6joQUHjqnjsq6	t	2025-07-19 02:19:39.710115	2025-07-19 02:19:39.710115	6285816571270
233	2	PILANG JAYA MAS	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/JzxLMAzP6FZwEQVS7	t	2025-07-19 02:19:39.866053	2025-07-19 02:19:39.866053	6285733372527
234	2	TOKO KJM	WONOASRI	MADIUN	https://maps.app.goo.gl/gYy4fZ92GVL5YeTG7	t	2025-07-19 02:19:40.031243	2025-07-19 02:19:40.031243	6281217717624
235	2	APOTEK KONDANG WARAS	SAWAHAN	MADIUN	https://maps.app.goo.gl/LTsSB2ZFhKVGRvWu5	t	2025-07-19 02:19:40.18123	2025-07-19 02:19:40.18123	6285815973513
236	2	TOKO CAHAYA	GEGER	MADIUN	https://maps.app.goo.gl/6XTsWuS14C27cZrr9	t	2025-07-19 02:19:40.334549	2025-07-19 02:19:40.334549	6281231399566
237	2	TOKO FLAMBOYAN	TAMAN	MADIUN	https://maps.app.goo.gl/SMqcJr2r4Gz5BBcv9	t	2025-07-19 02:19:40.488761	2025-07-19 02:19:40.488761	6281234918477
238	2	TOKO JAWA	MADIUN	MADIUN	https://maps.app.goo.gl/VrGdrTz2ARV1mDxT9	t	2025-07-19 02:19:40.640903	2025-07-19 02:19:40.640903	628563636353
239	2	TOKO WAHID	MEJAYAN	MADIUN	https://maps.app.goo.gl/eVsvyak3rnLMBJ6v8	t	2025-07-19 02:19:40.794287	2025-07-19 02:19:40.794287	6285233515887
240	2	TOKO FAZZA	MEJAYAN	MADIUN	https://maps.app.goo.gl/58PjJdcjpEWsJv3Y7	t	2025-07-19 02:19:40.942424	2025-07-19 02:19:40.942424	6285732812386
241	2	TOKO AL FAYYIN	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/nTU5MReqAMPDgdJr9	t	2025-07-19 02:19:41.092272	2025-07-19 02:19:41.092272	6281335413855
242	2	TOKO RIDHAN	BALEREJO	MADIUN	https://maps.app.goo.gl/V8pq7MyHrkxUdg7T9	t	2025-07-19 02:19:41.244346	2025-07-19 02:19:41.244346	6285235406970
243	2	TOKO BU SUTINI	SAWAHAN	MADIUN	https://maps.app.goo.gl/zrXscLpMraSNZLyq9	t	2025-07-19 02:19:41.392746	2025-07-19 02:19:41.392746	6281335343307
244	2	TOKO MAKMUR	SAWAHAN	MADIUN	https://maps.app.goo.gl/v5HgBMB7KeQweDUBA	t	2025-07-19 02:19:41.542028	2025-07-19 02:19:41.542028	6285708039800
245	2	MAESTRO CELL	BALEREJO	MADIUN	https://maps.app.goo.gl/1tJh3qdxJ9GH3g9s6	t	2025-07-19 02:19:41.688542	2025-07-19 02:19:41.688542	6285735025222
246	2	SRC RUVI	SAWAHAN	MADIUN	https://maps.app.goo.gl/w1HGZmBrBbskLEj27	t	2025-07-19 02:19:41.83539	2025-07-19 02:19:41.83539	6281230058882
247	2	APOTEK PARAMA	SAWAHAN	MADIUN	https://maps.app.goo.gl/fFFz7WfiSiWKDcQe8	t	2025-07-19 02:19:41.99345	2025-07-19 02:19:41.99345	6287865684964
248	2	TOKO RIDA	SAWAHAN	MADIUN	https://maps.app.goo.gl/T6PKEmSA68WtS8Pf8	t	2025-07-19 02:19:42.158709	2025-07-19 02:19:42.158709	62895399194366
249	2	DIVA MART	KARTOHARJO	MADIUN	https://maps.app.goo.gl/dMnoUJMZnHv2UZrb7	t	2025-07-19 02:19:42.315852	2025-07-19 02:19:42.315852	6281330404646
250	2	GRIYA KOSMETIK	TAMAN	MADIUN	https://maps.app.goo.gl/W9zRrPiHkp7VtV1e9	t	2025-07-19 02:19:42.468362	2025-07-19 02:19:42.468362	62881036026086
251	2	TOKO POWER	TAMAN	MADIUN	https://maps.app.goo.gl/KneDvXA8kdQwn6w76	t	2025-07-19 02:19:42.625455	2025-07-19 02:19:42.625455	62895367053634
252	2	HALTE PHONR	BALEREJO	MADIUN	https://maps.app.goo.gl/fGFnE1MBHNWNkiDq8	t	2025-07-19 02:19:42.781202	2025-07-19 02:19:42.781202	6282139722469
253	2	SALON TIWI	SARADAN	MADIUN	https://maps.app.goo.gl/chW9gvUz9iMUU7p49	t	2025-07-19 02:19:42.939378	2025-07-19 02:19:42.939378	6281234022541
254	2	TOKO AL FATHAN	SARADAN	MADIUN	https://maps.app.goo.gl/oYbLo6VXTjkGSS3M8	t	2025-07-19 02:19:43.092593	2025-07-19 02:19:43.092593	6282333230218
255	2	TOKO  NAJWA	SARADAN	MADIUN	https://maps.app.goo.gl/P6HXhhHbsPjkbddz5	t	2025-07-19 02:19:43.247907	2025-07-19 02:19:43.247907	6287705554777
256	2	TOKO ARZZERI	SARADAN	MADIUN	https://maps.app.goo.gl/bJJLkivceSoXebX3A	t	2025-07-19 02:19:43.412137	2025-07-19 02:19:43.412137	6287874558800
257	2	KIOS DATA CELL	MADIUN	MADIUN	https://maps.app.goo.gl/mayoi9ReaqDH7KUC6	t	2025-07-19 02:19:43.559985	2025-07-19 02:19:43.559985	6285748228500
258	2	TOKO BAIM	JIWAN	MADIUN	https://maps.app.goo.gl/4xkLfseuwzvwhZcz9	t	2025-07-19 02:19:43.720999	2025-07-19 02:19:43.720999	6281210075095
259	2	TOKO DANDY	TAMAN	MADIUN	https://maps.app.goo.gl/b6wVMy5YsLStxUrH9	t	2025-07-19 02:19:43.901205	2025-07-19 02:19:43.901205	6285736251299
260	2	TOKO AURORA	SARADAN	MADIUN	https://maps.app.goo.gl/VNMfTbWSnVgg8awQ7	t	2025-07-19 02:19:44.057334	2025-07-19 02:19:44.057334	6282142932417
261	2	TOKO HAWA	SARADAN	MADIUN	https://maps.app.goo.gl/9dNqAr2ZJAP7e8ab9	t	2025-07-19 02:19:44.21659	2025-07-19 02:19:44.21659	6285248153452
262	2	TOKO WAWAN	SARADAN	MADIUN	https://maps.app.goo.gl/Xrzvucxqie6M2djN7	t	2025-07-19 02:19:44.434927	2025-07-19 02:19:44.434927	6281334007082
263	2	BUMDES KENONGO REJO	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/ubyZ1ReT2216GYyq5	t	2025-07-19 02:19:44.604161	2025-07-19 02:19:44.604161	6283845731855
264	2	TOKO ANURGAH	MADIUN	MADIUN	https://maps.app.goo.gl/TPrCcs2V4ujWDaBv6	t	2025-07-19 02:19:44.784461	2025-07-19 02:19:44.784461	6285235658577
265	2	TOKO EDDY	BARAT	MADIUN	https://maps.app.goo.gl/KBEdyzEhwsdFmkBq6	t	2025-07-19 02:19:44.948312	2025-07-19 02:19:44.948312	6281226595411
266	2	RETHA SKIN CARE	KARTOHARJO	MADIUN	https://maps.app.goo.gl/TyUmAVzbPqJKJ37m9	t	2025-07-19 02:19:45.113969	2025-07-19 02:19:45.113969	6285933071171
267	2	TOKO BU PREH	SAWAHAN	MADIUN	https://maps.app.goo.gl/tq9JWecxA44FdKhs5	t	2025-07-19 02:19:45.273548	2025-07-19 02:19:45.273548	6285784865637
268	2	FLOWER ACCESORIS	MADIUN	MADIUN	https://maps.app.goo.gl/eJyMPi4rr9uUsbpG8	t	2025-07-19 02:19:45.430653	2025-07-19 02:19:45.430653	628125963163
269	2	VERO LIA	MEJAYAN	MADIUN	https://maps.app.goo.gl/FddgXVZgiPMHwSmJ9	t	2025-07-19 02:19:45.587356	2025-07-19 02:19:45.587356	6282245160500
270	2	AI HANNA	MEJAYAN	MADIUN	https://maps.app.goo.gl/wSDFWAfBqejShN4LA	t	2025-07-19 02:19:45.752593	2025-07-19 02:19:45.752593	6287856915666
271	2	TOKO PERTAMA	JIWAN	MADIUN	https://maps.app.goo.gl/2r9iPboJxitAQSGW8	t	2025-07-19 02:19:45.933251	2025-07-19 02:19:45.933251	6281230804416
272	2	ARINDA CELL	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/kVDkBGrLnaSZKvfo9	t	2025-07-19 02:19:46.101925	2025-07-19 02:19:46.101925	6285707959978
273	2	BERKAH MART	WUNGU	MADIUN	https://maps.app.goo.gl/RNvCdE7EPBQmeKK78	t	2025-07-19 02:19:46.257216	2025-07-19 02:19:46.257216	6281217118807
274	2	TOKO BU NUR	WUNGU	MADIUN	https://maps.app.goo.gl/pQTKFebFpiTtTbyXA	t	2025-07-19 02:19:46.422659	2025-07-19 02:19:46.422659	6289620991711
275	2	BU KATIMIN	GEGER	MADIUN	https://maps.app.goo.gl/cGGvN4xMxchKe7FV9	t	2025-07-19 02:19:46.614058	2025-07-19 02:19:46.614058	6282143897470
276	2	TOKO ALIANDURO 2	BANJAREJO	MADIUN	https://maps.app.goo.gl/zfWzfZbfXqihQgJT9	t	2025-07-19 02:19:46.778804	2025-07-19 02:19:46.778804	6281927409899
277	2	G STORE	TAMAN	MADIUN	https://maps.app.goo.gl/CsbtmopTdKkCFPPo9	t	2025-07-19 02:19:46.952884	2025-07-19 02:19:46.952884	6285736548797
278	2	SRC DWI	MANGUHARJO	MADIUN	https://maps.app.goo.gl/LAAAodMSU2AD5e4n6	t	2025-07-19 02:19:47.115885	2025-07-19 02:19:47.115885	6281913079229
279	2	TOKO KORMISEM	JIWAN	MADIUN	https://maps.app.goo.gl/fWMMFpijXUBQ22JL9	t	2025-07-19 02:19:47.277476	2025-07-19 02:19:47.277476	6287885263550
280	2	TOKO RUBUNG	WUNGU	MADIUN	https://maps.app.goo.gl/AQJknJXTax8n1TeL7	t	2025-07-19 02:19:47.447865	2025-07-19 02:19:47.447865	6285648466427
281	2	BENGGOL JAYA	JASENAN	MADIUN	https://maps.app.goo.gl/nKN1WH2vhC7RoZaE8	t	2025-07-19 02:19:47.599254	2025-07-19 02:19:47.599254	6285730079827
282	2	TOKO TOTOK	KARTOHARJO	MADIUN	https://maps.app.goo.gl/uaKkLBwi92xs8mNQ8	t	2025-07-19 02:19:47.760203	2025-07-19 02:19:47.760203	6289571061060
283	2	AZIA MART	SAWAHAN	MADIUN	https://maps.app.goo.gl/3hbcSQygErCrhLgs8	t	2025-07-19 02:19:47.921005	2025-07-19 02:19:47.921005	6281808128834
284	2	LANCAR BAROKAH	SAWAHAN	MADIUN	https://maps.app.goo.gl/mwqaFZvSC9mGEzfU7	t	2025-07-19 02:19:48.086489	2025-07-19 02:19:48.086489	6281245472131
285	2	IKI LO SMEBAKO	SAWAHAN	MADIUN	https://maps.app.goo.gl/oafkPXBdGD7yTqRo6	t	2025-07-19 02:19:48.247124	2025-07-19 02:19:48.247124	6281456144557
286	2	LARAIA SHOP	SAWAHAN	MADIUN	https://maps.app.goo.gl/wZkJETajwkRvabW56	t	2025-07-19 02:19:48.405396	2025-07-19 02:19:48.405396	62895370017755
287	2	EDWI.ID 2	DAGANGAN	MADIUN	https://maps.app.goo.gl/6Poe17t54csB1WBv8	t	2025-07-19 02:19:48.569422	2025-07-19 02:19:48.569422	6283832636959
288	2	ON MART	MANGUHARJO	MADIUN	https://maps.app.goo.gl/6RSe7wyFW9i1s72V7	t	2025-07-19 02:19:48.729304	2025-07-19 02:19:48.729304	6281334334425
289	2	TOKO BERKAH MERDEKA	DAGANGAN	MADIUN	https://maps.app.goo.gl/RdeqE1LHDcYJEiEi9	t	2025-07-19 02:19:48.88851	2025-07-19 02:19:48.88851	6285649104530
290	2	TOKO BU PAINI	GEGER	MADIUN	https://maps.app.goo.gl/LKS9TvHhuDRBr5wA9	t	2025-07-19 02:19:49.04079	2025-07-19 02:19:49.04079	\N
291	2	TOKO RERE	DAGANGAN	MADIUN	https://maps.app.goo.gl/bbMH8gTScdoEe1xGA	t	2025-07-19 02:19:49.20533	2025-07-19 02:19:49.20533	6281333690175
292	2	TOKO MADURA	GEGER	MADIUN	https://maps.app.goo.gl/tK8nbmfvCNFZbj5FA	t	2025-07-19 02:19:49.375844	2025-07-19 02:19:49.375844	6282114279599
293	2	TOKO MARGO	DAGANGAN	MADIUN	https://maps.app.goo.gl/KmvbzyHvKo9PacZD6	t	2025-07-19 02:19:49.536701	2025-07-19 02:19:49.536701	6289610931880
294	2	MM MULIA	DAGANGAN	MADIUN	https://maps.app.goo.gl/Tf3GaMeJ6SHSLmH37	t	2025-07-19 02:19:49.70439	2025-07-19 02:19:49.70439	6287818010322
295	2	TOKO BAYU	DAGANGAN	MADIUN	https://maps.app.goo.gl/dMrHus1u9z5rfvVr5	t	2025-07-19 02:19:49.876755	2025-07-19 02:19:49.876755	628586025439
296	2	TOKO MAHARANI	WUNGU	MADIUN	https://maps.app.goo.gl/41poq2gXEccz5Nun8	t	2025-07-19 02:19:50.062864	2025-07-19 02:19:50.062864	6283853718501
297	2	DESI CELL	WUNGU	MADIUN	https://maps.app.goo.gl/G6jTmQzqrKfBW7uCA	t	2025-07-19 02:19:50.232879	2025-07-19 02:19:50.232879	6285840981277
298	2	TOKO TUTIK BERKAH	KARTOHARJO	MADIUN	https://maps.app.goo.gl/whE6u1bquVCyFS1B8	t	2025-07-19 02:19:50.395803	2025-07-19 02:19:50.395803	\N
299	2	ROSE MART	WUNGU	MADIUN	https://maps.app.goo.gl/gir2xZyn1Mf35dEbA	t	2025-07-19 02:19:50.553959	2025-07-19 02:19:50.553959	6281231889268
300	2	TOKO AMANDA	KARTOHARJO	MADIUN	https://maps.app.goo.gl/KfjBDGwqSsFh31SD9	t	2025-07-19 02:19:50.72365	2025-07-19 02:19:50.72365	6289685552288
301	2	TK BINTANG TERANG	KARTOHARJO	MADIUN	https://maps.app.goo.gl/qKjnz99MRdSHY4eX6	t	2025-07-19 02:19:50.883042	2025-07-19 02:19:50.883042	6285172005677
302	2	TOKO ALIANDURO	TAMAN	MADIUN	https://maps.app.goo.gl/sVUy2b2rgta1wGuD7	t	2025-07-19 02:19:51.039235	2025-07-19 02:19:51.039235	6287784529803
303	2	RIDHO CELL	DAGANGAN	MADIUN	https://maps.app.goo.gl/LLEkAh4xpppb3mPN8	t	2025-07-19 02:19:51.251856	2025-07-19 02:19:51.251856	6281359128262
304	2	TOKO PERMATA	DAGANGAN	MADIUN	https://maps.app.goo.gl/xUdzn9TATYkuH3uc9	t	2025-07-19 02:19:51.461667	2025-07-19 02:19:51.461667	6285232648335
305	2	PAGOTAN MART	GEGER	MADIUN	https://maps.app.goo.gl/5Y8fEkrPdUi94HkH7	t	2025-07-19 02:19:51.696664	2025-07-19 02:19:51.696664	6287717926963
306	2	MAHDA CELL	DAGANGAN	MADIUN	https://maps.app.goo.gl/sYan5rZYxNcgE42N8	t	2025-07-19 02:19:51.93396	2025-07-19 02:19:51.93396	628125944649
307	2	DEWI SKINCARE	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/aAddLqLxkx6K4EkB7	t	2025-07-19 02:19:52.096516	2025-07-19 02:19:52.096516	6287805809393
308	2	TOKO NARTI	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/8egHoyWwGkq2VrMz5	t	2025-07-19 02:19:52.264992	2025-07-19 02:19:52.264992	6282333456669
309	2	TOKO CAHAYA	DAGANGAN	MADIUN	https://maps.app.goo.gl/687mbrm6Hc5hhVc28	t	2025-07-19 02:19:52.42249	2025-07-19 02:19:52.42249	6285107920069
310	2	TOKO AKBAR	WUNGU	MADIUN	https://maps.app.goo.gl/JkMes5Gwwiy2GdoCA	t	2025-07-19 02:19:52.579123	2025-07-19 02:19:52.579123	6285829466573
311	2	TOKO BU SUNASIH	JIWAN	MADIUN	https://maps.app.goo.gl/UU568w6o1QhjdpSMA	t	2025-07-19 02:19:52.738493	2025-07-19 02:19:52.738493	\N
312	2	TOKO BU SETO	JIWAN	MADIUN	https://maps.app.goo.gl/FEzrtCgGbU4rh9xX7	t	2025-07-19 02:19:52.919431	2025-07-19 02:19:52.919431	\N
313	2	TOKO MBAK YAH	JIWAN	MADIUN	https://maps.app.goo.gl/hXnVY6vBYUfZUD9U6	t	2025-07-19 02:19:53.141603	2025-07-19 02:19:53.141603	6281514073076
314	2	TOKO IYAN RARA	JIWAN	MADIUN	https://maps.app.goo.gl/duiGNofH6T2jdY5p6	t	2025-07-19 02:19:53.318693	2025-07-19 02:19:53.318693	6285706617393
315	2	TOKO BU ANNA	JIWAN	MADIUN	https://maps.app.goo.gl/GbtUvVVT4bAHN7G57	t	2025-07-19 02:19:53.483277	2025-07-19 02:19:53.483277	6285855435377
316	2	TOKO DHE HAR	JIWAN	MADIUN	https://maps.app.goo.gl/6T6Xfp5GUvMHJeV38	t	2025-07-19 02:19:53.645404	2025-07-19 02:19:53.645404	6285100936081
317	2	SRC MUJIANTO	JIWAN	MADIUN	https://maps.app.goo.gl/VnuDATJPBURbqBKn8	t	2025-07-19 02:19:53.806537	2025-07-19 02:19:53.806537	6285791777922
318	2	TOKO BU TUTIK	JIWAN	MADIUN	https://maps.app.goo.gl/eJMC5RcYyWTtB4VN6	t	2025-07-19 02:19:53.965832	2025-07-19 02:19:53.965832	6281335988747
319	2	SRC BUNDA	JIWAN	MADIUN	https://maps.app.goo.gl/UpqXVRPA5X9NsgeK6	t	2025-07-19 02:19:54.134215	2025-07-19 02:19:54.134215	6282132233600
320	2	TOKO REVA	JIWAN	MADIUN	https://maps.app.goo.gl/F1L5hPLo9ksnZHFaA	t	2025-07-19 02:19:54.301506	2025-07-19 02:19:54.301506	6281252821152
321	2	ELBA BARU	JIWAN	MADIUN	https://maps.app.goo.gl/FXXecYkk6aMoAzNf9	t	2025-07-19 02:19:54.464168	2025-07-19 02:19:54.464168	628563663566
322	2	TOKO BU TINI\\SENDANG	JIWAN	MADIUN	https://maps.app.goo.gl/5yBbnB1GqNhvt8dN7	t	2025-07-19 02:19:54.623948	2025-07-19 02:19:54.623948	6287873736255
323	2	SYIFA COLLECTION	JIWAN	MADIUN	https://maps.app.goo.gl/568AZccGMe5qC1MJ7	t	2025-07-19 02:19:54.796964	2025-07-19 02:19:54.796964	6285749358703
324	2	TOK BU WITO	JIWAN	MADIUN	https://maps.app.goo.gl/fgafaqNVdc9bHLRDA	t	2025-07-19 02:19:54.973832	2025-07-19 02:19:54.973832	6285235157829
325	2	SRC KARUNIA ZIVA	JIWAN	MADIUN	https://maps.app.goo.gl/VsKer9q349WtzEXa7	t	2025-07-19 02:19:55.144334	2025-07-19 02:19:55.144334	6285715322635
326	2	KUD TANI JAYA	JIWAN	MADIUN	https://maps.app.goo.gl/1TAER9gX8sujjrw48	t	2025-07-19 02:19:55.305926	2025-07-19 02:19:55.305926	6285739137057
327	2	TOKO ABI SYIFA	JIWAN	MADIUN	https://maps.app.goo.gl/qtNAPpv3w6BGJMFB6	t	2025-07-19 02:19:55.468612	2025-07-19 02:19:55.468612	6285784257789
328	2	RK BERKAH	JIWAN	MADIUN	https://maps.app.goo.gl/Z7oYgv45cdXBXaJX8	t	2025-07-19 02:19:55.628435	2025-07-19 02:19:55.628435	6281233466087
329	2	TOKO GENTA	JIWAN	MADIUN	https://maps.app.goo.gl/Sa1CmrAyAdJArBys6	t	2025-07-19 02:19:55.795932	2025-07-19 02:19:55.795932	6281249663328
330	2	LARAIA SHOP	TAMAN	MADIUN	https://maps.app.goo.gl/U5Dq2MNczSTJRukr5	t	2025-07-19 02:19:55.975725	2025-07-19 02:19:55.975725	62859193755010
331	2	DWI CELL	WONOASRI	MADIUN	https://maps.app.goo.gl/R3yPmBANHA1qU98r7	t	2025-07-19 02:19:56.133256	2025-07-19 02:19:56.133256	628195671231
332	2	DAVID CELL	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/GWhbQ32qHMfRsriJ7	t	2025-07-19 02:19:56.295155	2025-07-19 02:19:56.295155	6285736822613
333	2	MULTI CELL	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/e2XW4H5eQRRNftyL9	t	2025-07-19 02:19:56.555671	2025-07-19 02:19:56.555671	6287858288809
334	2	FOTOKOPI ANUGRAH	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/Cvqb4ELpayzA1X4NA	t	2025-07-19 02:19:56.764801	2025-07-19 02:19:56.764801	6282234672840
335	2	GRIYA PONSEL	PILANGKENCENG	MADIUN	https://maps.app.goo.gl/Cvqb4ELpayzA1X4NA	t	2025-07-19 02:19:56.965751	2025-07-19 02:19:56.965751	6282142762244
336	2	SUBULUSSALAM	MANGUHARJO	MADIUN	https://maps.app.goo.gl/Ssiz7gLKQfvWWN9EA	t	2025-07-19 02:19:57.197627	2025-07-19 02:19:57.197627	6285124252603
337	2	3M CELL	SAWAHAN	MADIUN	https://maps.app.goo.gl/pj3Bv9duXB88NG4Y7	t	2025-07-19 02:19:57.415467	2025-07-19 02:19:57.415467	6283866949466
338	2	BERLIAN MART	NGAWI	NGAWI	https://maps.app.goo.gl/Rbiv5svZPfvn5rP48	t	2025-07-19 02:19:57.604454	2025-07-19 02:19:57.604454	6285607376485
339	2	ANISA MART	NGAWI	NGAWI	https://maps.app.goo.gl/RHrUWtTxiwpyJuip6	t	2025-07-19 02:19:57.818104	2025-07-19 02:19:57.818104	6281615965350
340	2	GRIYA AYU	GERIH	NGAWI	https://maps.app.goo.gl/n18bVJ3swMD5gBFx9	t	2025-07-19 02:19:58.003383	2025-07-19 02:19:58.003383	6285233781297
341	2	SRC MENTARI	GENENG	NGAWI	https://maps.app.goo.gl/9E6x2eGV8o7FcVjb6	t	2025-07-19 02:19:58.248648	2025-07-19 02:19:58.248648	6285855032982
342	2	SAFA MART	GENENG	NGAWI	https://maps.app.goo.gl/Ye6gs3wBkEMPuXxv8	t	2025-07-19 02:19:58.444955	2025-07-19 02:19:58.444955	6281249409945
343	2	TOKO ANA	GENENG	NGAWI	https://maps.app.goo.gl/FTVRYbuh5HcqhiSg7	t	2025-07-19 02:19:58.639658	2025-07-19 02:19:58.639658	6285103813941
344	2	AJ MART	GERIH	NGAWI	https://maps.app.goo.gl/eQy6QeN1QbYjUpQ29	t	2025-07-19 02:19:58.86207	2025-07-19 02:19:58.86207	6281330888773
345	2	NGAWI MART	NGAWI	NGAWI	https://maps.app.goo.gl/KaWebZ52q9C52uGc7	t	2025-07-19 02:19:59.069393	2025-07-19 02:19:59.069393	6285655388197
346	2	TOKO CAHAYA	NGAWI	NGAWI	https://maps.app.goo.gl/87cyqwTYnfQMjchB6	t	2025-07-19 02:19:59.263613	2025-07-19 02:19:59.263613	628579534709
347	2	TOKO HIDAYAT	KARAS	MAGETAN	https://maps.app.goo.gl/fV6nXLMEyiEVsG9n6	t	2025-07-19 02:19:59.460222	2025-07-19 02:19:59.460222	6285330352332
348	2	TOKO MELATI	GERIH	NGAWI	https://maps.app.goo.gl/ppZ9LqUagcBT1hRv5	t	2025-07-19 02:19:59.63963	2025-07-19 02:19:59.63963	6285233043036
349	2	TOKO LUMINTU	KARTOHARJO	MAGETAN	https://maps.app.goo.gl/ghbBiFCTPvnTMMKs6	t	2025-07-19 02:19:59.827709	2025-07-19 02:19:59.827709	6282331276610
350	2	TOKO BU YASIH	KARTOHARJO	MAGETAN	https://maps.app.goo.gl/Uwv1REJBkFv1QZ5FA	t	2025-07-19 02:20:00.002866	2025-07-19 02:20:00.002866	6285852222815
351	2	TOKO RATNA	KARTOHARJO	MAGETAN	https://maps.app.goo.gl/vnZL8Cbog9KvqLEE9	t	2025-07-19 02:20:00.194897	2025-07-19 02:20:00.194897	628566666834
352	2	TOKO RIZKY	KARTOHARJO	MAGETAN	https://maps.app.goo.gl/sZC8SXS2XDLxEx6v6	t	2025-07-19 02:20:00.372098	2025-07-19 02:20:00.372098	\N
353	2	TOKO CAHAYA	KARANGREJO	MAGETAN	https://maps.app.goo.gl/rC1AUrSPjD8dj86A7	t	2025-07-19 02:20:00.549285	2025-07-19 02:20:00.549285	6282232836892
354	2	AL KAFI MART	KARANGREJO	MAGETAN	https://maps.app.goo.gl/vrMxwcQjAycR25K6A	t	2025-07-19 02:20:00.730438	2025-07-19 02:20:00.730438	6281515723564
355	2	BIMA MART	KARAS	MAGETAN	https://maps.app.goo.gl/XUfMgxwCrWBgm3nZ8	t	2025-07-19 02:20:00.912566	2025-07-19 02:20:00.912566	6282331749715
356	2	TOKO AUFAL	TEMBORO	MAGETAN	https://maps.app.goo.gl/XMUvsUhwq4n7ascY6	t	2025-07-19 02:20:01.094947	2025-07-19 02:20:01.094947	6282234843888
357	2	TOKO AL BADAR	TEMBORO	MAGETAN	https://maps.app.goo.gl/3uemXweF7g31XgDr8	t	2025-07-19 02:20:01.267276	2025-07-19 02:20:01.267276	6281245054078
358	2	TOKO RIDHO	TEMBORO	MAGETAN	https://maps.app.goo.gl/bQZwpyF8EW31BHVT9	t	2025-07-19 02:20:01.471051	2025-07-19 02:20:01.471051	6285608231695
359	2	TOKO BARU	KARAS	MAGETAN	https://maps.app.goo.gl/97kcfg3Zwko3ZABq7	t	2025-07-19 02:20:01.669095	2025-07-19 02:20:01.669095	6285746132730
360	2	KAISAR 999 KARAS	KARAS	MAGETAN	https://maps.app.goo.gl/ygvD7sjaJpXqY1bQA	t	2025-07-19 02:20:01.853545	2025-07-19 02:20:01.853545	6285732046254
361	2	ISTANA GROSIR	KARAS	MAGETAN	https://maps.app.goo.gl/MGmBfhGMjR7P7psU6	t	2025-07-19 02:20:02.04857	2025-07-19 02:20:02.04857	6282324953593
362	2	GRAHA JAYA GINUK	KARAS	MAGETAN	https://maps.app.goo.gl/MFnqAe8cS4aZUeP37	t	2025-07-19 02:20:02.496585	2025-07-19 02:20:02.496585	6285110436789
363	2	MORODADI MART	KARAS	MAGETAN	https://maps.app.goo.gl/SD2pk2YBGwe8SYbR8	t	2025-07-19 02:20:02.999902	2025-07-19 02:20:02.999902	6285336899311
364	2	SRC FANI	KARANGREJO	MAGETAN	https://maps.app.goo.gl/ksBBn1sXRYGajRc56	t	2025-07-19 02:20:03.190668	2025-07-19 02:20:03.190668	6283845433047
365	2	TONIKA MART	KARANGREJO	MAGETAN	https://maps.app.goo.gl/pN3SSmsYKj2XUH9W7	t	2025-07-19 02:20:03.386206	2025-07-19 02:20:03.386206	6285954432473
366	2	AL MAHYRA MART	KARTOHARJO	MAGETAN	https://maps.app.goo.gl/KVEkGdQwTDkP6D5Y7	t	2025-07-19 02:20:03.609065	2025-07-19 02:20:03.609065	6287770393799
367	2	BUNGA KOSMETIK	KARAS	MAGETAN	https://maps.app.goo.gl/tuNvdGdSf7xgT9Vi8	t	2025-07-19 02:20:03.814188	2025-07-19 02:20:03.814188	\N
368	2	QOLBY MART	KARAS	MAGETAN	https://maps.app.goo.gl/EmqtFCqXSrTKnTpy7	t	2025-07-19 02:20:04.022851	2025-07-19 02:20:04.022851	6282132810422
369	2	TOKO LARIS	KASREMAN	MAGETAN	https://maps.app.goo.gl/DP1Prd9VAvpMEVCW7	t	2025-07-19 02:20:04.376131	2025-07-19 02:20:04.376131	6282140095569
370	2	RIZKA SKINCARE	TEMBORO	MAGETAN	https://maps.app.goo.gl/12Zqv5cwrafvBHtd6	t	2025-07-19 02:20:04.57821	2025-07-19 02:20:04.57821	6285790779445
371	2	TOKO YANI	NGAWI	NGAWI	https://maps.app.goo.gl/LDB7jkcc3Nt78V2a7	t	2025-07-19 02:20:04.76511	2025-07-19 02:20:04.76511	6282147956550
372	2	MATCHA BEAUTY KOSMETIK	NGAWI	NGAWI	https://maps.app.goo.gl/cEUPpmYb25z1xJkeA	t	2025-07-19 02:20:04.95557	2025-07-19 02:20:04.95557	6281333699946
373	2	TOKO AT TALLAH	NGAWI	NGAWI	https://maps.app.goo.gl/1k7SuHvELasRDBZM7	t	2025-07-19 02:20:05.130483	2025-07-19 02:20:05.130483	6285735734542
374	2	SRC AYU	NGAWI	NGAWI	https://maps.app.goo.gl/8Pj45pwUjx69tvvr7	t	2025-07-19 02:20:05.326233	2025-07-19 02:20:05.326233	6287825024789
375	2	ABATI KOSMETIK	NGAWI	NGAWI	https://maps.app.goo.gl/YWPg1jCwoQ5tay8h7	t	2025-07-19 02:20:05.513444	2025-07-19 02:20:05.513444	6282264254025
376	2	ISYANA MART	NGAWI	NGAWI	https://maps.app.goo.gl/nLgrZiF1BMPPz8Ap7	t	2025-07-19 02:20:05.690451	2025-07-19 02:20:05.690451	6281130871001
377	2	MINIMARKET AMBAR	GENENG	NGAWI	https://maps.app.goo.gl/RN5qTzKPjaEL5mfs9	t	2025-07-19 02:20:05.866775	2025-07-19 02:20:05.866775	6281234074774
378	2	HENY MART 1	KENDAL	NGAWI	https://maps.app.goo.gl/sf3pdBPVXh54xbXPA	t	2025-07-19 02:20:06.052642	2025-07-19 02:20:06.052642	6285850959102
379	2	HENY MART 2	KENDAL	NGAWI	https://maps.app.goo.gl/ev844kP5keB3kDLR9	t	2025-07-19 02:20:06.23113	2025-07-19 02:20:06.23113	6285847704378
380	2	OLYN BEAUTY	KENDAL	NGAWI	https://maps.app.goo.gl/ixLKPkHSKyVaereVA	t	2025-07-19 02:20:06.422591	2025-07-19 02:20:06.422591	6283119577095
381	2	RATU SWALAYAN	KENDAL	NGAWI	https://maps.app.goo.gl/oorzpLhoxfYr99jP8	t	2025-07-19 02:20:06.596842	2025-07-19 02:20:06.596842	6285649021795
382	2	PODO MORO	KENDAL	NGAWI	https://maps.app.goo.gl/38ZcMDuBZNykPPd49	t	2025-07-19 02:20:06.795011	2025-07-19 02:20:06.795011	6285736214041
383	2	ZHEN MART	KENDAL	NGAWI	https://maps.app.goo.gl/9gCLAwggMcba76g7A	t	2025-07-19 02:20:06.989681	2025-07-19 02:20:06.989681	6285930411742
384	2	SRC SALWA	KENDAL	NGAWI	https://maps.app.goo.gl/cFweaKtjR4w1hKN99	t	2025-07-19 02:20:07.172427	2025-07-19 02:20:07.172427	6285707572596
385	2	AL AMMAR	KENDAL	NGAWI	https://maps.app.goo.gl/TybNtmKy3mNaGDJw8	t	2025-07-19 02:20:07.35451	2025-07-19 02:20:07.35451	628125929394
386	2	NAJMA STORE	KENDAL	NGAWI	https://maps.app.goo.gl/PsrPwZcABcNM1KeY7	t	2025-07-19 02:20:07.558932	2025-07-19 02:20:07.558932	6285648555037
387	2	LIA PERDANA	KENDAL	NGAWI	https://maps.app.goo.gl/DfmRHitk89tjN6pb6	t	2025-07-19 02:20:07.782306	2025-07-19 02:20:07.782306	6285735909121
388	2	AYANA MART	KENDAL	NGAWI	https://maps.app.goo.gl/21wjpoLekChk8dd29	t	2025-07-19 02:20:07.989703	2025-07-19 02:20:07.989703	6285733336442
389	2	ADITYA	KENDAL	NGAWI	https://maps.app.goo.gl/QuBaQZPe7zcEYHuW9	t	2025-07-19 02:20:08.187349	2025-07-19 02:20:08.187349	6285856822933
390	2	SRC PUTRA PRATAMA	KENDAL	NGAWI	https://maps.app.goo.gl/DwyGwvWYR7bw71fP9	t	2025-07-19 02:20:08.428535	2025-07-19 02:20:08.428535	6281379445841
391	2	RIEZA FOTOCOPY	KENDAL	NGAWI	https://maps.app.goo.gl/6b9x2XspZBKgXmGu8	t	2025-07-19 02:20:08.618016	2025-07-19 02:20:08.618016	6287817731735
392	2	NARA COSMETIK	KENDAL	NGAWI	https://maps.app.goo.gl/DQ6xWqYLALZdHSXGA	t	2025-07-19 02:20:08.803719	2025-07-19 02:20:08.803719	6285849124674
393	2	KOPERASI PONDOK AL-MANA	KENDAL	NGAWI	https://maps.app.goo.gl/a3YbZFvVbtJv68ui8	t	2025-07-19 02:20:08.987534	2025-07-19 02:20:08.987534	6281615500558
394	2	TOKO FAUZAN	KENDAL	NGAWI	https://maps.app.goo.gl/KH36AH1XnYvuYrzB8	t	2025-07-19 02:20:09.178565	2025-07-19 02:20:09.178565	6285730184006
395	2	SUMBER REZEKY	KENDAL	NGAWI	https://maps.app.goo.gl/eX4UJJQSfU3EPG5G7	t	2025-07-19 02:20:09.365386	2025-07-19 02:20:09.365386	6282335333877
396	2	WENY ATMAJA	KENDAL	NGAWI	https://maps.app.goo.gl/9XWbr8XMyMNJ7iDFA	t	2025-07-19 02:20:09.54746	2025-07-19 02:20:09.54746	6281559835679
397	2	TOKO SAINAH	KENDAL	NGAWI	https://maps.app.goo.gl/nVx4A4aSaUv37vtL9	t	2025-07-19 02:20:09.733303	2025-07-19 02:20:09.733303	6285856895878
398	2	SRC HASNA	KENDAL	NGAWI	https://maps.app.goo.gl/6axrJZi9Tjcj7vRD9	t	2025-07-19 02:20:09.913298	2025-07-19 02:20:09.913298	6285784331192
399	2	TOKO TRI MULYA JAYA	KENDAL	NGAWI	https://maps.app.goo.gl/VFWQBmrnYD4QMpBy8	t	2025-07-19 02:20:10.105333	2025-07-19 02:20:10.105333	6285649100529
400	2	KARTIKA BEAUTY STORE	KENDAL	NGAWI	https://maps.app.goo.gl/72ZJs1UrTQd7dYxv8	t	2025-07-19 02:20:10.289672	2025-07-19 02:20:10.289672	6285855157375
401	2	BUNGA KOSMETIK	KENDAL	NGAWI	https://maps.app.goo.gl/mHcpbWhdgjxnn7s26	t	2025-07-19 02:20:10.467375	2025-07-19 02:20:10.467375	6285876111195
402	2	SRC FAHMI	KENDAL	NGAWI	https://maps.app.goo.gl/wLUjST64JAyU4neD7	t	2025-07-19 02:20:10.660988	2025-07-19 02:20:10.660988	6285784888006
403	3	TOKO R MART	JENANGAN	PONOROGO	https://maps.app.goo.gl/pRwdajncfzcYi2FC8	t	2025-07-19 02:20:10.914244	2025-07-19 02:20:10.914244	6281259220330
404	3	NEVADA CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/UUrUcT5T55gBuF13A	t	2025-07-19 02:20:11.102761	2025-07-19 02:20:11.102761	6285815699506
405	3	LANCAR JAYA	JENANGAN	PONOROGO	https://maps.app.goo.gl/fjzdxJ4BNFxjtYkx9	t	2025-07-19 02:20:11.299958	2025-07-19 02:20:11.299958	6282338894252
406	3	TOKO SENJA	JENANGAN	PONOROGO	https://maps.app.goo.gl/i1m91ivkQ48HKSE67	t	2025-07-19 02:20:11.502032	2025-07-19 02:20:11.502032	6281515620820
407	3	TOKO SRIKANDI	JENANGAN	PONOROGO	https://maps.app.goo.gl/pnSLrVHMYwgpgN5A6	t	2025-07-19 02:20:11.677861	2025-07-19 02:20:11.677861	6289627724747
408	3	SIHO CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/nwMd6p2SHMPa8CB56	t	2025-07-19 02:20:11.854105	2025-07-19 02:20:11.854105	6282301186000
409	3	POJOK RAYA	JENANGAN	PONOROGO	https://maps.app.goo.gl/kXzT68dW3Cz5hV8g9	t	2025-07-19 02:20:12.065734	2025-07-19 02:20:12.065734	628816083270
410	3	TOKO OASE	JENANGAN	PONOROGO	https://maps.app.goo.gl/dvhxaU1UbucK1mpx5	t	2025-07-19 02:20:12.261512	2025-07-19 02:20:12.261512	62895380890568
411	3	TOKO SANDIKA	BABADAN	PONOROGO	https://maps.app.goo.gl/R6pVmggu7hu3bpJ37	t	2025-07-19 02:20:12.444004	2025-07-19 02:20:12.444004	6281359957568
412	3	TOKO FIRDAUS	BABADAN	PONOROGO	https://maps.app.goo.gl/vhYtwBLxhaWHUykC7	t	2025-07-19 02:20:12.643794	2025-07-19 02:20:12.643794	6289682376666
413	3	ANDRA CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/AQzq1dcb8WGttpXf9	t	2025-07-19 02:20:12.820461	2025-07-19 02:20:12.820461	6285736543651
414	3	DIKA CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/sdMiHLdWshqvgQeX9	t	2025-07-19 02:20:13.003359	2025-07-19 02:20:13.003359	6285655774299
415	3	TOKO SANTI	JENANGAN	PONOROGO	https://maps.app.goo.gl/f1oZ2nUeib65hppW7	t	2025-07-19 02:20:13.181112	2025-07-19 02:20:13.181112	6285857443870
416	3	DJONA CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/coS65wsf1kqVDnUb8	t	2025-07-19 02:20:13.371536	2025-07-19 02:20:13.371536	6285955000009
417	3	SRC RAMA	BABADAN	PONOROGO	https://maps.app.goo.gl/udKVMVALkTxA5WNj9	t	2025-07-19 02:20:13.596548	2025-07-19 02:20:13.596548	6282131069801
418	3	TOKO PAK SUR	BABADAN	PONOROGO	https://maps.app.goo.gl/BcDx5HmaYRLgnJmU7	t	2025-07-19 02:20:13.775216	2025-07-19 02:20:13.775216	6281333351132
419	3	TOKO RASYA	BABADAN	PONOROGO	https://maps.app.goo.gl/TAnJU55nqwhqMt3p8	t	2025-07-19 02:20:13.957849	2025-07-19 02:20:13.957849	62881026302730
420	3	SRC TRIANI	BABADAN	PONOROGO	https://maps.app.goo.gl/Cr4DCd83tjYbUUkR9	t	2025-07-19 02:20:14.148671	2025-07-19 02:20:14.148671	6289615476704
421	3	TOKO FANANI	BABADAN	PONOROGO	https://maps.app.goo.gl/mGG3Damum3NKujSN8	t	2025-07-19 02:20:14.32784	2025-07-19 02:20:14.32784	6285645714542
422	3	SRC YUNI	BABADAN	PONOROGO	https://maps.app.goo.gl/LKkDitRSwp98UhA97	t	2025-07-19 02:20:14.508129	2025-07-19 02:20:14.508129	6281252311302
423	3	SRC ARIFIN	BABADAN	PONOROGO	https://maps.app.goo.gl/cJFpNttoeyepJgJU8	t	2025-07-19 02:20:14.694016	2025-07-19 02:20:14.694016	6281335751755
424	3	TOKO SUMBER REZEKI	BABADAN	PONOROGO	https://maps.app.goo.gl/friHc7XyvWH3ZtP17	t	2025-07-19 02:20:14.88196	2025-07-19 02:20:14.88196	6281335247826
425	3	TOKO FAMILY	BABADAN	PONOROGO	https://maps.app.goo.gl/P4io2jtdFZRNJkVG8	t	2025-07-19 02:20:15.064704	2025-07-19 02:20:15.064704	628113317761
426	3	TOKO BU YATUN	BABADAN	PONOROGO	https://maps.app.goo.gl/uVLXWAaTUK8P5x2n8	t	2025-07-19 02:20:15.277715	2025-07-19 02:20:15.277715	6285292250872
427	3	ENAM BERKAH CELL	BABADAN	PONOROGO	https://maps.app.goo.gl/sZowr454tHgsHw8GA	t	2025-07-19 02:20:15.655164	2025-07-19 02:20:15.655164	6285204927909
428	3	SRC BOLODEWO	BABADAN	PONOROGO	https://maps.app.goo.gl/PjaV1X4KZSzMc92TA	t	2025-07-19 02:20:15.954732	2025-07-19 02:20:15.954732	6289677303301
429	3	DANI CELL	BABADAN	PONOROGO	https://maps.app.goo.gl/AFqW6zTMAEVZ26zT9	t	2025-07-19 02:20:16.16318	2025-07-19 02:20:16.16318	628125975953
430	3	TOKO EDI	BABADAN	PONOROGO	https://maps.app.goo.gl/oRrSuoUNUVTPsdtd7	t	2025-07-19 02:20:16.345703	2025-07-19 02:20:16.345703	6281234387955
431	3	SCR LILIK	JENANGAN	PONOROGO	https://maps.app.goo.gl/JzBV5Vyai1Txq9kB9	t	2025-07-19 02:20:16.52057	2025-07-19 02:20:16.52057	6281259719292
432	3	SRC YANTI	BABADAN	PONOROGO	https://maps.app.goo.gl/d9oNAvkdA6DyBeN77	t	2025-07-19 02:20:16.690539	2025-07-19 02:20:16.690539	6282337885102
433	3	TOKO SODIKUL	BABADAN	PONOROGO	https://maps.app.goo.gl/JnVxuKZCgD1Phh2V6	t	2025-07-19 02:20:16.874036	2025-07-19 02:20:16.874036	628977450230
434	3	TOKO ELLA	BABADAN	PONOROGO	https://maps.app.goo.gl/dFjeWTXgyHyeeFM59	t	2025-07-19 02:20:17.053261	2025-07-19 02:20:17.053261	6285231016698
435	3	TOKO MARGO MULYO	BABADAN	PONOROGO	https://maps.app.goo.gl/TPkKwtiERwxtwnx38	t	2025-07-19 02:20:17.244967	2025-07-19 02:20:17.244967	6281359883884
436	3	TOKO KRISNA	BABADAN	PONOROGO	https://maps.app.goo.gl/9ojMd3EZb9X46AVd8	t	2025-07-19 02:20:17.420532	2025-07-19 02:20:17.420532	6281246604426
437	3	RAJAWALI CELL	BABADAN	PONOROGO	https://maps.app.goo.gl/iHiPobR2v2DzWkmLA	t	2025-07-19 02:20:17.606134	2025-07-19 02:20:17.606134	6285275757572
438	3	SRC AGUNG MAKMUR	BABADAN	PONOROGO	https://maps.app.goo.gl/LzMrJrqV6G5UxGiz7	t	2025-07-19 02:20:17.808288	2025-07-19 02:20:17.808288	6282375654001
439	3	TOKO LANGGENG JAYA	BABADAN	PONOROGO	https://maps.app.goo.gl/X6PjAuadGucjQ5Jc7	t	2025-07-19 02:20:17.98483	2025-07-19 02:20:17.98483	6281335729297
440	3	TOKO KAKA	BABADAN	PONOROGO	https://maps.app.goo.gl/CfRhh8tyixrc4npdA	t	2025-07-19 02:20:18.163316	2025-07-19 02:20:18.163316	6282141640682
441	3	HANA MART	JENANGAN	PONOROGO	https://maps.app.goo.gl/HXag4LYyAUqFkwxMA	t	2025-07-19 02:20:18.342027	2025-07-19 02:20:18.342027	6282331184486
442	3	TOKO LINTANG BORANG	JENANGAN	PONOROGO	https://maps.app.goo.gl/rmcYp54x6H2PD9SWA	t	2025-07-19 02:20:18.517126	2025-07-19 02:20:18.517126	6285749105000
443	3	R CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/ZowVx6QzbaMjCdH4A	t	2025-07-19 02:20:18.70706	2025-07-19 02:20:18.70706	6285649030737
444	3	TOKO SIDO JODO	JENANGAN	PONOROGO	https://maps.app.goo.gl/eowwuErXRNtv2gfH7	t	2025-07-19 02:20:18.87842	2025-07-19 02:20:18.87842	6281335157688
445	3	TOKO LESTARI	JENANGAN	PONOROGO	https://maps.app.goo.gl/osw5LensRD923uFKA	t	2025-07-19 02:20:19.058612	2025-07-19 02:20:19.058612	6281259091090
446	3	TOKO BU KESI	JENANGAN	PONOROGO	https://maps.app.goo.gl/ygsj6fcdPH1cMgJk9	t	2025-07-19 02:20:19.232377	2025-07-19 02:20:19.232377	6281335259260
447	3	TOKO AL FATH	JENANGAN	PONOROGO	https://maps.app.goo.gl/8TjNgM6UKHrQxUUM9	t	2025-07-19 02:20:19.403936	2025-07-19 02:20:19.403936	6285202094454
448	3	TOKO RENES	JENANGAN	PONOROGO	https://maps.app.goo.gl/aLWG2U7sKByXNfCw6	t	2025-07-19 02:20:19.584725	2025-07-19 02:20:19.584725	6281231244442
449	3	TOKO SUMBER JAYA	JENANGAN	PONOROGO	https://maps.app.goo.gl/LrfyyUWdMYDBiwJQ6	t	2025-07-19 02:20:19.761265	2025-07-19 02:20:19.761265	6282135958134
450	3	TOKO TRI UTAMI	SIMAN	PONOROGO	https://maps.app.goo.gl/5AnNBQSjquKRaWUo8	t	2025-07-19 02:20:20.003553	2025-07-19 02:20:20.003553	628999979978
451	3	TOKO BERKAH JAYA	BABADAN	PONOROGO	https://maps.app.goo.gl/Co1mSQphFuLNqZzh6	t	2025-07-19 02:20:20.242862	2025-07-19 02:20:20.242862	62895365379877
452	3	CAHAYA MART	BABADAN	PONOROGO	https://maps.app.goo.gl/CcMEoAAAN9JK2T2F7	t	2025-07-19 02:20:20.44946	2025-07-19 02:20:20.44946	628124939899
453	3	TOKO MANDIRI	BABADAN	PONOROGO	https://maps.app.goo.gl/1AUq1MLnb8nYGJTi9	t	2025-07-19 02:20:20.643809	2025-07-19 02:20:20.643809	6283865976064
454	3	TOKO BU SUNARTI	BABADAN	PONOROGO	https://maps.app.goo.gl/amdQX8zyFG46mHpg8	t	2025-07-19 02:20:20.838856	2025-07-19 02:20:20.838856	6282331401615
455	3	TOKO SIDODADI	PONOROGO	PONOROGO	https://maps.app.goo.gl/1pA1jDJ9TBhhDEKL6	t	2025-07-19 02:20:21.091973	2025-07-19 02:20:21.091973	6281332189995
456	3	TOKO SURGA ONE	SIMAN	PONOROGO	https://maps.app.goo.gl/PWL24j72NNmQhTcy9	t	2025-07-19 02:20:21.306382	2025-07-19 02:20:21.306382	6289633311966
457	3	GOLDEN FUTSAL	SIMAN	PONOROGO	https://maps.app.goo.gl/LpcnDJHuE79NfAKa6	t	2025-07-19 02:20:21.528526	2025-07-19 02:20:21.528526	628113625566
458	3	TOKO WIJAYA	SIMAN	PONOROGO	https://maps.app.goo.gl/YHq2pPwMJn92NWaf9	t	2025-07-19 02:20:21.708356	2025-07-19 02:20:21.708356	6281393973949
459	3	TOKO LUMINTU	PONOROGO	PONOROGO	https://maps.app.goo.gl/eXjymTU2EDUkhJ4HA	t	2025-07-19 02:20:21.88596	2025-07-19 02:20:21.88596	6285733434987
460	3	TOKO HOME PLUS	PONOROGO	PONOROGO	https://maps.app.goo.gl/Rq6AkQAvQFrw6mZB7	t	2025-07-19 02:20:22.090747	2025-07-19 02:20:22.090747	6282236455758
461	3	TOKO 5758	PONOROGO	PONOROGO	https://maps.app.goo.gl/aH7UkLshwtngiuyZA	t	2025-07-19 02:20:22.301669	2025-07-19 02:20:22.301669	6285730432857
462	3	AL FATH CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/Fe4jmm43cZgcCcqeA	t	2025-07-19 02:20:22.489959	2025-07-19 02:20:22.489959	6285735719537
463	3	TOKO PAK KEMI	PONOROGO	PONOROGO	https://maps.app.goo.gl/edEwHQJaqcqQXdDGA	t	2025-07-19 02:20:22.681546	2025-07-19 02:20:22.681546	\N
464	3	EMERY CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/jDVnBJfWKMHGcLfV7	t	2025-07-19 02:20:22.871883	2025-07-19 02:20:22.871883	6287752666255
465	3	MENUR JAYA CELL	SIMAN	PONOROGO	https://maps.app.goo.gl/wGHdwEcoRHMpqDXa7	t	2025-07-19 02:20:23.04591	2025-07-19 02:20:23.04591	6287752666255
466	3	TOKO DARMANTO	BABADAN	PONOROGO	https://maps.app.goo.gl/x9jorxhaABPAzbwn7	t	2025-07-19 02:20:23.224819	2025-07-19 02:20:23.224819	\N
467	3	TOKO BERKAH AUREL	PONOROGO	PONOROGO	https://maps.app.goo.gl/zLUzn41Z2qWMZFrf7	t	2025-07-19 02:20:23.403171	2025-07-19 02:20:23.403171	62813113027
468	3	ALADIN CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/F87A2bCUQiRGhjRF6	t	2025-07-19 02:20:23.58717	2025-07-19 02:20:23.58717	6287752666255
469	3	SETYA CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/a2Zj2jgUnr7Bw1XMA	t	2025-07-19 02:20:23.761116	2025-07-19 02:20:23.761116	6282335473547
470	3	JAVIER CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/gJXiDsaZ1Dy6vh4w6	t	2025-07-19 02:20:23.941197	2025-07-19 02:20:23.941197	6287752666255
471	3	TOKO ALDAFA	JENANGAN	PONOROGO	https://maps.app.goo.gl/gfKNhkjVMCXsge1u5	t	2025-07-19 02:20:24.122079	2025-07-19 02:20:24.122079	6283850282102
472	3	TOKO HERA	JENANGAN	PONOROGO	https://maps.app.goo.gl/Cun9qTQ1j5emSuk9A	t	2025-07-19 02:20:24.298495	2025-07-19 02:20:24.298495	6281231371084
473	3	SRC SAMSUL	JENANGAN	PONOROGO	https://maps.app.goo.gl/SVK7F5FFCr973joS7	t	2025-07-19 02:20:24.479518	2025-07-19 02:20:24.479518	628125861549
474	3	TOKO REZQYANA	JENANGAN	PONOROGO	https://maps.app.goo.gl/2Pt8ir79Dqzt7jKX8	t	2025-07-19 02:20:24.660218	2025-07-19 02:20:24.660218	6285784592728
475	3	MJ CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/vHnFnNXpMfoeZaDz9	t	2025-07-19 02:20:24.835801	2025-07-19 02:20:24.835801	\N
476	3	TOKO ARIFIN	JENANGAN	PONOROGO	https://maps.app.goo.gl/dpMFnpqibVn5akHc7	t	2025-07-19 02:20:25.021733	2025-07-19 02:20:25.021733	\N
477	3	TOKO WAHYU SEDAH	JENANGAN	PONOROGO	https://maps.app.goo.gl/zxps3yXPiu3gbKVD7	t	2025-07-19 02:20:25.198132	2025-07-19 02:20:25.198132	6282331352955
478	3	TOKO INDAH JAYA	JENANGAN	PONOROGO	https://maps.app.goo.gl/mFkJvnaWaQUXk6nw8	t	2025-07-19 02:20:25.378521	2025-07-19 02:20:25.378521	6281230840049
479	3	TOKO ABID	JENANGAN	PONOROGO	https://maps.app.goo.gl/9eZQ7y9yFCt5WPev5	t	2025-07-19 02:20:25.574189	2025-07-19 02:20:25.574189	6285231173239
480	3	SALON ZIGGIE	PONOROGO	PONOROGO	https://maps.app.goo.gl/2Zr1PPh4AybH2nRK9	t	2025-07-19 02:20:25.764981	2025-07-19 02:20:25.764981	628563660670
481	3	TOKO BERKAH SUKOWATI	BABADAN	PONOROGO	https://maps.app.goo.gl/8eCzxsVMTz9mSMYe8	t	2025-07-19 02:20:25.954954	2025-07-19 02:20:25.954954	6282142089664
482	3	LAWU DATA CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/5PQWMXXSMVe6kha86	t	2025-07-19 02:20:26.147417	2025-07-19 02:20:26.147417	6289679135555
483	3	GRIYA ARIFTA CELL	BABADAN	PONOROGO	https://maps.app.goo.gl/bdkKiFzavtUbqcKLA	t	2025-07-19 02:20:26.325481	2025-07-19 02:20:26.325481	6282234808010
484	3	TOKO BAROKAH PANJENG	JENANGAN	PONOROGO	https://maps.app.goo.gl/y5W5t5weCmd3gzjN8	t	2025-07-19 02:20:26.512562	2025-07-19 02:20:26.512562	6281210847400
485	3	SRC SEMAR	JENANGAN	PONOROGO	https://maps.app.goo.gl/VwjvkjYZJ34RXpuE6	t	2025-07-19 02:20:26.689064	2025-07-19 02:20:26.689064	6281331401025
486	3	TOKO RISCOM	PONOROGO	PONOROGO	https://maps.app.goo.gl/ftpSgaBU8Yc6wJSo8	t	2025-07-19 02:20:26.899695	2025-07-19 02:20:26.899695	6281335010010
487	3	PELANGI CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/zWhmWcPEccY9tVfs6	t	2025-07-19 02:20:27.128949	2025-07-19 02:20:27.128949	6285645811101
488	3	MONICA CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/4k83YvLvrEzkiska9	t	2025-07-19 02:20:27.316492	2025-07-19 02:20:27.316492	6282301103303
489	3	MONICA CELL 2	PONOROGO	PONOROGO	https://maps.app.goo.gl/oy4oWP3CAACtcMJ78	t	2025-07-19 02:20:27.507161	2025-07-19 02:20:27.507161	6282301103303
490	3	TOKO ANINDYA	PONOROGO	PONOROGO	https://maps.app.goo.gl/Uy7X47Y2KALuwnzS6	t	2025-07-19 02:20:27.694281	2025-07-19 02:20:27.694281	6281259456661
491	3	TOKO DEVA	JENANGAN	PONOROGO	https://maps.app.goo.gl/BHNc6eodaiqwGTpT9	t	2025-07-19 02:20:27.876601	2025-07-19 02:20:27.876601	\N
492	3	PUSAT PERDANA	BABADAN	PONOROGO	https://maps.app.goo.gl/Q9xvkPQr66aR7Wrk6	t	2025-07-19 02:20:28.053217	2025-07-19 02:20:28.053217	628982366771
493	3	ANDA CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/DvhHr6efMziS7c888	t	2025-07-19 02:20:28.231779	2025-07-19 02:20:28.231779	628533085510
494	3	MOMO CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/KQT2GkDPfM3pm6ge7	t	2025-07-19 02:20:28.419163	2025-07-19 02:20:28.419163	6281231624678
495	3	AGAM CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/AhLHw1utLwKHsyes9	t	2025-07-19 02:20:28.597056	2025-07-19 02:20:28.597056	6283115622071
496	3	TOKO BU YUN	PONOROGO	PONOROGO	https://maps.app.goo.gl/AhLHw1utLwKHsyes9	t	2025-07-19 02:20:28.791203	2025-07-19 02:20:28.791203	6282257686566
497	3	TOKO PUJI	PONOROGO	PONOROGO	https://maps.app.goo.gl/MnbCPuogadMpT5iU8	t	2025-07-19 02:20:28.971131	2025-07-19 02:20:28.971131	6285755323248
498	3	SRC TURI	SIMAN	PONOROGO	https://maps.app.goo.gl/gHmUbZp2CFDYrm5M9	t	2025-07-19 02:20:29.157831	2025-07-19 02:20:29.157831	\N
499	3	TOKO MIMIDARO	BABADAN	PONOROGO	https://maps.app.goo.gl/hnDbssVx2KmKZE1dA	t	2025-07-19 02:20:29.333194	2025-07-19 02:20:29.333194	6287781894025
500	3	MULTI MART	BABADAN	PONOROGO	https://maps.app.goo.gl/gQ4dtWDZ3UZ4qUHT7	t	2025-07-19 02:20:29.524495	2025-07-19 02:20:29.524495	628982931000
501	3	FOTOCOPY CAHAYA 1	PONOROGO	PONOROGO	https://maps.app.goo.gl/bW3kua2D9kiPVceu8	t	2025-07-19 02:20:29.702915	2025-07-19 02:20:29.702915	6282331316009
502	3	TOKO PRABU	PONOROGO	PONOROGO	https://maps.app.goo.gl/1tbFSGV482KPULiEA	t	2025-07-19 02:20:29.887283	2025-07-19 02:20:29.887283	6281216130070
503	3	TOKO SUMBER BERKAH	PONOROGO	PONOROGO	https://maps.app.goo.gl/2wNLtVZEooneQndu9	t	2025-07-19 02:20:30.082167	2025-07-19 02:20:30.082167	6286758570066
504	3	RAMA CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/ZKiiQf6hzvvzPPiPA	t	2025-07-19 02:20:30.256934	2025-07-19 02:20:30.256934	6281914854100
505	3	TOKO DAMARIO	PONOROGO	PONOROGO	https://maps.app.goo.gl/cbruRVD3bKoxd9AQA	t	2025-07-19 02:20:30.448942	2025-07-19 02:20:30.448942	6281335828224
506	3	TOKO SANJAYA	JENANGAN	PONOROGO	https://maps.app.goo.gl/YK5xYoeQJiRdDucj9	t	2025-07-19 02:20:30.648035	2025-07-19 02:20:30.648035	6285231180716
507	3	TOKO AIKO	PONOROGO	PONOROGO	https://maps.app.goo.gl/P98G1AGVBC27yEUd6	t	2025-07-19 02:20:30.842128	2025-07-19 02:20:30.842128	6281259000034
508	3	AIKO CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/j7ivB7JBxXJnuu4LA	t	2025-07-19 02:20:31.013543	2025-07-19 02:20:31.013543	6281259000034
509	3	ANTERO CELL	SIMAN	PONOROGO	https://maps.app.goo.gl/kpZJMAosMnu8FjwX7	t	2025-07-19 02:20:31.194838	2025-07-19 02:20:31.194838	6285235864178
510	3	SRC NIRMALA	SIMAN	PONOROGO	https://maps.app.goo.gl/LWSF4ssVciU9j4R78	t	2025-07-19 02:20:31.407231	2025-07-19 02:20:31.407231	\N
511	3	TOKO RAMA	PONOROGO	PONOROGO	https://maps.app.goo.gl/sMppuS2UjavqjeEK9	t	2025-07-19 02:20:31.596848	2025-07-19 02:20:31.596848	6282139901721
512	3	BU SULIS	SIMAN	PONOROGO	https://maps.app.goo.gl/Sf6w8d8MaPSGkwsL7	t	2025-07-19 02:20:31.788093	2025-07-19 02:20:31.788093	6281235307744
513	3	TOKO ALVATAN	SIMAN	PONOROGO	https://maps.app.goo.gl/JmPCQuUjmoNnu3Yy8	t	2025-07-19 02:20:31.974431	2025-07-19 02:20:31.974431	6285792277926
514	3	TOKO NETI	PONOROGO	PONOROGO	https://maps.app.goo.gl/rNdK3sHW8y1hXyRk8	t	2025-07-19 02:20:32.172931	2025-07-19 02:20:32.172931	6281234149994
515	3	TOKO AYU	JENANGAN	PONOROGO	https://maps.app.goo.gl/k2m7aXiuX9cMv1pR8	t	2025-07-19 02:20:32.374521	2025-07-19 02:20:32.374521	6281299724652
516	3	TOKO SUBUR JAYA	BABADAN	PONOROGO	https://maps.app.goo.gl/9bqPvhjLSxjj1yv5A	t	2025-07-19 02:20:32.548045	2025-07-19 02:20:32.548045	\N
517	3	ELVA CELL	BABADAN	PONOROGO	https://maps.app.goo.gl/b6da2pp5T2uXUJ4MA	t	2025-07-19 02:20:32.727848	2025-07-19 02:20:32.727848	628125908910
518	3	TOKO SRIKAYA	BABADAN	PONOROGO	https://maps.app.goo.gl/wUPhgkf2KjM3XypL6	t	2025-07-19 02:20:32.934362	2025-07-19 02:20:32.934362	6282131106666
519	3	DAHLIA JAYA	BABADAN	PONOROGO	https://maps.app.goo.gl/AZeGJP2VyH8VPtiS7	t	2025-07-19 02:20:33.213983	2025-07-19 02:20:33.213983	6283173558819
520	3	METRO STAR	BABADAN	PONOROGO	https://maps.app.goo.gl/WSxbnopsQfnc9febA	t	2025-07-19 02:20:33.444205	2025-07-19 02:20:33.444205	628125923879
521	3	TOKO AYUNI	BABADAN	PONOROGO	https://maps.app.goo.gl/fxtX8hjoUYQJgrvn8	t	2025-07-19 02:20:33.625914	2025-07-19 02:20:33.625914	628983436012
522	3	TOKO BINTANG	BABADAN	PONOROGO	https://maps.app.goo.gl/haVB2bjpd1Ueg8BEA	t	2025-07-19 02:20:33.808961	2025-07-19 02:20:33.808961	628123418931
523	3	ASAHAN MART	PONOROGO	PONOROGO	https://maps.app.goo.gl/8gkSZrGwnmATbbFS7	t	2025-07-19 02:20:34.011361	2025-07-19 02:20:34.011361	6282137772904
524	3	TOKO JALI	PONOROGO	PONOROGO	https://maps.app.goo.gl/Cr79A2KuJ7fyn6B99	t	2025-07-19 02:20:34.190491	2025-07-19 02:20:34.190491	6283845703235
525	3	TOKO OVAL	BABADAN	PONOROGO	https://maps.app.goo.gl/QDUN59f5t58UkjLm6	t	2025-07-19 02:20:34.36386	2025-07-19 02:20:34.36386	6283192882202
526	3	TOKO BU YENI	BABADAN	PONOROGO	https://maps.app.goo.gl/pdRVvw5d7nA89Srj8	t	2025-07-19 02:20:34.537215	2025-07-19 02:20:34.537215	6281998991568
527	3	MASTENG CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/udyoKM6VKrUkXQtn6	t	2025-07-19 02:20:34.713923	2025-07-19 02:20:34.713923	628563335758
528	3	BERKAH SALAM	JENANGAN	PONOROGO	https://maps.app.goo.gl/rDo4gHLRsSc6xWZr7	t	2025-07-19 02:20:34.895579	2025-07-19 02:20:34.895579	6285604101273
529	3	RENDRA CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/8wBiMqifFJ4wJfBm6	t	2025-07-19 02:20:35.387077	2025-07-19 02:20:35.387077	6282143388861
530	3	TOKO RIDHO	JENANGAN	PONOROGO	https://maps.app.goo.gl/CK5AbVRRJEXSgqcD8	t	2025-07-19 02:20:35.625364	2025-07-19 02:20:35.625364	6281235177773
531	3	TOKO KARINA	JENANGAN	PONOROGO	https://maps.app.goo.gl/Fz1qBaXurpZrudJ4A	t	2025-07-19 02:20:35.800981	2025-07-19 02:20:35.800981	6282335982620
532	3	AN CELL	JENANGAN	PONOROGO	https://maps.app.goo.gl/EeDt6bDeSKNK1xbR9	t	2025-07-19 02:20:35.973792	2025-07-19 02:20:35.973792	6285649615971
533	3	TOKO JONAN  JAYA	BABADAN	PONOROGO	https://maps.app.goo.gl/uJiLHQNBH7UnB69r7	t	2025-07-19 02:20:36.138242	2025-07-19 02:20:36.138242	6282139993002
534	3	AL FATH CELL 2	PONOROGO	PONOROGO	https://maps.app.goo.gl/XDqtdDRXqnZk47aQ7	t	2025-07-19 02:20:36.307849	2025-07-19 02:20:36.307849	6285735719537
535	3	SEMAR CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/5HUqhRYVANW2zPj77	t	2025-07-19 02:20:36.488456	2025-07-19 02:20:36.488456	6289655000007
536	3	YSS CELL	PONOROGO	PONOROGO	https://maps.app.goo.gl/H5Lsuqxa55s8Et7R6	t	2025-07-19 02:20:36.658944	2025-07-19 02:20:36.658944	628977967890
537	4	SB JAYA	NGASEM	KEDIRI	https://maps.app.goo.gl/aVaphjkibcjzQ2hR8	t	2025-07-19 02:20:36.87875	2025-07-19 02:20:36.87875	6289682276625
538	4	TOKO PUTRI	NGASEM	KEDIRI	https://maps.app.goo.gl/7GWoGfZnyQiPZTti9	t	2025-07-19 02:20:37.07549	2025-07-19 02:20:37.07549	6285646590565
539	4	TOKO DOKO	NGASEM	KEDIRI	https://maps.app.goo.gl/S2iW2BD3YJEHj3Su8	t	2025-07-19 02:20:37.241427	2025-07-19 02:20:37.241427	6281259055001
540	4	ZAHRA FAMILY	GURAH	KEDIRI	https://maps.app.goo.gl/4q2imGNLaW3RJ9r5A	t	2025-07-19 02:20:37.41543	2025-07-19 02:20:37.41543	6285857732935
541	4	TOKO MUJIONO	KEDIRI	KEDIRI	https://maps.app.goo.gl/XRZvTaLescRjv17o7	t	2025-07-19 02:20:37.591225	2025-07-19 02:20:37.591225	6285806162111
542	4	KEENAN JAYA / RATNA	KEDIRI	KEDIRI	https://maps.app.goo.gl/dtgT8e3yRCcADpJb8	t	2025-07-19 02:20:37.758013	2025-07-19 02:20:37.758013	6285852058222
543	4	TOKO EVIT	KEDIRI	KEDIRI	https://maps.app.goo.gl/6bZRf1W6gk1WW94p8	t	2025-07-19 02:20:37.933523	2025-07-19 02:20:37.933523	6285645788228
544	4	EVIT MART	KEDIRI	KEDIRI	https://maps.app.goo.gl/mdjzQTfBnPE1i62z6	t	2025-07-19 02:20:38.106722	2025-07-19 02:20:38.106722	6285645788228
545	4	KURNIA JAYA	KEDIRI	KEDIRI	https://maps.app.goo.gl/DkHy5SJpgYJXZVZUA	t	2025-07-19 02:20:38.287931	2025-07-19 02:20:38.287931	6285257453337
546	4	TOKO SEDULUR	KEDIRI	KEDIRI	https://maps.app.goo.gl/mQkSn35jhWRng36W6	t	2025-07-19 02:20:38.466478	2025-07-19 02:20:38.466478	6289654966345
547	4	TOKO BU ERNA	KEDIRI	KEDIRI	https://maps.app.goo.gl/U4UcytFVYEPtCinz8	t	2025-07-19 02:20:38.626171	2025-07-19 02:20:38.626171	6281235498899
548	4	TOK AYS	KEDIRI	KEDIRI	https://maps.app.goo.gl/LoMtknLsq315nA437	t	2025-07-19 02:20:38.812488	2025-07-19 02:20:38.812488	6287730815138
549	4	TOKO HARIYANTO	KEDIRI	KEDIRI	https://maps.app.goo.gl/vDC1ARMKqavigcaE6	t	2025-07-19 02:20:39.015962	2025-07-19 02:20:39.015962	628973156783
550	4	KEMBAR JAYA	KEDIRI	KEDIRI	https://maps.app.goo.gl/8okJPZDB3fmy3zoW8	t	2025-07-19 02:20:39.258461	2025-07-19 02:20:39.258461	6282139640234
551	4	QTO BEE	KEDIRI	KEDIRI	https://maps.app.goo.gl/11MH3eLqJnMwe2Dd8	t	2025-07-19 02:20:39.420843	2025-07-19 02:20:39.420843	6281359564754
552	4	TOKO TOP	KEDIRI	KEDIRI	https://maps.app.goo.gl/RDjwj3z2jMCjhzH46	t	2025-07-19 02:20:39.609544	2025-07-19 02:20:39.609544	6281359564754
553	4	TOKO NAZWA	KEDIRI	KEDIRI	https://maps.app.goo.gl/SmQqCypZipdunXaj7	t	2025-07-19 02:20:39.783563	2025-07-19 02:20:39.783563	6289615192223
554	4	TOKO ADITYA	PESANTREN	KEDIRI	https://maps.app.goo.gl/enGQS6uXwditKMWK8	t	2025-07-19 02:20:39.952805	2025-07-19 02:20:39.952805	6281358204804
555	4	TOKO MBAK HENI	PESANTREN	KEDIRI	https://maps.app.goo.gl/PVN36yBvj1hqooic7	t	2025-07-19 02:20:40.127007	2025-07-19 02:20:40.127007	6281330770365
556	4	TOKO MUTIARA 2	MOJOROTO	KEDIRI	https://maps.app.goo.gl/5w1FM1HXe3UqxGuYA	t	2025-07-19 02:20:40.305831	2025-07-19 02:20:40.305831	6282141047101
557	4	SUMBER BAROKAH	NGASEM	KEDIRI	https://maps.app.goo.gl/CrPXuguVpnJyYyBK6	t	2025-07-19 02:20:40.470024	2025-07-19 02:20:40.470024	6285732091145
558	4	ARTO MORO	PESANTREN	KEDIRI	https://maps.app.goo.gl/7kcYSXTZuJ4Tv7Lv7	t	2025-07-19 02:20:40.631431	2025-07-19 02:20:40.631431	6281232897278
559	4	TOKO WAHYU	PESANTREN	KEDIRI	https://maps.app.goo.gl/pXVjopdQGrAeq2ze8	t	2025-07-19 02:20:40.801516	2025-07-19 02:20:40.801516	6281359925007
560	4	TOKO NAMOY	KEDIRI	KEDIRI	https://maps.app.goo.gl/B7g53jKuExXdM1Bt5	t	2025-07-19 02:20:40.961401	2025-07-19 02:20:40.961401	6289518099155
561	4	TOKO BYANS	KEDIRI	KEDIRI	https://maps.app.goo.gl/2dZ7f8euVNzFFgH96	t	2025-07-19 02:20:41.12961	2025-07-19 02:20:41.12961	6285749000451
562	4	TOKO ALIM	KEDIRI	KEDIRI	https://maps.app.goo.gl/zoPCU9A7AB2hHS7Q6	t	2025-07-19 02:20:41.298673	2025-07-19 02:20:41.298673	6285755459222
563	4	TOKO INDRAWARTI	KEDIRI	KEDIRI	https://maps.app.goo.gl/Cm2BqTugihpP6MnU6	t	2025-07-19 02:20:41.46274	2025-07-19 02:20:41.46274	6281359385029
564	4	TOKO NANIK	KEDIRI	KEDIRI	https://maps.app.goo.gl/RWm81Rqkuz2VCcCx9	t	2025-07-19 02:20:41.622753	2025-07-19 02:20:41.622753	6282165102374
565	4	TOKO ILHAM	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/Hxp1nDvCcSxpKGw9A	t	2025-07-19 02:20:41.795801	2025-07-19 02:20:41.795801	6281259763659
566	4	TOKO DWI JAYA	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/aPDSRtmnxjizzeLQ9	t	2025-07-19 02:20:41.975003	2025-07-19 02:20:41.975003	6282335030002
567	4	TOKO SUPIAH	MOJOROTO	KEDIRI	https://maps.app.goo.gl/pWsQhqAnjd71Ebez6	t	2025-07-19 02:20:42.156835	2025-07-19 02:20:42.156835	\N
568	4	HARSONO	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/a4jjJEc8A2HzkVgx7	t	2025-07-19 02:20:42.330307	2025-07-19 02:20:42.330307	6282131847070
569	4	TOKO ATIK	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/GA39TsPr4U1HAtZj6	t	2025-07-19 02:20:42.500167	2025-07-19 02:20:42.500167	6285784035994
570	4	TOKO SARMINI	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/P15RsubcGXKASXUT9	t	2025-07-19 02:20:42.668775	2025-07-19 02:20:42.668775	6281913840417
571	4	TOKO AL HIKMAH	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/w19Ub1pQnyW9e33v5	t	2025-07-19 02:20:42.850038	2025-07-19 02:20:42.850038	6285851190613
572	4	TOKO DIKA	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/JMWXTD4eJVTTQoEz7	t	2025-07-19 02:20:43.029187	2025-07-19 02:20:43.029187	6285607513429
573	4	SRC ANIK	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/MnrmaJpa39x6CZWJA	t	2025-07-19 02:20:43.197149	2025-07-19 02:20:43.197149	6285790627404
574	4	BUSER MART	PAPAR	KEDIRI	https://maps.app.goo.gl/1RZCHJ6UU7JQidFF7	t	2025-07-19 02:20:43.396824	2025-07-19 02:20:43.396824	6281805592690
575	4	TOKO FRIDA	PAPAR	KEDIRI	https://maps.app.goo.gl/FJwi5SRdg34d6pCm9	t	2025-07-19 02:20:43.582427	2025-07-19 02:20:43.582427	6281233523919
576	4	TOKO SUGIK	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/H8P4H1dUTBCKXpuNA	t	2025-07-19 02:20:43.752616	2025-07-19 02:20:43.752616	6285235394947
577	4	TOKO MUJIATI	PAGU	KEDIRI	https://maps.app.goo.gl/wLAbYVyb3ApKpZDK8	t	2025-07-19 02:20:43.91568	2025-07-19 02:20:43.91568	6287792273142
578	4	TOKO RAHMAT	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/gzMR4a3sEaZ1L5ed9	t	2025-07-19 02:20:44.072603	2025-07-19 02:20:44.072603	6285790778072
579	4	TOKO LINA JAYA	KEDIRI	KEDIRI	https://maps.app.goo.gl/mr5x2MK9pwBjA3Rx9	t	2025-07-19 02:20:44.238388	2025-07-19 02:20:44.238388	6285606126129
580	4	TOKO FADIL	MOJOROTO	KEDIRI	https://maps.app.goo.gl/mSEJDs3Cdq51BaqK7	t	2025-07-19 02:20:44.400613	2025-07-19 02:20:44.400613	6285934828240
581	4	SRC SULASTRI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/TFgLJXhR8j8mDUnPA	t	2025-07-19 02:20:44.563735	2025-07-19 02:20:44.563735	628161554989
582	4	SRC ALI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/3G7YEg1rekmdPPT79	t	2025-07-19 02:20:44.731183	2025-07-19 02:20:44.731183	6285645998785
583	4	WAHYU CELL	SEMEN	KEDIRI	https://maps.app.goo.gl/FAm5KwbWiMiAWwYo6	t	2025-07-19 02:20:44.900211	2025-07-19 02:20:44.900211	6285815648841
584	4	AL FATH MART	SEMEN	KEDIRI	https://maps.app.goo.gl/6v56pvfi4hEEoyr6A	t	2025-07-19 02:20:45.079431	2025-07-19 02:20:45.079431	628569545604
585	4	TOKO WAHYUNI	SEMEN	KEDIRI	https://maps.app.goo.gl/HQA8NiCnNasnPAUQ7	t	2025-07-19 02:20:45.248146	2025-07-19 02:20:45.248146	62085845414759
586	4	SRC IMAH	SEMEN	KEDIRI	https://maps.app.goo.gl/CmpyEjF34Y7hqSq78	t	2025-07-19 02:20:45.423424	2025-07-19 02:20:45.423424	6281216684167
587	4	TOKO YESI	MOJO	KEDIRI	https://maps.app.goo.gl/4zMxpPAsHMi8aPJD6	t	2025-07-19 02:20:45.598024	2025-07-19 02:20:45.598024	6285784856069
588	4	TOKO FREYA	MOJO	KEDIRI	https://maps.app.goo.gl/7e77nLrASP4RYaMq9	t	2025-07-19 02:20:45.774714	2025-07-19 02:20:45.774714	6285641557824
589	4	TOKO BAROKAH 3	MOJOROTO	KEDIRI	https://maps.app.goo.gl/a5ECPUSsrSQA1Ba66	t	2025-07-19 02:20:45.936894	2025-07-19 02:20:45.936894	6282253044403
590	4	TOKO BAROKAH 4	MOJOROTO	KEDIRI	https://maps.app.goo.gl/TEhjA8zsgNgMTE6Z9	t	2025-07-19 02:20:46.098224	2025-07-19 02:20:46.098224	6282253044403
591	4	TOKO ADAM	MOJOROTO	KEDIRI	https://maps.app.goo.gl/e8K5twA9G5qUcj5x7	t	2025-07-19 02:20:46.268172	2025-07-19 02:20:46.268172	6282211994726
592	4	AIR MART	MOJOROTO	KEDIRI	https://maps.app.goo.gl/yrTqidhpRNT8qN9D7	t	2025-07-19 02:20:46.460318	2025-07-19 02:20:46.460318	6281235851612
593	4	TOKO RANTI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/jm4JeAb4Mp63yxCj7	t	2025-07-19 02:20:46.62803	2025-07-19 02:20:46.62803	\N
594	4	TOKO JAY	MOJOROTO	KEDIRI	https://maps.app.goo.gl/H4nRUvGmAhYbdEB89	t	2025-07-19 02:20:46.797584	2025-07-19 02:20:46.797584	628775323699
595	4	TOKO MUTIARA MART	MOJOROTO	KEDIRI	https://maps.app.goo.gl/WjQU2r94is97oeCr9	t	2025-07-19 02:20:46.968177	2025-07-19 02:20:46.968177	6287781670712
596	4	TOSERBA RISKA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/ZuQbfoQaNfdqHRit9	t	2025-07-19 02:20:47.134425	2025-07-19 02:20:47.134425	\N
597	4	TOKO YANIA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/6Yz4Gif34BFSJry99	t	2025-07-19 02:20:47.29948	2025-07-19 02:20:47.29948	6281252034516
598	4	TOKO RINA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/UGw8qBCzgXf9bgcV7	t	2025-07-19 02:20:47.471772	2025-07-19 02:20:47.471772	6281359168989
599	4	TOKO IDA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/VBvHUhPYSaj1p2fp7	t	2025-07-19 02:20:47.649553	2025-07-19 02:20:47.649553	6282140808382
600	4	TOKO BEJO	MOJOROTO	KEDIRI	https://maps.app.goo.gl/y2pRHi12nLnS4ZYp7	t	2025-07-19 02:20:47.826501	2025-07-19 02:20:47.826501	6281335592318
601	4	TOKO ANIS	NGASEM	KEDIRI	https://maps.app.goo.gl/9oM46qZngaWB1WA96	t	2025-07-19 02:20:48.021294	2025-07-19 02:20:48.021294	6285784342252
602	4	TOKO GATSBY	NGASEM	KEDIRI	https://maps.app.goo.gl/jNGopDut1b1vSirx5	t	2025-07-19 02:20:48.217627	2025-07-19 02:20:48.217627	6285708456483
603	4	TOKO FITRI	NGASEM	KEDIRI	https://maps.app.goo.gl/BhAQGA1ordv8aS3x7	t	2025-07-19 02:20:48.382253	2025-07-19 02:20:48.382253	6285746663840
604	4	TOKO LUMINTU	NGASEM	KEDIRI	https://maps.app.goo.gl/AeFDtYh9iGXbtbEZ9	t	2025-07-19 02:20:48.542757	2025-07-19 02:20:48.542757	628158991115
605	4	TOKO KHUSNUL	NGASEM	KEDIRI	https://maps.app.goo.gl/8ubrD9VMTpJBV6Zq6	t	2025-07-19 02:20:48.701919	2025-07-19 02:20:48.701919	628533594369
606	4	TOKO MADU WANGI	NGASEM	KEDIRI	https://maps.app.goo.gl/S3KwmxVVGsWz7P5S9	t	2025-07-19 02:20:48.87034	2025-07-19 02:20:48.87034	6289682505869
607	4	TOKO MUBAROK	NGASEM	KEDIRI	https://maps.app.goo.gl/sMVhe9MBtV3SpyR49	t	2025-07-19 02:20:49.047806	2025-07-19 02:20:49.047806	6287838880645
608	4	TOKO RIKA	NGASEM	KEDIRI	https://maps.app.goo.gl/L2L5ktqF4JDErTwp6	t	2025-07-19 02:20:49.224512	2025-07-19 02:20:49.224512	6285852239236
609	4	TOKO ALVIN NUR	NGASEM	KEDIRI	https://maps.app.goo.gl/uH5Fg9w48TmgTTVK6	t	2025-07-19 02:20:49.407876	2025-07-19 02:20:49.407876	6281553916547
610	4	TOKO MISBAH	NGASEM	KEDIRI	https://maps.app.goo.gl/UebfRzvfUsZmieRb6	t	2025-07-19 02:20:49.617125	2025-07-19 02:20:49.617125	6283851189903
611	4	TOKO ISYANA	NGASEM	KEDIRI	https://maps.app.goo.gl/kJw23sxvSpxRc7EAA	t	2025-07-19 02:20:49.836004	2025-07-19 02:20:49.836004	6282137164040
612	4	TOKO HERU	NGASEM	KEDIRI	https://maps.app.goo.gl/zKHdKi6vfc8kWM19A	t	2025-07-19 02:20:49.997964	2025-07-19 02:20:49.997964	6285736772050
613	4	TOKO SAEROJI	NGASEM	KEDIRI	https://maps.app.goo.gl/fDGy1rqrz2D7jMH99	t	2025-07-19 02:20:50.169644	2025-07-19 02:20:50.169644	6281331781108
614	4	TOKO DELIMA	NGASEM	KEDIRI	https://maps.app.goo.gl/hhmRYnigQvdqB1p18	t	2025-07-19 02:20:50.343534	2025-07-19 02:20:50.343534	6285850712020
615	4	TOKO NINA	KEDIRI	KEDIRI	https://maps.app.goo.gl/pp4UM7JuqA2xTDf46	t	2025-07-19 02:20:50.507767	2025-07-19 02:20:50.507767	6281283834346
616	4	TOKO BAMBANG	KEDIRI	KEDIRI	https://maps.app.goo.gl/4US9pNunK5ZCkdUE6	t	2025-07-19 02:20:50.673956	2025-07-19 02:20:50.673956	6285265911409
617	4	TOKO DINI	NGASEM	KEDIRI	https://maps.app.goo.gl/RXHLhLMhQjCUGavy6	t	2025-07-19 02:20:50.85441	2025-07-19 02:20:50.85441	\N
618	4	KIOS PAGORA	NGASEM	KEDIRI	https://maps.app.goo.gl/7Kqc17ibyxqPRZJ86	t	2025-07-19 02:20:51.018376	2025-07-19 02:20:51.018376	6285234239339
619	4	SANNI MART	MOJOROTO	KEDIRI	https://maps.app.goo.gl/VEsRekVLakJDRWFbA	t	2025-07-19 02:20:51.190645	2025-07-19 02:20:51.190645	6281367362687
620	4	TOKO ALAWI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/e3BEfFfZ6U4arrah9	t	2025-07-19 02:20:51.36092	2025-07-19 02:20:51.36092	6283848288486
621	4	RIN MART	MOJOROTO	KEDIRI	https://maps.app.goo.gl/iXrQsmzQWLAGLxsw6	t	2025-07-19 02:20:51.520079	2025-07-19 02:20:51.520079	6285851154221
622	4	TOKO ALIP	MOJOROTO	KEDIRI	https://maps.app.goo.gl/uFRJVeBrdxw9KS1N9	t	2025-07-19 02:20:51.691432	2025-07-19 02:20:51.691432	6285183026503
623	4	TOKO RITA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/jj9VH9GpY9GeuP9B8	t	2025-07-19 02:20:51.857751	2025-07-19 02:20:51.857751	6285335555644
624	4	TOKO RINI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/VQks6xNLcz2qUwWa8	t	2025-07-19 02:20:52.028475	2025-07-19 02:20:52.028475	6281234809009
625	4	TOKO DERMAGA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/vxyESbHZfC4zMfAj7	t	2025-07-19 02:20:52.216378	2025-07-19 02:20:52.216378	6282145016021
626	4	TOKO PAK NO	MOJOROTO	KEDIRI	https://maps.app.goo.gl/1zXMFqAM3afsyY9y7	t	2025-07-19 02:20:52.415982	2025-07-19 02:20:52.415982	\N
627	4	PT AMARGO PUTRO	MOJOROTO	KEDIRI	https://maps.app.goo.gl/bnSqrA5oJ6EYukqA9	t	2025-07-19 02:20:52.591162	2025-07-19 02:20:52.591162	6281217155615
628	4	TOKO JAMRO	PAPAR	KEDIRI	https://maps.app.goo.gl/J3XRpnP2WDYwCjt56	t	2025-07-19 02:20:52.756858	2025-07-19 02:20:52.756858	6282334892058
629	4	TOKO RUDI	PAPAR	KEDIRI	https://maps.app.goo.gl/MEbT33QTKtgEyseH8	t	2025-07-19 02:20:52.925598	2025-07-19 02:20:52.925598	6285330476384
630	4	TOKO HARTINI	PAPAR	KEDIRI	https://maps.app.goo.gl/Pq68yAaqdCM9gbKs5	t	2025-07-19 02:20:53.099508	2025-07-19 02:20:53.099508	6285708230710
631	4	TOKO TARI	PAPAR	KEDIRI	https://maps.app.goo.gl/1VhhDeicSvbe3vpU7	t	2025-07-19 02:20:53.281719	2025-07-19 02:20:53.281719	6285790333076
632	4	TOKO DUA CAHAYA	PAPAR	KEDIRI	https://maps.app.goo.gl/ESarUZoZdMa9fWk28	t	2025-07-19 02:20:53.449683	2025-07-19 02:20:53.449683	\N
633	4	TOKO RUKARTI	PAPAR	KEDIRI	https://maps.app.goo.gl/BffBvwriD24RXHyw9	t	2025-07-19 02:20:53.615003	2025-07-19 02:20:53.615003	6285784744578
634	4	TOKO FRANESA	PAPAR	KEDIRI	https://maps.app.goo.gl/55Cuo7tFrfpHk1S3A	t	2025-07-19 02:20:53.778868	2025-07-19 02:20:53.778868	6282140950330
635	4	TOKO EKASARI	PAPAR	KEDIRI	https://maps.app.goo.gl/rvi7Uz2sRJaz8S9R8	t	2025-07-19 02:20:53.941862	2025-07-19 02:20:53.941862	6281335667505
636	4	TOKO MOMO	MOJOROTO	KEDIRI	https://maps.app.goo.gl/upQBPnpe2TTpNzRs6	t	2025-07-19 02:20:54.123775	2025-07-19 02:20:54.123775	6285706852259
637	4	TOKO BU YULI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/pWWZdGMce2LTZMEe9	t	2025-07-19 02:20:54.347429	2025-07-19 02:20:54.347429	6285856512132
638	4	TOKO DUVAN	MOJOROTO	KEDIRI	https://maps.app.goo.gl/kuXdxjtzeZ1h59B27	t	2025-07-19 02:20:54.540454	2025-07-19 02:20:54.540454	6282131539041
639	4	TOKO SUMBER REZEKI	MOJOROTO	KEDIRI	https://maps.app.goo.gl/23VQiopQhEGwUinq7	t	2025-07-19 02:20:54.769281	2025-07-19 02:20:54.769281	6282132357195
640	4	GREEN MART	NGASEM	KEDIRI	https://maps.app.goo.gl/CJZPHNnnxgTd8TB89	t	2025-07-19 02:20:54.942482	2025-07-19 02:20:54.942482	6285102260270
641	4	TOKO AL HIDAYAH	NGASEM	KEDIRI	https://maps.app.goo.gl/L4sGrpFRoHj6gLLh9	t	2025-07-19 02:20:55.112415	2025-07-19 02:20:55.112415	6281997999559
642	4	TOKO BINTI	NGASEM	KEDIRI	https://maps.app.goo.gl/FiAfix7E96MTPiof8	t	2025-07-19 02:20:55.290991	2025-07-19 02:20:55.290991	6281515565399
643	4	TOKO MARTI	NGASEM	KEDIRI	https://maps.app.goo.gl/AGjFnkxqUSQPWwJPA	t	2025-07-19 02:20:55.488998	2025-07-19 02:20:55.488998	6281515789083
644	4	KANG MAS CELL	PESANTREN	KEDIRI	https://maps.app.goo.gl/hJQkMZ8DL9TVVZsw7	t	2025-07-19 02:20:55.673719	2025-07-19 02:20:55.673719	6281234433121
645	4	SRC SULAIMAN	PESANTREN	KEDIRI	https://maps.app.goo.gl/wSiy4mNWbat3Yr9P9	t	2025-07-19 02:20:55.894226	2025-07-19 02:20:55.894226	6285851222304
646	4	TOKO WANTO	SEMEN	KEDIRI	https://maps.app.goo.gl/LXqhQ1s68bamDoxc9	t	2025-07-19 02:20:56.063749	2025-07-19 02:20:56.063749	6281553521301
647	4	TOKO SUTRI	SEMEN	KEDIRI	https://maps.app.goo.gl/ZrkurfgNpRbmrnWr8	t	2025-07-19 02:20:56.236421	2025-07-19 02:20:56.236421	6285790336440
648	4	WILIS CELL	SEMEN	KEDIRI	https://maps.app.goo.gl/MVA6bRHDduweKBHH7	t	2025-07-19 02:20:56.404006	2025-07-19 02:20:56.404006	6285655659997
649	4	TOKO INDAH	SEMEN	KEDIRI	https://maps.app.goo.gl/DMpgyx2tm6xdw99cA	t	2025-07-19 02:20:56.587077	2025-07-19 02:20:56.587077	\N
650	4	TOKO AIR MANCUR	SEMEN	KEDIRI	https://maps.app.goo.gl/njavF6jyRcY2vbZD7	t	2025-07-19 02:20:56.746545	2025-07-19 02:20:56.746545	6282245580363
651	4	TOKO YANI	SEMEN	KEDIRI	https://maps.app.goo.gl/2zzgKAJKQxKa6gXBA	t	2025-07-19 02:20:56.917378	2025-07-19 02:20:56.917378	\N
652	4	TOKO PUPUT	SEMEN	KEDIRI	https://maps.app.goo.gl/oLxK5EJDsykDWA2v9	t	2025-07-19 02:20:57.077146	2025-07-19 02:20:57.077146	6285606085233
653	4	TOKO TASMIATI	SEMEN	KEDIRI	https://maps.app.goo.gl/yrJQyGEcF2vvedVW8	t	2025-07-19 02:20:57.242136	2025-07-19 02:20:57.242136	6281249714149
654	4	TOKO DAVA	SEMEN	KEDIRI	https://maps.app.goo.gl/TBR6iXTRBHtnKSF88	t	2025-07-19 02:20:57.408262	2025-07-19 02:20:57.408262	6281515906781
655	4	TOKO SYIFA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/28f5L1ke9KN6MaXg9	t	2025-07-19 02:20:57.574369	2025-07-19 02:20:57.574369	6285655932066
656	4	TOKO RIZKUNA 1	MOJOROTO	KEDIRI	https://maps.app.goo.gl/nDKumxGmJT4D2P5r8	t	2025-07-19 02:20:57.745113	2025-07-19 02:20:57.745113	6285345036663
657	4	TOKO HERI	BANYAKAN	KEDIRI	https://maps.app.goo.gl/Wx4KnNCuyqehj6fR8	t	2025-07-19 02:20:57.929208	2025-07-19 02:20:57.929208	6281337356084
658	4	MM SHOP	SEMEN	KEDIRI	https://maps.app.goo.gl/eupLn3QbXPKPvWT66	t	2025-07-19 02:20:58.118481	2025-07-19 02:20:58.118481	6285749012229
659	4	TOKO KARUNIA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/dHLwxHTuj4cyP9FSA	t	2025-07-19 02:20:58.298913	2025-07-19 02:20:58.298913	6282131834573
660	4	AMELIA MART	SEMEN	KEDIRI	https://maps.app.goo.gl/z3p8xA7xsLvq8NaK7	t	2025-07-19 02:20:58.482345	2025-07-19 02:20:58.482345	6283850751772
661	4	KAROMAH ABADI	SEMEN	KEDIRI	https://maps.app.goo.gl/FqXxMZsKtJxU9zcb7	t	2025-07-19 02:20:58.666281	2025-07-19 02:20:58.666281	6285731148258
662	4	TOKO RARA	KEDIRI	KEDIRI	https://maps.app.goo.gl/dpkDvVW5JoBqtCkh9	t	2025-07-19 02:20:58.841062	2025-07-19 02:20:58.841062	6282234103188
663	4	TOKO BASRI	KEDIRI	KEDIRI	https://maps.app.goo.gl/H211E8hPqNiUtgmx5	t	2025-07-19 02:20:59.01027	2025-07-19 02:20:59.01027	6285735436056
664	4	TOKO RESTU IBU	GROGOL	KEDIRI	https://maps.app.goo.gl/dWEzh92Xkp7aAHox5	t	2025-07-19 02:20:59.17934	2025-07-19 02:20:59.17934	\N
665	4	TOKO AMAIRA	BANYAKAN	KEDIRI	https://maps.app.goo.gl/WKS14Epa8ZvewAwM6	t	2025-07-19 02:20:59.343461	2025-07-19 02:20:59.343461	\N
666	4	MUZAYIN ASRUL HUDA	BANYAKAN	KEDIRI	https://maps.app.goo.gl/eFdqppefxH4dMLrV7	t	2025-07-19 02:20:59.618873	2025-07-19 02:20:59.618873	\N
667	4	MADURA MARVIN	BANYAKAN	KEDIRI	https://maps.app.goo.gl/xJ4HQM6W1KLTxp8H9	t	2025-07-19 02:20:59.784252	2025-07-19 02:20:59.784252	\N
668	4	MADURA MART	BANYAKAN	KEDIRI	https://maps.app.goo.gl/U1tbkXC4SvcYuvXi7	t	2025-07-19 02:20:59.941412	2025-07-19 02:20:59.941412	\N
669	4	TOKO ALIF	KEDIRI	KEDIRI	https://maps.app.goo.gl/3RcWdPw5mohdSGxM9	t	2025-07-19 02:21:00.09726	2025-07-19 02:21:00.09726	6285222024750
670	4	OLIVIA SALON	PESANTREN	KEDIRI	https://maps.app.goo.gl/A8DbtQipkEXKWfu86	t	2025-07-19 02:21:00.268999	2025-07-19 02:21:00.268999	6282336544078
671	4	MADURA MART KOTA	KEDIRI	KEDIRI	https://maps.app.goo.gl/m11vffVBAEKmmqHu7	t	2025-07-19 02:21:00.428394	2025-07-19 02:21:00.428394	6285143416100
672	4	TOKO SUNGGING	KEDIRI	KEDIRI	https://maps.app.goo.gl/9VLUD6E91KqjT33B8	t	2025-07-19 02:21:00.579572	2025-07-19 02:21:00.579572	\N
673	4	SALON VIVI	KEDIRI	KEDIRI	https://maps.app.goo.gl/WMkyKig9KbWxgx1y7	t	2025-07-19 02:21:00.740413	2025-07-19 02:21:00.740413	6282113482406
674	4	TOKO ENI	KEDIRI	KEDIRI	https://maps.app.goo.gl/7DECGrppHSACD14G6	t	2025-07-19 02:21:00.897315	2025-07-19 02:21:00.897315	6281333840382
675	4	TOKO LAHAS JAYA	KEDIRI	KEDIRI	https://maps.app.goo.gl/w8hWRD63mEPzWqAA8	t	2025-07-19 02:21:01.051726	2025-07-19 02:21:01.051726	\N
676	4	TOKO MITRA MAKMUR	PESANTREN	KEDIRI	https://maps.app.goo.gl/kXNobskWieks5G8E8	t	2025-07-19 02:21:01.204835	2025-07-19 02:21:01.204835	\N
677	4	TOKO BERKAH ABADI	KEDIRI	KEDIRI	https://maps.app.goo.gl/KJkZ15sauahYhvGv9	t	2025-07-19 02:21:01.376106	2025-07-19 02:21:01.376106	\N
678	4	TOKO AL HUSNA	KEDIRI	KEDIRI	https://maps.app.goo.gl/gkL4ofGjLg5NK81w7	t	2025-07-19 02:21:01.63575	2025-07-19 02:21:01.63575	\N
679	4	TOKO ORA NYONO	KEDIRI	KEDIRI	https://maps.app.goo.gl/KdW8dVsouKbxhUZp6	t	2025-07-19 02:21:01.897386	2025-07-19 02:21:01.897386	\N
680	4	BAR CELL	KEDIRI	KEDIRI	https://maps.app.goo.gl/a83GdBZovTgqB9C46	t	2025-07-19 02:21:02.154127	2025-07-19 02:21:02.154127	\N
681	4	TOKO IKHSAN	KEDIRI	KEDIRI	https://maps.app.goo.gl/6LMpPcqRr51XwaNb7	t	2025-07-19 02:21:02.306934	2025-07-19 02:21:02.306934	\N
682	4	TOKO BU LIS	KEDIRI	KEDIRI	https://maps.app.goo.gl/YtdS32QbwEM73Vac8	t	2025-07-19 02:21:02.460643	2025-07-19 02:21:02.460643	\N
683	4	TOKO MELATI	KEDIRI	KEDIRI	https://maps.app.goo.gl/ZSfZE3DKtKkkkF8M6	t	2025-07-19 02:21:02.677742	2025-07-19 02:21:02.677742	\N
684	4	DELL COM	KEDIRI	KEDIRI	https://maps.app.goo.gl/LdWe3DJbiAwcFhZv7	t	2025-07-19 02:21:02.854193	2025-07-19 02:21:02.854193	\N
685	4	MADURA MART 3	PESANTREN	KEDIRI	https://maps.app.goo.gl/b1PHFS7z5rehceHx6	t	2025-07-19 02:21:03.039023	2025-07-19 02:21:03.039023	\N
686	4	SRC HERI	PESANTREN	KEDIRI	https://maps.app.goo.gl/BjKjyr2nUwSMSS326	t	2025-07-19 02:21:03.384415	2025-07-19 02:21:03.384415	\N
687	4	TOKO MUBAROKAH	KEDIRI	KEDIRI	https://maps.app.goo.gl/r911LVBEGKGPaKdd9	t	2025-07-19 02:21:03.757329	2025-07-19 02:21:03.757329	\N
688	4	SRC KATIYA	KEDIRI	KEDIRI	https://maps.app.goo.gl/Pk5yLBff4mo1CFvp8	t	2025-07-19 02:21:04.067996	2025-07-19 02:21:04.067996	\N
689	4	TOKO SUGENG	KEDIRI	KEDIRI	https://maps.app.goo.gl/cqnxotRfD22Pj5h78	t	2025-07-19 02:21:04.233898	2025-07-19 02:21:04.233898	\N
690	4	TOKO RATIH	KEDIRI	KEDIRI	https://maps.app.goo.gl/6S8coRefFR56KdR87	t	2025-07-19 02:21:04.392619	2025-07-19 02:21:04.392619	\N
691	4	TOKO SAFIRA	PESANTREN	KEDIRI	https://maps.app.goo.gl/3FMH2MR75xu6aiwC6	t	2025-07-19 02:21:04.558172	2025-07-19 02:21:04.558172	\N
692	4	FOTOCOPY EXCEL	PESANTREN	KEDIRI	https://maps.app.goo.gl/oofmzmFdtUYB5Foe7	t	2025-07-19 02:21:04.712805	2025-07-19 02:21:04.712805	\N
693	4	TOKO BANYU MILI	NGASEM	KEDIRI	https://maps.app.goo.gl/2VszJNcFrAKxuakt8	t	2025-07-19 02:21:04.863612	2025-07-19 02:21:04.863612	\N
694	4	INFO CELL	NGASEM	KEDIRI	https://maps.app.goo.gl/8Y6eGzAU9uFrPS3R9	t	2025-07-19 02:21:05.026853	2025-07-19 02:21:05.026853	\N
695	4	TOKO GLOW	NGASEM	KEDIRI	https://maps.app.goo.gl/Kz3LscqssxsnuP2B8	t	2025-07-19 02:21:05.177508	2025-07-19 02:21:05.177508	\N
696	4	ENO SPA	NGASEM	KEDIRI	https://maps.app.goo.gl/xi75uQ9xgHR6xTKq7	t	2025-07-19 02:21:05.32916	2025-07-19 02:21:05.32916	\N
697	4	ARIK ACCESORIS	KEDIRI	KEDIRI	https://maps.app.goo.gl/MxEXXaWUvwNWNoXz8	t	2025-07-19 02:21:05.485645	2025-07-19 02:21:05.485645	\N
698	4	TOKO ALVEN	PESANTREN	KEDIRI	https://maps.app.goo.gl/ar4djiPGAeCVR5BD6	t	2025-07-19 02:21:05.638686	2025-07-19 02:21:05.638686	\N
699	4	TOKO RIZQUNA 5	PESANTREN	KEDIRI	https://maps.app.goo.gl/zRiWaVwwz4L9T6397	t	2025-07-19 02:21:05.808313	2025-07-19 02:21:05.808313	\N
700	4	TOKO IBRAN	PESANTREN	KEDIRI	https://maps.app.goo.gl/Hy28u77VUU2RoAKH6	t	2025-07-19 02:21:05.979007	2025-07-19 02:21:05.979007	\N
701	4	TOKO ARTO MORO	PESANTREN	KEDIRI	https://maps.app.goo.gl/zbnUuYmea6wzt1nc7	t	2025-07-19 02:21:06.15185	2025-07-19 02:21:06.15185	\N
702	4	TOKO DARU SALAM	PESANTREN	KEDIRI	https://maps.app.goo.gl/NSpDzXvGEC2LRWpVA	t	2025-07-19 02:21:06.328652	2025-07-19 02:21:06.328652	\N
703	4	TOKO 58	PESANTREN	KEDIRI	https://maps.app.goo.gl/dyaNDtXkse741n5L9	t	2025-07-19 02:21:06.483434	2025-07-19 02:21:06.483434	\N
704	4	TOKO RAFI	PESANTREN	KEDIRI	https://maps.app.goo.gl/ogfnrkNkrN8VUZGi8	t	2025-07-19 02:21:06.643621	2025-07-19 02:21:06.643621	\N
705	4	TOKO AMAT	PESANTREN	KEDIRI	https://maps.app.goo.gl/MGkupuJjkauVa2j4A	t	2025-07-19 02:21:06.801193	2025-07-19 02:21:06.801193	\N
706	4	TOKO MUDJIANA	NGASEM	KEDIRI	https://maps.app.goo.gl/DiYgjXc7SJYXVn4K6	t	2025-07-19 02:21:06.950806	2025-07-19 02:21:06.950806	\N
707	4	SP CELL	NGASEM	KEDIRI	https://maps.app.goo.gl/ZZYjtoJm1xWpuZjR8	t	2025-07-19 02:21:07.108281	2025-07-19 02:21:07.108281	\N
708	4	TOKO ARYA JAYA	PESANTREN	KEDIRI	https://maps.app.goo.gl/Za6N4TFf5Rm3T2XF6	t	2025-07-19 02:21:07.260018	2025-07-19 02:21:07.260018	\N
709	4	TOKO AKAR PULSA	PESANTREN	KEDIRI	https://maps.app.goo.gl/cSTzESi35mbPmG4H9	t	2025-07-19 02:21:07.413643	2025-07-19 02:21:07.413643	\N
710	4	TOKO SURATI	PESANTREN	KEDIRI	https://maps.app.goo.gl/6J9q66pfB59UCAdg8	t	2025-07-19 02:21:07.569325	2025-07-19 02:21:07.569325	\N
711	4	TOKO RAMA JAYA	SEMEN	KEDIRI	https://maps.app.goo.gl/JenMLfcYfY9GDYak8	t	2025-07-19 02:21:07.742598	2025-07-19 02:21:07.742598	\N
712	4	TOKO HUDA	SEMEN	KEDIRI	https://maps.app.goo.gl/H3sNA1LWwLc1m9MX9	t	2025-07-19 02:21:07.892779	2025-07-19 02:21:07.892779	\N
713	4	TOKO NUR	SEMEN	KEDIRI	https://maps.app.goo.gl/LqbxLztvL6ky9BqBA	t	2025-07-19 02:21:08.046098	2025-07-19 02:21:08.046098	\N
714	4	TOKO JOKO	SEMEN	KEDIRI	https://maps.app.goo.gl/mpyup5Eq3dR2avGp9	t	2025-07-19 02:21:08.236341	2025-07-19 02:21:08.236341	\N
715	4	TOKO TUNGGUL JAYA	SEMEN	KEDIRI	https://maps.app.goo.gl/NNSg1aZByVHcQds57	t	2025-07-19 02:21:08.40125	2025-07-19 02:21:08.40125	\N
716	4	TOKO ZAHRO	SEMEN	KEDIRI	https://maps.app.goo.gl/o3XP38VeKprz2AYq7	t	2025-07-19 02:21:08.558658	2025-07-19 02:21:08.558658	\N
717	4	HANUM CELL	SEMEN	KEDIRI	https://maps.app.goo.gl/ATxbXspBaFFJ3rZMA	t	2025-07-19 02:21:08.714213	2025-07-19 02:21:08.714213	\N
718	4	TOKO BAROKAH	SEMEN	KEDIRI	https://maps.app.goo.gl/84vJu2AqB6ogom2CA	t	2025-07-19 02:21:08.875298	2025-07-19 02:21:08.875298	\N
719	4	TOKO SUSI	SEMEN	KEDIRI	https://maps.app.goo.gl/rdqXAAQnKEiAJWoJ9	t	2025-07-19 02:21:09.020047	2025-07-19 02:21:09.020047	\N
720	4	TOK RUMIASIH	SEMEN	KEDIRI	https://maps.app.goo.gl/cmrnPWRSQeZH6er46	t	2025-07-19 02:21:09.175687	2025-07-19 02:21:09.175687	\N
721	4	TOKO AMAIRA	BANYAKAN	KEDIRI	https://maps.app.goo.gl/XBgNxEa1kC2pVkKu7	t	2025-07-19 02:21:09.328145	2025-07-19 02:21:09.328145	\N
722	4	TOKO DUA PUTRA	KEDIRI	KEDIRI	https://maps.app.goo.gl/WbM4qFzXYJVrqtsN7	t	2025-07-19 02:21:09.480485	2025-07-19 02:21:09.480485	\N
723	4	TOKO JAINURI	KEDIRI	KEDIRI	https://maps.app.goo.gl/jCc3FLASLCmCQKy87	t	2025-07-19 02:21:09.635146	2025-07-19 02:21:09.635146	\N
724	4	TOKO PANAMA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/5VFzb3UxKk1M8TxC9	t	2025-07-19 02:21:09.782694	2025-07-19 02:21:09.782694	\N
725	4	TOKO AQILAH 2	BANYAKAN	KEDIRI	https://maps.app.goo.gl/ZSheCczupRKrWMCx7	t	2025-07-19 02:21:09.936611	2025-07-19 02:21:09.936611	\N
726	4	TOKO CAHAYA	MOJOROTO	KEDIRI	https://maps.app.goo.gl/v9WKdp7rAqhs6hn4A	t	2025-07-19 02:21:10.099444	2025-07-19 02:21:10.099444	\N
727	4	TOKO ANUGRAH	MOJOROTO	KEDIRI	https://maps.app.goo.gl/XZuozGt6ACjiUxJ48	t	2025-07-19 02:21:10.255792	2025-07-19 02:21:10.255792	\N
728	4	TOKO MURTINI	BANYAKAN	KEDIRI	https://maps.app.goo.gl/DFi7F2xD1k4qbjei7	t	2025-07-19 02:21:10.419689	2025-07-19 02:21:10.419689	6285706561077
729	4	APOTEK NGABLAK SEHAT	BANYAKAN	KEDIRI	https://maps.app.goo.gl/zvNF6pRbhqVv6YHVA	t	2025-07-19 02:21:10.598828	2025-07-19 02:21:10.598828	6285749545357
730	4	ADAM MART	BANYAKAN	KEDIRI	https://maps.app.goo.gl/7KkcyvVHorhCbhabA	t	2025-07-19 02:21:10.789021	2025-07-19 02:21:10.789021	6282331744036
731	4	TOKO DIFA	GROGOL	KEDIRI	https://maps.app.goo.gl/CnXGP7Dvm9vtgqvD6	t	2025-07-19 02:21:10.984644	2025-07-19 02:21:10.984644	6281234371206
732	4	TOKO MULYANTO	GROGOL	KEDIRI	https://maps.app.goo.gl/ztn3pGgQiT6x1uzUA	t	2025-07-19 02:21:11.15512	2025-07-19 02:21:11.15512	\N
733	4	TOKO ARMINAREKA	BANYAKAN	KEDIRI	https://maps.app.goo.gl/BR4WUCyxqKTRAnZZ8	t	2025-07-19 02:21:11.319859	2025-07-19 02:21:11.319859	628125953137
734	4	TOKO MBAK ASA	GROGOL	KEDIRI	https://maps.app.goo.gl/pinDgYYWgX7xfHQKA	t	2025-07-19 02:21:11.474702	2025-07-19 02:21:11.474702	\N
735	4	TOKO NAWI	BANYAKAN	KEDIRI	https://maps.app.goo.gl/C8puQ4f49krk2pSf9	t	2025-07-19 02:21:11.6246	2025-07-19 02:21:11.6246	6285736959584
736	4	CORNER CELL	GROGOL	KEDIRI	https://maps.app.goo.gl/kDrod9WgsqKct2H9A	t	2025-07-19 02:21:11.781256	2025-07-19 02:21:11.781256	\N
737	4	TOKO K-CUNK	NGASEM	KEDIRI	https://maps.app.goo.gl/G8dwjByjw4WZzNms8	t	2025-07-19 02:21:11.937436	2025-07-19 02:21:11.937436	6282331597191
738	4	TOKO RINDI JAYA	PESANTREN	KEDIRI	https://maps.app.goo.gl/ZdKtkmgozt98PjBv8	t	2025-07-19 02:21:12.101678	2025-07-19 02:21:12.101678	\N
739	4	TOKO KAMIL SEMBAKO	MOJOROTO	KEDIRI	https://maps.app.goo.gl/UsYtAMRefbBaggVB6	t	2025-07-19 02:21:12.255913	2025-07-19 02:21:12.255913	6285731390815
740	4	JP MART 1	BANYAKAN	KEDIRI	https://maps.app.goo.gl/ToaZ1heyt6Qv8BNYA	t	2025-07-19 02:21:12.417331	2025-07-19 02:21:12.417331	6281996630351
741	4	57 CELL	BANYAKAN	KEDIRI	https://maps.app.goo.gl/ApqZwALRpznURfbq5	t	2025-07-19 02:21:12.576676	2025-07-19 02:21:12.576676	\N
742	4	TOKO YASMIN	BANYAKAN	KEDIRI	https://maps.app.goo.gl/4z1uaU4fp5MQ8d2X6	t	2025-07-19 02:21:12.727818	2025-07-19 02:21:12.727818	6287840603979
743	4	TOKO CITRA ABADI	BANYAKAN	KEDIRI	https://maps.app.goo.gl/z31QuAvnJbpds5j46	t	2025-07-19 02:21:12.883895	2025-07-19 02:21:12.883895	\N
744	4	TOKO CAHAYA ABADI	BANYAKAN	KEDIRI	https://maps.app.goo.gl/Z2zuhPoJqfRuhZyX9	t	2025-07-19 02:21:13.03567	2025-07-19 02:21:13.03567	\N
745	4	ERIK ACCESORIS	KEDIRI	KEDIRI	https://maps.app.goo.gl/oUjXU2cwwwGfJ58L7	t	2025-07-19 02:21:13.182257	2025-07-19 02:21:13.182257	\N
746	4	KISS CELL	KEDIRI	KEDIRI	https://maps.app.goo.gl/CKZpKgJ43ez31B479	t	2025-07-19 02:21:13.363202	2025-07-19 02:21:13.363202	\N
747	4	TOKO KEN KEN	KEDIRI	KEDIRI	https://maps.app.goo.gl/Nx9nUq9TdaSg5B4JA	t	2025-07-19 02:21:13.514597	2025-07-19 02:21:13.514597	\N
748	4	TOKO ANIK	BANYAKAN	KEDIRI	https://maps.app.goo.gl/kGKRaEKExS5oPSGK7	t	2025-07-19 02:21:13.682634	2025-07-19 02:21:13.682634	\N
749	4	INDOMAKMUR MART	BANYAKAN	KEDIRI	https://maps.app.goo.gl/aPUPzUbzSo7vJvWD9	t	2025-07-19 02:21:13.838531	2025-07-19 02:21:13.838531	\N
750	4	DBS MART	BANYAKAN	KEDIRI	https://maps.app.goo.gl/xwY5MTnQMbktBnRp9	t	2025-07-19 02:21:13.997646	2025-07-19 02:21:13.997646	6285852397519
751	4	RIZQYA BEAUTY STORE	BANYAKAN	KEDIRI	https://maps.app.goo.gl/vLW4bV4DnWyAYX6h9	t	2025-07-19 02:21:14.155559	2025-07-19 02:21:14.155559	6281231471610
752	4	JAVA MART	GROGOL	KEDIRI	https://maps.app.goo.gl/566c1Dzc3ZVenCiW9	t	2025-07-19 02:21:14.318226	2025-07-19 02:21:14.318226	\N
753	4	TOKO MEKAR SARI	GROGOL	KEDIRI	https://maps.app.goo.gl/qLW3NQiqX8FgV6Ui6	t	2025-07-19 02:21:14.471731	2025-07-19 02:21:14.471731	\N
754	4	TOKO URIL	GROGOL	KEDIRI	https://maps.app.goo.gl/SVSLknAGjCNQbzUM8	t	2025-07-19 02:21:14.619924	2025-07-19 02:21:14.619924	\N
755	4	OKO EDI ARMADANI	GROGOL	KEDIRI	https://maps.app.goo.gl/GTspQybqFQcXc8FL9	t	2025-07-19 02:21:14.781819	2025-07-19 02:21:14.781819	\N
756	4	OKO REJEKI MUDA	GROGOL	KEDIRI	https://maps.app.goo.gl/cCC3nLqyk4hBhz9w8	t	2025-07-19 02:21:14.938955	2025-07-19 02:21:14.938955	\N
757	4	TOKO RIZKY MUDA	GAMPENGREJO	KEDIRI	https://maps.app.goo.gl/E2T6E2EpKJhZy9DA8	t	2025-07-19 02:21:15.085225	2025-07-19 02:21:15.085225	6281259426466
758	4	BERKAH JAYA	MANISRENGGO	KEDIRI	https://maps.app.goo.gl/FHvUrrWjVJGBTvAd8	t	2025-07-19 02:21:15.23595	2025-07-19 02:21:15.23595	6282245900728
759	5	TOKO PAK AGUS	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/tSTjh1cNTJd6PbsR7	t	2025-07-19 02:21:15.435274	2025-07-19 02:21:15.435274	6285259998278
760	5	TOKO BU YAYUK	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/cYC6CTK5s7ZMVDRe8	t	2025-07-19 02:21:15.585177	2025-07-19 02:21:15.585177	6285736206998
761	5	TOKO MBAK TUN	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/cCwKFMApDbp2JEC88	t	2025-07-19 02:21:15.736346	2025-07-19 02:21:15.736346	6285646430402
762	5	TOKO MBAK INTAN	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/mFjYHo8gN5GHTekn8	t	2025-07-19 02:21:15.893913	2025-07-19 02:21:15.893913	6281252059672
763	5	TOKO MBAK NITA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/HiHsyWEuo4u6FKWN6	t	2025-07-19 02:21:16.058707	2025-07-19 02:21:16.058707	6285649176850
764	5	TOKO BU RETNO	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/yrEtUGiuPbHBoGrB8	t	2025-07-19 02:21:16.2086	2025-07-19 02:21:16.2086	6285755555215
765	5	TOKO BU NUR	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/XXV25ufCGA4mbvvo9	t	2025-07-19 02:21:16.362774	2025-07-19 02:21:16.362774	6285859136793
766	5	RAFA CELL	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/qr7GmPR5MaYFeEuq6	t	2025-07-19 02:21:16.51735	2025-07-19 02:21:16.51735	6285333280654
767	5	TOKO TAHTA JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/wC9YVJwThVP1eASG9	t	2025-07-19 02:21:16.664068	2025-07-19 02:21:16.664068	6285755188918
768	5	TOKO MBAK IDA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/UbhzSj61uc2aZJJ1A	t	2025-07-19 02:21:16.813635	2025-07-19 02:21:16.813635	6285748222792
769	5	TOKO BERKAH	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/2EVctH9GTfHvPe4x7	t	2025-07-19 02:21:16.970071	2025-07-19 02:21:16.970071	6285953753118
770	5	TOKO HARTONO	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Pqz11PDN1RXbbXDa7	t	2025-07-19 02:21:17.131456	2025-07-19 02:21:17.131456	6281317652332
771	5	TOKO BU ENDANG	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Qe3Wk4j16HN84S2J9	t	2025-07-19 02:21:17.292145	2025-07-19 02:21:17.292145	6289654863377
772	5	AGVA CELL	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/sy9cjVp6KRCMKFxCA	t	2025-07-19 02:21:17.46803	2025-07-19 02:21:17.46803	6285607504779
773	5	TOKO DAMARA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/KMcejGiWVDiaLVLY6	t	2025-07-19 02:21:17.627023	2025-07-19 02:21:17.627023	6281554199625
774	5	PINK MART	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/trrbKjok7vwACF5t8	t	2025-07-19 02:21:17.783625	2025-07-19 02:21:17.783625	6282353808997
775	5	TOKO AZ-ZAHRA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/BwzdfijkFKvfX3as7	t	2025-07-19 02:21:17.935541	2025-07-19 02:21:17.935541	6289509977959
776	5	TOKO BU TITIK	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/MA7wHcKNuupp76Yi9	t	2025-07-19 02:21:18.086586	2025-07-19 02:21:18.086586	6285233513991
777	5	TOKO NANDA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/c87BPxJEMvFs7eFs7	t	2025-07-19 02:21:18.267452	2025-07-19 02:21:18.267452	6285736543672
778	5	ULFA SHOP	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Pt5LmfUUqaEX9WBcA	t	2025-07-19 02:21:18.456249	2025-07-19 02:21:18.456249	6285646676306
779	5	TOKO PAK SUGENG	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/NhnNn8JhYyEwTrhb6	t	2025-07-19 02:21:18.642554	2025-07-19 02:21:18.642554	6281333445744
780	5	TOKO BAGAS	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/LUPAV41YSbrCnx7W8	t	2025-07-19 02:21:18.807677	2025-07-19 02:21:18.807677	6285808780525
781	5	TOKO SAIFUL	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/cVAghFrfRtdhnyXQ6	t	2025-07-19 02:21:18.957528	2025-07-19 02:21:18.957528	6281259818696
782	5	SRC WIJAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/KyRTmjr1WQbiknGy9	t	2025-07-19 02:21:19.116596	2025-07-19 02:21:19.116596	6281259710005
783	5	ULFA JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/QxyAmzzZaHWdZFFy8	t	2025-07-19 02:21:19.266733	2025-07-19 02:21:19.266733	6285852066243
784	5	TOKO PAK KUAT	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/qG4CLaCrvAXwwPnaA	t	2025-07-19 02:21:19.437132	2025-07-19 02:21:19.437132	6285262480274
785	5	TOKO MEMEY	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/br7VbZWEQWPCsy5R6	t	2025-07-19 02:21:19.587659	2025-07-19 02:21:19.587659	6281233801778
786	5	TOKO BAROKAH	KEDIRI	KEDIRI	https://maps.app.goo.gl/cD2Yyc6fsCCMH5Dj9	t	2025-07-19 02:21:19.747009	2025-07-19 02:21:19.747009	6285336265785
787	5	SRC LILIK	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/8kwm41u5eroWWprT7	t	2025-07-19 02:21:19.898882	2025-07-19 02:21:19.898882	6285335223070
788	5	TOKO BU DEA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/zBwjjmwVUQj154Zn7	t	2025-07-19 02:21:20.055193	2025-07-19 02:21:20.055193	62822644144441
789	5	TOKO BU RETNO KEPUH	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/S7MDC6U4HvkiHLcBA	t	2025-07-19 02:21:20.209218	2025-07-19 02:21:20.209218	6282336711173
790	5	TOKO BU YULNA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/XSUM8Y9itJRzLwPE8	t	2025-07-19 02:21:20.358773	2025-07-19 02:21:20.358773	6285606999742
791	5	SRC BERKAH JAYA ARFAN	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/t91h8znh6N3BFhnc9	t	2025-07-19 02:21:20.516939	2025-07-19 02:21:20.516939	6282299834865
792	5	TOKO BERKAH JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/zh9H1SEx2jkW2rp88	t	2025-07-19 02:21:20.668634	2025-07-19 02:21:20.668634	6285843109556
793	5	TOKO PANJI	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/SC34Gh1b58jiKeJi7	t	2025-07-19 02:21:20.819735	2025-07-19 02:21:20.819735	6285888666744
794	5	TOKO NISA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/EEmeoSZFy5vk1dju8	t	2025-07-19 02:21:20.973597	2025-07-19 02:21:20.973597	6285812248878
795	5	TOKO AHMAD JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/5rr43N8eiccbxkBH7	t	2025-07-19 02:21:21.132025	2025-07-19 02:21:21.132025	628133562770
796	5	SRC NANIK	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Xcy5wfgfKfG5KBzD8	t	2025-07-19 02:21:21.282741	2025-07-19 02:21:21.282741	6281316219586
797	5	TOKO BAROKAH JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/kdyceiU9xwR7oCNJ9	t	2025-07-19 02:21:21.441413	2025-07-19 02:21:21.441413	6285785092726
798	5	TOKO BERAS JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/6G8U6WScpfwWgueA9	t	2025-07-19 02:21:21.590274	2025-07-19 02:21:21.590274	6285607263889
799	5	TOKO KAWLA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/9tkx41s2yvwV2BQm6	t	2025-07-19 02:21:21.740244	2025-07-19 02:21:21.740244	6285736814564
800	5	TOKO BU MEI	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/6Q1xvcTM5zS4SfEA6	t	2025-07-19 02:21:21.890707	2025-07-19 02:21:21.890707	6282245583285
801	5	TOKO ABAD ABID	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Xp8KCm78sSj6MCky9	t	2025-07-19 02:21:22.05079	2025-07-19 02:21:22.05079	6282332032176
802	5	TOKO LUMINTU	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/A26RTi68oksVNBhC9	t	2025-07-19 02:21:22.204888	2025-07-19 02:21:22.204888	6281357022521
803	5	SRC RUKIN	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Azyi6rJnz2SJLU1t5	t	2025-07-19 02:21:22.358686	2025-07-19 02:21:22.358686	6285708832039
804	5	TOKO MAHESA BETA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/yeFfqwkiYJxqv3Du8	t	2025-07-19 02:21:22.522845	2025-07-19 02:21:22.522845	6285815041099
805	5	TOKO CIMA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Lv7u49RnbtKJmtWx7	t	2025-07-19 02:21:22.675977	2025-07-19 02:21:22.675977	6281555489060
806	5	TOKO RAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/ukfATTrSgvrrf5dC8	t	2025-07-19 02:21:22.830072	2025-07-19 02:21:22.830072	6285735232865
807	5	TOKO BALAP	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/HuwKHiHj5KE4JVWf6	t	2025-07-19 02:21:22.979685	2025-07-19 02:21:22.979685	6283131057115
808	5	TOKO HIDAYAH	MOJO	KEDIRI	https://maps.app.goo.gl/qMBVtRDPPu7H3j4r7	t	2025-07-19 02:21:23.135225	2025-07-19 02:21:23.135225	6281553309002
809	5	TOKO BAGUS	MOJO	KEDIRI	https://maps.app.goo.gl/P4b9keSx38RUfk6L7	t	2025-07-19 02:21:23.291955	2025-07-19 02:21:23.291955	6285606716706
810	5	AL FIRDAUS MART	MOJO	KEDIRI	https://maps.app.goo.gl/aq8ucZsCdvV7uerc8	t	2025-07-19 02:21:23.460081	2025-07-19 02:21:23.460081	6285336183545
811	5	TOKO ZOM ROHIM	MOJO	KEDIRI	https://maps.app.goo.gl/sQYHzfNtdAaKjMrk9	t	2025-07-19 02:21:23.659697	2025-07-19 02:21:23.659697	628585602201
812	5	NATHA SHOP	MOJO	KEDIRI	https://maps.app.goo.gl/5csUsZqjuh45fsrx5	t	2025-07-19 02:21:23.88785	2025-07-19 02:21:23.88785	6282230374777
813	5	TOKO SUMBER REZEKY	MOJO	KEDIRI	https://maps.app.goo.gl/AJz2t2fLHyqFkktT6	t	2025-07-19 02:21:24.19816	2025-07-19 02:21:24.19816	6282132357195
814	5	TOKO BAROKAH BESUKI	MOJO	KEDIRI	https://maps.app.goo.gl/Yy86vtp83yaz2Tgr8	t	2025-07-19 02:21:24.356703	2025-07-19 02:21:24.356703	6285704709110
815	5	SRC SITI RODIATUL	MOJO	KEDIRI	https://maps.app.goo.gl/Bko1knAXYBbMzuUJ9	t	2025-07-19 02:21:24.504287	2025-07-19 02:21:24.504287	6285607504779
816	5	TOKO BU NURUL	MOJO	KEDIRI	https://maps.app.goo.gl/U3g4pyv2Vd4s9R9u9	t	2025-07-19 02:21:24.665069	2025-07-19 02:21:24.665069	6281217473150
817	5	TOKO BAROKAH SURAT	MOJO	KEDIRI	https://maps.app.goo.gl/hvuG3e73jNSax2Kn7	t	2025-07-19 02:21:24.820639	2025-07-19 02:21:24.820639	6285607643019
818	5	TOKO ZADA	MOJO	KEDIRI	https://maps.app.goo.gl/ihGViJLtKBR9XKBN7	t	2025-07-19 02:21:24.975994	2025-07-19 02:21:24.975994	6285608145754
819	5	TOKO BU NUR	MOJO	KEDIRI	https://maps.app.goo.gl/wxfCBU3v4Q1dExjc7	t	2025-07-19 02:21:25.126973	2025-07-19 02:21:25.126973	6285856473331
820	5	TOKO AZZAIM	MOJO	KEDIRI	https://maps.app.goo.gl/ab71YHLdzYXmcZLU6	t	2025-07-19 02:21:25.288875	2025-07-19 02:21:25.288875	6282146283271
821	5	TOKO BAROKAH PLOSO	MOJO	KEDIRI	https://maps.app.goo.gl/GKL1TfkaUgjMPZT19	t	2025-07-19 02:21:25.437989	2025-07-19 02:21:25.437989	6285790313304
822	5	TOKO HERU	MOJO	KEDIRI	https://maps.app.goo.gl/EAq79snkfhJGrGm56	t	2025-07-19 02:21:25.606448	2025-07-19 02:21:25.606448	6285748956820
823	5	TOKO RIRIN	MOJO	KEDIRI	https://maps.app.goo.gl/DjFrMuTuDJQQGUWb6	t	2025-07-19 02:21:25.782492	2025-07-19 02:21:25.782492	6285564621731
824	5	SRC ASMAKIN	MOJO	KEDIRI	https://maps.app.goo.gl/iTETw7zbCzCKJf8u9	t	2025-07-19 02:21:25.984649	2025-07-19 02:21:25.984649	6285843323795
825	5	TOKO SUMBER RIZKY	MOJO	KEDIRI	https://maps.app.goo.gl/4Z3ftjNiBRY6CHAR8	t	2025-07-19 02:21:26.167057	2025-07-19 02:21:26.167057	6281217022952
826	5	TOKO NUANSA SEHAT	MOJO	KEDIRI	https://maps.app.goo.gl/SFw6CqmNp5c4JQKC6	t	2025-07-19 02:21:26.363564	2025-07-19 02:21:26.363564	6281336350847
827	5	SRC IRWAN	MOJO	KEDIRI	https://maps.app.goo.gl/rda3jb7yGPqhAz3A7	t	2025-07-19 02:21:26.538609	2025-07-19 02:21:26.538609	6285746621663
828	5	TOKO BU PREH	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/fCSLmkNYyDBfHDJx7	t	2025-07-19 02:21:26.700899	2025-07-19 02:21:26.700899	6281233357023
829	5	SRC MUTIAH	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/PD8pPZ7xLvNhMpWX8	t	2025-07-19 02:21:26.86305	2025-07-19 02:21:26.86305	6285736975192
830	5	SRC ISTI	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/JAuti8y5a27z5Jj9A	t	2025-07-19 02:21:27.028847	2025-07-19 02:21:27.028847	6281259099983
831	5	TOKO BU WARIN	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/N3eLn6F1wa74u4zM9	t	2025-07-19 02:21:27.198863	2025-07-19 02:21:27.198863	6285607504779
832	5	SRC HOKKI	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/HkanuFq1n1DfUhB1A	t	2025-07-19 02:21:27.357697	2025-07-19 02:21:27.357697	6285736504999
833	5	TOKO SUMBER REZEKI KRAS	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/KTn1mtf6X8m2TFGz5	t	2025-07-19 02:21:27.523528	2025-07-19 02:21:27.523528	6285736930396
834	5	TOKO RAMADHAN	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/bxANPjgEt788VPW68	t	2025-07-19 02:21:27.695746	2025-07-19 02:21:27.695746	6285790768904
835	5	TOKO ALSEBA JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Kg77R6E4MjnEpbUUA	t	2025-07-19 02:21:27.867468	2025-07-19 02:21:27.867468	6285607590350
836	5	SRC ELOK	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/QMXQqxp72iHVYm1y7	t	2025-07-19 02:21:28.028853	2025-07-19 02:21:28.028853	6285871540463
837	5	MADURA MART 1	KANDAT	KEDIRI	https://maps.app.goo.gl/W6SXCoQ1fKVB7xuM6	t	2025-07-19 02:21:28.192932	2025-07-19 02:21:28.192932	6283834368681
838	5	MADURA MART 2	KANDAT	KEDIRI	https://maps.app.goo.gl/BqetohZ2UjALzY8Z8	t	2025-07-19 02:21:28.355105	2025-07-19 02:21:28.355105	6287710530583
839	5	PUSPITA  MART	KRAS	KEDIRI	https://maps.app.goo.gl/D9D68UHyNzGJiF8f9	t	2025-07-19 02:21:28.518574	2025-07-19 02:21:28.518574	6285649507066
840	5	TOKO SANJAYA	KRAS	KEDIRI	https://maps.app.goo.gl/vKoe99YZqGWrHzT76	t	2025-07-19 02:21:28.68016	2025-07-19 02:21:28.68016	628573586003
841	5	ALYA MART	MOJO	KEDIRI	https://maps.app.goo.gl/6YiSHemz3M8QqAtq5	t	2025-07-19 02:21:28.846158	2025-07-19 02:21:28.846158	628123456855
842	5	LANCAR BAROKAH	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/Cr6g675uec1zUpJg8	t	2025-07-19 02:21:29.009143	2025-07-19 02:21:29.009143	6285736049560
843	5	TOKO ANDI JAYA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/4jChFvrvQYkAhd5r9	t	2025-07-19 02:21:29.17654	2025-07-19 02:21:29.17654	6282141671799
844	5	YONI MART	KRAS	KEDIRI	https://maps.app.goo.gl/BduCnxzqrHMu6KFW9	t	2025-07-19 02:21:29.344082	2025-07-19 02:21:29.344082	6285735686229
845	5	TOKO HELLO	SUMBERGEMPOL	TULUNGAGUNG	https://maps.app.goo.gl/dhYbUKytdZCv3V2h8	t	2025-07-19 02:21:29.511102	2025-07-19 02:21:29.511102	6281235394955
846	5	TOKO LUTFIATI	SUMBERGEMPOL	TULUNGAGUNG	https://maps.app.goo.gl/PPLqFvfmc7BTGSqNA	t	2025-07-19 02:21:29.67492	2025-07-19 02:21:29.67492	628546042012
847	5	TOKO KENTHOENG	KEDUNGWARU	TULUNGAGUNG	https://maps.app.goo.gl/sk5CzpbUZSiTzj4r8	t	2025-07-19 02:21:29.840177	2025-07-19 02:21:29.840177	62859171549039
848	5	SRC WYGATI	KEDUNGWARU	TULUNGAGUNG	https://maps.app.goo.gl/THt4QHLVjCh1kWAD8	t	2025-07-19 02:21:30.020965	2025-07-19 02:21:30.020965	6281232174352
849	5	TOKO ROSELLA	KEDUNGWARU	TULUNGAGUNG	https://maps.app.goo.gl/jpp9hbXs11faKsrr9	t	2025-07-19 02:21:30.18697	2025-07-19 02:21:30.18697	6283117942422
850	5	CAHAYA KOSMETIK	NGANTRU	TULUNGAGUNG	https://maps.app.goo.gl/QjwvWG3DDpFE6LMF8	t	2025-07-19 02:21:30.355568	2025-07-19 02:21:30.355568	6285730758796
851	5	SALAM MART	WONODADI	BLITAR	https://maps.app.goo.gl/b2mzD6S9we8YL4gGA	t	2025-07-19 02:21:30.527696	2025-07-19 02:21:30.527696	6281703021068
852	5	AN JAYA	WONODADI	BLITAR	https://maps.app.goo.gl/kb75757CSnTuxhmG6	t	2025-07-19 02:21:30.695317	2025-07-19 02:21:30.695317	6285607504779
853	5	SRC  MUNIR	NGANTRU	TULUANGUNG	https://maps.app.goo.gl/3mcbkauyXudngUgd7	t	2025-07-19 02:21:30.878572	2025-07-19 02:21:30.878572	6285233141976
854	5	SRC SIRKUIT	WONODADI	BLITAR	https://maps.app.goo.gl/LAvnsy3sxGpSLCv46	t	2025-07-19 02:21:31.043988	2025-07-19 02:21:31.043988	6285791202215
855	5	RUMAH KOSMETIK	NGANTRU	TULUNGAGUNG	https://maps.app.goo.gl/dQF8A6vhodhuANVj7	t	2025-07-19 02:21:31.218722	2025-07-19 02:21:31.218722	62859727153
856	5	NABILA KOSMETIK	WONODADI	BLITAR	https://maps.app.goo.gl/Lo7rKSsswEaJWCr97	t	2025-07-19 02:21:31.383962	2025-07-19 02:21:31.383962	6285856898062
857	5	DYAN CELL	NGANTRU	TULUNGAGUNG	https://maps.app.goo.gl/pVkxg1FyUFVJ6VBR8	t	2025-07-19 02:21:31.551092	2025-07-19 02:21:31.551092	6281339770052
858	5	TOKO UTAMI	NGANTRU	TULUNGAGUNG	https://maps.app.goo.gl/9oZ55aJhdi7bu9QA6	t	2025-07-19 02:21:31.71435	2025-07-19 02:21:31.71435	6281556624377
859	5	TOKO ARTOMORO	KRAS	KEDIRI	https://maps.app.goo.gl/qjvfLrbJ575PzEU66	t	2025-07-19 02:21:31.87367	2025-07-19 02:21:31.87367	6282142152380
860	5	SRC SUBUR MAKMUR	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/HumUA5E4b95gWivW6	t	2025-07-19 02:21:32.031662	2025-07-19 02:21:32.031662	6285235826789
861	5	SRC PAK NARYO	KRAS	KEDIRI	https://maps.app.goo.gl/222yHFcYg79gpSYv5	t	2025-07-19 02:21:32.195925	2025-07-19 02:21:32.195925	6281255057181
862	5	APOTEK ROSA FARMA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/dTUhYfEkQASkFi739	t	2025-07-19 02:21:32.356383	2025-07-19 02:21:32.356383	6285859671245
863	5	SRC KOMSIAH	RINGINREJO	KEDIRI	https://maps.app.goo.gl/ZyqY45xqE7eBqurV8	t	2025-07-19 02:21:32.515741	2025-07-19 02:21:32.515741	6281335233602
864	5	ALIBABA NART	RINGINREJO	KEDIRI	https://maps.app.goo.gl/BxJBcU6QPCrPx6Uo7	t	2025-07-19 02:21:32.683199	2025-07-19 02:21:32.683199	6285749363496
865	5	AAN CELL	RINGINREJO	KEDIRI	https://maps.app.goo.gl/jqSHuXBxGfc2nZJk6	t	2025-07-19 02:21:32.880211	2025-07-19 02:21:32.880211	6281615644266
866	5	AV MART	RINGINREJO	KEDIRI	https://maps.app.goo.gl/zKf8g53etw1nYcAeA	t	2025-07-19 02:21:33.329571	2025-07-19 02:21:33.329571	6281515570580
867	5	RIZKYA CELL	RINGINREJO	KEDIRI	https://maps.app.goo.gl/LKFJoDNGzTVKPSgt9	t	2025-07-19 02:21:33.782775	2025-07-19 02:21:33.782775	6281553539006
868	5	SRC ALFIAH	RINGINREJO	KEDIRI	https://maps.app.goo.gl/FsXdBHQk95CPcQPV7	t	2025-07-19 02:21:34.016442	2025-07-19 02:21:34.016442	6285607504779
869	5	TOKO SINAR JAYA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/6DXvZdLHgGNvEDUbA	t	2025-07-19 02:21:34.200852	2025-07-19 02:21:34.200852	6285856219599
870	5	TOKO LANGGENG JAYA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/pyxYWk1apR7p3pX78	t	2025-07-19 02:21:34.378919	2025-07-19 02:21:34.378919	6285956168039
871	5	TOKO BEDJO FARMA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/rSEGczf9RLMPDpGm8	t	2025-07-19 02:21:34.535826	2025-07-19 02:21:34.535826	6285855236852
872	5	SRC SOBAR	RINGINREJO	KEDIRI	https://maps.app.goo.gl/VSCzwffiXX2ujfEw5	t	2025-07-19 02:21:34.698079	2025-07-19 02:21:34.698079	628125578674
873	5	APOTEK CANDRA WIJAYA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/1MxCRFXPThbjrLrg9	t	2025-07-19 02:21:34.881152	2025-07-19 02:21:34.881152	6285646700989
874	5	TOKO BU ELI	RINGINREJO	KEDIRI	https://maps.app.goo.gl/MUBQV8f6NzZD7smc7	t	2025-07-19 02:21:35.042347	2025-07-19 02:21:35.042347	6285751047835
875	5	TOKO BU PUTRI	KANDAT	KEDIRI	https://maps.app.goo.gl/qyXyX2ky6sxs4Jyg8	t	2025-07-19 02:21:35.200182	2025-07-19 02:21:35.200182	6287812004888
876	5	OKE MART	KANDAT	KEDIRI	https://maps.app.goo.gl/fecotfUFqeDcVaZr9	t	2025-07-19 02:21:35.356897	2025-07-19 02:21:35.356897	6285815928343
877	5	TOKO BU ANA	KANDAT	KEDIRI	https://maps.app.goo.gl/ivbUREsQtz29buuy6	t	2025-07-19 02:21:35.528853	2025-07-19 02:21:35.528853	6285857891011
878	5	TOKO PRIMA	KANDAT	KEDIRI	https://maps.app.goo.gl/CJjZoAfB1WBiaBte6	t	2025-07-19 02:21:35.699412	2025-07-19 02:21:35.699412	6285210447988
879	5	TOKO BU MARMI	KANDAT	KEDIRI	https://maps.app.goo.gl/S6Mr37hp7wKjdt5H6	t	2025-07-19 02:21:35.926925	2025-07-19 02:21:35.926925	6285648274262
880	5	MITHUK BAROKAH	KRAS	KEDIRI	https://maps.app.goo.gl/2mWviAKfb8MLUKZA9	t	2025-07-19 02:21:36.086136	2025-07-19 02:21:36.086136	6281335066635
881	5	APOTEK ADE FARMA	KRAS	KEDIRI	https://maps.app.goo.gl/wrc77D7C6Sayv2Lp7	t	2025-07-19 02:21:36.244996	2025-07-19 02:21:36.244996	6285212911522
882	5	SINYO CELL	KRAS	KEDIRI	https://maps.app.goo.gl/vEvsk24vaAGNNzG87	t	2025-07-19 02:21:36.423592	2025-07-19 02:21:36.423592	6285707378828
883	5	BINTANG CELL	RINGINREJO	KEDIRI	https://maps.app.goo.gl/tBd4iYvxp1UjEdm58	t	2025-07-19 02:21:36.589289	2025-07-19 02:21:36.589289	628590149019
884	5	APOTEK DAVITA FARMA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/C4ZHkT6LVvrFsFa86	t	2025-07-19 02:21:36.763811	2025-07-19 02:21:36.763811	628233325170
885	5	JURAGAN DATA	RINGINREJO	KEDIRI	https://maps.app.goo.gl/A9v5qfmTowDRTFZC8	t	2025-07-19 02:21:36.928801	2025-07-19 02:21:36.928801	6285655664411
886	5	MURMER CELL	KANDAT	KEDIRI	https://maps.app.goo.gl/55XEK76cdzKqLSbM7	t	2025-07-19 02:21:37.104265	2025-07-19 02:21:37.104265	6281216959143
887	5	BINA BERKAH	KANDAT	KEDIRI	https://maps.app.goo.gl/C5gt71Yvu6qXduyq6	t	2025-07-19 02:21:37.263597	2025-07-19 02:21:37.263597	628813110583
888	5	ASIA CELL	SAMBI	KEDIRI	https://maps.app.goo.gl/EeDt6bDeSKNK1xbR9	t	2025-07-19 02:21:37.432115	2025-07-19 02:21:37.432115	628117576766
889	5	MADURA MOJO	MOJO	KEDIRI	https://maps.app.goo.gl/6tB9niVKLmEG7FSn9	t	2025-07-19 02:21:37.596212	2025-07-19 02:21:37.596212	6282337933394
890	5	BADRIS CELL	MOJO	KEDIRI	https://maps.app.goo.gl/RhQsTKZZktmD7hr88	t	2025-07-19 02:21:37.763675	2025-07-19 02:21:37.763675	6282234244944
891	5	AGEN MOJO	MOJO	KEDIRI	https://maps.app.goo.gl/iGEegVZzaicG7Y2p7	t	2025-07-19 02:21:37.932211	2025-07-19 02:21:37.932211	6287881546109
892	5	TOKO TIARA	MOJO	KEDIRI	https://maps.app.goo.gl/QBQdebwbheddS9BEA	t	2025-07-19 02:21:38.096831	2025-07-19 02:21:38.096831	\N
893	5	TOKO BAGUS	KANDAT	KEDIRI	https://maps.app.goo.gl/Vqxx6W2pdkHRJ27p9	t	2025-07-19 02:21:38.267785	2025-07-19 02:21:38.267785	6281615781465
894	5	AL FAZZA	WATES	KEDIRI	https://maps.app.goo.gl/u8rr87U9cAikLXKT6	t	2025-07-19 02:21:38.440609	2025-07-19 02:21:38.440609	6281343366872
895	5	TOKO RIA	KANDAT	KEDIRI	https://maps.app.goo.gl/SCAr8eqWQxDYU9919	t	2025-07-19 02:21:38.600749	2025-07-19 02:21:38.600749	6281235588993
896	5	HIBATILLAH	PESANTREN	KEDIRI	https://maps.app.goo.gl/8THjVWnmSxK9EYfQA	t	2025-07-19 02:21:38.759254	2025-07-19 02:21:38.759254	6282233314846
897	5	BISMILLAH BERKAH	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/k1ra8vsFqGPpJhGQ6	t	2025-07-19 02:21:38.92607	2025-07-19 02:21:38.92607	6281949518368
898	5	DHARMO JAYA	KRAS	KEDIRI	https://maps.app.goo.gl/HytpekKe11mAVNgDA	t	2025-07-19 03:56:26.924796	2025-07-19 03:56:26.924796	\N
44	1	GLOW UP 1	TAMBRAN	MAGETAN	https://maps.app.goo.gl/6AcUrCBcoUP1As3r6	t	2025-07-19 02:19:09.937103	2025-07-19 02:19:09.937103	6285646420772
899	5	HAVIDA CELL	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/ai5HW2W9qFQNrhjs8	t	2025-07-19 07:38:53.992636	2025-07-19 07:38:53.992636	\N
900	5	APOTEK ALIYA FARMA	NGADILUWIH	KEDIRI	https://maps.app.goo.gl/pj6zH4U8mbSrVuFW9	t	2025-07-19 07:38:55.201317	2025-07-19 07:38:55.201317	\N
901	5	ANAM CELL	KRAS	KEDIRI	https://maps.app.goo.gl/1uwGArP7CRputLRMA	t	2025-07-19 07:38:56.665979	2025-07-19 07:38:56.665979	\N
902	5	APOTEK SWALAYAN	MOJO	KEDIRI	https://maps.app.goo.gl/QFyjwPpkbKZbvhC6A	t	2025-07-19 07:38:57.826216	2025-07-19 07:38:57.826216	\N
903	5	TOKO KUZUKA	MOJO	KEDIRI	https://maps.app.goo.gl/DU88dx5LZNvbHgoYA	t	2025-07-19 07:38:59.029079	2025-07-19 07:38:59.029079	\N
904	5	R MART	MOJO	KEDIRI	https://maps.app.goo.gl/LPrYqGjqqur11ewd6	t	2025-07-19 07:39:00.178533	2025-07-19 07:39:00.178533	\N
905	5	APOTEK AULIA FARMA	MOJO	KEDIRI	https://maps.app.goo.gl/t4LEib4WyJRNQjAi6	t	2025-07-19 07:39:01.307433	2025-07-19 07:39:01.307433	\N
906	5	TOKO SYAHRUL	KANDAT	KEDIRI	https://maps.app.goo.gl/FFxiaE28r8HKkgLY9	t	2025-07-19 07:39:02.444174	2025-07-19 07:39:02.444174	\N
907	5	SRC RODIAH	WATES	KEDIRI	https://maps.app.goo.gl/DaYhqXnj2b9WaxeGA	t	2025-07-19 07:39:03.599902	2025-07-19 07:39:03.599902	\N
908	5	TOKO BU ROHMAH	KANDAT	KEDIRI	https://maps.app.goo.gl/Q3QSEAe4bvExZrjS7	t	2025-07-19 07:39:04.755931	2025-07-19 07:39:04.755931	\N
\.


--
-- TOC entry 4060 (class 0 OID 0)
-- Dependencies: 329
-- Name: bulk_pengiriman_id_bulk_pengiriman_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bulk_pengiriman_id_bulk_pengiriman_seq', 1, false);


--
-- TOC entry 4061 (class 0 OID 0)
-- Dependencies: 337
-- Name: detail_penagihan_id_detail_tagih_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detail_penagihan_id_detail_tagih_seq', 61, true);


--
-- TOC entry 4062 (class 0 OID 0)
-- Dependencies: 333
-- Name: detail_pengiriman_id_detail_kirim_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detail_pengiriman_id_detail_kirim_seq', 4544, true);


--
-- TOC entry 4063 (class 0 OID 0)
-- Dependencies: 335
-- Name: penagihan_id_penagihan_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.penagihan_id_penagihan_seq', 19, true);


--
-- TOC entry 4064 (class 0 OID 0)
-- Dependencies: 331
-- Name: pengiriman_id_pengiriman_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pengiriman_id_pengiriman_seq', 916, true);


--
-- TOC entry 4065 (class 0 OID 0)
-- Dependencies: 339
-- Name: potongan_penagihan_id_potongan_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.potongan_penagihan_id_potongan_seq', 1, false);


--
-- TOC entry 4066 (class 0 OID 0)
-- Dependencies: 325
-- Name: produk_id_produk_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.produk_id_produk_seq', 5, true);


--
-- TOC entry 4067 (class 0 OID 0)
-- Dependencies: 323
-- Name: sales_id_sales_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_sales_seq', 5, true);


--
-- TOC entry 4068 (class 0 OID 0)
-- Dependencies: 341
-- Name: setoran_id_setoran_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.setoran_id_setoran_seq', 1, false);


--
-- TOC entry 4069 (class 0 OID 0)
-- Dependencies: 347
-- Name: system_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_logs_id_seq', 1, true);


--
-- TOC entry 4070 (class 0 OID 0)
-- Dependencies: 327
-- Name: toko_id_toko_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.toko_id_toko_seq', 908, true);


--
-- TOC entry 3708 (class 2606 OID 17358)
-- Name: bulk_pengiriman bulk_pengiriman_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_pengiriman
    ADD CONSTRAINT bulk_pengiriman_pkey PRIMARY KEY (id_bulk_pengiriman);


--
-- TOC entry 3733 (class 2606 OID 17360)
-- Name: detail_penagihan detail_penagihan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan
    ADD CONSTRAINT detail_penagihan_pkey PRIMARY KEY (id_detail_tagih);


--
-- TOC entry 3716 (class 2606 OID 17362)
-- Name: detail_pengiriman detail_pengiriman_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman
    ADD CONSTRAINT detail_pengiriman_pkey PRIMARY KEY (id_detail_kirim);


--
-- TOC entry 3731 (class 2606 OID 17364)
-- Name: penagihan penagihan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penagihan
    ADD CONSTRAINT penagihan_pkey PRIMARY KEY (id_penagihan);


--
-- TOC entry 3714 (class 2606 OID 17366)
-- Name: pengiriman pengiriman_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman
    ADD CONSTRAINT pengiriman_pkey PRIMARY KEY (id_pengiriman);


--
-- TOC entry 3742 (class 2606 OID 17368)
-- Name: potongan_penagihan potongan_penagihan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potongan_penagihan
    ADD CONSTRAINT potongan_penagihan_pkey PRIMARY KEY (id_potongan);


--
-- TOC entry 3691 (class 2606 OID 17370)
-- Name: produk produk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk
    ADD CONSTRAINT produk_pkey PRIMARY KEY (id_produk);


--
-- TOC entry 3682 (class 2606 OID 17372)
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id_sales);


--
-- TOC entry 3748 (class 2606 OID 17374)
-- Name: setoran setoran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setoran
    ADD CONSTRAINT setoran_pkey PRIMARY KEY (id_setoran);


--
-- TOC entry 3762 (class 2606 OID 17653)
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3706 (class 2606 OID 17376)
-- Name: toko toko_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_pkey PRIMARY KEY (id_toko);


--
-- TOC entry 3734 (class 1259 OID 17461)
-- Name: idx_detail_penagihan_penagihan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_penagihan ON public.detail_penagihan USING btree (id_penagihan);


--
-- TOC entry 3735 (class 1259 OID 17774)
-- Name: idx_detail_penagihan_penagihan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_penagihan_id ON public.detail_penagihan USING btree (id_penagihan);


--
-- TOC entry 3736 (class 1259 OID 17775)
-- Name: idx_detail_penagihan_produk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_produk_id ON public.detail_penagihan USING btree (id_produk);


--
-- TOC entry 3737 (class 1259 OID 17776)
-- Name: idx_detail_penagihan_quantities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_quantities ON public.detail_penagihan USING btree (id_penagihan, jumlah_terjual, jumlah_kembali);


--
-- TOC entry 3738 (class 1259 OID 17874)
-- Name: idx_detail_penagihan_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_penagihan_sales ON public.detail_penagihan USING btree (id_produk, jumlah_terjual, jumlah_kembali, dibuat_pada DESC);


--
-- TOC entry 3717 (class 1259 OID 17611)
-- Name: idx_detail_pengiriman_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_composite ON public.detail_pengiriman USING btree (id_pengiriman, id_produk, jumlah_kirim);


--
-- TOC entry 3718 (class 1259 OID 17873)
-- Name: idx_detail_pengiriman_movement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_movement ON public.detail_pengiriman USING btree (id_produk, jumlah_kirim, dibuat_pada DESC);


--
-- TOC entry 3719 (class 1259 OID 17459)
-- Name: idx_detail_pengiriman_pengiriman; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_pengiriman ON public.detail_pengiriman USING btree (id_pengiriman);


--
-- TOC entry 3720 (class 1259 OID 17871)
-- Name: idx_detail_pengiriman_pengiriman_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_pengiriman_id ON public.detail_pengiriman USING btree (id_pengiriman);


--
-- TOC entry 3721 (class 1259 OID 17870)
-- Name: idx_detail_pengiriman_produk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_produk_id ON public.detail_pengiriman USING btree (id_produk);


--
-- TOC entry 3722 (class 1259 OID 17872)
-- Name: idx_detail_pengiriman_quantities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detail_pengiriman_quantities ON public.detail_pengiriman USING btree (id_produk, jumlah_kirim);


--
-- TOC entry 3763 (class 1259 OID 17791)
-- Name: idx_mv_penagihan_aggregates_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_penagihan_aggregates_unique ON public.mv_penagihan_aggregates USING btree (id);


--
-- TOC entry 3764 (class 1259 OID 17806)
-- Name: idx_mv_penagihan_with_totals_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_penagihan_with_totals_date ON public.mv_penagihan_with_totals USING btree (dibuat_pada DESC);


--
-- TOC entry 3765 (class 1259 OID 17804)
-- Name: idx_mv_penagihan_with_totals_pk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_penagihan_with_totals_pk ON public.mv_penagihan_with_totals USING btree (id_penagihan);


--
-- TOC entry 3766 (class 1259 OID 17805)
-- Name: idx_mv_penagihan_with_totals_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_penagihan_with_totals_toko ON public.mv_penagihan_with_totals USING btree (id_toko, dibuat_pada DESC);


--
-- TOC entry 3754 (class 1259 OID 17629)
-- Name: idx_mv_pengiriman_agg_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_pengiriman_agg_date ON public.mv_pengiriman_aggregates USING btree (tanggal_kirim DESC);


--
-- TOC entry 3755 (class 1259 OID 17633)
-- Name: idx_mv_pengiriman_agg_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_pengiriman_agg_filter ON public.mv_pengiriman_aggregates USING btree (id_sales, kabupaten, kecamatan, tanggal_kirim_date);


--
-- TOC entry 3756 (class 1259 OID 17631)
-- Name: idx_mv_pengiriman_agg_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_pengiriman_agg_location ON public.mv_pengiriman_aggregates USING btree (kabupaten, kecamatan);


--
-- TOC entry 3757 (class 1259 OID 17627)
-- Name: idx_mv_pengiriman_agg_pk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_pengiriman_agg_pk ON public.mv_pengiriman_aggregates USING btree (id_pengiriman);


--
-- TOC entry 3758 (class 1259 OID 17630)
-- Name: idx_mv_pengiriman_agg_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_pengiriman_agg_sales ON public.mv_pengiriman_aggregates USING btree (id_sales);


--
-- TOC entry 3759 (class 1259 OID 17628)
-- Name: idx_mv_pengiriman_agg_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_pengiriman_agg_search ON public.mv_pengiriman_aggregates USING gin (search_vector);


--
-- TOC entry 3760 (class 1259 OID 17632)
-- Name: idx_mv_pengiriman_agg_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_pengiriman_agg_toko ON public.mv_pengiriman_aggregates USING btree (id_toko);


--
-- TOC entry 3767 (class 1259 OID 17887)
-- Name: idx_mv_produk_aggregates_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_produk_aggregates_unique ON public.mv_produk_aggregates USING btree (id);


--
-- TOC entry 3768 (class 1259 OID 17905)
-- Name: idx_mv_produk_with_stats_movement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_produk_with_stats_movement ON public.mv_produk_with_stats USING btree (total_terkirim, total_terbayar, sisa_stok);


--
-- TOC entry 3769 (class 1259 OID 17901)
-- Name: idx_mv_produk_with_stats_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_produk_with_stats_name ON public.mv_produk_with_stats USING btree (nama_produk);


--
-- TOC entry 3770 (class 1259 OID 17900)
-- Name: idx_mv_produk_with_stats_pk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_produk_with_stats_pk ON public.mv_produk_with_stats USING btree (id_produk);


--
-- TOC entry 3771 (class 1259 OID 17904)
-- Name: idx_mv_produk_with_stats_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_produk_with_stats_price ON public.mv_produk_with_stats USING btree (harga_satuan);


--
-- TOC entry 3772 (class 1259 OID 17903)
-- Name: idx_mv_produk_with_stats_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_produk_with_stats_priority ON public.mv_produk_with_stats USING btree (is_priority, priority_order);


--
-- TOC entry 3773 (class 1259 OID 17902)
-- Name: idx_mv_produk_with_stats_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_produk_with_stats_status ON public.mv_produk_with_stats USING btree (status_produk, dibuat_pada DESC);


--
-- TOC entry 3774 (class 1259 OID 17981)
-- Name: idx_mv_sales_agg_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_sales_agg_activity ON public.mv_sales_aggregates USING btree (last_shipment_date DESC, last_billing_date DESC);


--
-- TOC entry 3775 (class 1259 OID 17983)
-- Name: idx_mv_sales_agg_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_sales_agg_filter ON public.mv_sales_aggregates USING btree (status_aktif, nomor_telepon, created_month_date);


--
-- TOC entry 3776 (class 1259 OID 17978)
-- Name: idx_mv_sales_agg_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_sales_agg_id ON public.mv_sales_aggregates USING btree (id_sales);


--
-- TOC entry 3777 (class 1259 OID 17982)
-- Name: idx_mv_sales_agg_name_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_sales_agg_name_search ON public.mv_sales_aggregates USING gin (to_tsvector('indonesian'::regconfig, (nama_sales)::text));


--
-- TOC entry 3778 (class 1259 OID 17980)
-- Name: idx_mv_sales_agg_performance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_sales_agg_performance ON public.mv_sales_aggregates USING btree (total_revenue DESC, total_stores DESC);


--
-- TOC entry 3779 (class 1259 OID 17979)
-- Name: idx_mv_sales_agg_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_sales_agg_status ON public.mv_sales_aggregates USING btree (status_aktif);


--
-- TOC entry 3749 (class 1259 OID 17477)
-- Name: idx_mv_toko_agg_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_toko_agg_filter ON public.mv_toko_aggregates USING btree (id_sales, kabupaten, kecamatan, status_toko);


--
-- TOC entry 3750 (class 1259 OID 17478)
-- Name: idx_mv_toko_agg_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_toko_agg_location ON public.mv_toko_aggregates USING btree (kabupaten, kecamatan);


--
-- TOC entry 3751 (class 1259 OID 17475)
-- Name: idx_mv_toko_agg_pk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_toko_agg_pk ON public.mv_toko_aggregates USING btree (id_toko);


--
-- TOC entry 3752 (class 1259 OID 17479)
-- Name: idx_mv_toko_agg_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_toko_agg_sales ON public.mv_toko_aggregates USING btree (id_sales);


--
-- TOC entry 3753 (class 1259 OID 17476)
-- Name: idx_mv_toko_agg_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_toko_agg_search ON public.mv_toko_aggregates USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text));


--
-- TOC entry 3723 (class 1259 OID 17771)
-- Name: idx_penagihan_ada_potongan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_ada_potongan ON public.penagihan USING btree (ada_potongan, dibuat_pada DESC);


--
-- TOC entry 3724 (class 1259 OID 17773)
-- Name: idx_penagihan_amount; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_amount ON public.penagihan USING btree (total_uang_diterima, dibuat_pada DESC);


--
-- TOC entry 3725 (class 1259 OID 17768)
-- Name: idx_penagihan_composite_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_composite_search ON public.penagihan USING btree (id_toko, dibuat_pada DESC);


--
-- TOC entry 3726 (class 1259 OID 17769)
-- Name: idx_penagihan_date_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_date_filters ON public.penagihan USING btree (dibuat_pada DESC, diperbarui_pada);


--
-- TOC entry 3727 (class 1259 OID 17772)
-- Name: idx_penagihan_filters_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_filters_composite ON public.penagihan USING btree (metode_pembayaran, ada_potongan, dibuat_pada DESC);


--
-- TOC entry 3728 (class 1259 OID 17770)
-- Name: idx_penagihan_metode_pembayaran; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_metode_pembayaran ON public.penagihan USING btree (metode_pembayaran, dibuat_pada DESC);


--
-- TOC entry 3729 (class 1259 OID 17460)
-- Name: idx_penagihan_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penagihan_toko ON public.penagihan USING btree (id_toko);


--
-- TOC entry 3709 (class 1259 OID 17608)
-- Name: idx_pengiriman_composite_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_composite_search ON public.pengiriman USING btree (id_toko, tanggal_kirim DESC);


--
-- TOC entry 3710 (class 1259 OID 17610)
-- Name: idx_pengiriman_date_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_date_range ON public.pengiriman USING btree (tanggal_kirim);


--
-- TOC entry 3711 (class 1259 OID 17609)
-- Name: idx_pengiriman_tanggal_kirim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_tanggal_kirim ON public.pengiriman USING btree (tanggal_kirim DESC);


--
-- TOC entry 3712 (class 1259 OID 17458)
-- Name: idx_pengiriman_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengiriman_toko ON public.pengiriman USING btree (id_toko);


--
-- TOC entry 3739 (class 1259 OID 17778)
-- Name: idx_potongan_penagihan_amount; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_potongan_penagihan_amount ON public.potongan_penagihan USING btree (jumlah_potongan, id_penagihan);


--
-- TOC entry 3740 (class 1259 OID 17777)
-- Name: idx_potongan_penagihan_penagihan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_potongan_penagihan_penagihan_id ON public.potongan_penagihan USING btree (id_penagihan);


--
-- TOC entry 3683 (class 1259 OID 17868)
-- Name: idx_produk_date_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_date_filters ON public.produk USING btree (dibuat_pada DESC, diperbarui_pada);


--
-- TOC entry 3684 (class 1259 OID 17867)
-- Name: idx_produk_filters_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_filters_composite ON public.produk USING btree (status_produk, is_priority, harga_satuan, dibuat_pada DESC);


--
-- TOC entry 3685 (class 1259 OID 17869)
-- Name: idx_produk_nama_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_nama_gin ON public.produk USING gin (to_tsvector('indonesian'::regconfig, (nama_produk)::text));


--
-- TOC entry 3686 (class 1259 OID 17863)
-- Name: idx_produk_nama_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_nama_search ON public.produk USING btree (nama_produk);


--
-- TOC entry 3687 (class 1259 OID 17866)
-- Name: idx_produk_price_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_price_filters ON public.produk USING btree (harga_satuan, status_produk);


--
-- TOC entry 3688 (class 1259 OID 17865)
-- Name: idx_produk_priority_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_priority_filters ON public.produk USING btree (is_priority, priority_order, dibuat_pada DESC);


--
-- TOC entry 3689 (class 1259 OID 17864)
-- Name: idx_produk_status_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_status_filters ON public.produk USING btree (status_produk, dibuat_pada DESC);


--
-- TOC entry 3672 (class 1259 OID 17961)
-- Name: idx_sales_active_name_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_active_name_composite ON public.sales USING btree (status_aktif, nama_sales) WHERE (status_aktif = true);


--
-- TOC entry 3673 (class 1259 OID 17965)
-- Name: idx_sales_advanced_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_advanced_filter ON public.sales USING btree (status_aktif, nomor_telepon, dibuat_pada DESC);


--
-- TOC entry 3674 (class 1259 OID 17963)
-- Name: idx_sales_date_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_date_range ON public.sales USING btree (dibuat_pada, status_aktif);


--
-- TOC entry 3675 (class 1259 OID 17964)
-- Name: idx_sales_fulltext_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_fulltext_name ON public.sales USING gin (to_tsvector('indonesian'::regconfig, (nama_sales)::text));


--
-- TOC entry 3676 (class 1259 OID 17580)
-- Name: idx_sales_nama_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_nama_sales ON public.sales USING btree (nama_sales);


--
-- TOC entry 3677 (class 1259 OID 17614)
-- Name: idx_sales_pengiriman_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_pengiriman_active ON public.sales USING btree (status_aktif, nama_sales) WHERE (status_aktif = true);


--
-- TOC entry 3678 (class 1259 OID 17962)
-- Name: idx_sales_phone_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_phone_search ON public.sales USING btree (nomor_telepon) WHERE (nomor_telepon IS NOT NULL);


--
-- TOC entry 3679 (class 1259 OID 17462)
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_status ON public.sales USING btree (status_aktif);


--
-- TOC entry 3680 (class 1259 OID 17581)
-- Name: idx_sales_status_aktif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_status_aktif ON public.sales USING btree (status_aktif);


--
-- TOC entry 3743 (class 1259 OID 18161)
-- Name: idx_setoran_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_created ON public.setoran USING btree (dibuat_pada DESC);


--
-- TOC entry 3744 (class 1259 OID 18159)
-- Name: idx_setoran_penerima; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_penerima ON public.setoran USING btree (penerima_setoran);


--
-- TOC entry 3745 (class 1259 OID 18162)
-- Name: idx_setoran_penerima_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_penerima_created ON public.setoran USING btree (penerima_setoran, dibuat_pada DESC);


--
-- TOC entry 3746 (class 1259 OID 18160)
-- Name: idx_setoran_total; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setoran_total ON public.setoran USING btree (total_setoran);


--
-- TOC entry 3692 (class 1259 OID 17575)
-- Name: idx_toko_composite_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_composite_filters ON public.toko USING btree (status_toko, id_sales, kabupaten, kecamatan);


--
-- TOC entry 3693 (class 1259 OID 17577)
-- Name: idx_toko_id_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_id_sales ON public.toko USING btree (id_sales);


--
-- TOC entry 3694 (class 1259 OID 17578)
-- Name: idx_toko_kabupaten; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_kabupaten ON public.toko USING btree (kabupaten);


--
-- TOC entry 3695 (class 1259 OID 17579)
-- Name: idx_toko_kecamatan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_kecamatan ON public.toko USING btree (kecamatan);


--
-- TOC entry 3696 (class 1259 OID 17454)
-- Name: idx_toko_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_location ON public.toko USING btree (kabupaten, kecamatan);


--
-- TOC entry 3697 (class 1259 OID 17613)
-- Name: idx_toko_nama_fulltext_pengiriman; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_nama_fulltext_pengiriman ON public.toko USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text)) WHERE (status_toko = true);


--
-- TOC entry 3698 (class 1259 OID 17453)
-- Name: idx_toko_nama_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_nama_search ON public.toko USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text));


--
-- TOC entry 3699 (class 1259 OID 17574)
-- Name: idx_toko_nama_toko_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_nama_toko_gin ON public.toko USING gin (to_tsvector('indonesian'::regconfig, (nama_toko)::text));


--
-- TOC entry 3700 (class 1259 OID 17612)
-- Name: idx_toko_pengiriman_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_pengiriman_search ON public.toko USING btree (id_sales, kabupaten, kecamatan, status_toko);


--
-- TOC entry 3701 (class 1259 OID 17455)
-- Name: idx_toko_sales; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_sales ON public.toko USING btree (id_sales);


--
-- TOC entry 3702 (class 1259 OID 17457)
-- Name: idx_toko_search_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_search_filter ON public.toko USING btree (id_sales, kabupaten, kecamatan, status_toko);


--
-- TOC entry 3703 (class 1259 OID 17456)
-- Name: idx_toko_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_status ON public.toko USING btree (status_toko);


--
-- TOC entry 3704 (class 1259 OID 17576)
-- Name: idx_toko_status_toko; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_status_toko ON public.toko USING btree (status_toko);


--
-- TOC entry 3799 (class 2620 OID 17483)
-- Name: detail_penagihan refresh_on_penagihan_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_on_penagihan_change AFTER INSERT OR DELETE OR UPDATE ON public.detail_penagihan FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_toko_aggregates();


--
-- TOC entry 3796 (class 2620 OID 17482)
-- Name: detail_pengiriman refresh_on_pengiriman_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_on_pengiriman_change AFTER INSERT OR DELETE OR UPDATE ON public.detail_pengiriman FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_toko_aggregates();


--
-- TOC entry 3792 (class 2620 OID 17484)
-- Name: toko refresh_on_toko_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_on_toko_change AFTER INSERT OR DELETE OR UPDATE ON public.toko FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_toko_aggregates();


--
-- TOC entry 3790 (class 2620 OID 17988)
-- Name: sales sales_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sales_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.sales FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_sales_aggregates();


--
-- TOC entry 3793 (class 2620 OID 17989)
-- Name: toko toko_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER toko_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.toko FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_sales_aggregates();


--
-- TOC entry 3798 (class 2620 OID 17811)
-- Name: penagihan tr_penagihan_refresh_views; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_penagihan_refresh_views AFTER INSERT OR DELETE OR UPDATE ON public.penagihan FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_penagihan_views();


--
-- TOC entry 3800 (class 2620 OID 17813)
-- Name: potongan_penagihan tr_potongan_penagihan_refresh_views; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_potongan_penagihan_refresh_views AFTER INSERT OR DELETE OR UPDATE ON public.potongan_penagihan FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_penagihan_views();


--
-- TOC entry 3797 (class 2620 OID 17641)
-- Name: detail_pengiriman trigger_refresh_pengiriman_on_detail; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_detail AFTER INSERT OR DELETE OR UPDATE ON public.detail_pengiriman FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3795 (class 2620 OID 17640)
-- Name: pengiriman trigger_refresh_pengiriman_on_pengiriman; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_pengiriman AFTER INSERT OR DELETE OR UPDATE ON public.pengiriman FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3791 (class 2620 OID 17643)
-- Name: sales trigger_refresh_pengiriman_on_sales; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_sales AFTER UPDATE ON public.sales FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3794 (class 2620 OID 17642)
-- Name: toko trigger_refresh_pengiriman_on_toko; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_refresh_pengiriman_on_toko AFTER UPDATE ON public.toko FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_pengiriman_mv();


--
-- TOC entry 3781 (class 2606 OID 17377)
-- Name: bulk_pengiriman bulk_pengiriman_id_sales_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_pengiriman
    ADD CONSTRAINT bulk_pengiriman_id_sales_fkey FOREIGN KEY (id_sales) REFERENCES public.sales(id_sales);


--
-- TOC entry 3787 (class 2606 OID 17382)
-- Name: detail_penagihan detail_penagihan_id_penagihan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan
    ADD CONSTRAINT detail_penagihan_id_penagihan_fkey FOREIGN KEY (id_penagihan) REFERENCES public.penagihan(id_penagihan) ON DELETE CASCADE;


--
-- TOC entry 3788 (class 2606 OID 17387)
-- Name: detail_penagihan detail_penagihan_id_produk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_penagihan
    ADD CONSTRAINT detail_penagihan_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE;


--
-- TOC entry 3784 (class 2606 OID 17392)
-- Name: detail_pengiriman detail_pengiriman_id_pengiriman_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman
    ADD CONSTRAINT detail_pengiriman_id_pengiriman_fkey FOREIGN KEY (id_pengiriman) REFERENCES public.pengiriman(id_pengiriman) ON DELETE CASCADE;


--
-- TOC entry 3785 (class 2606 OID 17397)
-- Name: detail_pengiriman detail_pengiriman_id_produk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pengiriman
    ADD CONSTRAINT detail_pengiriman_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE;


--
-- TOC entry 3786 (class 2606 OID 17402)
-- Name: penagihan penagihan_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penagihan
    ADD CONSTRAINT penagihan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id_toko) ON DELETE CASCADE;


--
-- TOC entry 3782 (class 2606 OID 17407)
-- Name: pengiriman pengiriman_id_bulk_pengiriman_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman
    ADD CONSTRAINT pengiriman_id_bulk_pengiriman_fkey FOREIGN KEY (id_bulk_pengiriman) REFERENCES public.bulk_pengiriman(id_bulk_pengiriman);


--
-- TOC entry 3783 (class 2606 OID 17412)
-- Name: pengiriman pengiriman_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengiriman
    ADD CONSTRAINT pengiriman_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id_toko) ON DELETE CASCADE;


--
-- TOC entry 3789 (class 2606 OID 17417)
-- Name: potongan_penagihan potongan_penagihan_id_penagihan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potongan_penagihan
    ADD CONSTRAINT potongan_penagihan_id_penagihan_fkey FOREIGN KEY (id_penagihan) REFERENCES public.penagihan(id_penagihan) ON DELETE CASCADE;


--
-- TOC entry 3780 (class 2606 OID 17422)
-- Name: toko toko_id_sales_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_id_sales_fkey FOREIGN KEY (id_sales) REFERENCES public.sales(id_sales) ON DELETE CASCADE;


--
-- TOC entry 3995 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 3996 (class 0 OID 0)
-- Dependencies: 476
-- Name: FUNCTION count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO anon;
GRANT ALL ON FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO authenticated;
GRANT ALL ON FUNCTION public.count_sales_optimized(search_term text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO service_role;


--
-- TOC entry 3997 (class 0 OID 0)
-- Dependencies: 479
-- Name: FUNCTION get_setoran_filter_options(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_setoran_filter_options() TO anon;
GRANT ALL ON FUNCTION public.get_setoran_filter_options() TO authenticated;
GRANT ALL ON FUNCTION public.get_setoran_filter_options() TO service_role;


--
-- TOC entry 3998 (class 0 OID 0)
-- Dependencies: 463
-- Name: FUNCTION get_toko_filter_options_simple(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_toko_filter_options_simple() TO anon;
GRANT ALL ON FUNCTION public.get_toko_filter_options_simple() TO authenticated;
GRANT ALL ON FUNCTION public.get_toko_filter_options_simple() TO service_role;


--
-- TOC entry 3999 (class 0 OID 0)
-- Dependencies: 462
-- Name: FUNCTION get_toko_search_suggestions_simple(search_term text, max_results integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) TO anon;
GRANT ALL ON FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_toko_search_suggestions_simple(search_term text, max_results integer) TO service_role;


--
-- TOC entry 4000 (class 0 OID 0)
-- Dependencies: 474
-- Name: FUNCTION manual_refresh_produk_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.manual_refresh_produk_views() TO anon;
GRANT ALL ON FUNCTION public.manual_refresh_produk_views() TO authenticated;
GRANT ALL ON FUNCTION public.manual_refresh_produk_views() TO service_role;


--
-- TOC entry 4001 (class 0 OID 0)
-- Dependencies: 469
-- Name: FUNCTION refresh_penagihan_materialized_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_penagihan_materialized_views() TO anon;
GRANT ALL ON FUNCTION public.refresh_penagihan_materialized_views() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_penagihan_materialized_views() TO service_role;


--
-- TOC entry 4002 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION refresh_pengiriman_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_pengiriman_aggregates() TO anon;
GRANT ALL ON FUNCTION public.refresh_pengiriman_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_pengiriman_aggregates() TO service_role;


--
-- TOC entry 4003 (class 0 OID 0)
-- Dependencies: 472
-- Name: FUNCTION refresh_produk_materialized_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_produk_materialized_views() TO anon;
GRANT ALL ON FUNCTION public.refresh_produk_materialized_views() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_produk_materialized_views() TO service_role;


--
-- TOC entry 4004 (class 0 OID 0)
-- Dependencies: 477
-- Name: FUNCTION refresh_sales_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_sales_aggregates() TO anon;
GRANT ALL ON FUNCTION public.refresh_sales_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_sales_aggregates() TO service_role;


--
-- TOC entry 4005 (class 0 OID 0)
-- Dependencies: 459
-- Name: FUNCTION refresh_toko_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_toko_aggregates() TO anon;
GRANT ALL ON FUNCTION public.refresh_toko_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_toko_aggregates() TO service_role;


--
-- TOC entry 4006 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) TO anon;
GRANT ALL ON FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) TO authenticated;
GRANT ALL ON FUNCTION public.search_penagihan_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, sales_filter text, kabupaten_filter text, kecamatan_filter text, metode_pembayaran_filter text, ada_potongan_filter boolean, date_from_filter text, date_to_filter text) TO service_role;


--
-- TOC entry 4007 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO anon;
GRANT ALL ON FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_pengiriman_optimized(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO service_role;


--
-- TOC entry 4008 (class 0 OID 0)
-- Dependencies: 465
-- Name: FUNCTION search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO anon;
GRANT ALL ON FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_pengiriman_simple(search_term text, filter_sales integer, filter_kabupaten text, filter_kecamatan text, filter_date_from date, filter_date_to date, sort_by text, sort_order text, page_size integer, page_number integer) TO service_role;


--
-- TOC entry 4009 (class 0 OID 0)
-- Dependencies: 471
-- Name: FUNCTION search_produk_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, status_filter boolean, priority_filter boolean, price_from_filter numeric, price_to_filter numeric, date_from_filter text, date_to_filter text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_produk_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, status_filter boolean, priority_filter boolean, price_from_filter numeric, price_to_filter numeric, date_from_filter text, date_to_filter text) TO anon;
GRANT ALL ON FUNCTION public.search_produk_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, status_filter boolean, priority_filter boolean, price_from_filter numeric, price_to_filter numeric, date_from_filter text, date_to_filter text) TO authenticated;
GRANT ALL ON FUNCTION public.search_produk_optimized(search_query text, p_limit integer, p_offset integer, sort_column text, sort_direction text, status_filter boolean, priority_filter boolean, price_from_filter numeric, price_to_filter numeric, date_from_filter text, date_to_filter text) TO service_role;


--
-- TOC entry 4010 (class 0 OID 0)
-- Dependencies: 475
-- Name: FUNCTION search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO anon;
GRANT ALL ON FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO authenticated;
GRANT ALL ON FUNCTION public.search_sales_optimized(search_term text, page_offset integer, page_limit integer, sort_column text, sort_direction text, filter_status text, filter_telepon_exists text, filter_date_from text, filter_date_to text) TO service_role;


--
-- TOC entry 4011 (class 0 OID 0)
-- Dependencies: 461
-- Name: FUNCTION search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) TO anon;
GRANT ALL ON FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_toko_simple(search_term text, filter_status boolean, filter_sales integer, filter_kabupaten text, filter_kecamatan text, page_size integer, page_number integer) TO service_role;


--
-- TOC entry 4012 (class 0 OID 0)
-- Dependencies: 470
-- Name: FUNCTION trigger_refresh_penagihan_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_penagihan_views() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_penagihan_views() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_penagihan_views() TO service_role;


--
-- TOC entry 4013 (class 0 OID 0)
-- Dependencies: 467
-- Name: FUNCTION trigger_refresh_pengiriman_mv(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_pengiriman_mv() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_pengiriman_mv() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_pengiriman_mv() TO service_role;


--
-- TOC entry 4014 (class 0 OID 0)
-- Dependencies: 473
-- Name: FUNCTION trigger_refresh_produk_views(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_produk_views() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_produk_views() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_produk_views() TO service_role;


--
-- TOC entry 4015 (class 0 OID 0)
-- Dependencies: 478
-- Name: FUNCTION trigger_refresh_sales_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_sales_aggregates() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_sales_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_sales_aggregates() TO service_role;


--
-- TOC entry 4016 (class 0 OID 0)
-- Dependencies: 460
-- Name: FUNCTION trigger_refresh_toko_aggregates(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_toko_aggregates() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_toko_aggregates() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_toko_aggregates() TO service_role;


--
-- TOC entry 4017 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE bulk_pengiriman; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bulk_pengiriman TO anon;
GRANT ALL ON TABLE public.bulk_pengiriman TO authenticated;
GRANT ALL ON TABLE public.bulk_pengiriman TO service_role;


--
-- TOC entry 4019 (class 0 OID 0)
-- Dependencies: 329
-- Name: SEQUENCE bulk_pengiriman_id_bulk_pengiriman_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq TO anon;
GRANT ALL ON SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq TO authenticated;
GRANT ALL ON SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq TO service_role;


--
-- TOC entry 4020 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE detail_penagihan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.detail_penagihan TO anon;
GRANT ALL ON TABLE public.detail_penagihan TO authenticated;
GRANT ALL ON TABLE public.detail_penagihan TO service_role;


--
-- TOC entry 4022 (class 0 OID 0)
-- Dependencies: 337
-- Name: SEQUENCE detail_penagihan_id_detail_tagih_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.detail_penagihan_id_detail_tagih_seq TO anon;
GRANT ALL ON SEQUENCE public.detail_penagihan_id_detail_tagih_seq TO authenticated;
GRANT ALL ON SEQUENCE public.detail_penagihan_id_detail_tagih_seq TO service_role;


--
-- TOC entry 4023 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE detail_pengiriman; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.detail_pengiriman TO anon;
GRANT ALL ON TABLE public.detail_pengiriman TO authenticated;
GRANT ALL ON TABLE public.detail_pengiriman TO service_role;


--
-- TOC entry 4025 (class 0 OID 0)
-- Dependencies: 333
-- Name: SEQUENCE detail_pengiriman_id_detail_kirim_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.detail_pengiriman_id_detail_kirim_seq TO anon;
GRANT ALL ON SEQUENCE public.detail_pengiriman_id_detail_kirim_seq TO authenticated;
GRANT ALL ON SEQUENCE public.detail_pengiriman_id_detail_kirim_seq TO service_role;


--
-- TOC entry 4026 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE penagihan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penagihan TO anon;
GRANT ALL ON TABLE public.penagihan TO authenticated;
GRANT ALL ON TABLE public.penagihan TO service_role;


--
-- TOC entry 4027 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE mv_penagihan_aggregates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_penagihan_aggregates TO anon;
GRANT ALL ON TABLE public.mv_penagihan_aggregates TO authenticated;
GRANT ALL ON TABLE public.mv_penagihan_aggregates TO service_role;


--
-- TOC entry 4028 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE potongan_penagihan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.potongan_penagihan TO anon;
GRANT ALL ON TABLE public.potongan_penagihan TO authenticated;
GRANT ALL ON TABLE public.potongan_penagihan TO service_role;


--
-- TOC entry 4029 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE mv_penagihan_with_totals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_penagihan_with_totals TO anon;
GRANT ALL ON TABLE public.mv_penagihan_with_totals TO authenticated;
GRANT ALL ON TABLE public.mv_penagihan_with_totals TO service_role;


--
-- TOC entry 4030 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE pengiriman; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pengiriman TO anon;
GRANT ALL ON TABLE public.pengiriman TO authenticated;
GRANT ALL ON TABLE public.pengiriman TO service_role;


--
-- TOC entry 4031 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE produk; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk TO anon;
GRANT ALL ON TABLE public.produk TO authenticated;
GRANT ALL ON TABLE public.produk TO service_role;


--
-- TOC entry 4032 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE sales; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales TO anon;
GRANT ALL ON TABLE public.sales TO authenticated;
GRANT ALL ON TABLE public.sales TO service_role;


--
-- TOC entry 4033 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE toko; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.toko TO anon;
GRANT ALL ON TABLE public.toko TO authenticated;
GRANT ALL ON TABLE public.toko TO service_role;


--
-- TOC entry 4034 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE mv_pengiriman_aggregates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_pengiriman_aggregates TO anon;
GRANT ALL ON TABLE public.mv_pengiriman_aggregates TO authenticated;
GRANT ALL ON TABLE public.mv_pengiriman_aggregates TO service_role;


--
-- TOC entry 4035 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE mv_produk_aggregates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_produk_aggregates TO anon;
GRANT ALL ON TABLE public.mv_produk_aggregates TO authenticated;
GRANT ALL ON TABLE public.mv_produk_aggregates TO service_role;


--
-- TOC entry 4036 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE mv_produk_with_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_produk_with_stats TO anon;
GRANT ALL ON TABLE public.mv_produk_with_stats TO authenticated;
GRANT ALL ON TABLE public.mv_produk_with_stats TO service_role;


--
-- TOC entry 4037 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE mv_sales_aggregates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_sales_aggregates TO anon;
GRANT ALL ON TABLE public.mv_sales_aggregates TO authenticated;
GRANT ALL ON TABLE public.mv_sales_aggregates TO service_role;


--
-- TOC entry 4038 (class 0 OID 0)
-- Dependencies: 342
-- Name: TABLE mv_toko_aggregates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mv_toko_aggregates TO anon;
GRANT ALL ON TABLE public.mv_toko_aggregates TO authenticated;
GRANT ALL ON TABLE public.mv_toko_aggregates TO service_role;


--
-- TOC entry 4040 (class 0 OID 0)
-- Dependencies: 335
-- Name: SEQUENCE penagihan_id_penagihan_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.penagihan_id_penagihan_seq TO anon;
GRANT ALL ON SEQUENCE public.penagihan_id_penagihan_seq TO authenticated;
GRANT ALL ON SEQUENCE public.penagihan_id_penagihan_seq TO service_role;


--
-- TOC entry 4042 (class 0 OID 0)
-- Dependencies: 331
-- Name: SEQUENCE pengiriman_id_pengiriman_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pengiriman_id_pengiriman_seq TO anon;
GRANT ALL ON SEQUENCE public.pengiriman_id_pengiriman_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pengiriman_id_pengiriman_seq TO service_role;


--
-- TOC entry 4044 (class 0 OID 0)
-- Dependencies: 339
-- Name: SEQUENCE potongan_penagihan_id_potongan_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.potongan_penagihan_id_potongan_seq TO anon;
GRANT ALL ON SEQUENCE public.potongan_penagihan_id_potongan_seq TO authenticated;
GRANT ALL ON SEQUENCE public.potongan_penagihan_id_potongan_seq TO service_role;


--
-- TOC entry 4046 (class 0 OID 0)
-- Dependencies: 325
-- Name: SEQUENCE produk_id_produk_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.produk_id_produk_seq TO anon;
GRANT ALL ON SEQUENCE public.produk_id_produk_seq TO authenticated;
GRANT ALL ON SEQUENCE public.produk_id_produk_seq TO service_role;


--
-- TOC entry 4048 (class 0 OID 0)
-- Dependencies: 323
-- Name: SEQUENCE sales_id_sales_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sales_id_sales_seq TO anon;
GRANT ALL ON SEQUENCE public.sales_id_sales_seq TO authenticated;
GRANT ALL ON SEQUENCE public.sales_id_sales_seq TO service_role;


--
-- TOC entry 4049 (class 0 OID 0)
-- Dependencies: 340
-- Name: TABLE setoran; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.setoran TO anon;
GRANT ALL ON TABLE public.setoran TO authenticated;
GRANT ALL ON TABLE public.setoran TO service_role;


--
-- TOC entry 4051 (class 0 OID 0)
-- Dependencies: 341
-- Name: SEQUENCE setoran_id_setoran_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.setoran_id_setoran_seq TO anon;
GRANT ALL ON SEQUENCE public.setoran_id_setoran_seq TO authenticated;
GRANT ALL ON SEQUENCE public.setoran_id_setoran_seq TO service_role;


--
-- TOC entry 4052 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE system_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_logs TO anon;
GRANT ALL ON TABLE public.system_logs TO authenticated;
GRANT ALL ON TABLE public.system_logs TO service_role;


--
-- TOC entry 4054 (class 0 OID 0)
-- Dependencies: 347
-- Name: SEQUENCE system_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.system_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.system_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.system_logs_id_seq TO service_role;


--
-- TOC entry 4056 (class 0 OID 0)
-- Dependencies: 327
-- Name: SEQUENCE toko_id_toko_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.toko_id_toko_seq TO anon;
GRANT ALL ON SEQUENCE public.toko_id_toko_seq TO authenticated;
GRANT ALL ON SEQUENCE public.toko_id_toko_seq TO service_role;


--
-- TOC entry 4057 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE v_kabupaten_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_kabupaten_options TO anon;
GRANT ALL ON TABLE public.v_kabupaten_options TO authenticated;
GRANT ALL ON TABLE public.v_kabupaten_options TO service_role;


--
-- TOC entry 4058 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE v_kecamatan_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_kecamatan_options TO anon;
GRANT ALL ON TABLE public.v_kecamatan_options TO authenticated;
GRANT ALL ON TABLE public.v_kecamatan_options TO service_role;


--
-- TOC entry 4059 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE v_sales_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_sales_options TO anon;
GRANT ALL ON TABLE public.v_sales_options TO authenticated;
GRANT ALL ON TABLE public.v_sales_options TO service_role;


--
-- TOC entry 2432 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2433 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2431 (class 826 OID 16487)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2435 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2430 (class 826 OID 16486)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2434 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 3984 (class 0 OID 17779)
-- Dependencies: 349 3990
-- Name: mv_penagihan_aggregates; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_penagihan_aggregates;


--
-- TOC entry 3985 (class 0 OID 17792)
-- Dependencies: 350 3990
-- Name: mv_penagihan_with_totals; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_penagihan_with_totals;


--
-- TOC entry 3981 (class 0 OID 17615)
-- Dependencies: 346 3990
-- Name: mv_pengiriman_aggregates; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_pengiriman_aggregates;


--
-- TOC entry 3986 (class 0 OID 17875)
-- Dependencies: 351 3990
-- Name: mv_produk_aggregates; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_produk_aggregates;


--
-- TOC entry 3987 (class 0 OID 17888)
-- Dependencies: 352 3990
-- Name: mv_produk_with_stats; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_produk_with_stats;


--
-- TOC entry 3988 (class 0 OID 17966)
-- Dependencies: 353 3990
-- Name: mv_sales_aggregates; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_sales_aggregates;


--
-- TOC entry 3980 (class 0 OID 17463)
-- Dependencies: 342 3990
-- Name: mv_toko_aggregates; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_toko_aggregates;


-- Completed on 2025-07-21 15:45:22

--
-- PostgreSQL database dump complete
--

