#!/usr/bin/env node
/**
 * Database migration script for implementing RPC functions
 * Usage: node migrate.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false
    }
});

async function executeSqlFile(filePath) {
    try {
        console.log(`📖 Reading migration file: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        
        // Split SQL content by statements (separated by semicolon and newline)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`🔧 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement.trim().length === 0) continue;
            
            try {
                console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
                
                // Execute SQL statement
                const { data, error } = await supabase.rpc('exec_sql_statement', {
                    sql_statement: statement + ';'
                });
                
                if (error) {
                    // Try direct execution if rpc function doesn't exist
                    const { error: directError } = await supabase
                        .from('_temp_migration')
                        .select('*')
                        .limit(1);
                    
                    // Execute using raw SQL query - we'll use a workaround
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_SERVICE_KEY
                        },
                        body: JSON.stringify({
                            sql: statement + ';'
                        })
                    });
                    
                    if (!response.ok) {
                        // Last resort: try executing via SQL editor simulation
                        console.log(`⚠️  Warning: Could not execute statement ${i + 1} automatically`);
                        console.log(`Statement: ${statement.substring(0, 100)}...`);
                        errorCount++;
                        continue;
                    }
                }
                
                successCount++;
                console.log(`✅ Statement ${i + 1} executed successfully`);
                
            } catch (statementError) {
                console.error(`❌ Error executing statement ${i + 1}:`, statementError.message);
                console.error(`Statement: ${statement.substring(0, 200)}...`);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`✅ Successful statements: ${successCount}`);
        console.log(`❌ Failed statements: ${errorCount}`);
        console.log(`📝 Total statements: ${statements.length}`);
        
        if (errorCount === 0) {
            console.log(`\n🎉 Migration completed successfully!`);
        } else {
            console.log(`\n⚠️  Migration completed with ${errorCount} errors`);
            console.log(`Please review the failed statements and execute them manually in Supabase Dashboard`);
        }
        
        return { successCount, errorCount, totalStatements: statements.length };
        
    } catch (error) {
        console.error('❌ Error reading or executing migration file:', error.message);
        throw error;
    }
}

async function testConnection() {
    try {
        console.log('🔌 Testing Supabase connection...');
        const { data, error } = await supabase
            .from('produk')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Connection successful!');
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting database migration...\n');
    
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
        console.error('❌ Cannot proceed without database connection');
        process.exit(1);
    }
    
    // Execute migration
    const migrationFile = path.join(__dirname, 'database_migration.sql');
    
    if (!fs.existsSync(migrationFile)) {
        console.error(`❌ Migration file not found: ${migrationFile}`);
        process.exit(1);
    }
    
    try {
        const result = await executeSqlFile(migrationFile);
        
        if (result.errorCount > 0) {
            console.log('\n📋 Manual execution required for failed statements:');
            console.log('1. Go to https://app.supabase.com');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Copy and paste the failed SQL statements');
            console.log('4. Run them manually');
            process.exit(1);
        }
        
        console.log('\n✨ All done! The RPC functions are now available for use.');
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    }
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run migration
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeSqlFile, testConnection };