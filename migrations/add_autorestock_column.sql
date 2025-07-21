-- Migration: Add is_autorestock column to pengiriman table
-- This allows us to identify which shipments are autorestock shipments

-- Add the is_autorestock column
ALTER TABLE public.pengiriman 
ADD COLUMN is_autorestock boolean DEFAULT false;

-- Update existing autorestock shipments (pengiriman created on the same day as penagihan)
-- This identifies autorestock shipments by matching timing patterns
UPDATE public.pengiriman 
SET is_autorestock = true 
WHERE id_pengiriman IN (
    SELECT DISTINCT p.id_pengiriman
    FROM pengiriman p
    INNER JOIN penagihan pen ON p.id_toko = pen.id_toko
    WHERE p.tanggal_kirim::date = pen.dibuat_pada::date
    AND p.dibuat_pada > pen.dibuat_pada
    AND p.dibuat_pada - pen.dibuat_pada < INTERVAL '5 minutes'
);

-- Add index for better query performance
CREATE INDEX idx_pengiriman_autorestock ON public.pengiriman(is_autorestock);

-- Add comment for documentation
COMMENT ON COLUMN public.pengiriman.is_autorestock IS 'Identifies if this shipment is an automatic restock shipment created from billing';