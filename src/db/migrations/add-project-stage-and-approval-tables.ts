import { sql } from 'drizzle-orm';

import { db } from '../index';

export async function createProjectStageAndApprovalTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_project_stage_transition (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES bus_project(id) ON DELETE CASCADE,
        from_stage VARCHAR(50) NOT NULL,
        to_stage VARCHAR(50) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_id INTEGER,
        operator_id INTEGER NOT NULL REFERENCES sys_user(id),
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_project_stage_transition_project ON bus_project_stage_transition(project_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_project_stage_transition_created ON bus_project_stage_transition(created_at)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_project_stage_transition_trigger ON bus_project_stage_transition(trigger_type, trigger_id)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_approval_request (
        id SERIAL PRIMARY KEY,
        approval_type VARCHAR(50) NOT NULL,
        business_object_type VARCHAR(50) NOT NULL,
        business_object_id INTEGER NOT NULL,
        project_id INTEGER REFERENCES bus_project(id),
        title VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        current_step INTEGER NOT NULL DEFAULT 1,
        initiator_id INTEGER NOT NULL REFERENCES sys_user(id),
        submitted_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_request_project ON bus_approval_request(project_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_request_type ON bus_approval_request(approval_type)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_request_status ON bus_approval_request(status)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_request_business ON bus_approval_request(business_object_type, business_object_id)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_approval_step (
        id SERIAL PRIMARY KEY,
        approval_request_id INTEGER NOT NULL REFERENCES bus_approval_request(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        approver_id INTEGER REFERENCES sys_user(id),
        approver_role VARCHAR(50),
        decision VARCHAR(20) NOT NULL DEFAULT 'pending',
        decision_at TIMESTAMP,
        comment TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_approval_step_request_order UNIQUE (approval_request_id, step_order)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_step_request ON bus_approval_step(approval_request_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_step_approver ON bus_approval_step(approver_id)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bus_approval_event (
        id SERIAL PRIMARY KEY,
        approval_request_id INTEGER NOT NULL REFERENCES bus_approval_request(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        operator_id INTEGER NOT NULL REFERENCES sys_user(id),
        payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_event_request ON bus_approval_event(approval_request_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_approval_event_type ON bus_approval_event(event_type)
    `);

    console.log('✅ project stage transition and approval tables created successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to create phase-3 batch-a tables:', error);
    return false;
  }
}

if (require.main === module) {
  createProjectStageAndApprovalTables()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createProjectStageAndApprovalTables;