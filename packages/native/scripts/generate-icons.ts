import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "bun";

const SIZES = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

const main = async () => {
  const svgPath = join(import.meta.dirname, "../../weby/public/verso.svg");
  const outputDir = join(import.meta.dirname, "../icon.iconset");

  console.log(`Creating directory: ${outputDir}`);
  await mkdir(outputDir, { recursive: true });

  console.log(`Generating icon variants using ImageMagick...`);
  for (const { name, size } of SIZES) {
    const outputPath = join(outputDir, name);
    console.log(`Generating ${name} (${size}x${size})...`);

    const proc = spawn({
      cmd: [
        "magick",
        "convert",
        "-background",
        "none",
        "-resize",
        `${size}x${size}`,
        svgPath,
        outputPath,
      ],
      stderr: "inherit",
      stdout: "inherit",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      console.warn(`Warning: failed using 'magick convert', trying fallback 'convert'...`);
      const fallbackProc = spawn({
        cmd: ["convert", "-background", "none", "-resize", `${size}x${size}`, svgPath, outputPath],
        stderr: "inherit",
        stdout: "inherit",
      });
      const fallbackExit = await fallbackProc.exited;
      if (fallbackExit !== 0) {
        throw new Error(`Failed to generate icon ${name}`);
      }
    }
  }

  console.log("All icon variants generated successfully!");
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
