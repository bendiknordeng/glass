import { supabase } from '@/services/supabase';

// Generate a valid test UUID for unauthenticated test scenarios
function generateTestUuid(): string {
  return '1ddcaa0b-5b46-4005-95c1-b5ab18030b0b';
}

/**
 * This utility function tests Supabase connectivity and various operations
 * to diagnose where issues might be occurring.
 */
export async function testSupabaseConnection() {
  console.log('🔍 STARTING SUPABASE CONNECTION TEST');
  console.log('------------------------------------');
  
  // Test 1: Basic connectivity
  console.log('Test 1: Basic connectivity');
  try {
    const start = performance.now();
    const { data, error } = await supabase.from('players').select('count').limit(1);
    const duration = Math.round(performance.now() - start);
    
    if (error) {
      console.error(`❌ Connection failed (${duration}ms):`, error);
    } else {
      console.log(`✅ Connected successfully (${duration}ms)`);
      console.log('    Count result:', data);
    }
  } catch (e) {
    console.error('❌ Connection exception:', e);
  }
  
  // Test 2: Auth state
  console.log('\nTest 2: Auth state');
  let userId;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session) {
      userId = session.session.user.id;
      console.log('✅ Authenticated as:', userId);
      console.log('   Email:', session.session.user.email);
    } else {
      userId = generateTestUuid(); // Use a properly formatted test UUID
      console.log('❌ Not authenticated');
      console.log('   Using test UUID for remaining tests:', userId);
    }
  } catch (e) {
    userId = generateTestUuid(); // Fallback if auth check fails
    console.error('❌ Auth check exception:', e);
    console.log('   Using test UUID for remaining tests:', userId);
  }
  
  // Test 3: Test RLS with simple insert
  console.log('\nTest 3: Test insert operation');
  try {
    const start = performance.now();
    const testData = {
      user_id: userId, // Now using a properly formatted UUID
      name: 'Test Player ' + new Date().toISOString(),
      image: null,
      score: 0,
      favorite: false,
      last_played_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert(testData)
      .select();
    
    const duration = Math.round(performance.now() - start);
    
    if (error) {
      console.error(`❌ Insert failed (${duration}ms):`, error);
      
      if (error.code === '42501') {
        console.log('   This appears to be a permissions error. Check your RLS policies.');
      } else if (error.code === '23503') {
        console.log('   This appears to be a foreign key constraint error.');
      } else if (error.code === '23505') {
        console.log('   This appears to be a unique constraint violation.');
      }
    } else {
      console.log(`✅ Insert successful (${duration}ms)`);
      console.log('   Inserted data:', data);
    }
  } catch (e) {
    console.error('❌ Insert exception:', e);
  }
  
  // Test 4: Network latency 
  console.log('\nTest 4: Network latency test');
  try {
    const tests = 3;
    let totalTime = 0;
    
    for (let i = 0; i < tests; i++) {
      const start = performance.now();
      await supabase.from('players').select('count');
      const duration = performance.now() - start;
      totalTime += duration;
      console.log(`   Request ${i+1}: ${Math.round(duration)}ms`);
    }
    
    const avgTime = Math.round(totalTime / tests);
    console.log(`   Average latency: ${avgTime}ms`);
    
    if (avgTime > 1000) {
      console.log('❌ High latency detected (>1000ms). This could cause timeouts.');
    } else if (avgTime > 500) {
      console.log('⚠️ Moderate latency detected (>500ms). This might contribute to issues.');
    } else {
      console.log('✅ Latency looks acceptable.');
    }
  } catch (e) {
    console.error('❌ Latency test exception:', e);
  }
  
  // Test 5: Check for required tables
  console.log('\nTest 5: Check required tables');
  const requiredTables = ['players', 'challenges', 'games', 'users'];
  
  for (const table of requiredTables) {
    try {
      const start = performance.now();
      // We'll do a simple count query to check table existence
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      const duration = Math.round(performance.now() - start);
      
      if (error) {
        if (error.code === '42P01') {
          console.error(`❌ Table '${table}' does not exist (${duration}ms)`);
        } else {
          console.error(`❌ Error checking table '${table}' (${duration}ms):`, error);
        }
      } else {
        console.log(`✅ Table '${table}' exists (${duration}ms)`);
      }
    } catch (e) {
      console.error(`❌ Exception checking table '${table}':`, e);
    }
  }
  
  // Test 6: Test RLS policies
  console.log('\nTest 6: RLS Policy Test');
  
  // First get auth state - reusing the userId from the earlier test
  if (userId) {
    console.log(`Testing RLS policies with user ID: ${userId}`);
    
    // Test 6.1: Insert with correct user_id
    try {
      console.log('Test 6.1: Insert with correct user_id (should succeed)');
      const start = performance.now();
      const testData = {
        user_id: userId,
        name: 'RLS Test Player ' + new Date().toISOString(),
        image: null,
        score: 0,
        favorite: false,
        last_played_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('players')
        .insert(testData)
        .select()
        .single();
      
      const duration = Math.round(performance.now() - start);
      
      if (error) {
        console.error(`❌ Insert failed (${duration}ms):`, error);
        console.log('   This suggests your RLS policies are too restrictive or not properly configured.');
      } else {
        console.log(`✅ Insert succeeded (${duration}ms). RLS policy allows correct inserts.`);
        
        // Try to clean up the test data
        try {
          await supabase.from('players').delete().eq('id', data.id);
          console.log('   Test data cleaned up successfully.');
        } catch (e) {
          console.error('   Could not clean up test data:', e);
        }
      }
    } catch (e) {
      console.error('❌ Exception testing RLS insert:', e);
    }
    
    // Test 6.2: Insert with wrong user_id (should fail if RLS is working)
    try {
      console.log('\nTest 6.2: Insert with wrong user_id (should fail if RLS is correctly configured)');
      const start = performance.now();
      const fakeUserId = userId === '00000000-0000-0000-0000-000000000000' 
        ? '11111111-1111-1111-1111-111111111111' 
        : '00000000-0000-0000-0000-000000000000';
        
      const testData = {
        user_id: fakeUserId, // Using a different but valid UUID
        name: 'Bad RLS Test Player ' + new Date().toISOString(),
        image: null,
        score: 0,
        favorite: false,
        last_played_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('players')
        .insert(testData)
        .select()
        .single();
      
      const duration = Math.round(performance.now() - start);
      
      if (error) {
        console.log(`✅ Insert with wrong user_id correctly failed (${duration}ms). RLS policies working.`);
      } else {
        console.error(`❌ Insert with wrong user_id succeeded (${duration}ms)!`);
        console.log('   This indicates your RLS policies are NOT restricting users properly.');
        console.log('   This is a security risk - users can insert data for other users.');
        
        // Try to clean up the test data
        try {
          await supabase.from('players').delete().eq('id', data.id);
          console.log('   Test data cleaned up successfully.');
        } catch (e) {
          console.error('   Could not clean up test data:', e);
        }
      }
    } catch (e) {
      console.error('❌ Exception testing RLS wrong user_id insert:', e);
    }
  } else {
    console.log('❌ No valid user ID available for RLS tests.');
  }
  
  console.log('\n------------------------------------');
  console.log('🔍 SUPABASE CONNECTION TEST COMPLETE');
}

// Additional helper function to check if a specific table exists
export async function checkTableExists(tableName: string) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    if (error) {
      console.error(`Error checking if ${tableName} exists:`, error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (e) {
    console.error(`Exception checking if ${tableName} exists:`, e);
    return false;
  }
} 