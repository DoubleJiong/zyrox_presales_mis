-- ============================================================
-- 客户 region 字段归一化迁移脚本
-- 适用环境：本地5004 / 远程5000（任何已有历史数据的库）
--
-- 作用：
--   将 bus_customer.region 中各种历史格式（简称/别名/城市名）
--   统一映射为 regionOptions 规范值，使前端下拉框能正确回显。
--
-- 使用方法：
--   psql -U presales -d presales_system -f migrate-customer-region-normalize.sql
-- ============================================================

BEGIN;

UPDATE bus_customer SET region = CASE region
  -- 直辖市
  WHEN '北京'    THEN '北京市'
  WHEN '天津'    THEN '天津市'
  WHEN '上海'    THEN '上海市'
  WHEN '重庆'    THEN '重庆市'

  -- 省份（补后缀）
  WHEN '河北'    THEN '河北省'
  WHEN '山西'    THEN '山西省'
  WHEN '辽宁'    THEN '辽宁省'
  WHEN '吉林'    THEN '吉林省'
  WHEN '黑龙江'  THEN '黑龙江省'
  WHEN '江苏'    THEN '江苏省'
  WHEN '安徽'    THEN '安徽省'
  WHEN '福建'    THEN '福建省'
  WHEN '江西'    THEN '江西省'
  WHEN '山东'    THEN '山东省'
  WHEN '河南'    THEN '河南省'
  WHEN '湖北'    THEN '湖北省'
  WHEN '湖南'    THEN '湖南省'
  WHEN '广东'    THEN '广东省'
  WHEN '海南'    THEN '海南省'
  WHEN '四川'    THEN '四川省'
  WHEN '贵州'    THEN '贵州省'
  WHEN '云南'    THEN '云南省'
  WHEN '陕西'    THEN '陕西省'
  WHEN '陕西省'  THEN '陕西省'   -- 已有省后缀的保持不变（防重复执行）
  WHEN '甘肃'    THEN '甘肃省'
  WHEN '青海'    THEN '青海省'
  WHEN '台湾'    THEN '台湾省'

  -- 自治区
  WHEN '内蒙'    THEN '内蒙古自治区'
  WHEN '内蒙古'  THEN '内蒙古自治区'
  WHEN '广西'    THEN '广西壮族自治区'
  WHEN '西藏'    THEN '西藏自治区'
  WHEN '宁夏'    THEN '宁夏回族自治区'
  WHEN '新疆'    THEN '新疆维吾尔自治区'

  -- 特别行政区
  WHEN '香港'    THEN '香港特别行政区'
  WHEN '澳门'    THEN '澳门特别行政区'

  -- 浙江地市（补"市"后缀，使其匹配 regionOptions 的 value）
  WHEN '杭州'    THEN '杭州市'
  WHEN '宁波'    THEN '宁波市'
  WHEN '温州'    THEN '温州市'
  WHEN '嘉兴'    THEN '嘉兴市'
  WHEN '湖州'    THEN '湖州市'
  WHEN '绍兴'    THEN '绍兴市'
  WHEN '金华'    THEN '金华市'
  WHEN '衢州'    THEN '衢州市'
  WHEN '舟山'    THEN '舟山市'
  WHEN '台州'    THEN '台州市'
  WHEN '丽水'    THEN '丽水市'

  -- 可明确归省的城市名
  WHEN '深圳'    THEN '广东省'
  WHEN '广州'    THEN '广东省'
  WHEN '南京'    THEN '江苏省'
  WHEN '苏州'    THEN '江苏省'
  WHEN '武汉'    THEN '湖北省'
  WHEN '长沙'    THEN '湖南省'
  WHEN '成都'    THEN '四川省'
  WHEN '西安'    THEN '陕西省'
  WHEN '郑州'    THEN '河南省'
  WHEN '济南'    THEN '山东省'
  WHEN '青岛'    THEN '山东省'
  WHEN '沈阳'    THEN '辽宁省'
  WHEN '大连'    THEN '辽宁省'
  WHEN '哈尔滨'  THEN '黑龙江省'
  WHEN '长春'    THEN '吉林省'
  WHEN '昆明'    THEN '云南省'
  WHEN '贵阳'    THEN '贵州省'
  WHEN '福州'    THEN '福建省'
  WHEN '厦门'    THEN '福建省'
  WHEN '南昌'    THEN '江西省'
  WHEN '合肥'    THEN '安徽省'
  WHEN '石家庄'  THEN '河北省'
  WHEN '太原'    THEN '山西省'

  -- 不可明确映射的大区/销售区域/垃圾数据：保留原值（不处理）
  ELSE region
END
WHERE deleted_at IS NULL
  AND region IS NOT NULL
  AND region NOT IN (
    '北京市','天津市','上海市','重庆市',
    '河北省','山西省','辽宁省','吉林省','黑龙江省',
    '江苏省','安徽省','福建省','江西省','山东省',
    '河南省','湖北省','湖南省','广东省','海南省',
    '四川省','贵州省','云南省','陕西省','甘肃省',
    '青海省','台湾省',
    '内蒙古自治区','广西壮族自治区','西藏自治区','宁夏回族自治区','新疆维吾尔自治区',
    '香港特别行政区','澳门特别行政区',
    '杭州市','宁波市','温州市','嘉兴市','湖州市',
    '绍兴市','金华市','衢州市','舟山市','台州市','丽水市'
  );

COMMIT;

-- 执行后确认：统计仍未归一化的区域值（应为大区/无法识别值）
SELECT region, COUNT(*) as cnt
FROM bus_customer
WHERE deleted_at IS NULL AND region IS NOT NULL
  AND region NOT IN (
    '北京市','天津市','上海市','重庆市',
    '河北省','山西省','辽宁省','吉林省','黑龙江省',
    '江苏省','安徽省','福建省','江西省','山东省',
    '河南省','湖北省','湖南省','广东省','海南省',
    '四川省','贵州省','云南省','陕西省','甘肃省',
    '青海省','台湾省',
    '内蒙古自治区','广西壮族自治区','西藏自治区','宁夏回族自治区','新疆维吾尔自治区',
    '香港特别行政区','澳门特别行政区',
    '杭州市','宁波市','温州市','嘉兴市','湖州市',
    '绍兴市','金华市','衢州市','舟山市','台州市','丽水市'
  )
GROUP BY region ORDER BY cnt DESC;
