import path from 'node:path';

import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { db } = await import('../../src/db');

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE bus_customer
      SET customer_type_id = 3,
          updated_at = NOW()
      WHERE deleted_at IS NULL
        AND customer_type_id = 5
    `);

    await tx.execute(sql`
      UPDATE sys_customer_type
      SET code = 'UNIVERSITY',
          name = '高校',
          description = '普通高校、本科院校及高等院校客户',
          status = 'active',
          updated_at = NOW()
      WHERE id = 1
    `);

    await tx.execute(sql`
      UPDATE sys_customer_type
      SET code = 'GOVERNMENT',
          name = '政府',
          description = '政府机关和事业单位客户',
          status = 'active',
          updated_at = NOW()
      WHERE id = 2
    `);

    await tx.execute(sql`
      UPDATE sys_customer_type
      SET code = 'ENTERPRISE',
          name = '企业',
          description = '企业和商业机构客户',
          status = 'active',
          updated_at = NOW()
      WHERE id = 3
    `);

    await tx.execute(sql`
      UPDATE sys_customer_type
      SET code = 'HOSPITAL',
          name = '医院',
          description = '医院及医疗卫生机构客户',
          status = 'active',
          updated_at = NOW()
      WHERE id = 4
    `);

    await tx.execute(sql`
      UPDATE sys_customer_type
      SET code = 'K12',
          name = 'K12',
          description = '中小学、幼儿园及基础教育客户',
          status = 'active',
          updated_at = NOW()
      WHERE id = 5
    `);

    await tx.execute(sql`
      INSERT INTO sys_customer_type (id, code, name, description, status, created_at, updated_at)
      VALUES
        (6, 'HIGHER_VOCATIONAL', '高职', '高职高专、职业学院及职业大学客户', 'active', NOW(), NOW()),
        (7, 'SECONDARY_VOCATIONAL', '中专', '中专、中职及中等职业学校客户', 'active', NOW(), NOW()),
        (8, 'MILITARY_POLICE', '军警', '军队、武警、公安及警务院校客户', 'active', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = NOW()
    `);

    await tx.execute(sql`
      UPDATE bus_customer
      SET customer_type_id = CASE
          WHEN customer_name ~* '(军|警|公安|武警|国防|解放军|海军|陆军|空军|火箭军|战略支援|警官|警察)' THEN 8
          WHEN customer_name ~* '(职业学院|职业技术学院|职业大学|高等专科学校|专科学校|技师学院|技工学校|职业学校)' THEN 6
          WHEN customer_name ~* '(中等专业学校|中专|中职)' THEN 7
          WHEN customer_name ~* '(中学|小学|幼儿园|实验学校|九年一贯制|十二年一贯制|完全小学|高级中学|初级中学|附属学校)' THEN 5
          ELSE 1
        END,
          updated_at = NOW()
      WHERE deleted_at IS NULL
        AND customer_type_id = 1
    `);

    await tx.execute(sql`
      DELETE FROM sys_attribute
      WHERE category IN ('industry', 'customer_type')
    `);

    await tx.execute(sql`
      UPDATE sys_attribute_category
      SET category_name = '客户类型',
          description = CASE
            WHEN category_code = 'industry' THEN '客户类型分类'
            ELSE '客户类型分类：高校、高职、中专、K12、政府、企业、军警、医院'
          END,
          updated_at = NOW()
      WHERE category_code IN ('industry', 'customer_type')
    `);

    await tx.execute(sql`
      INSERT INTO sys_attribute (
        category,
        attribute_key,
        name,
        attribute_value,
        attribute_type,
        description,
        sort_order,
        is_system,
        status,
        created_at,
        updated_at
      )
      VALUES
        ('industry', 'industry_university', '高校', 'university', 'string', '普通高校、本科院校及高等院校客户', 1, true, 'active', NOW(), NOW()),
        ('industry', 'industry_government', '政府', 'government', 'string', '政府机关和事业单位客户', 2, true, 'active', NOW(), NOW()),
        ('industry', 'industry_enterprise', '企业', 'enterprise', 'string', '企业和商业机构客户', 3, true, 'active', NOW(), NOW()),
        ('industry', 'industry_hospital', '医院', 'hospital', 'string', '医院及医疗卫生机构客户', 4, true, 'active', NOW(), NOW()),
        ('industry', 'industry_k12', 'K12', 'k12', 'string', '中小学、幼儿园及基础教育客户', 5, true, 'active', NOW(), NOW()),
        ('industry', 'industry_higher_vocational', '高职', 'higher_vocational', 'string', '高职高专、职业学院及职业大学客户', 6, true, 'active', NOW(), NOW()),
        ('industry', 'industry_secondary_vocational', '中专', 'secondary_vocational', 'string', '中专、中职及中等职业学校客户', 7, true, 'active', NOW(), NOW()),
        ('industry', 'industry_military_police', '军警', 'military_police', 'string', '军队、武警、公安及警务院校客户', 8, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_university', '高校', 'university', 'string', '普通高校、本科院校及高等院校客户', 1, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_government', '政府', 'government', 'string', '政府机关和事业单位客户', 2, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_enterprise', '企业', 'enterprise', 'string', '企业和商业机构客户', 3, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_hospital', '医院', 'hospital', 'string', '医院及医疗卫生机构客户', 4, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_k12', 'K12', 'k12', 'string', '中小学、幼儿园及基础教育客户', 5, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_higher_vocational', '高职', 'higher_vocational', 'string', '高职高专、职业学院及职业大学客户', 6, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_secondary_vocational', '中专', 'secondary_vocational', 'string', '中专、中职及中等职业学校客户', 7, true, 'active', NOW(), NOW()),
        ('customer_type', 'customer_type_military_police', '军警', 'military_police', 'string', '军队、武警、公安及警务院校客户', 8, true, 'active', NOW(), NOW())
    `);

    await tx.execute(sql`DELETE FROM sys_customer_type WHERE id NOT IN (1, 2, 3, 4, 5, 6, 7, 8)`);
    await tx.execute(sql`SELECT setval('sys_customer_type_id_seq', 8, true)`);
  });

  const usage = await db.execute(sql`
    SELECT ct.id, ct.code, ct.name, COUNT(c.id)::int AS customer_count
    FROM sys_customer_type ct
    LEFT JOIN bus_customer c
      ON c.customer_type_id = ct.id
     AND c.deleted_at IS NULL
    WHERE ct.deleted_at IS NULL
    GROUP BY ct.id, ct.code, ct.name
    ORDER BY ct.id
  `);

  console.log(JSON.stringify(usage, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[converge-customer-types] failed:', error);
    process.exit(1);
  });