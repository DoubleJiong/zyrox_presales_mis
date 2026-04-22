/**
 * GUI 可管理的系统分类
 * 这些分类虽然是 isSystem=true，但允许在字典管理页面编辑。
 * project_type 已从独立表收归字典管理。
 */
const GUI_MANAGED_SYSTEM_ATTRIBUTE_CATEGORIES = new Set([
  'industry',
  'region',
  'project_priority',
  'priority',
  'bidding_method',
  'scoring_method',
  'fund_source',
  'project_type',
  'message_type',
  'message_priority',
]);

/**
 * 专用主数据分类（有独立管理页面的分类）
 * project_type 已收归字典，此集合目前为空，保留扩展能力。
 */
const DEDICATED_MASTER_DATA_ATTRIBUTE_CATEGORIES = new Set<string>([
]);

export function isGuiManagedSystemAttributeCategory(categoryCode: string): boolean {
  return GUI_MANAGED_SYSTEM_ATTRIBUTE_CATEGORIES.has(categoryCode);
}

export function isDedicatedMasterDataAttributeCategory(categoryCode: string): boolean {
  return DEDICATED_MASTER_DATA_ATTRIBUTE_CATEGORIES.has(categoryCode);
}

export function canManageAttributeCategoryInGui(categoryCode: string, isSystem: boolean): boolean {
  if (isDedicatedMasterDataAttributeCategory(categoryCode)) {
    return false;
  }

  if (!isSystem) {
    return true;
  }

  return isGuiManagedSystemAttributeCategory(categoryCode);
}

export function shouldSkipDictionaryConfigSync(categoryCode: string): boolean {
  return isGuiManagedSystemAttributeCategory(categoryCode)
    || isDedicatedMasterDataAttributeCategory(categoryCode);
}