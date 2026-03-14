/**
 * Image Preprocessing Pipeline
 * ─────────────────────────────
 * 1. Deskew — detect the document's tilt angle via projection-profile analysis
 *    and rotate the image to straighten it.
 * 2. Upscale — increase resolution (min 2400px on the longest side) using
 *    high-quality canvas interpolation for better OCR readability.
 *
 * This runs BEFORE compression so the final file is sharp and properly aligned.
 */

// ── Public types ─────────────────────────────────────────────────────────────

export interface PreprocessResult {
  /** The processed (aligned + upscaled) image File */
  processedFile: File;
  /** Detected skew angle in degrees (positive = clockwise tilt) */
  skewAngle: number;
  /** Whether the image was actually upscaled */
  wasUpscaled: boolean;
  /** Resolution after processing */
  newWidth: number;
  newHeight: number;
  /** Original resolution before processing */
  originalWidth: number;
  originalHeight: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum longest-side in px after upscale */
const MIN_LONGEST_SIDE = 2400;

/** Angles below this threshold are considered "not tilted" and skipped */
const SKEW_THRESHOLD_DEG = 0.3;

/** Max dimension for the tiny analysis canvas (for speed) */
const ANALYSIS_SIZE = 400;

// ── Main entry point ─────────────────────────────────────────────────────────

export async function preprocessImage(file: File): Promise<PreprocessResult> {
  // Only process images
  if (!file.type.startsWith("image/")) {
    const img = await loadImage(file);
    return {
      processedFile: file,
      skewAngle: 0,
      wasUpscaled: false,
      newWidth: img.width,
      newHeight: img.height,
      originalWidth: img.width,
      originalHeight: img.height,
    };
  }

  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;

  console.log(
    `%c[Preprocess START]%c ${file.name} | ${originalWidth}×${originalHeight}`,
    "color: #8b5cf6; font-weight: bold",
    "color: inherit"
  );

  // ── Step 1: Detect skew ──────────────────────────────────────────────
  const skewAngle = detectSkew(img);
  const needsDeskew = Math.abs(skewAngle) > SKEW_THRESHOLD_DEG;

  if (needsDeskew) {
    console.log(
      `%c[Deskew]%c Detected tilt: ${skewAngle.toFixed(2)}° → correcting`,
      "color: #f59e0b; font-weight: bold",
      "color: inherit"
    );
  } else {
    console.log(
      `%c[Deskew]%c Image is straight (${skewAngle.toFixed(2)}°) — no correction needed`,
      "color: #22c55e; font-weight: bold",
      "color: inherit"
    );
  }

  // ── Step 2: Determine upscale factor ─────────────────────────────────
  const longestSide = Math.max(originalWidth, originalHeight);
  let scale = 1;
  let wasUpscaled = false;

  if (longestSide < MIN_LONGEST_SIDE) {
    scale = MIN_LONGEST_SIDE / longestSide;
    wasUpscaled = true;
    console.log(
      `%c[Upscale]%c Resolution too low (${longestSide}px) → scaling ${scale.toFixed(2)}×`,
      "color: #3b82f6; font-weight: bold",
      "color: inherit"
    );
  } else {
    console.log(
      `%c[Upscale]%c Resolution already adequate (${longestSide}px) — skipping`,
      "color: #22c55e; font-weight: bold",
      "color: inherit"
    );
  }

  // ── Step 3: Apply transforms on a single canvas pass ─────────────────
  const { canvas, finalWidth, finalHeight } = applyTransforms(
    img,
    needsDeskew ? skewAngle : 0,
    scale
  );

  // ── Step 4: Export to a File object ──────────────────────────────────
  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const quality = outputType === "image/jpeg" ? 0.92 : undefined;

  const blob = await canvasToBlob(canvas, outputType, quality);
  const processedFile = new File([blob], file.name, {
    type: outputType,
    lastModified: Date.now(),
  });

  console.log(
    `%c[Preprocess DONE]%c ${file.name} | ${originalWidth}×${originalHeight} → ${finalWidth}×${finalHeight} | Skew: ${skewAngle.toFixed(2)}°`,
    "color: #22c55e; font-weight: bold",
    "color: inherit"
  );

  return {
    processedFile,
    skewAngle,
    wasUpscaled,
    newWidth: finalWidth,
    newHeight: finalHeight,
    originalWidth,
    originalHeight,
  };
}

// ── Skew Detection (Projection-Profile Variance) ─────────────────────────────
//
// How it works:
//  1. Downscale the image to a tiny analysis canvas (for speed).
//  2. Convert to grayscale and binarise (dark pixels = foreground).
//  3. For each candidate angle (-15° to +15° in 1° coarse steps):
//       – Compute the horizontal projection profile (count dark pixels per row
//         after virtual rotation).
//       – Compute the variance of the profile.
//  4. The angle whose projection has the **highest variance** corresponds to
//     perfectly horizontal text lines (sharp peaks = high variance).
//  5. Refine around the best coarse angle with 0.1° steps.
//
// The detected angle is the tilt of the document; negating it straightens it.

function detectSkew(img: HTMLImageElement): number {
  // Downsample for fast analysis
  const ratio = Math.min(ANALYSIS_SIZE / img.width, ANALYSIS_SIZE / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);

  // Build a boolean array: true = dark foreground pixel
  const dark: boolean[] = new Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    dark[i] = gray < 128;
  }

  // ── Coarse search: -15° to +15° in 1° steps ─────────────────────────
  let bestAngle = 0;
  let bestVariance = -1;

  for (let angle = -15; angle <= 15; angle += 1) {
    const v = projectionVariance(dark, w, h, angle);
    if (v > bestVariance) {
      bestVariance = v;
      bestAngle = angle;
    }
  }

  // ── Fine search: ±1° around best in 0.1° steps ──────────────────────
  for (let angle = bestAngle - 1; angle <= bestAngle + 1; angle += 0.1) {
    const v = projectionVariance(dark, w, h, angle);
    if (v > bestVariance) {
      bestVariance = v;
      bestAngle = angle;
    }
  }

  return Math.round(bestAngle * 10) / 10; // round to 0.1° precision
}

/** Compute the variance of the horizontal projection for a given rotation angle */
function projectionVariance(
  dark: boolean[],
  w: number,
  h: number,
  angleDeg: number
): number {
  const rad = (angleDeg * Math.PI) / 180;
  const sinA = Math.sin(rad);
  const cosA = Math.cos(rad);

  const projection = new Map<number, number>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (dark[y * w + x]) {
        // Projected row after rotation
        const yPrime = Math.round(x * sinA + y * cosA);
        projection.set(yPrime, (projection.get(yPrime) || 0) + 1);
      }
    }
  }

  const values = Array.from(projection.values());
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

// ── Apply Rotation + Upscale in a Single Canvas Pass ─────────────────────────

function applyTransforms(
  img: HTMLImageElement,
  skewAngleDeg: number,
  scale: number
): { canvas: HTMLCanvasElement; finalWidth: number; finalHeight: number } {
  const scaledW = Math.round(img.width * scale);
  const scaledH = Math.round(img.height * scale);

  // When rotating, the bounding box grows — compute the expanded dimensions
  const rad = (-skewAngleDeg * Math.PI) / 180; // negate to correct
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));

  const canvasW = Math.ceil(scaledW * absCos + scaledH * absSin);
  const canvasH = Math.ceil(scaledW * absSin + scaledH * absCos);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext("2d")!;

  // Fill with white background (avoids transparent corners after rotation)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // High-quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Move origin to center, rotate, then draw the scaled image centered
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);

  return { canvas, finalWidth: canvasW, finalHeight: canvasH };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), type, quality);
  });
}
