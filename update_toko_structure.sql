-- Script SQL untuk memperbarui struktur tabel toko
-- Menghapus kolom alamat dan desa

-- 1. Drop dan recreate fungsi get_toko_by_sales tanpa kolom alamat dan desa
DROP FUNCTION IF EXISTS public.get_toko_by_sales(integer);

CREATE FUNCTION public.get_toko_by_sales(sales_id integer) 
RETURNS TABLE(
    id_toko integer, 
    nama_toko character varying, 
    kecamatan character varying, 
    kabupaten character varying
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id_toko,
        t.nama_toko,
        t.kecamatan,
        t.kabupaten
    FROM toko t
    WHERE t.id_sales = sales_id AND t.status_toko = TRUE
    ORDER BY t.nama_toko;
END;
$$;

ALTER FUNCTION public.get_toko_by_sales(sales_id integer) OWNER TO postgres;

-- 2. Hapus kolom alamat dari tabel toko
ALTER TABLE public.toko DROP COLUMN IF EXISTS alamat;

-- 3. Hapus kolom desa dari tabel toko
ALTER TABLE public.toko DROP COLUMN IF EXISTS desa;

-- 4. Grant permissions untuk fungsi yang sudah diperbarui
GRANT ALL ON FUNCTION public.get_toko_by_sales(sales_id integer) TO anon;
GRANT ALL ON FUNCTION public.get_toko_by_sales(sales_id integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_toko_by_sales(sales_id integer) TO service_role;

-- Verifikasi struktur tabel setelah perubahan
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'toko' AND table_schema = 'public'
-- ORDER BY ordinal_position;