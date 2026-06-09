const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const TARGET_LOGO_BYTES = 1.8 * 1024 * 1024;
const MAX_LOGO_DIMENSION = 1200;

export async function compressLogoImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  if (file.size <= MAX_LOGO_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the logo image.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob.size <= TARGET_LOGO_BYTES) {
      return new File([blob], replaceExtension(file.name, "webp"), {
        type: "image/webp",
        lastModified: Date.now()
      });
    }
  }

  throw new Error("This image is too large to compress below 2 MB. Please choose a smaller image.");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not compress the logo image."));
    }, type, quality);
  });
}

function replaceExtension(filename: string, extension: string) {
  const base = filename.replace(/\.[^.]+$/, "") || "logo";
  return `${base}.${extension}`;
}
