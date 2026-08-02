/**
 * @fileoverview Characterization tests for the `POST /wake` HTTP route in `index.js`.
 *
 * `index.js` has no exports — importing it has the side effect of starting a real
 * `express` app via `app.listen(...)`. To exercise the route without sending real
 * Wake-on-LAN packets or leaving a port open:
 *  - `wake_on_lan` is stubbed by injecting a fake entry directly into the CommonJS
 *    `require.cache` before `index.js` loads. `vi.mock` does NOT work here: Node's
 *    native CJS loader (not vitest's module graph) handles `require()` calls made
 *    from inside a CommonJS file loaded via dynamic `import()`, so vitest's mock
 *    registry never sees them — confirmed by an earlier run of this suite where
 *    the real `wake_on_lan.wake()` executed and broadcast a real UDP magic packet
 *    despite a `vi.mock("wake_on_lan", ...)` being registered. Cache injection
 *    mutates the actual module object Node hands back from `require()`, so it
 *    works regardless of which loader resolves the call — the same reason the
 *    `http.Server.prototype.listen` spy below works.
 *  - `process.env.PORT` is set to `"0"` before import so the server binds to an
 *    OS-assigned ephemeral port instead of a fixed one.
 *  - `http.Server.prototype.listen` is spied (call-through to the real
 *    implementation) purely to capture the server instance that `index.js` never
 *    exports, so it can be closed in `afterAll`.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createRequire } from "node:module";

const cjsRequire = createRequire(import.meta.url);
const wakeMock = vi.fn((mac, opts, callback) => callback(null));

let server;
let baseUrl;
let restoreListenSpy;

beforeAll(async () => {
	process.env.PORT = "0";

	const wolPath = cjsRequire.resolve("wake_on_lan");
	cjsRequire.cache[wolPath] = {
		id: wolPath,
		filename: wolPath,
		loaded: true,
		exports: { wake: (...args) => wakeMock(...args) }
	};

	const originalListen = http.Server.prototype.listen;
	const listenSpy = vi.spyOn(http.Server.prototype, "listen").mockImplementation(function (...args) {
		server = this;
		return originalListen.apply(this, args);
	});
	restoreListenSpy = () => listenSpy.mockRestore();

	const indexPath = cjsRequire.resolve("../index.js");
	delete cjsRequire.cache[indexPath];
	cjsRequire(indexPath);

	await new Promise((resolve) => {
		if (server.listening) return resolve();
		server.once("listening", resolve);
	});

	const { port } = server.address();
	baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
	restoreListenSpy();
	delete process.env.PORT;
});

async function postWake(body, { headers, raw } = {}) {
	return fetch(`${baseUrl}/wake`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: raw !== undefined ? raw : JSON.stringify(body)
	});
}

describe("POST /wake", () => {
	it("sends a WoL packet and returns 200 + success for a valid MAC using the default address and port", async () => {
		wakeMock.mockClear();
		wakeMock.mockImplementationOnce((mac, opts, callback) => callback(null));

		const res = await postWake({ mac: "AA:BB:CC:DD:EE:FF" });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json).toEqual({ success: true });
		expect(wakeMock).toHaveBeenCalledTimes(1);
		expect(wakeMock.mock.calls[0][0]).toBe("AA:BB:CC:DD:EE:FF");
		expect(wakeMock.mock.calls[0][1]).toEqual({ address: "255.255.255.255", port: 9 });
		expect(typeof wakeMock.mock.calls[0][2]).toBe("function");
	});

	it("forwards a custom ip and port to wake_on_lan when provided", async () => {
		wakeMock.mockClear();
		wakeMock.mockImplementationOnce((mac, opts, callback) => callback(null));

		const res = await postWake({ mac: "11:22:33:44:55:66", ip: "192.168.1.50", port: 1234 });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json).toEqual({ success: true });
		expect(wakeMock.mock.calls[0][0]).toBe("11:22:33:44:55:66");
		expect(wakeMock.mock.calls[0][1]).toEqual({ address: "192.168.1.50", port: 1234 });
	});

	it("returns 400 and does not call wake_on_lan when mac is missing", async () => {
		wakeMock.mockClear();

		const res = await postWake({});
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json).toEqual({ error: "MAC required" });
		expect(wakeMock).not.toHaveBeenCalled();
	});

	it("returns 400 when mac is an empty string (falsy)", async () => {
		wakeMock.mockClear();

		const res = await postWake({ mac: "" });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json).toEqual({ error: "MAC required" });
		expect(wakeMock).not.toHaveBeenCalled();
	});

	it("returns 500 via Express's default error handler when the request has no JSON body at all", async () => {
		// With no Content-Type/body, express.json() leaves req.body as `undefined`
		// (it does NOT default it to `{}`), so the handler's destructuring
		// `const { mac } = req.body` throws synchronously. Express 5 catches
		// synchronous handler throws automatically and routes them to its default
		// HTML error handler -- there is no custom error middleware in index.js.
		wakeMock.mockClear();

		const res = await fetch(`${baseUrl}/wake`, { method: "POST" });
		const text = await res.text();

		expect(res.status).toBe(500);
		expect(res.headers.get("content-type")).toMatch(/text\/html/);
		expect(text).toContain("Cannot destructure property &#39;mac&#39; of &#39;req.body&#39; as it is undefined");
		expect(wakeMock).not.toHaveBeenCalled();
	});

	it("returns 500 with the underlying error message when wake_on_lan reports an error", async () => {
		wakeMock.mockClear();
		wakeMock.mockImplementationOnce((mac, opts, callback) => callback(new Error("malformed MAC address")));

		const res = await postWake({ mac: "not-a-real-mac" });
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json).toEqual({ error: "malformed MAC address" });
	});

	it("returns 400 for a malformed JSON body", async () => {
		wakeMock.mockClear();

		const res = await postWake(undefined, { raw: "{not valid json" });

		expect(res.status).toBe(400);
		expect(wakeMock).not.toHaveBeenCalled();
	});

	it("returns 404 for GET /wake (route only accepts POST)", async () => {
		const res = await fetch(`${baseUrl}/wake`, { method: "GET" });
		expect(res.status).toBe(404);
	});

	it("returns 404 for an unknown route", async () => {
		const res = await fetch(`${baseUrl}/does-not-exist`);
		expect(res.status).toBe(404);
	});
});
