-- migrations/001_create_pengeluaran_operasional.sql

CREATE TABLE public.pengeluaran_operasional (
    id_pengeluaran SERIAL PRIMARY KEY,
    jumlah NUMERIC(12, 2) NOT NULL,
    keterangan TEXT NOT NULL,
    url_bukti_foto TEXT, -- Nullable, untuk URL bukti dari Supabase
    tanggal_pengeluaran TIMESTAMPTZ NOT NULL,
    dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
    diperbarui_pada TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.pengeluaran_operasional IS 'Mencatat pengeluaran operasional umum perusahaan.';
COMMENT ON COLUMN public.pengeluaran_operasional.jumlah IS 'Jumlah nominal pengeluaran.';
COMMENT ON COLUMN public.pengeluaran_operasional.keterangan IS 'Deskripsi atau rincian dari pengeluaran.';
COMMENT ON COLUMN public.pengeluaran_operasional.url_bukti_foto IS 'URL ke gambar bukti pengeluaran yang disimpan di Supabase Storage.';
COMMENT ON COLUMN public.pengeluaran_operasional.tanggal_pengeluaran IS 'Tanggal aktual kapan pengeluaran terjadi.';

-- Trigger untuk secara otomatis memperbarui kolom diperbarui_pada setiap kali ada update
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diperbarui_pada = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_pengeluaran_operasional_timestamp
BEFORE UPDATE ON public.pengeluaran_operasional
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();