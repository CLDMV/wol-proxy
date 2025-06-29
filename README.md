# wol-proxy

**wol-proxy** is a simple cross-platform CLI tool and HTTP server for sending Wake-on-LAN (WoL) packets over your network.

Use it as a local utility or run it on a remote VM to expose WoL via an HTTP API.

---

## 📦 Installation

```bash
npm install -g wol-proxy
```

---

## 🚀 Usage

### 1. Start the server

To start the proxy:

```bash
wol-proxy
```

It starts an HTTP server on port **3000** by default.

Override the port:

```bash
PORT=8080 wol-proxy
```

> The server listens on all interfaces (0.0.0.0).

---

## 📬 Send Wake-on-LAN Request

Make a `POST` request to `/wake` with a JSON body:

### Example using `curl`:

```bash
curl -X POST http://<proxy-ip>:3000/wake \
  -H "Content-Type: application/json" \
  -d '{"mac": "00:11:22:33:44:55", "ip": "10.0.0.100", "port": 9}'
```

**Successful Response:**

```json
{ "success": true }
```

---

## 🔧 Request Options

| Field   | Required | Description |
|---------|----------|-------------|
| `mac`   | ✅ Yes    | Target device MAC address (e.g. `"f8:01:b4:68:bc:22"`) |
| `ip`    | ❌ No     | Broadcast IP (default: `255.255.255.255`) |
| `port`  | ❌ No     | UDP port (default: `9`) |

---

## 🧪 Quick Test

```bash
wol-proxy &
curl -X POST http://localhost:3000/wake \
  -H "Content-Type: application/json" \
  -d '{"mac": "00:11:22:33:44:55"}'
```

---

## 🔐 Security

This server is unauthenticated by default.  
To secure it:
- Use a reverse proxy (NGINX or Apache) with IP whitelisting or auth
- Restrict access using a firewall or run behind a VPN

---

## 🖥 Development

Clone and run locally:

```bash
git clone https://github.com/CLDMV/wol-proxy.git
cd wol-proxy
npm install
node index.js
```

---


---

## 🛠 Running as a System Service (Ubuntu, CentOS, Fedora, etc.)

After installing `wol-proxy` globally with npm, it will automatically **attempt to install a systemd service** during post-install (on compatible Linux systems).

If successful, you’ll see a confirmation message and can start the service immediately.

---

### ✅ 1. Manual Setup (if automatic setup fails or is skipped)

You can still manually enable the service using the bundled `.service` file:

```bash
sudo cp $(npm root -g)/@cldmv/wol-proxy/wol-proxy.service /etc/systemd/system/wol-proxy.service
```

> This copies the service file from the global npm module into the systemd directory.

### ✅ 2. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable wol-proxy
sudo systemctl start wol-proxy
```

### 🔍 Check service status

```bash
sudo systemctl status wol-proxy
```

### 📋 View logs

```bash
journalctl -u wol-proxy -f
```

`wol-proxy` will now run in the background and start automatically at boot.

---

## 📜 License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

You may use, modify, and redistribute this software under the terms of the GPL-3.0 license.

See the full license text in the [LICENSE](./LICENSE) file or at  
https://www.gnu.org/licenses/gpl-3.0.html

© 2025 CLDMV
