import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

function getStoredConnections() {
  try {
    const filePath = join(process.cwd(), 'data', 'connections.json');
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: { dbId: string } }
) {
  try {
    const { dbId } = params;
    
    // Get database connection details
    const connections = getStoredConnections();
    const connection = connections.find((conn: any) => conn.id === dbId);
    
    if (!connection) {
      return NextResponse.json({ 
        healthy: false, 
        error: 'Database connection not found' 
      }, { status: 404 });
    }
    
    const connectionConfig = {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
      connectTimeoutMillis: 5000, // 5 second timeout
    };

    const pool = new Pool(connectionConfig);

    try {
      const start = Date.now();
      const result = await pool.query('SELECT 1 as health_check');
      const latency = Date.now() - start;
      
      return NextResponse.json({
        healthy: true,
        latency,
        database: connection.database,
        host: connection.host,
        port: connection.port
      });
    } catch (error: any) {
      return NextResponse.json({
        healthy: false,
        error: error.message,
        code: error.code
      }, { status: 503 });
    } finally {
      try {
        await pool.end();
      } catch (closeError) {
        console.error('Error closing health check pool:', closeError);
      }
    }
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json({
      healthy: false,
      error: 'Internal server error during health check'
    }, { status: 500 });
  }
}
