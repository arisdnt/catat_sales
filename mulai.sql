-- Database structure for new database
-- Generated from old.sql without data

-- Table: sales
CREATE TABLE public.sales (
    id_sales integer NOT NULL,
    nama_sales character varying(255) NOT NULL,
    nomor_telepon character varying(20),
    status_aktif boolean DEFAULT true,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.sales_id_sales_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sales_id_sales_seq OWNED BY public.sales.id_sales;
ALTER TABLE ONLY public.sales ALTER COLUMN id_sales SET DEFAULT nextval('public.sales_id_sales_seq'::regclass);

-- Table: produk
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

CREATE SEQUENCE public.produk_id_produk_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.produk_id_produk_seq OWNED BY public.produk.id_produk;
ALTER TABLE ONLY public.produk ALTER COLUMN id_produk SET DEFAULT nextval('public.produk_id_produk_seq'::regclass);

-- Table: toko
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

CREATE SEQUENCE public.toko_id_toko_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.toko_id_toko_seq OWNED BY public.toko.id_toko;
ALTER TABLE ONLY public.toko ALTER COLUMN id_toko SET DEFAULT nextval('public.toko_id_toko_seq'::regclass);

-- Table: bulk_pengiriman
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

CREATE SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.bulk_pengiriman_id_bulk_pengiriman_seq OWNED BY public.bulk_pengiriman.id_bulk_pengiriman;
ALTER TABLE ONLY public.bulk_pengiriman ALTER COLUMN id_bulk_pengiriman SET DEFAULT nextval('public.bulk_pengiriman_id_bulk_pengiriman_seq'::regclass);

-- Table: pengiriman
CREATE TABLE public.pengiriman (
    id_pengiriman integer NOT NULL,
    id_toko integer NOT NULL,
    tanggal_kirim date NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_bulk_pengiriman integer
);

CREATE SEQUENCE public.pengiriman_id_pengiriman_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pengiriman_id_pengiriman_seq OWNED BY public.pengiriman.id_pengiriman;
ALTER TABLE ONLY public.pengiriman ALTER COLUMN id_pengiriman SET DEFAULT nextval('public.pengiriman_id_pengiriman_seq'::regclass);

-- Table: detail_pengiriman
CREATE TABLE public.detail_pengiriman (
    id_detail_kirim integer NOT NULL,
    id_pengiriman integer NOT NULL,
    id_produk integer NOT NULL,
    jumlah_kirim integer NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT detail_pengiriman_jumlah_kirim_check CHECK ((jumlah_kirim > 0))
);

CREATE SEQUENCE public.detail_pengiriman_id_detail_kirim_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.detail_pengiriman_id_detail_kirim_seq OWNED BY public.detail_pengiriman.id_detail_kirim;
ALTER TABLE ONLY public.detail_pengiriman ALTER COLUMN id_detail_kirim SET DEFAULT nextval('public.detail_pengiriman_id_detail_kirim_seq'::regclass);

-- Table: penagihan
CREATE TABLE public.penagihan (
    id_penagihan integer NOT NULL,
    id_toko integer NOT NULL,
    total_uang_diterima numeric(12,2) NOT NULL,
    metode_pembayaran character varying(20) NOT NULL,
    ada_potongan boolean DEFAULT false,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT penagihan_metode_pembayaran_check CHECK (((metode_pembayaran)::text = ANY ((ARRAY['Cash'::character varying, 'Transfer'::character varying])::text[]))),
    CONSTRAINT penagihan_total_uang_diterima_check CHECK ((total_uang_diterima >= (0)::numeric))
);

CREATE SEQUENCE public.penagihan_id_penagihan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.penagihan_id_penagihan_seq OWNED BY public.penagihan.id_penagihan;
ALTER TABLE ONLY public.penagihan ALTER COLUMN id_penagihan SET DEFAULT nextval('public.penagihan_id_penagihan_seq'::regclass);

-- Table: detail_penagihan
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

CREATE SEQUENCE public.detail_penagihan_id_detail_tagih_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.detail_penagihan_id_detail_tagih_seq OWNED BY public.detail_penagihan.id_detail_tagih;
ALTER TABLE ONLY public.detail_penagihan ALTER COLUMN id_detail_tagih SET DEFAULT nextval('public.detail_penagihan_id_detail_tagih_seq'::regclass);

-- Table: potongan_penagihan
CREATE TABLE public.potongan_penagihan (
    id_potongan integer NOT NULL,
    id_penagihan integer NOT NULL,
    jumlah_potongan numeric(12,2) NOT NULL,
    alasan text,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT potongan_penagihan_jumlah_potongan_check CHECK ((jumlah_potongan >= (0)::numeric))
);

CREATE SEQUENCE public.potongan_penagihan_id_potongan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.potongan_penagihan_id_potongan_seq OWNED BY public.potongan_penagihan.id_potongan;
ALTER TABLE ONLY public.potongan_penagihan ALTER COLUMN id_potongan SET DEFAULT nextval('public.potongan_penagihan_id_potongan_seq'::regclass);

-- Table: setoran
CREATE TABLE public.setoran (
    id_setoran integer NOT NULL,
    total_setoran numeric(14,2) NOT NULL,
    penerima_setoran character varying(100) NOT NULL,
    dibuat_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT setoran_total_setoran_check CHECK ((total_setoran >= (0)::numeric))
);

CREATE SEQUENCE public.setoran_id_setoran_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.setoran_id_setoran_seq OWNED BY public.setoran.id_setoran;
ALTER TABLE ONLY public.setoran ALTER COLUMN id_setoran SET DEFAULT nextval('public.setoran_id_setoran_seq'::regclass);

-- Primary Key Constraints
ALTER TABLE ONLY public.bulk_pengiriman ADD CONSTRAINT bulk_pengiriman_pkey PRIMARY KEY (id_bulk_pengiriman);
ALTER TABLE ONLY public.detail_penagihan ADD CONSTRAINT detail_penagihan_pkey PRIMARY KEY (id_detail_tagih);
ALTER TABLE ONLY public.detail_pengiriman ADD CONSTRAINT detail_pengiriman_pkey PRIMARY KEY (id_detail_kirim);
ALTER TABLE ONLY public.penagihan ADD CONSTRAINT penagihan_pkey PRIMARY KEY (id_penagihan);
ALTER TABLE ONLY public.pengiriman ADD CONSTRAINT pengiriman_pkey PRIMARY KEY (id_pengiriman);
ALTER TABLE ONLY public.potongan_penagihan ADD CONSTRAINT potongan_penagihan_pkey PRIMARY KEY (id_potongan);
ALTER TABLE ONLY public.produk ADD CONSTRAINT produk_pkey PRIMARY KEY (id_produk);
ALTER TABLE ONLY public.sales ADD CONSTRAINT sales_pkey PRIMARY KEY (id_sales);
ALTER TABLE ONLY public.setoran ADD CONSTRAINT setoran_pkey PRIMARY KEY (id_setoran);
ALTER TABLE ONLY public.toko ADD CONSTRAINT toko_pkey PRIMARY KEY (id_toko);

-- Foreign Key Constraints
ALTER TABLE ONLY public.bulk_pengiriman ADD CONSTRAINT bulk_pengiriman_id_sales_fkey FOREIGN KEY (id_sales) REFERENCES public.sales(id_sales);
ALTER TABLE ONLY public.detail_penagihan ADD CONSTRAINT detail_penagihan_id_penagihan_fkey FOREIGN KEY (id_penagihan) REFERENCES public.penagihan(id_penagihan) ON DELETE CASCADE;
ALTER TABLE ONLY public.detail_penagihan ADD CONSTRAINT detail_penagihan_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE;
ALTER TABLE ONLY public.detail_pengiriman ADD CONSTRAINT detail_pengiriman_id_pengiriman_fkey FOREIGN KEY (id_pengiriman) REFERENCES public.pengiriman(id_pengiriman) ON DELETE CASCADE;
ALTER TABLE ONLY public.detail_pengiriman ADD CONSTRAINT detail_pengiriman_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE;
ALTER TABLE ONLY public.penagihan ADD CONSTRAINT penagihan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id_toko) ON DELETE CASCADE;
ALTER TABLE ONLY public.pengiriman ADD CONSTRAINT pengiriman_id_bulk_pengiriman_fkey FOREIGN KEY (id_bulk_pengiriman) REFERENCES public.bulk_pengiriman(id_bulk_pengiriman);
ALTER TABLE ONLY public.pengiriman ADD CONSTRAINT pengiriman_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id_toko) ON DELETE CASCADE;
ALTER TABLE ONLY public.potongan_penagihan ADD CONSTRAINT potongan_penagihan_id_penagihan_fkey FOREIGN KEY (id_penagihan) REFERENCES public.penagihan(id_penagihan) ON DELETE CASCADE;
ALTER TABLE ONLY public.toko ADD CONSTRAINT toko_id_sales_fkey FOREIGN KEY (id_sales) REFERENCES public.sales(id_sales) ON DELETE CASCADE;

-- Views
-- View for priority products
CREATE VIEW public.v_produk_prioritas AS
SELECT 
    id_produk,
    nama_produk,
    harga_satuan,
    priority_order,
    status_produk
FROM public.produk
WHERE is_priority = true AND status_produk = true
ORDER BY priority_order ASC, nama_produk ASC;

-- View for non-priority products
CREATE VIEW public.v_produk_non_prioritas AS
SELECT 
    id_produk,
    nama_produk,
    harga_satuan,
    status_produk
FROM public.produk
WHERE (is_priority = false OR is_priority IS NULL) AND status_produk = true
ORDER BY nama_produk ASC;

-- View for shipping report
CREATE VIEW public.v_laporan_pengiriman AS
SELECT 
    p.id_pengiriman,
    p.tanggal_kirim,
    t.nama_toko,
    t.kecamatan,
    t.kabupaten,
    s.nama_sales,
    pr.nama_produk,
    dp.jumlah_kirim,
    pr.harga_satuan,
    (dp.jumlah_kirim * pr.harga_satuan) as total_nilai,
    p.dibuat_pada
FROM public.pengiriman p
JOIN public.toko t ON p.id_toko = t.id_toko
JOIN public.sales s ON t.id_sales = s.id_sales
JOIN public.detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
JOIN public.produk pr ON dp.id_produk = pr.id_produk;

-- View for billing report
CREATE VIEW public.v_laporan_penagihan AS
SELECT 
    pen.id_penagihan,
    pen.dibuat_pada as tanggal_tagih,
    t.nama_toko,
    t.kecamatan,
    t.kabupaten,
    s.nama_sales,
    pr.nama_produk,
    dp.jumlah_terjual,
    dp.jumlah_kembali,
    pr.harga_satuan,
    (dp.jumlah_terjual * pr.harga_satuan) as total_nilai_terjual,
    pen.total_uang_diterima,
    pen.metode_pembayaran,
    pen.ada_potongan
FROM public.penagihan pen
JOIN public.toko t ON pen.id_toko = t.id_toko
JOIN public.sales s ON t.id_sales = s.id_sales
JOIN public.detail_penagihan dp ON pen.id_penagihan = dp.id_penagihan
JOIN public.produk pr ON dp.id_produk = pr.id_produk;

-- View for deposit reconciliation report
CREATE VIEW public.v_rekonsiliasi_setoran AS
SELECT 
    set.id_setoran,
    set.dibuat_pada as tanggal_setoran,
    set.total_setoran,
    set.penerima_setoran,
    COALESCE(SUM(pen.total_uang_diterima), 0) as total_penagihan_cash,
    (set.total_setoran - COALESCE(SUM(pen.total_uang_diterima), 0)) as selisih
FROM public.setoran set
LEFT JOIN public.penagihan pen ON DATE(pen.dibuat_pada) <= DATE(set.dibuat_pada) 
    AND pen.metode_pembayaran = 'Cash'
GROUP BY set.id_setoran, set.dibuat_pada, set.total_setoran, set.penerima_setoran
ORDER BY set.dibuat_pada DESC;