const COMPANY_SUFFIX_PATTERNS = [
  '股份有限公司',
  '集团有限公司',
  '有限责任公司',
  '股份公司',
  '有限公司',
  '集团',
  '公司',
] as const;

const PUNCTUATION_PATTERN = /[\s\u3000()（）\[\]【】{}<>《》'"'`~!@#$%^&*+=|\\/:;,.?，。！？、_-]+/g;

export type CustomerNameMatchType = 'exact' | 'similar' | 'none';

export interface CustomerNameMatchResult {
  normalizedInput: string;
  normalizedCandidate: string;
  matchType: CustomerNameMatchType;
  score: number;
}

export function stripCustomerCompanySuffix(input: string): string {
  let value = input.trim();

  let changed = true;
  while (changed && value) {
    changed = false;
    for (const suffix of COMPANY_SUFFIX_PATTERNS) {
      if (value.endsWith(suffix)) {
        value = value.slice(0, -suffix.length).trim();
        changed = true;
        break;
      }
    }
  }

  return value;
}

export function normalizeCustomerNameForDedup(input: string): string {
  if (!input) {
    return '';
  }

  return stripCustomerCompanySuffix(input)
    .toLocaleLowerCase('zh-CN')
    .replace(PUNCTUATION_PATTERN, '');
}

export function buildCustomerNameLookupKeywords(input: string): string[] {
  const trimmed = input.trim();
  const stripped = stripCustomerCompanySuffix(trimmed);

  return Array.from(
    new Set(
      [trimmed, stripped]
        .map((value) => value.trim())
        .filter((value) => value.length >= 2),
    ),
  );
}

function buildBigrams(input: string): string[] {
  const chars = Array.from(input);
  if (chars.length < 2) {
    return chars;
  }

  const result: string[] = [];
  for (let index = 0; index < chars.length - 1; index += 1) {
    result.push(`${chars[index]}${chars[index + 1]}`);
  }

  return result;
}

function calculateDiceCoefficient(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);

  if (leftBigrams.length === 0 || rightBigrams.length === 0) {
    return 0;
  }

  const rightCounts = new Map<string, number>();
  for (const bigram of rightBigrams) {
    rightCounts.set(bigram, (rightCounts.get(bigram) ?? 0) + 1);
  }

  let overlap = 0;
  for (const bigram of leftBigrams) {
    const count = rightCounts.get(bigram) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(bigram, count - 1);
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function calculateLongestCommonSubstringLength(left: string, right: string): number {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  const matrix = Array.from({ length: leftChars.length + 1 }, () => Array<number>(rightChars.length + 1).fill(0));
  let maxLength = 0;

  for (let leftIndex = 1; leftIndex <= leftChars.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= rightChars.length; rightIndex += 1) {
      if (leftChars[leftIndex - 1] === rightChars[rightIndex - 1]) {
        matrix[leftIndex][rightIndex] = matrix[leftIndex - 1][rightIndex - 1] + 1;
        maxLength = Math.max(maxLength, matrix[leftIndex][rightIndex]);
      }
    }
  }

  return maxLength;
}

export function matchCustomerName(input: string, candidate: string): CustomerNameMatchResult {
  const normalizedInput = normalizeCustomerNameForDedup(input);
  const normalizedCandidate = normalizeCustomerNameForDedup(candidate);

  if (!normalizedInput || !normalizedCandidate) {
    return {
      normalizedInput,
      normalizedCandidate,
      matchType: 'none',
      score: 0,
    };
  }

  if (normalizedInput === normalizedCandidate) {
    return {
      normalizedInput,
      normalizedCandidate,
      matchType: 'exact',
      score: 1,
    };
  }

  const hasContainment =
    normalizedInput.length >= 2 &&
    normalizedCandidate.length >= 2 &&
    (normalizedInput.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedInput));

  if (hasContainment) {
    return {
      normalizedInput,
      normalizedCandidate,
      matchType: 'similar',
      score: 0.9,
    };
  }

  const longestCommonSubstringLength = calculateLongestCommonSubstringLength(normalizedInput, normalizedCandidate);
  const commonSubstringRatio = longestCommonSubstringLength / Math.min(normalizedInput.length, normalizedCandidate.length);
  if (longestCommonSubstringLength >= 3 && commonSubstringRatio >= 0.6) {
    return {
      normalizedInput,
      normalizedCandidate,
      matchType: 'similar',
      score: commonSubstringRatio,
    };
  }

  const score = calculateDiceCoefficient(normalizedInput, normalizedCandidate);

  return {
    normalizedInput,
    normalizedCandidate,
    matchType: score >= 0.72 ? 'similar' : 'none',
    score,
  };
}