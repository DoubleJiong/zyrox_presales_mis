-- 数据字典表结构升级脚本
-- 为 sys_attribute 表添加缺失字段

-- 添加 name 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_attribute' AND column_name = 'name'
    ) THEN
        ALTER TABLE sys_attribute ADD COLUMN name VARCHAR(100);
        -- 用 attribute_value 初始化 name 字段
        UPDATE sys_attribute SET name = attribute_value WHERE name IS NULL;
        RAISE NOTICE 'Added name column to sys_attribute';
    END IF;
END $$;

-- 添加 status 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_attribute' AND column_name = 'status'
    ) THEN
        ALTER TABLE sys_attribute ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        UPDATE sys_attribute SET status = 'active' WHERE status IS NULL;
        RAISE NOTICE 'Added status column to sys_attribute';
    END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_attribute_key ON sys_attribute(attribute_key);
CREATE INDEX IF NOT EXISTS idx_attribute_category ON sys_attribute(category);
CREATE INDEX IF NOT EXISTS idx_attribute_status ON sys_attribute(status);

-- 输出表结构
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sys_attribute' 
ORDER BY ordinal_position;
