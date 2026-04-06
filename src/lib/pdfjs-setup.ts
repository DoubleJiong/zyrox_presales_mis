/**
 * PDF.js 配置
 * 在 Node.js 环境中正确配置 pdfjs-dist worker
 */

let isConfigured = false;

export async function configurePdfJs() {
  if (isConfigured) return;
  
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // 在 Node.js 环境中，使用 legacy worker
    // 设置 workerSrc 为模块标识符
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
    
    isConfigured = true;
    console.log('[PDF.js] 配置完成，workerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  } catch (error) {
    console.error('[PDF.js] 配置失败:', error);
  }
}
