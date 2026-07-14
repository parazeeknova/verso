import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    identifier: "cc.przknv.verso",
    name: "Verso",
    version: "0.2.71",
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
      codesign: !!process.env.ELECTROBUN_DEVELOPER_ID,
      icons: "icon.iconset",
      notarize: !!process.env.ELECTROBUN_APPLEIDPASS,
    },
    win: {
      bundleCEF: false,
      icon: "icon.iconset/icon_256x256.png",
    },
  },
} satisfies ElectrobunConfig;
