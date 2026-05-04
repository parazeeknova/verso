export const compressImage = (
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.8,
): Promise<string> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.addEventListener("load", () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    });

    img.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("failed to load image"));
    });

    img.src = url;
  });
