// Test script to verify PostgreSQL connection
// Run with: node scripts/test-db-connection.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL?.includes('localhost') || process.env.POSTGRES_URL?.includes('sslmode=disable') 
      ? false 
      : {
          rejectUnauthorized: false,
        },
  });

  try {
    console.log('Testing database connection...');
    console.log('Connection string:', process.env.POSTGRES_URL ? 'Set ✓' : 'Missing ✗');
    
    if (!process.env.POSTGRES_URL) {
      console.error('❌ POSTGRES_URL environment variable is not set');
      console.log('Please create .env.local file with your database connection string.');
      return;
    }

    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    console.log('📊 Database version:', versionResult.rows[0].version);
    
    // Test schema access
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log('📋 Available schemas:', schemasResult.rows.map(row => row.schema_name));
    
    // Test table count
    const tableResult = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    `);
    console.log('🗂️  Total tables:', tableResult.rows[0].table_count);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possible solutions:');
      console.log('   - Check if PostgreSQL is running');
      console.log('   - Verify host and port in connection string');
      console.log('   - Check firewall settings');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed:');
      console.log('   - Check username and password');
      console.log('   - Verify pg_hba.conf settings');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist:');
      console.log('   - Check database name in connection string');
      console.log('   - Create the database if it doesn\'t exist');
    }
  } finally {
    await pool.end();
  }
}

testConnection();
