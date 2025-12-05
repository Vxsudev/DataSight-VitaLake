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

function getConnectionConfig(dbId: string) {
  if (dbId) {
    const connections = getStoredConnections();
    const connection = connections.find((conn: any) => conn.id === dbId);
    
    if (!connection) {
      throw new Error('Database connection not found');
    }
    
    return {
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
      throw new Error('Database connection not configured');
    }
    
    return {
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.POSTGRES_URL?.includes('localhost') || process.env.POSTGRES_URL?.includes('sslmode=disable') 
        ? false 
        : {
            rejectUnauthorized: false,
          },
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { dbId: string; schemaId: string; tableId: string; columnName: string } }
) {
  const { dbId, schemaId, tableId, columnName } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Cap at 1000 for safety
  const search = searchParams.get('search');
  
  let pool: Pool | null = null;
  
  try {
    // Get database connection configuration
    const connectionConfig = getConnectionConfig(dbId);
    pool = new Pool(connectionConfig);
    
    // Build the base query for distinct values with optional search filtering
    let whereClause = `"${columnName}" IS NOT NULL`;
    let queryParams: any[] = [limit];
    
    // Add search filtering if provided
    if (search && search.trim()) {
      whereClause += ` AND LOWER("${columnName}"::text) LIKE LOWER($2)`;
      queryParams.push(`%${search.trim()}%`);
    }
    
    // Get distinct values for the column, ordered by frequency (most common first)
    const query = `
      SELECT "${columnName}" as value, COUNT(*) as count 
      FROM "${schemaId}"."${tableId}" 
      WHERE ${whereClause}
      GROUP BY "${columnName}" 
      ORDER BY COUNT(*) DESC, "${columnName}" ASC 
      LIMIT $1
    `;
    
    const result = await pool.query(query, queryParams);
    
    // Also get NULL count if there are any (separate query for clarity)
    let nullCountQuery = `
      SELECT COUNT(*) as null_count 
      FROM "${schemaId}"."${tableId}" 
      WHERE "${columnName}" IS NULL
    `;
    
    // If searching, don't include NULLs unless explicitly searching for them
    if (search && search.trim() && !search.toLowerCase().includes('null')) {
      // Don't include NULL count when searching unless searching for null
    } else {
      const nullResult = await pool.query(nullCountQuery);
      const nullCount = parseInt(nullResult.rows[0]?.null_count || '0');
      
      // Prepare the distinct values array
      const distinctValues = result.rows.map(row => ({
        value: row.value,
        count: parseInt(row.count),
        displayValue: row.value?.toString() || 'NULL'
      }));
      
      // Add NULL option if there are NULL values and not searching or searching for null
      if (nullCount > 0 && (!search || search.toLowerCase().includes('null'))) {
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
        hasMore: result.rows.length >= limit,
        searchTerm: search || null
      });
    }
    
    // No NULL handling when search doesn't match
    const distinctValues = result.rows.map(row => ({
      value: row.value,
      count: parseInt(row.count),
      displayValue: row.value?.toString() || 'NULL'
    }));

    return NextResponse.json({
      column: columnName,
      values: distinctValues,
      totalDistinct: distinctValues.length,
      hasMore: result.rows.length >= limit,
      searchTerm: search || null
    });

    return NextResponse.json({
      column: columnName,
      values: distinctValues,
      totalDistinct: distinctValues.length,
      hasMore: result.rows.length >= limit,
      searchTerm: search || null
    });
    
  } catch (error: any) {
    console.error(`Error fetching distinct values for column ${columnName} from database ${dbId}:`, error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch distinct values',
      column: columnName 
    }, { status: 500 });
  } finally {
    // Close the pool to avoid connection leaks
    if (pool) {
      try {
        await pool.end();
      } catch (closeError) {
        console.error('Error closing database pool:', closeError);
      }
    }
  }
}
