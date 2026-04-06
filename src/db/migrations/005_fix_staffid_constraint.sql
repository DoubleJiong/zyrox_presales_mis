-- 修复 staffId 外键约束不一致问题
-- 问题: Schema 定义 staffId 引用 users.id，但数据库约束引用 bus_staff_profile.id
-- 解决: 统一为引用 users.id

-- 注意: 执行此迁移前请确保:
-- 1. bus_project_presales_record 表中的 staffId 值都存在于 sys_user 表中
-- 2. 已备份数据

-- 1. 删除旧的外键约束（如果存在引用 bus_staff_profile 的约束）
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 查找并删除引用 bus_staff_profile 的外键约束
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'bus_project_presales_record'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'staff_id'
    AND ccu.table_name = 'bus_staff_profile';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE bus_project_presales_record DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint referencing bus_staff_profile found';
    END IF;
END $$;

-- 2. 添加正确的外键约束（引用 sys_user 表）
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- 检查是否已存在正确的约束
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'bus_project_presales_record'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'staff_id'
        AND ccu.table_name = 'sys_user'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        ALTER TABLE bus_project_presales_record
        ADD CONSTRAINT fk_presales_record_staff
        FOREIGN KEY (staff_id) REFERENCES sys_user(id)
        ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Added constraint referencing sys_user';
    ELSE
        RAISE NOTICE 'Constraint referencing sys_user already exists';
    END IF;
END $$;

-- 3. 验证迁移结果
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'bus_project_presales_record'
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'staff_id';
