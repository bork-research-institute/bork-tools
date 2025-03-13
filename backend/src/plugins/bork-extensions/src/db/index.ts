import { Pool } from 'pg';
import * as queries from './queries';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export { pool as db, schema, queries };
