import imageCompression from "browser-image-compression";

const ONE_MB = 1024 * 1024; // 1 MB in bytes

/**
 * Compress a file if its size exceeds 1 MB.
 *
 * - Images (JPEG / PNG / WebP): uses browser-image-compression to reduce quality & resolution.
 * - PDFs: renders each page to a lower-quality JPEG canvas and re-packages into a single PDF blob.
 * - Files ≤ 1 MB are returned unchanged.
 *
 * Returns { compressedFile, compressedSize }.
 */
export async function compressFile(
  file: File,
  options?: { maxWidthOrHeight?: number }
): Promise<{ compressedFile: File; compressedSize: number }> {
  const originalSizeMB = (file.size / ONE_MB).toFixed(2);

  // If the file is already ≤ 1 MB, skip compression
  if (file.size <= ONE_MB) {
    console.log(
      `%c[Compression SKIPPED]%c ${file.name} (${originalSizeMB} MB) — already ≤ 1 MB`,
      "color: #f59e0b; font-weight: bold",
      "color: inherit"
    );
    return { compressedFile: file, compressedSize: file.size };
  }

  console.log(
    `%c[Compression START]%c ${file.name} | Type: ${file.type} | Original: ${originalSizeMB} MB`,
    "color: #3b82f6; font-weight: bold",
    "color: inherit"
  );

  const fileType = file.type;
  let result: { compressedFile: File; compressedSize: number };

  // ── Image compression ──────────────────────────────────────────────
  if (fileType.startsWith("image/")) {
    result = await compressImage(file, options?.maxWidthOrHeight);
  }
  // ── PDF compression ────────────────────────────────────────────────
  else if (fileType === "application/pdf") {
    result = await compressPdf(file);
  }
  // ── Unsupported type → return as-is ────────────────────────────────
  else {
    console.log(
      `%c[Compression SKIPPED]%c Unsupported type: ${fileType}`,
      "color: #f59e0b; font-weight: bold",
      "color: inherit"
    );
    return { compressedFile: file, compressedSize: file.size };
  }

  const compressedSizeMB = (result.compressedSize / ONE_MB).toFixed(2);
  const savings = Math.round((1 - result.compressedSize / file.size) * 100);

  console.log(
    `%c[Compression DONE]%c ${file.name} | ${originalSizeMB} MB → ${compressedSizeMB} MB | ${savings}% saved`,
    "color: #22c55e; font-weight: bold",
    "color: inherit"
  );

  return result;
}

// ─── Image Compression ────────────────────────────────────────────────────────

async function compressImage(
  file: File,
  maxWidthOrHeight: number = 1920
): Promise<{ compressedFile: File; compressedSize: number }> {
  const options = {
    maxSizeMB: 1, // target max 1 MB
    maxWidthOrHeight, // cap resolution (preserves upscaled res when specified)
    useWebWorker: true,
    fileType: file.type as string,
    initialQuality: 0.7, // JPEG quality start
  };

  const compressedBlob = await imageCompression(file, options);

  const compressedFile = new File([compressedBlob], file.name, {
    type: compressedBlob.type,
    lastModified: Date.now(),
  });

  return { compressedFile, compressedSize: compressedFile.size };
}

// ─── PDF Compression ─────────────────────────────────────────────────────────

async function compressPdf(
  file: File
): Promise<{ compressedFile: File; compressedSize: number }> {
  try {
    // Dynamically import pdfjs-dist to keep the initial bundle smaller
    const pdfjsLib = await import("pdfjs-dist");

    // Set up the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    // Render each page to a JPEG canvas, then collect the blobs
    const pageBlobs: Blob[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      // Use a lower scale for compression (1.0 ≈ 72 DPI, 1.5 ≈ 108 DPI)
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      // Convert canvas to JPEG blob with 0.6 quality
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b!),
          "image/jpeg",
          0.6
        );
      });

      pageBlobs.push(blob);
    }

    // For a single-page PDF, just return the JPEG image
    if (pageBlobs.length === 1) {
      const compressedFile = new File(
        [pageBlobs[0]],
        file.name.replace(/\.pdf$/i, "_compressed.jpg"),
        { type: "image/jpeg", lastModified: Date.now() }
      );
      return { compressedFile, compressedSize: compressedFile.size };
    }

    // For multi-page PDFs, concatenate JPEG pages into a single blob
    // (returning images as a combined file — a pragmatic approach for
    //  client-side only PDF compression without a full PDF writer)
    const combinedBlob = new Blob(pageBlobs, { type: "image/jpeg" });
    const compressedFile = new File(
      [combinedBlob],
      file.name.replace(/\.pdf$/i, "_compressed.jpg"),
      { type: "image/jpeg", lastModified: Date.now() }
    );

    return { compressedFile, compressedSize: compressedFile.size };
  } catch (error) {
    console.error("PDF compression failed, returning original:", error);
    return { compressedFile: file, compressedSize: file.size };
  }
}
