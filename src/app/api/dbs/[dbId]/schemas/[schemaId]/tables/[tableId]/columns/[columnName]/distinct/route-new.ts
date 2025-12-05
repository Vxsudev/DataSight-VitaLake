import { NextResponse, NextRequest } from 'next/server';
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
  request: NextRequest,
  { params }: { params: { dbId: string; schemaId: string; tableId: string; columnName: string } }
) {
  const { dbId, schemaId, tableId, columnName } = await params;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '100'; // Limit distinct values for performance
  
  // Get database connection details
  let connectionConfig;
  
  if (dbId) {
    const connections = getStoredConnections();
    const connection = connections.find((conn: any) => conn.id === dbId);
    
    if (!connection) {
      return NextResponse.json({ error: 'Database connection not found' }, { status: 404 });
    }
    
    connectionConfig = {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    };
  } else {
    // Fallback to environment variables if no dbId provided
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }
    
    connectionConfig = {
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.POSTGRES_URL?.includes('localhost') || process.env.POSTGRES_URL?.includes('sslmode=disable') 
        ? false 
        : {
            rejectUnauthorized: false,
          },
    };
  }

  const pool = new Pool(connectionConfig);

  try {
    // Get distinct values for the column, ordered by frequency (most common first)
    // LIMIT to prevent overwhelming the UI with thousands of options
    const query = `
      SELECT "${columnName}" as value, COUNT(*) as count 
      FROM "${schemaId}"."${tableId}" 
      WHERE "${columnName}" IS NOT NULL 
      GROUP BY "${columnName}" 
      ORDER BY COUNT(*) DESC, "${columnName}" ASC 
      LIMIT $1
    `;
    
    const result = await pool.query(query, [parseInt(limit)]);
    
    // Also get NULL count if there are any
    const nullCountQuery = `
      SELECT COUNT(*) as null_count 
      FROM "${schemaId}"."${tableId}" 
      WHERE "${columnName}" IS NULL
    `;
    
    const nullResult = await pool.query(nullCountQuery);
    const nullCount = parseInt(nullResult.rows[0]?.null_count || '0');
    
    const distinctValues = result.rows.map(row => ({
      value: row.value,
      count: parseInt(row.count),
      displayValue: row.value?.toString() || 'NULL'
    }));
    
    // Add NULL option if there are NULL values
    if (nullCount > 0) {
      distinctValues.push({
        value: null,
        count: nullCount,
        displayValue: 'NULL'
      });
    }

    return NextResponse.json({
      column: columnName,
      values: distinctValues,
      totalDistinct: distinctValues.length,
      hasMore: result.rows.length >= parseInt(limit)
    });
    
  } catch (error: any) {
    console.error(`Error fetching distinct values for column ${columnName} from database ${dbId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Close the pool to avoid connection leaks
    try {
      await pool.end();
    } catch (closeError) {
      console.error('Error closing database pool:', closeError);
    }
  }
}
