#!/usr/bin/env node
/**
 * Fix missing refresh_penagihan_materialized_views function
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false
    }
});

async function createMissingFunction() {
    try {
        console.log('🔧 Creating missing refresh_penagihan_materialized_views function...');
        
        const sqlFunction = `
-- Create the missing function as a simple placeholder
CREATE OR REPLACE FUNCTION public.refresh_penagihan_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function is called by triggers when penagihan records change
    -- Since we don't have materialized views anymore, this is just a placeholder
    -- In the future, if materialized views are added, refresh them here
    RETURN;
END;
$$;
        `;

        // Execute the function creation
        const { error } = await supabase.rpc('exec_sql', { sql: sqlFunction });
        
        if (error) {
            // Try direct SQL execution
            const { error: directError } = await supabase
                .from('_temp_')
                .select('*')
                .limit(0);
            
            // Log the function for manual execution
            console.log('ℹ️  Please execute this SQL manually in Supabase dashboard:');
            console.log(sqlFunction);
            return false;
        }

        console.log('✅ Function created successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error creating function:', error.message);
        console.log('ℹ️  Please execute this SQL manually in Supabase dashboard:');
        console.log(`
-- Create the missing function as a simple placeholder
CREATE OR REPLACE FUNCTION public.refresh_penagihan_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function is called by triggers when penagihan records change
    -- Since we don't have materialized views anymore, this is just a placeholder
    RETURN;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.refresh_penagihan_materialized_views() TO anon;
GRANT EXECUTE ON FUNCTION public.refresh_penagihan_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_penagihan_materialized_views() TO service_role;
        `);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting materialized views fix...\n');
    
    const success = await createMissingFunction();
    
    if (success) {
        console.log('\n✨ Fix completed successfully!');
        console.log('The penagihan transactions should now work without errors.');
    } else {
        console.log('\n⚠️  Please execute the SQL manually in Supabase dashboard.');
        console.log('1. Go to https://app.supabase.com');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the SQL shown above');
        console.log('4. Run it manually');
    }
}

if (require.main === module) {
    main().catch(console.error);
}