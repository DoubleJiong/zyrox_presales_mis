/**
 * 文件内容对比服务
 * 
 * 支持 Office 文件的内容级别对比：
 * - Word (.docx): 段落级别文本对比
 * - Excel (.xlsx): 单元格级别对比
 * - PowerPoint (.pptx): 幻灯片级别对比
 * 
 * 技术原理：
 * Office 文件本质上是 ZIP 压缩包，内部是 XML 文件。
 * 我们解析 XML 提取文本内容，进行差异化对比。
 */

import JSZip from 'jszip';
import * as XLSX from 'xlsx';

// ==================== 类型定义 ====================

export type FileDiffType = 'added' | 'deleted' | 'modified' | 'unchanged';

export interface WordDiff {
  type: FileDiffType;
  paragraphIndex: number;
  oldText?: string;
  newText?: string;
  context?: string; // 前后文
}

export interface ExcelCellDiff {
  type: FileDiffType;
  sheet: string;
  cell: string; // 如 "A1", "B5"
  oldValue?: string | number;
  newValue?: string | number;
}

export interface ExcelSheetDiff {
  sheetName: string;
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
  cellDiffs: ExcelCellDiff[];
  summary: {
    added: number;
    deleted: number;
    modified: number;
  };
}

export interface PPTSlideDiff {
  slideIndex: number;
  type: 'added' | 'deleted' | 'modified';
  title?: string;
  changes?: {
    elementId: string;
    oldText?: string;
    newText?: string;
  }[];
}

export interface FileCompareResult {
  fileType: 'word' | 'excel' | 'ppt' | 'other';
  fileName: string;
  canCompare: boolean;
  diffs?: WordDiff[] | ExcelSheetDiff[] | PPTSlideDiff[];
  summary?: {
    added: number;
    deleted: number;
    modified: number;
    unchanged: number;
  };
  error?: string;
}

// ==================== Word 文档对比 ====================

/**
 * 从 Word XML 中提取段落文本
 */
function extractWordParagraphs(xmlContent: string): string[] {
  const paragraphs: string[] = [];
  
  // 简单的 XML 解析：提取 <w:p> 标签中的文本
  // <w:p> 表示段落，<w:t> 表示文本
  const pRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch;
  
  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const pContent = pMatch[1];
    // 提取该段落中的所有文本
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let text = '';
    let tMatch;
    
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      text += tMatch[1];
    }
    
    // 只保留非空段落
    if (text.trim()) {
      paragraphs.push(text.trim());
    }
  }
  
  return paragraphs;
}

/**
 * 对比两个 Word 文档
 */
async function compareWordContent(
  oldBuffer: ArrayBuffer,
  newBuffer: ArrayBuffer
): Promise<{ diffs: WordDiff[]; summary: { added: number; deleted: number; modified: number; unchanged: number } }> {
  const oldZip = await JSZip.loadAsync(oldBuffer);
  const newZip = await JSZip.loadAsync(newBuffer);
  
  // 提取 document.xml
  const oldDocFile = oldZip.file('word/document.xml');
  const newDocFile = newZip.file('word/document.xml');
  
  if (!oldDocFile || !newDocFile) {
    throw new Error('无法解析 Word 文档结构');
  }
  
  const oldXml = await oldDocFile.async('string');
  const newXml = await newDocFile.async('string');
  
  // 提取段落
  const oldParagraphs = extractWordParagraphs(oldXml);
  const newParagraphs = extractWordParagraphs(newXml);
  
  // 使用 LCS 算法进行差异对比
  const diffs = diffArrays<string>(oldParagraphs, newParagraphs, (a, b) => a === b);
  
  const result: WordDiff[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  for (const diff of diffs) {
    if (diff.type === 'unchanged') {
      result.push({
        type: 'unchanged',
        paragraphIndex: newIndex,
        oldText: diff.oldValue,
        newText: diff.newValue,
      });
      oldIndex++;
      newIndex++;
    } else if (diff.type === 'added') {
      result.push({
        type: 'added',
        paragraphIndex: newIndex,
        newText: diff.newValue,
      });
      newIndex++;
    } else if (diff.type === 'deleted') {
      result.push({
        type: 'deleted',
        paragraphIndex: oldIndex,
        oldText: diff.oldValue,
      });
      oldIndex++;
    } else if (diff.type === 'modified') {
      result.push({
        type: 'modified',
        paragraphIndex: newIndex,
        oldText: diff.oldValue,
        newText: diff.newValue,
      });
      oldIndex++;
      newIndex++;
    }
  }
  
  const summary = {
    added: result.filter(d => d.type === 'added').length,
    deleted: result.filter(d => d.type === 'deleted').length,
    modified: result.filter(d => d.type === 'modified').length,
    unchanged: result.filter(d => d.type === 'unchanged').length,
  };
  
  // 只返回有变化的段落（过滤掉未变化的）
  const changedDiffs = result.filter(d => d.type !== 'unchanged');
  
  return { diffs: changedDiffs, summary };
}

// ==================== Excel 文件对比 ====================

/**
 * 对比两个 Excel 文件
 */
async function compareExcelContent(
  oldBuffer: ArrayBuffer,
  newBuffer: ArrayBuffer
): Promise<{ diffs: ExcelSheetDiff[]; summary: { added: number; deleted: number; modified: number; unchanged: number } }> {
  const oldWorkbook = XLSX.read(oldBuffer, { type: 'array' });
  const newWorkbook = XLSX.read(newBuffer, { type: 'array' });
  
  const oldSheets = Object.keys(oldWorkbook.Sheets);
  const newSheets = Object.keys(newWorkbook.Sheets);
  const allSheets = new Set([...oldSheets, ...newSheets]);
  
  const diffs: ExcelSheetDiff[] = [];
  let totalAdded = 0;
  let totalDeleted = 0;
  let totalModified = 0;
  
  for (const sheetName of allSheets) {
    const oldSheet = oldWorkbook.Sheets[sheetName];
    const newSheet = newWorkbook.Sheets[sheetName];
    
    if (!oldSheet && newSheet) {
      // 新增的 Sheet
      const cellDiffs = getAllCellsInSheet(newSheet).map(cell => ({
        type: 'added' as const,
        sheet: sheetName,
        cell: cell.ref,
        newValue: cell.value,
      }));
      diffs.push({
        sheetName,
        type: 'added',
        cellDiffs,
        summary: { added: cellDiffs.length, deleted: 0, modified: 0 },
      });
      totalAdded += cellDiffs.length;
    } else if (oldSheet && !newSheet) {
      // 删除的 Sheet
      const cellDiffs = getAllCellsInSheet(oldSheet).map(cell => ({
        type: 'deleted' as const,
        sheet: sheetName,
        cell: cell.ref,
        oldValue: cell.value,
      }));
      diffs.push({
        sheetName,
        type: 'deleted',
        cellDiffs,
        summary: { added: 0, deleted: cellDiffs.length, modified: 0 },
      });
      totalDeleted += cellDiffs.length;
    } else if (oldSheet && newSheet) {
      // 对比单元格
      const cellDiffs = compareSheets(oldSheet, newSheet, sheetName);
      const hasChanges = cellDiffs.length > 0;
      
      diffs.push({
        sheetName,
        type: hasChanges ? 'modified' : 'unchanged',
        cellDiffs,
        summary: {
          added: cellDiffs.filter(c => c.type === 'added').length,
          deleted: cellDiffs.filter(c => c.type === 'deleted').length,
          modified: cellDiffs.filter(c => c.type === 'modified').length,
        },
      });
      totalAdded += cellDiffs.filter(c => c.type === 'added').length;
      totalDeleted += cellDiffs.filter(c => c.type === 'deleted').length;
      totalModified += cellDiffs.filter(c => c.type === 'modified').length;
    }
  }
  
  return {
    diffs: diffs.filter(d => d.type !== 'unchanged' || d.cellDiffs.length > 0),
    summary: {
      added: totalAdded,
      deleted: totalDeleted,
      modified: totalModified,
      unchanged: 0,
    },
  };
}

/**
 * 获取 Sheet 中所有单元格
 */
function getAllCellsInSheet(sheet: XLSX.WorkSheet): { ref: string; value: string | number }[] {
  const result: { ref: string; value: string | number }[] = [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellRef];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        result.push({
          ref: cellRef,
          value: cell.v,
        });
      }
    }
  }
  
  return result;
}

/**
 * 对比两个 Sheet
 */
function compareSheets(
  oldSheet: XLSX.WorkSheet,
  newSheet: XLSX.WorkSheet,
  sheetName: string
): ExcelCellDiff[] {
  const diffs: ExcelCellDiff[] = [];
  
  // 获取两个 sheet 的范围
  const oldRange = XLSX.utils.decode_range(oldSheet['!ref'] || 'A1');
  const newRange = XLSX.utils.decode_range(newSheet['!ref'] || 'A1');
  
  const maxRow = Math.max(oldRange.e.r, newRange.e.r);
  const maxCol = Math.max(oldRange.e.c, newRange.e.c);
  
  for (let row = 0; row <= maxRow; row++) {
    for (let col = 0; col <= maxCol; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const oldCell = oldSheet[cellRef];
      const newCell = newSheet[cellRef];
      
      const oldVal = oldCell?.v;
      const newVal = newCell?.v;
      
      // 格式化值进行比较
      const oldStr = oldVal !== undefined && oldVal !== null && oldVal !== '' ? String(oldVal) : undefined;
      const newStr = newVal !== undefined && newVal !== null && newVal !== '' ? String(newVal) : undefined;
      
      if (oldStr === undefined && newStr !== undefined) {
        diffs.push({
          type: 'added',
          sheet: sheetName,
          cell: cellRef,
          newValue: newStr,
        });
      } else if (oldStr !== undefined && newStr === undefined) {
        diffs.push({
          type: 'deleted',
          sheet: sheetName,
          cell: cellRef,
          oldValue: oldStr,
        });
      } else if (oldStr !== newStr) {
        diffs.push({
          type: 'modified',
          sheet: sheetName,
          cell: cellRef,
          oldValue: oldStr,
          newValue: newStr,
        });
      }
    }
  }
  
  return diffs;
}

// ==================== PPT 文件对比 ====================

/**
 * 从 PPT 幻灯片 XML 中提取文本
 */
function extractSlideTexts(xmlContent: string): { elementId: string; text: string }[] {
  const texts: { elementId: string; text: string }[] = [];
  
  // 提取所有文本元素 <a:t>
  // PPT 中文本结构：p:sp > p:txBody > a:p > a:r > a:t
  const spRegex = /<p:sp[^>]*>([\s\S]*?)<\/p:sp>/g;
  let spMatch;
  let elementIndex = 0;
  
  while ((spMatch = spRegex.exec(xmlContent)) !== null) {
    const spContent = spMatch[1];
    // 提取该元素中的所有文本
    const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let text = '';
    let tMatch;
    
    while ((tMatch = tRegex.exec(spContent)) !== null) {
      text += tMatch[1];
    }
    
    if (text.trim()) {
      texts.push({
        elementId: `element_${elementIndex}`,
        text: text.trim(),
      });
    }
    elementIndex++;
  }
  
  return texts;
}

/**
 * 从幻灯片中提取标题（通常是第一个文本框）
 */
function extractSlideTitle(xmlContent: string): string | undefined {
  const texts = extractSlideTexts(xmlContent);
  return texts[0]?.text;
}

/**
 * 对比两个 PPT 文件
 */
async function comparePPTContent(
  oldBuffer: ArrayBuffer,
  newBuffer: ArrayBuffer
): Promise<{ diffs: PPTSlideDiff[]; summary: { added: number; deleted: number; modified: number; unchanged: number } }> {
  const oldZip = await JSZip.loadAsync(oldBuffer);
  const newZip = await JSZip.loadAsync(newBuffer);
  
  // 提取所有幻灯片
  const oldSlides = await extractSlides(oldZip);
  const newSlides = await extractSlides(newZip);
  
  const maxSlides = Math.max(oldSlides.length, newSlides.length);
  const diffs: PPTSlideDiff[] = [];
  
  for (let i = 0; i < maxSlides; i++) {
    const slideNum = i + 1;
    const oldSlide = oldSlides[i];
    const newSlide = newSlides[i];
    
    if (!oldSlide && newSlide) {
      // 新增的幻灯片
      diffs.push({
        slideIndex: slideNum,
        type: 'added',
        title: extractSlideTitle(newSlide.xml),
      });
    } else if (oldSlide && !newSlide) {
      // 删除的幻灯片
      diffs.push({
        slideIndex: slideNum,
        type: 'deleted',
        title: extractSlideTitle(oldSlide.xml),
      });
    } else if (oldSlide && newSlide) {
      // 对比幻灯片内容
      const oldTexts = extractSlideTexts(oldSlide.xml);
      const newTexts = extractSlideTexts(newSlide.xml);
      
      const textDiffs = diffArrays(
        oldTexts,
        newTexts,
        (a, b) => a.text === b.text
      );
      
      const hasChanges = textDiffs.some(d => d.type !== 'unchanged');
      
      if (hasChanges) {
        const changes = textDiffs
          .filter(d => d.type === 'modified')
          .map(d => ({
            elementId: d.oldValue?.elementId || d.newValue?.elementId || '',
            oldText: d.oldValue?.text,
            newText: d.newValue?.text,
          }));
        
        diffs.push({
          slideIndex: slideNum,
          type: 'modified',
          title: extractSlideTitle(newSlide.xml),
          changes,
        });
      }
    }
  }
  
  const summary = {
    added: diffs.filter(d => d.type === 'added').length,
    deleted: diffs.filter(d => d.type === 'deleted').length,
    modified: diffs.filter(d => d.type === 'modified').length,
    unchanged: maxSlides - diffs.length,
  };
  
  return { diffs, summary };
}

/**
 * 提取 PPT 中的所有幻灯片
 */
async function extractSlides(zip: JSZip): Promise<{ index: number; xml: string }[]> {
  const slides: { index: number; xml: string }[] = [];
  let i = 1;
  
  while (true) {
    const slideFile = zip.file(`ppt/slides/slide${i}.xml`);
    if (!slideFile) break;
    
    const xml = await slideFile.async('string');
    slides.push({ index: i, xml });
    i++;
  }
  
  return slides;
}

// ==================== 通用差异算法 ====================

interface DiffResult<T> {
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
  oldValue?: T;
  newValue?: T;
}

/**
 * 基于最长公共子序列(LCS)的数组差异算法
 */
function diffArrays<T>(
  oldArr: T[],
  newArr: T[],
  equals: (a: T, b: T) => boolean = (a, b) => a === b
): DiffResult<T>[] {
  const result: DiffResult<T>[] = [];
  
  // 构建 LCS 矩阵
  const m = oldArr.length;
  const n = newArr.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (equals(oldArr[i - 1], newArr[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // 回溯生成差异
  let i = m;
  let j = n;
  const tempResult: DiffResult<T>[] = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && equals(oldArr[i - 1], newArr[j - 1])) {
      tempResult.push({
        type: 'unchanged',
        oldValue: oldArr[i - 1],
        newValue: newArr[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempResult.push({
        type: 'added',
        newValue: newArr[j - 1],
      });
      j--;
    } else if (i > 0) {
      tempResult.push({
        type: 'deleted',
        oldValue: oldArr[i - 1],
      });
      i--;
    }
  }
  
  // 反转结果（因为是从后往前回溯的）
  return tempResult.reverse();
}

// ==================== 主服务类 ====================

export class FileCompareService {
  
  /**
   * 对比两个文件
   */
  async compareFiles(
    oldFileUrl: string,
    newFileUrl: string,
    fileName: string
  ): Promise<FileCompareResult> {
    try {
      // 判断文件类型
      const ext = fileName.split('.').pop()?.toLowerCase();
      let fileType: 'word' | 'excel' | 'ppt' | 'other';
      
      if (ext === 'docx' || ext === 'doc') {
        fileType = 'word';
      } else if (ext === 'xlsx' || ext === 'xls') {
        fileType = 'excel';
      } else if (ext === 'pptx' || ext === 'ppt') {
        fileType = 'ppt';
      } else {
        return {
          fileType: 'other',
          fileName,
          canCompare: false,
          error: '不支持的文件类型',
        };
      }
      
      // 下载文件
      const [oldBuffer, newBuffer] = await Promise.all([
        this.downloadFile(oldFileUrl),
        this.downloadFile(newFileUrl),
      ]);
      
      // 根据文件类型进行对比
      switch (fileType) {
        case 'word':
          const wordResult = await compareWordContent(oldBuffer, newBuffer);
          return {
            fileType: 'word',
            fileName,
            canCompare: true,
            diffs: wordResult.diffs,
            summary: wordResult.summary,
          };
          
        case 'excel':
          const excelResult = await compareExcelContent(oldBuffer, newBuffer);
          return {
            fileType: 'excel',
            fileName,
            canCompare: true,
            diffs: excelResult.diffs,
            summary: excelResult.summary,
          };
          
        case 'ppt':
          const pptResult = await comparePPTContent(oldBuffer, newBuffer);
          return {
            fileType: 'ppt',
            fileName,
            canCompare: true,
            diffs: pptResult.diffs,
            summary: pptResult.summary,
          };
          
        default:
          return {
            fileType: 'other',
            fileName,
            canCompare: false,
            error: '不支持的文件类型',
          };
      }
    } catch (error) {
      return {
        fileType: 'other',
        fileName,
        canCompare: false,
        error: error instanceof Error ? error.message : '文件对比失败',
      };
    }
  }
  
  /**
   * 下载文件到 ArrayBuffer
   */
  private async downloadFile(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.status}`);
    }
    return response.arrayBuffer();
  }
  
  /**
   * 批量对比文件
   */
  async compareMultipleFiles(
    oldFiles: { fileName: string; fileUrl: string }[],
    newFiles: { fileName: string; fileUrl: string }[]
  ): Promise<FileCompareResult[]> {
    const results: FileCompareResult[] = [];
    
    // 按文件名匹配
    const oldFileMap = new Map(oldFiles.map(f => [f.fileName, f]));
    const newFileMap = new Map(newFiles.map(f => [f.fileName, f]));
    const allFileNames = new Set([...oldFileMap.keys(), ...newFileMap.keys()]);
    
    for (const fileName of allFileNames) {
      const oldFile = oldFileMap.get(fileName);
      const newFile = newFileMap.get(fileName);
      
      if (!oldFile && newFile) {
        // 新增的文件
        results.push({
          fileType: 'other',
          fileName,
          canCompare: false,
          summary: { added: 1, deleted: 0, modified: 0, unchanged: 0 },
        });
      } else if (oldFile && !newFile) {
        // 删除的文件
        results.push({
          fileType: 'other',
          fileName,
          canCompare: false,
          summary: { added: 0, deleted: 1, modified: 0, unchanged: 0 },
        });
      } else if (oldFile && newFile) {
        // 对比文件
        const result = await this.compareFiles(oldFile.fileUrl, newFile.fileUrl, fileName);
        results.push(result);
      }
    }
    
    return results;
  }
}

// 导出单例
export const fileCompareService = new FileCompareService();
