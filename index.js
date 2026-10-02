#!/usr/bin/env node
/**
 *
 *	@Project: @cldmv/wol-proxy
 *	@Filename: /index.js
 *	@Date: 2025-06-29T00:14:22-07:00 (1751181262)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T11:30:39-07:00 (1790965839)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

const express = require('express');
const wol = require('wake_on_lan');
const app = express();
app.use(express.json());

app.post('/wake', (req, res) => {
	const { mac, ip = '255.255.255.255', port = 9 } = req.body;
	if (!mac) return res.status(400).json({ error: 'MAC required' });

	wol.wake(mac, { address: ip, port }, err => {
		if (err) return res.status(500).json({ error: err.message });
		console.log(`Sent WoL to ${mac} via ${ip}:${port}`);
		res.json({ success: true });
	});
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`WOL proxy on port ${port}`));
