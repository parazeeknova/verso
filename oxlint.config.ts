import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  ignorePatterns: [
    "packages/weby/src/routeTree.gen.ts",
    "packages/weby/src/routes/**/$userId.ts",
    "packages/weby/src/routes/**/$groupId.ts",
    "packages/weby/src/routes/**/$slugId.ts",
    "packages/weby/src/routes/**/$tableName*.ts",
    "packages/weby/src/routes/**/$historyId.ts",
    "packages/weby/src/routes/s/$spaceSlug*.tsx",
    "packages/weby/src/features/editor/extensions/table/**",
  ],
});
