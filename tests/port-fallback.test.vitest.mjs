/**
 * @fileoverview Characterizes `index.js`'s top-level port-selection line:
 *
 *     const port = process.env.PORT || 3000;
 *     app.listen(port, '0.0.0.0', () => console.log(`WOL proxy on port ${port}`));
 *
 * `tests/wake-endpoint.test.vitest.mjs` covers the `process.env.PORT` (truthy) branch by
 * setting `PORT=0` for an ephemeral real bind. This file covers the `|| 3000`
 * fallback branch (PORT unset) in a separate process (the OOM-safe runner spawns
 * one vitest child process per test file, so env vars and the CJS `require.cache`
 * here are isolated from every other test file).
 *
 * To exercise the fallback WITHOUT ever binding the real, fixed port 3000 (which
 * could conflict with another service or leave a long-lived listener behind),
 * `http.Server.prototype.listen` is fully replaced (no call-through) so it records
 * its arguments and invokes the callback without opening a socket. `wake_on_lan`
 * is stubbed the same way as the other suite (via `require.cache` injection --
 * `vi.mock` does not intercept requires performed by a CommonJS file loaded
 * through Node's native loader) even though this file never calls the route.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createRequire } from "node:module";

const cjsRequire = createRequire(import.meta.url);

let capturedArgs;
let logSpy;

beforeAll(async () => {
	delete process.env.PORT;

	const wolPath = cjsRequire.resolve("wake_on_lan");
	cjsRequire.cache[wolPath] = {
		id: wolPath,
		filename: wolPath,
		loaded: true,
		exports: { wake: vi.fn() }
	};

	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

	vi.spyOn(http.Server.prototype, "listen").mockImplementation(function (...args) {
		capturedArgs = args;
		const callback = args.find((a) => typeof a === "function");
		if (callback) queueMicrotask(callback);
		return this;
	});

	const indexPath = cjsRequire.resolve("../index.js");
	delete cjsRequire.cache[indexPath];
	cjsRequire(indexPath);

	// Let the queued microtask (the stubbed listen's callback) flush.
	await new Promise((resolve) => setImmediate(resolve));
});

afterAll(() => {
	vi.restoreAllMocks();
	delete process.env.PORT;
});

describe("module bootstrap: PORT env fallback", () => {
	it("defaults to port 3000 and binds 0.0.0.0 when process.env.PORT is unset", () => {
		expect(capturedArgs[0]).toBe(3000);
		expect(capturedArgs[1]).toBe("0.0.0.0");
		expect(typeof capturedArgs[2]).toBe("function");
	});

	it("logs the startup message with the resolved port once listen's callback fires", () => {
		expect(logSpy).toHaveBeenCalledWith("WOL proxy on port 3000");
	});
});
