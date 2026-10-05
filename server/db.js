import sql from 'mssql';

let pool = null;

export async function getSqlPool() {
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;

  if (!connectionString) {
    const err = new Error('AZURE_SQL_CONNECTION_STRING is not set in environment variables');
    err.code = 'NO_DB_CONFIG';
    throw err;
  }

  try {
    // ถ้ายังไม่มี pool หรือ pool เชื่อมต่อไม่สำเร็จ ให้สร้างการเชื่อมต่อใหม่
    if (!pool || !pool.connected) {
      pool = await sql.connect(connectionString);
    }
    return pool;
  } catch (error) {
    // ล้างค่า pool เพื่อให้พยายามเชื่อมต่อใหม่ในครั้งถัดไป
    pool = null;
    console.error('Database connection failed:', error.message);
    throw error;
  }
}