import bcrypt from 'bcrypt';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://presales:presales@localhost:5432/presales_system';
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD || 'password';

const testUsers = [
  {
    username: 'duhui',
    realName: '杜辉',
    email: 'duhui@zhengyuan.com',
    roleId: 2,
    department: '售前部',
    phone: '13800138101',
  },
  {
    username: 'qiyijun',
    realName: '齐益军',
    email: 'qiyijun@zhengyuan.com',
    roleId: 4,
    department: '项目管理部',
    phone: '13800138102',
  },
  {
    username: 'yangyang',
    realName: '杨阳',
    email: 'yangyang@zhengyuan.com',
    roleId: 3,
    department: '解决方案部',
    phone: '13800138103',
  },
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await client.query(
      "select setval(pg_get_serial_sequence('sys_user','id'), coalesce((select max(id) from sys_user), 1), true)"
    );

    const results = [];

    for (const testUser of testUsers) {
      const existing = await client.query<{ id: number }>(
        'select id from sys_user where username = $1 or email = $2 limit 1',
        [testUser.username, testUser.email]
      );

      let userId: number;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        await client.query(
          'update sys_user set real_name = $1, email = $2, phone = $3, department = $4, role_id = $5, status = $6, deleted_at = null, updated_at = now() where id = $7',
          [testUser.realName, testUser.email, testUser.phone, testUser.department, testUser.roleId, 'active', userId]
        );
      } else {
        const inserted = await client.query<{ id: number }>(
          'insert into sys_user (username, password, real_name, email, phone, department, role_id, status, must_change_password, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()) returning id',
          [
            testUser.username,
            passwordHash,
            testUser.realName,
            testUser.email,
            testUser.phone,
            testUser.department,
            testUser.roleId,
            'active',
            false,
          ]
        );
        userId = inserted.rows[0].id;
      }

      await client.query('delete from sys_user_role where user_id = $1', [userId]);
      await client.query(
        'insert into sys_user_role (user_id, role_id, created_at) values ($1, $2, now()) on conflict (user_id, role_id) do nothing',
        [userId, testUser.roleId]
      );

      const userRow = await client.query(
        'select id, username, real_name, email, role_id, status from sys_user where id = $1',
        [userId]
      );

      results.push(userRow.rows[0]);
    }

    console.log(JSON.stringify({ password: DEFAULT_PASSWORD, users: results }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});