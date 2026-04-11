import { sql } from 'drizzle-orm';

import { db } from '../index';

export async function createProjectImplementationTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_project_implementation (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL UNIQUE REFERENCES bus_project(id),
        implementation_status VARCHAR(50) DEFAULT 'planning',
        delivery_plan TEXT,
        implementation_steps TEXT,
        acceptance_criteria TEXT,
        risk_mitigation TEXT,
        progress_notes TEXT,
        planned_start_date DATE,
        planned_end_date DATE,
        actual_start_date DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_project_implementation_project ON bus_project_implementation(project_id)
    `);

    console.log('✅ bus_project_implementation table created');
  } catch (error) {
    console.error('❌ Failed to create bus_project_implementation table:', error);
    throw error;
  }
}
