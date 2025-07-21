-- Migration: Remove bulk_pengiriman table and associated dependencies
-- This removes the unnecessary bulk_pengiriman table and simplifies the architecture

-- Step 1: Drop foreign key constraint from pengiriman table
ALTER TABLE public.pengiriman DROP CONSTRAINT IF EXISTS pengiriman_id_bulk_pengiriman_fkey;

-- Step 2: Drop the id_bulk_pengiriman column from pengiriman table
ALTER TABLE public.pengiriman DROP COLUMN IF EXISTS id_bulk_pengiriman;

-- Step 3: Drop the bulk_pengiriman table (this will also drop dependent objects)
DROP TABLE IF EXISTS public.bulk_pengiriman CASCADE;

-- Step 4: Drop the sequence
DROP SEQUENCE IF EXISTS public.bulk_pengiriman_id_bulk_pengiriman_seq;

-- Step 5: Add comments for documentation
COMMENT ON TABLE public.pengiriman IS 'Individual shipments table - no longer dependent on bulk_pengiriman';

-- Verification query (optional - can be used to verify the changes)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'pengiriman' 
-- ORDER BY ordinal_position;