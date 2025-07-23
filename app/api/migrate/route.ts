import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from '@/lib/api-helpers';

export async function POST() {
    try {
        console.log('🚀 Starting database migration...');
        
        // Read the migration file
        const migrationPath = join(process.cwd(), 'database_migration.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        console.log('📖 Migration file loaded successfully');
        
        // Split into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\s*$/));
        
        console.log(`🔧 Processing ${statements.length} SQL statements...`);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            try {
                console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
                
                // Execute SQL statement directly using supabase admin
                const { data, error } = await supabaseAdmin
                    .rpc('exec_sql', { sql: statement + ';' })
                    .single();
                
                if (error) {
                    // If exec_sql RPC doesn't exist, try direct query execution
                    const { error: queryError } = await supabaseAdmin
                        .from('information_schema.tables')
                        .select('*')
                        .limit(1);
                    
                    if (!queryError) {
                        // Connection works, but we need to handle SQL execution differently
                        // For now, we'll log the statement to be executed manually
                        console.log(`⚠️  Statement ${i + 1} needs manual execution:`, statement.substring(0, 100) + '...');
                        results.push({
                            statement: i + 1,
                            status: 'manual_required',
                            error: 'Direct SQL execution not available via API',
                            preview: statement.substring(0, 100) + '...'
                        });
                        errorCount++;
                        continue;
                    }
                    
                    throw new Error(error.message || 'Failed to execute statement');
                }
                
                results.push({
                    statement: i + 1,
                    status: 'success',
                    preview: statement.substring(0, 100) + '...'
                });
                successCount++;
                console.log(`✅ Statement ${i + 1} executed successfully`);
                
            } catch (error: any) {
                console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                results.push({
                    statement: i + 1,
                    status: 'error',
                    error: error.message,
                    preview: statement.substring(0, 100) + '...'
                });
                errorCount++;
            }
        }
        
        console.log(`📊 Migration completed - Success: ${successCount}, Errors: ${errorCount}`);
        
        return NextResponse.json({
            success: errorCount === 0,
            message: errorCount === 0 
                ? 'Migration completed successfully!' 
                : `Migration completed with ${errorCount} errors. Some statements may need manual execution.`,
            summary: {
                totalStatements: statements.length,
                successCount,
                errorCount
            },
            results,
            manualExecutionRequired: errorCount > 0,
            migrationSQL: errorCount > 0 ? migrationSQL : undefined
        });
        
    } catch (error: any) {
        console.error('💥 Migration failed:', error.message);
        
        return NextResponse.json({
            success: false,
            message: 'Migration failed: ' + error.message,
            error: error.message,
            migrationSQL: readFileSync(join(process.cwd(), 'database_migration.sql'), 'utf8')
        }, { status: 500 });
    }
}

// GET endpoint to provide the migration SQL for manual execution
export async function GET() {
    try {
        const migrationPath = join(process.cwd(), 'database_migration.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        return NextResponse.json({
            success: true,
            message: 'Migration SQL ready for manual execution',
            migrationSQL,
            instructions: [
                '1. Copy the migrationSQL content from this response',
                '2. Go to https://app.supabase.com and open your project',
                '3. Navigate to SQL Editor',
                '4. Paste the SQL and execute it',
                '5. Verify that all RPC functions were created successfully'
            ]
        });
        
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: 'Failed to read migration file',
            error: error.message
        }, { status: 500 });
    }
}