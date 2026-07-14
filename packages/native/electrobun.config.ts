import type { ElectrobunConfig } from "electrobun";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(readFileSync(join(import.meta.dirname, "package.json"), "utf-8"));

export default {
  app: {
    identifier: "cc.przknv.verso",
    name: "Verso",
    version: packageJson.version,
  },
  build: {
    copy: {
      "../weby/.output": "views/weby-server",
    },
    linux: {
      bundleCEF: false,
      icon: "icon.iconset/icon_256x256.png",
    },
    mac: {
      bundleCEF: false,
      codesign: process.env.ELECTROBUN_MAC_CODESIGN
        ? process.env.ELECTROBUN_MAC_CODESIGN === "true"
        : !!process.env.ELECTROBUN_DEVELOPER_ID,
      icons: "icon.iconset",
      notarize: process.env.ELECTROBUN_MAC_CODESIGN
        ? process.env.ELECTROBUN_MAC_CODESIGN === "true" && !!process.env.ELECTROBUN_APPLEIDPASS
        : !!process.env.ELECTROBUN_APPLEIDPASS,
    },
    win: {
      bundleCEF: false,
      icon: "icon.iconset/icon_256x256.png",
    },
  },
} satisfies ElectrobunConfig;
