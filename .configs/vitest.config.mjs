/**
 *
 *	@Project: @cldmv/wol-proxy
 *	@Filename: /.configs/vitest.config.mjs
 *	@Date: 2026-08-02T23:39:44-07:00 (1785739184)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T11:30:33-07:00 (1790965833)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
	root,
	test: {
		include: ["tests/**/*.test.vitest.mjs"],
		exclude: ["node_modules"],
		environment: "node",
		testTimeout: 30000,
		reporters: ["dot"],
		coverage: {
			provider: "v8",
			include: ["index.js"],
			exclude: ["**/*.json", "tests/**", "**/* - Copy.js"],
			reporter: ["text", "html", "json-summary", "json"]
		}
	}
});
