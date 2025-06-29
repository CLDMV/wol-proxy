const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function isSystemdLinux() {
	try {
		if (fs.existsSync('/etc/systemd/system')) return '/etc/systemd/system';
		if (fs.existsSync('/bin/systemctl')) return '/bin/systemctl';
	} catch {
		return false;
	}
	return false;
}

let dest;

if (dest = isSystemdLinux()) {
	const src = path.join(__dirname, 'wol-proxy.service');
	dest = dest + '/wol-proxy.service';

	try {
		console.log(`🔧 Installing wol-proxy systemd service to: ${dest}`);
		execSync(`sudo cp "${src}" "${dest}"`, { stdio: 'inherit' });
		execSync('sudo systemctl daemon-reload', { stdio: 'inherit' });
		console.log('✅ Service file installed. You may now enable it:');
		console.log('   sudo systemctl enable wol-proxy');
		console.log('   sudo systemctl start wol-proxy');
	} catch (err) {
		console.warn('⚠️ Failed to auto-install systemd service. Try manually with sudo.');
	}
} else {
	console.log('ℹ️ Skipping systemd setup (not a Linux systemd environment).');
}
