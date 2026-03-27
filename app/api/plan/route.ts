import { NextRequest, NextResponse } from 'next/server';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'devuser',
  password: process.env.DB_PASSWORD ?? 'devpass',
  database: process.env.DB_NAME ?? 'travel_planning',
});

// GET /api/plan?user_id=1
// GET /api/plan?user_id=1&plan_id=5
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('user_id');
  const planId = searchParams.get('plan_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  if (planId) {
    const result = await pool.query(
      'SELECT * FROM user_plan WHERE user_id = $1 AND plan_id = $2',
      [userId, planId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  }

  const result = await pool.query(
    'SELECT * FROM user_plan WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return NextResponse.json(result.rows);
}

// POST /api/plan
// Body: { user_id: number, plans: object[] }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, plans } = body;

  if (!user_id || !Array.isArray(plans) || plans.length === 0) {
    return NextResponse.json(
      { error: 'user_id and plans (non-empty array) are required' },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Auto-create user if not exists
    await client.query(
      'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [user_id],
    );

    const values = plans.map((_, i) => `($1, $${i + 2})`).join(', ');
    const params = [user_id, ...plans.map((p) => JSON.stringify(p))];
    const queryText = `INSERT INTO user_plan (user_id, plan_data) VALUES ${values} RETURNING *`;

    console.log("Executing query:", queryText, "with params:", params);
    const result = await client.query(queryText, params);

    await client.query('COMMIT');
    return NextResponse.json(result.rows, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// DELETE /api/plan
// Body: { plan_id: number, user_id: number }
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { plan_id, user_id } = body;

  if (!plan_id || !user_id) {
    return NextResponse.json({ error: 'plan_id and user_id are required' }, { status: 400 });
  }

  const result = await pool.query(
    'DELETE FROM user_plan WHERE plan_id = $1 AND user_id = $2 RETURNING *',
    [plan_id, user_id],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Deleted successfully', plan: result.rows[0] });
}
