#!/usr/bin/env node
/**
 * Test penagihan creation and fix the function issue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
    try {
        console.log('🔌 Testing database connection...');
        const { data, error } = await supabase
            .from('produk')
            .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        console.log('✅ Connection successful!');
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
    }
}

async function createFunction() {
    try {
        console.log('🔧 Creating missing function...');
        
        // Use a simple function creation via raw SQL
        const { error } = await supabase.rpc('exec', {
            sql: `
CREATE OR REPLACE FUNCTION public.refresh_penagihan_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Placeholder function for trigger compatibility
    RETURN;
END;
$$;
            `
        });
        
        if (error) {
            console.log('⚠️  Direct function creation failed, trying alternative...');
            
            // Alternative: Create a dummy record to test if the function is needed
            console.log('🧪 Testing penagihan creation...');
            
            // First, let's see what happens when we try to create a penagihan
            return false;
        }
        
        console.log('✅ Function created successfully!');
        return true;
    } catch (error) {
        console.error('❌ Function creation failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting penagihan fix test...\n');
    
    const connected = await testConnection();
    if (!connected) {
        process.exit(1);
    }
    
    const functionCreated = await createFunction();
    
    if (!functionCreated) {
        console.log('\n📋 Manual SQL to execute in Supabase dashboard:');
        console.log('---');
        console.log(`
CREATE OR REPLACE FUNCTION public.refresh_penagihan_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function is called by triggers when penagihan records change
    -- Since we don't have materialized views, this is just a placeholder
    RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.refresh_penagihan_materialized_views() TO anon;
GRANT EXECUTE ON FUNCTION public.refresh_penagihan_materialized_views() TO authenticated;  
GRANT EXECUTE ON FUNCTION public.refresh_penagihan_materialized_views() TO service_role;
        `);
        console.log('---');
        console.log('✋ After executing the SQL above, try the penagihan transaction again.');
    } else {
        console.log('\n✨ Fix completed! You can now try the penagihan transaction.');
    }
}

main().catch(console.error);