const GUI_MANAGED_SYSTEM_ATTRIBUTE_CATEGORIES = new Set([
  'industry',
  'region',
  'project_priority',
  'priority',
  'bidding_method',
  'scoring_method',
  'fund_source',
  'bid_type',
  'bond_status',
  'archive_status',
]);

const DEDICATED_MASTER_DATA_ATTRIBUTE_CATEGORIES = new Set([
  'project_type',
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