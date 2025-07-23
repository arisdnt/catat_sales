const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://ubzemtmtkmezhdsezeko.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemVtdG10a21lemhkc2V6ZWtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg4NTg3OSwiZXhwIjoyMDY4NDYxODc5fQ.Kq7YHbu_2U1YlDHFdSZwzAqqpzou_xPEVt52q0X20Rk'
);

async function applySetoranFixes() {
  try {
    console.log('🔄 Applying setoran dashboard fixes...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./fix_setoran_view.sql', 'utf8');
    
    // Apply the SQL changes
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    });
    
    if (error) {
      console.error('❌ Error applying database changes:', error.message);
      
      // Try alternative approach - execute each statement separately
      console.log('🔄 Trying alternative approach...');
      
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        if (statement.includes('--') && !statement.includes('CREATE')) {
          continue; // Skip comments
        }
        
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          if (stmtError) {
            console.log(`⚠️ Statement failed: ${statement.substring(0, 50)}...`);
            console.log(`Error: ${stmtError.message}`);
          } else {
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
          }
        } catch (err) {
          console.log(`⚠️ Statement error: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Database changes applied successfully');
    }
    
    // Test the new view
    console.log('🔍 Testing new view structure...');
    const { data: testData, error: testError } = await supabase
      .from('v_setoran_dashboard')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.error('❌ Error testing view:', testError.message);
    } else {
      console.log('✅ View is working correctly');
      console.log(`📊 Sample data rows: ${testData.length}`);
      if (testData.length > 0) {
        console.log('📋 Sample fields:', Object.keys(testData[0]).join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the fixes
applySetoranFixes();