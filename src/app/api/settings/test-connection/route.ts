import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONNECTIONS_FILE = join(process.cwd(), 'data', 'connections.json');

interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

// Load connections from file
function loadConnections(): DatabaseConnection[] {
  if (!existsSync(CONNECTIONS_FILE)) {
    return [];
  }
  try {
    const data = readFileSync(CONNECTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load connections:', error);
    return [];
  }
}

async function testPostgreSQLConnection(connection: DatabaseConnection) {
  const pool = new Pool({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    // Set a timeout for connection testing
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    max: 1, // Only create one connection for testing
  });

  try {
    // Test the connection
    const client = await pool.connect();
    
    // Run a simple query to verify the connection works
    const result = await client.query('SELECT 1 as test');
    client.release();
    
    return {
      success: true,
      message: `Successfully connected to ${connection.database}`,
      details: `Connection established to PostgreSQL database "${connection.database}" on ${connection.host}:${connection.port}`
    };
  } catch (error: any) {
    console.error('PostgreSQL connection test failed:', error);
    
    // Provide more specific error messages
    let message = 'Connection failed';
    if (error.code === 'ECONNREFUSED') {
      message = 'Connection refused - check if the database server is running';
    } else if (error.code === 'ENOTFOUND') {
      message = 'Host not found - check the hostname';
    } else if (error.code === '28P01') {
      message = 'Authentication failed - check username and password';
    } else if (error.code === '3D000') {
      message = 'Database does not exist';
    } else if (error.message) {
      message = error.message;
    }
    
    return {
      success: false,
      message,
      details: error.code ? `Error code: ${error.code}` : undefined
    };
  } finally {
    await pool.end();
  }
}

async function testMySQLConnection(connection: DatabaseConnection) {
  // For now, return a placeholder - you can implement MySQL testing later
  return {
    success: false,
    message: 'MySQL connection testing not yet implemented',
    details: 'This feature will be added in a future update'
  };
}

async function testSQLiteConnection(connection: DatabaseConnection) {
  // For now, return a placeholder - you can implement SQLite testing later
  return {
    success: false,
    message: 'SQLite connection testing not yet implemented',
    details: 'This feature will be added in a future update'
  };
}

async function testMongoDBConnection(connection: DatabaseConnection) {
  // For now, return a placeholder - you can implement MongoDB testing later
  return {
    success: false,
    message: 'MongoDB connection testing not yet implemented',
    details: 'This feature will be added in a future update'
  };
}

export async function POST(request: NextRequest) {
  try {
    const connectionData: DatabaseConnection = await request.json();
    console.log('Testing connection for:', { ...connectionData, password: '***' });

    // If the password is masked, get the real password from stored connections
    let actualConnection = connectionData;
    if (connectionData.password === '••••••••') {
      const storedConnections = loadConnections();
      const storedConnection = storedConnections.find(conn => conn.id === connectionData.id);
      
      if (storedConnection) {
        actualConnection = {
          ...connectionData,
          password: storedConnection.password
        };
        console.log('Using stored password for connection test');
      } else {
        console.log('No stored connection found, using provided data');
      }
    }

    if (!actualConnection.type || !actualConnection.host || !actualConnection.database) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required connection parameters' 
        },
        { status: 400 }
      );
    }

    let result;
    
    switch (actualConnection.type) {
      case 'postgresql':
        result = await testPostgreSQLConnection(actualConnection);
        break;
      case 'mysql':
        result = await testMySQLConnection(actualConnection);
        break;
      case 'sqlite':
        result = await testSQLiteConnection(actualConnection);
        break;
      case 'mongodb':
        result = await testMongoDBConnection(actualConnection);
        break;
      default:
        result = {
          success: false,
          message: `Unsupported database type: ${actualConnection.type}`
        };
    }

    console.log('Connection test result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while testing the connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
