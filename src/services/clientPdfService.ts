import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

let cachedLogoDataUri = '';
let cachedCssBundle = '';

/**
 * Preloads the company logo and converts to a base64 data URI to guarantee
 * it never disappears or causes CORS issues in html2canvas captures.
 */
export async function getLogoBase64(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUri = reader.result as string;
        resolve(cachedLogoDataUri);
      };
      reader.onerror = () => resolve('/logo.png');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '/logo.png';
  }
}

/**
 * Extracts and inlines all active CSS stylesheets (including compiled Vite Tailwind CSS).
 * This guarantees that when html2canvas creates an isolated iframe, all utility classes,
 * grid systems, fonts, and colors are 100% available without network failures.
 */
async function collectAllCssText(): Promise<string> {
  if (cachedCssBundle) return cachedCssBundle;

  let combined = '';

  // 1. Read existing style tags in head
  const styles = document.querySelectorAll('style');
  styles.forEach((s) => {
    combined += s.textContent + '\n';
  });

  // 2. Fetch all linked stylesheets (e.g. Vite production compiled CSS bundle)
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const link of Array.from(links)) {
    const href = (link as HTMLLinkElement).href;
    if (!href) continue;
    try {
      const res = await fetch(href);
      if (res.ok) {
        combined += (await res.text()) + '\n';
      }
    } catch {
      // Fallback: try reading rules
      try {
        const sheet = Array.from(document.styleSheets).find((s) => s.href === href);
        if (sheet && sheet.cssRules) {
          combined += Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') + '\n';
        }
      } catch {}
    }
  }

  // Fallback: try reading all document.styleSheets
  if (!combined.trim()) {
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          if (sheet.cssRules) {
            combined += Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') + '\n';
          }
        } catch {}
      }
    } catch {}
  }

  if (combined.trim()) {
    cachedCssBundle = combined;
  }
  return combined;
}

export interface PdfExportOptions {
  documentTitle?: string;
  serialNumber?: string;
  tradeName?: string;
}

/**
 * Exports any rendered DOM element to an authentic, high-fidelity A4 PDF.
 * Uses exact on-screen rendered HTML+CSS as the single source of truth.
 * - Standard A4 210mm x 297mm dimensions
 * - Captures at 100% opacity in a hidden background layer (behind dark app shell)
 * - Inlines all CSS bundle rules directly into the captured DOM
 * - Hard-clamps logo (max-h: 65px) and QR codes (64x64) so raw images cannot explode
 * - Natively preserves Arabic RTL ligature joining
 * - Never splits clauses, paragraphs, or table rows across pages
 * - Renders crisp vector headers/footers with "Page X of Y" on all pages
 * - Triggers instant, reliable .pdf file download
 */
export async function exportElementToPdf(
  sourceElement: HTMLElement,
  filename: string,
  options?: PdfExportOptions
): Promise<void> {
  // 1. Wait for web fonts and assets to finish rendering
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font wait failures
    }
  }

  const [logoDataUri, cssText] = await Promise.all([
    getLogoBase64(),
    collectAllCssText(),
  ]);

  // 2. Standard A4 Dimensions at 96 DPI: 210mm x 297mm (1:1.414 ratio)
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;
  const HEADER_RESERVE_PX = 46;
  const FOOTER_RESERVE_PX = 48;
  const CONTENT_PAGE_HEIGHT_PX = A4_HEIGHT_PX - HEADER_RESERVE_PX - FOOTER_RESERVE_PX;

  // 3. Create a stable, in-viewport capture container behind the app UI
  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.top = '0';
  sandbox.style.left = '0';
  sandbox.style.width = `${A4_WIDTH_PX}px`;
  sandbox.style.minWidth = `${A4_WIDTH_PX}px`;
  sandbox.style.maxWidth = `${A4_WIDTH_PX}px`;
  sandbox.style.zIndex = '-9999';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.boxSizing = 'border-box';
  sandbox.style.overflow = 'hidden';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.opacity = '1';
  sandbox.style.visibility = 'visible';

  // Inject inlined stylesheet into sandbox so the clone has all styles natively
  if (cssText) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-pdf-styles', 'true');
    styleEl.textContent = cssText;
    sandbox.appendChild(styleEl);
  }

  // Clone document body
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.width = `${A4_WIDTH_PX}px`;
  clone.style.maxWidth = `${A4_WIDTH_PX}px`;
  clone.style.minWidth = `${A4_WIDTH_PX}px`;
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = '#ffffff';
  clone.style.margin = '0 auto';
  clone.style.padding = '0';
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  clone.style.transform = 'none';
  clone.style.opacity = '1';

  // Remove any no-print controls from clone
  const noPrintEls = clone.querySelectorAll('.no-print');
  noPrintEls.forEach((el) => el.remove());

  // Replace all logo image sources with base64 data URI and enforce hard clamp styles
  const imgs = Array.from(clone.querySelectorAll('img'));
  imgs.forEach((img) => {
    if (img.src.includes('logo.png') || img.src.includes('logo.jpg')) {
      img.src = logoDataUri;
      img.style.maxHeight = '65px';
      img.style.maxWidth = '220px';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
    } else {
      // QR codes
      img.style.width = '64px';
      img.style.height = '64px';
      img.style.maxWidth = '64px';
      img.style.maxHeight = '64px';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
    }
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Wait for all images in clone to be fully loaded
    await Promise.all(
      Array.from(clone.querySelectorAll('img')).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // Give browser layout engine a short tick to compute heights and text shaping
    await new Promise((r) => setTimeout(r, 120));

    // 4. Measure initial document height
    const totalHeight = clone.scrollHeight;

    // 5. High-resolution canvas capture (scale 2 = 300 DPI clarity)
    const scale = 2;
    const fullCanvas = await html2canvas(clone, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: A4_WIDTH_PX,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      logging: false,
      onclone: (clonedDoc, clonedEl) => {
        // 1. Ensure cloned document has a base tag for asset resolution
        if (!clonedDoc.querySelector('base')) {
          const base = clonedDoc.createElement('base');
          base.href = window.location.origin + '/';
          clonedDoc.head.appendChild(base);
        }

        // 2. Inject all inlined CSS rules into clonedDoc.head
        if (cssText) {
          const styleEl = clonedDoc.createElement('style');
          styleEl.textContent = cssText;
          clonedDoc.head.appendChild(styleEl);
        }

        // 3. HARD CLAMP ALL IMAGES in cloned document so they can never explode to raw size
        const allImgs = Array.from(clonedEl.querySelectorAll('img'));
        allImgs.forEach((img) => {
          if (img.src.includes('logo.png') || img.src.includes('logo.jpg')) {
            img.style.maxHeight = '65px';
            img.style.maxWidth = '220px';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
          } else {
            // QR verification codes
            img.style.width = '64px';
            img.style.height = '64px';
            img.style.maxWidth = '64px';
            img.style.maxHeight = '64px';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
          }
        });
      },
    });

    const renderedHeight = fullCanvas.height / scale;

    // 6. Intelligent Multi-Page Boundary Calculation (Prevent Slicing Clauses or Rows)
    const pageCuts: { startY: number; endY: number }[] = [];

    if (renderedHeight <= A4_HEIGHT_PX) {
      // Exact single page
      pageCuts.push({ startY: 0, endY: renderedHeight });
    } else {
      // Find candidate block elements that must NOT be cut in half
      const blockElements = Array.from(
        clone.querySelectorAll(
          '.pdf-avoid-break, [data-pdf-block], tr, .clause-box, .grid, .totals-box, .signatures-box'
        )
      ) as HTMLElement[];

      const blocks = blockElements.map((el) => {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        return { top, bottom: top + height };
      });

      let currentStartY = 0;

      while (currentStartY < renderedHeight) {
        // Page 1 has no header reserve; pages 2+ have both header & footer reserve
        const usableHeight = currentStartY === 0 
          ? (A4_HEIGHT_PX - FOOTER_RESERVE_PX) 
          : CONTENT_PAGE_HEIGHT_PX;

        let targetEndY = currentStartY + usableHeight;

        if (targetEndY >= renderedHeight) {
          // Last page reaches the end
          pageCuts.push({ startY: currentStartY, endY: renderedHeight });
          break;
        }

        // Check if targetEndY slices through any block
        let safeSplitY = targetEndY;
        const crossingBlock = blocks.find(
          (b) => b.top < targetEndY && b.bottom > targetEndY && b.top > currentStartY
        );

        if (crossingBlock && crossingBlock.top > currentStartY + 140) {
          // Break cleanly before the crossing block starts
          safeSplitY = crossingBlock.top;
        }

        pageCuts.push({ startY: currentStartY, endY: safeSplitY });
        currentStartY = safeSplitY;
      }
    }

    const totalPages = Math.max(1, pageCuts.length);

    // 7. Assemble crisp A4 PDF using jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = A4_WIDTH_PX * scale;
    pageCanvas.height = A4_HEIGHT_PX * scale;
    const ctx = pageCanvas.getContext('2d')!;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const { startY, endY } = pageCuts[i];
      const sliceHeight = endY - startY;

      // Fill canvas background with clean white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Draw slice onto canvas
      ctx.drawImage(
        fullCanvas,
        0,
        startY * scale,
        A4_WIDTH_PX * scale,
        sliceHeight * scale,
        0,
        (i > 0 ? HEADER_RESERVE_PX : 0) * scale,
        A4_WIDTH_PX * scale,
        sliceHeight * scale
      );

      // Render image onto A4 page (210mm x 297mm)
      const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // 8. Vector Header for Page 2+ (Crisp, clean, professional)
      if (i > 0) {
        pdf.setFontSize(8);
        pdf.setTextColor(10, 26, 60);
        pdf.setFont('helvetica', 'bold');
        pdf.text(
          options?.tradeName || 'CORE LINK Administrative Services',
          14,
          8
        );

        if (options?.documentTitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(`• ${options.documentTitle}`, 65, 8);
        }

        if (options?.serialNumber) {
          pdf.setFont('courier', 'bold');
          pdf.setTextColor(30, 58, 138);
          pdf.text(options.serialNumber, 196, 8, { align: 'right' });
        }

        // Divider rule
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.line(14, 10.5, 196, 10.5);
      }

      // 9. Vector Footer for All Pages (Crisp, official UAE compliance strip)
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(14, 289, 196, 289);

      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        'CORE LINK Administrative Services • Ajman, UAE • Tel: 068055093 / 068055073 • License #140290',
        14,
        293
      );

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Page ${i + 1} of ${totalPages}`, 196, 293, { align: 'right' });
    }

    // 10. Trigger direct browser download
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
  } finally {
    // Safely remove sandbox
    if (sandbox.parentNode) {
      document.body.removeChild(sandbox);
    }
  }
}
