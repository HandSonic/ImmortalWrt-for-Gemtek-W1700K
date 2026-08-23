'use strict';
'require view';
'require poll';
'require rpc';
'require ui';

var callNpuStatus = rpc.declare({ object: 'luci.airoha_npu', method: 'getStatus' });
var callPpeEntries = rpc.declare({ object: 'luci.airoha_npu', method: 'getPpeEntries', nobatch: true });
var callTokenInfo = rpc.declare({ object: 'luci.airoha_npu', method: 'getTokenInfo', nobatch: true });
var callFrameEngine = rpc.declare({ object: 'luci.airoha_npu', method: 'getFrameEngine', nobatch: true });
var callSetGovernor = rpc.declare({ object: 'luci.airoha_npu', method: 'setGovernor', params: ['governor'] });
var callSetMaxFreq = rpc.declare({ object: 'luci.airoha_npu', method: 'setMaxFreq', params: ['freq'] });
var callSetOverclock = rpc.declare({ object: 'luci.airoha_npu', method: 'setOverclock', params: ['freq_mhz'] });
var callGetVlanOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getVlanOffload', nobatch: true });
var callSetVlanOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setVlanOffload', params: ['enabled'] });
var callGetPPPoEOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getPPPoEOffload', nobatch: true });
var callSetPPPoEOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setPPPoEOffload', params: ['enabled'] });
var callGetFlowOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getFlowOffload', nobatch: true });
var callSetFlowOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setFlowOffload', params: ['enabled'] });
var callGetApModeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getApModeOffload', nobatch: true });
var callSetApModeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setApModeOffload', params: ['enabled'] });

var ppeSnapshot = { entries: [], truncated: false };

function loadStatusData() {
	return Promise.all([
		L.resolveDefault(callNpuStatus(), {}),
		L.resolveDefault(callTokenInfo(), { tx_queues: [], station_counts: [] }),
		L.resolveDefault(callFrameEngine(), { error: 'unavailable' }),
		L.resolveDefault(callGetVlanOffload(), { enabled: 0 }),
		L.resolveDefault(callGetPPPoEOffload(), { enabled: 0 }),
		L.resolveDefault(callGetFlowOffload(), { enabled: 0 }),
		L.resolveDefault(callGetApModeOffload(), { enabled: 0 })
	]).then(function(data) {
		return [data[0], ppeSnapshot, data[1], data[2], data[3], data[4], data[5], data[6]];
	});
}

function addPpeStats(status, ppe) {
	var entries = Array.isArray(ppe && ppe.entries) ? ppe.entries : [];
	var bound = 0;

	for (var i = 0; i < entries.length; i++)
		if (entries[i].state === 'BND')
			bound++;

	status.offload_bound = bound;
	status.offload_total = entries.length;
	status.offload_truncated = !!(ppe && ppe.truncated);
	return status;
}

function updatePpeView(ppe) {
	ppeSnapshot = ppe && Array.isArray(ppe.entries) ? ppe : { entries: [], truncated: false };
	var entries = ppeSnapshot.entries;
	var stats = addPpeStats({}, ppeSnapshot);
	var bound = document.getElementById('fe-ppe-bound');
	var total = document.getElementById('fe-ppe-total');
	var table = document.getElementById('ppe-entries-table');

	if (bound)
		bound.textContent = stats.offload_bound.toString() + (ppeSnapshot.truncated ? '+' : '');
	if (total)
		total.textContent = stats.offload_total.toString() + (ppeSnapshot.truncated ? '+' : '');
	if (table) {
		while (table.rows.length > 1)
			table.deleteRow(1);
		renderPpeRows(entries).forEach(function(row) { table.appendChild(row); });
	}
}

function refreshPpeData() {
	return L.resolveDefault(callPpeEntries(), { entries: [], truncated: false }).then(updatePpeView);
}

/* ── Theme-adaptive CSS ── */
var themeCSS = '\
.soc-card{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-radius:8px;padding:14px;transition:border-color .3s}\
.soc-card-accent{border-left-width:3px;border-left-style:solid}\
.soc-muted{color:var(--soc-muted)}\
.soc-text{color:var(--soc-text)}\
.soc-label{font-size:11px;color:var(--soc-muted)}\
.soc-bar-track{background:var(--soc-bar-track);border-radius:4px;overflow:hidden}\
.soc-pse-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}\
.soc-pse-cell{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-radius:5px;padding:6px 8px;font-size:12px}\
.soc-band-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}\
.soc-gdm-grid,.soc-data-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}\
.soc-cdm-grid,.soc-data-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}\
.soc-flow-table{overflow-x:auto}\
.offload-row{display:grid;grid-template-columns:repeat(4,minmax(175px,1fr));gap:8px;padding:0;margin:12px 0}\
.offload-item{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-left:3px solid var(--soc-border);border-radius:12px;padding:11px 14px;min-width:0;min-height:58px;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}\
.offload-item:has(.offload-on){border-left-color:#22c55e}\
.offload-item:has(.offload-off){border-left-color:#6b7280}\
.offload-name{display:flex;align-items:center;gap:10px;min-width:0;font-size:13px;line-height:1.4;font-weight:500}\
.offload-name .soc-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.offload-dot{width:8px;height:8px;border-radius:50%;background:#9ca3af;flex:0 0 auto;transition:background .25s,box-shadow .25s}\
.offload-item:has(.offload-on) .offload-dot{background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12)}\
.offload-controls{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:128px}\
.npu-toggle{position:relative;display:inline-flex;width:52px;height:30px;flex:0 0 auto;cursor:pointer}\
.npu-toggle-input{position:absolute;width:1px;height:1px;opacity:0;margin:0}\
.npu-toggle-track{position:absolute;inset:0;border:1px solid #cbd5e1;border-radius:999px;background:#d7dce2;transition:background .25s,border-color .25s,box-shadow .25s}\
.npu-toggle-track:before{content:"";position:absolute;width:24px;height:24px;left:2px;top:2px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.24);transition:transform .25s}\
.npu-toggle-input:checked+.npu-toggle-track{background:#22c55e;border-color:#16a34a}\
.npu-toggle-input:checked+.npu-toggle-track:before{transform:translateX(22px)}\
.npu-toggle-input:focus-visible+.npu-toggle-track{box-shadow:0 0 0 3px rgba(0,200,255,.25)}\
.npu-toggle-input:disabled+.npu-toggle-track{opacity:.55;cursor:wait}\
.offload-badge{font-size:12px;font-weight:600;line-height:1.4;letter-spacing:0;padding:0;border:0;background:transparent;display:inline-flex;align-items:center;white-space:nowrap}\
.offload-on{color:#16a34a}\
.offload-off{color:#6b7280}\
@media(max-width:1050px){.offload-row{grid-template-columns:repeat(2,minmax(180px,1fr))}}\
@media(max-width:900px){.soc-gdm-grid,.soc-data-grid-3{grid-template-columns:1fr}.soc-cdm-grid,.soc-data-grid-2{grid-template-columns:1fr}.soc-band-grid{grid-template-columns:1fr}}\
@media(max-width:640px){.offload-row{grid-template-columns:1fr}.offload-item{min-height:62px;padding:12px 14px}.offload-controls{min-width:132px}}\
';

function isDarkMode() {
	var selected = document.documentElement.dataset.theme;
	if (selected === 'dark') return true;
	if (selected === 'light') return false;
	if (selected === 'auto' && window.matchMedia)
		return window.matchMedia('(prefers-color-scheme: dark)').matches;

	// Fall back to sampling rendered backgrounds for themes without a mode flag.
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		var bg = window.getComputedStyle(els[i]).backgroundColor;
		var m = bg.match(/\d+/g);
		if (m && m.length >= 3) {
			var a = m.length >= 4 ? parseFloat(m[3]) : 1;
			if (a < 0.1) continue; // transparent, skip
			var lum = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
			return lum < 128;
		}
	}
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

var _lastDarkMode = null;

function injectCSS() {
	var el = document.getElementById('soc-theme-css');
	if (!el) { el = document.createElement('style'); el.id = 'soc-theme-css'; document.head.appendChild(el); }

	var dark = isDarkMode();
	if (dark === _lastDarkMode) return;
	_lastDarkMode = dark;

	var vars = dark
		? ':root{--soc-card-bg:#1e1e1e;--soc-border:#333;--soc-muted:#999;--soc-text:#e0e0e0;--soc-bar-track:#333}'
		: ':root{--soc-card-bg:#fff;--soc-border:#d0d0d0;--soc-muted:#666;--soc-text:#222;--soc-bar-track:#e0e0e0}';
	el.textContent = themeCSS + vars;
}

/* ── Helpers ── */
var bandInfo = [
	{ name: '2.4 GHz', accent: '#ff9800' },
	{ name: '5 GHz', accent: '#2196f3' },
	{ name: '6 GHz', accent: '#9c27b0' }
];

var psePortMap = [
	{ name: 'CDM1', label: _('CPU DMA 1'),       color: '#607d8b' },
	{ name: 'GDM1', label: _('Internal Switch'), color: '#ff9800' },
	{ name: 'GDM2', label: _('10G WAN'),         color: '#4caf50' },
	{ name: 'GDM3', label: 'GDM3',        color: '#607d8b' },
	{ name: 'PPE1', label: _('PPE Engine 1'),    color: '#2196f3' },
	{ name: 'CDM2', label: _('CPU DMA 2'),       color: '#607d8b' },
	{ name: 'CDM3', label: 'CDM3',        color: '#607d8b' },
	{ name: 'CDM4', label: _('WiFi WDMA'),       color: '#9c27b0' },
	{ name: 'PPE2', label: _('PPE Engine 2'),    color: '#2196f3' },
	{ name: 'GDM4', label: _('LAN1 2.5G'),       color: '#4caf50' }
];

function fmtFreq(khz) { return (!khz || khz === 0) ? _('N/A') : (khz / 1000).toFixed(0) + ' MHz'; }
function fmtK(n) {
	if (!n || n === 0) return '0';
	if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
	return n.toString();
}

function calcTotalMem(regions) {
	var t = 0;
	(regions || []).forEach(function(r) {
		var m = (r.size || '').match(/(\d+)\s*(KiB|MiB|GiB)/i);
		if (m) { var s = parseInt(m[1]); var u = m[2][0].toUpperCase(); t += u === 'G' ? s*1048576 : u === 'M' ? s*1024 : s; }
	});
	return t >= 1024 ? (t/1024).toFixed(0)+' MiB' : t+' KiB';
}

function tokenHealth(c, s) {
	if (!s) return { text: _('N/A'), color: '#888' };
	var p = c/s*100;
	return p < 50 ? { text:_('Healthy'), color:'#4caf50' } : p < 80 ? { text:_('Warning'), color:'#ff9800' } : { text:_('Critical'), color:'#f44336' };
}

function npuState(st, ti) {
	if (st && st.npu_loaded && ti && ti.npu_active)
		return { text: _('Active'), className: 'label-success' };
	if (st && st.npu_loaded)
		return { text: _('Driver Ready'), className: 'label-warning' };
	return { text: _('Not Active'), className: 'label-danger' };
}

function getBandStats(ti, b) {
	var c = Array.isArray(ti.station_counts) ? ti.station_counts : [];
	for (var i=0;i<c.length;i++) if (c[i].band===b) return c[i];
	return { band:b, count:0, tx_packets:0, tx_retries:0 };
}

function getTxQueue(ti, b) {
	var q = Array.isArray(ti.tx_queues) ? ti.tx_queues : [];
	for (var i=0;i<q.length;i++) if (q[i].band===b) return q[i];
	return null;
}

function bandHealth(s, q) {
	if (!s || s.count===0) return { text:_('No clients'), color:'#888' };
	if (q && q.type === 'npu') return { text:_('Connected'), color:'#4caf50' };
	if (!s.tx_packets) return { text:_('Idle'), color:'#888' };
	var r = s.tx_retries/(s.tx_packets+s.tx_retries);
	return r>0.5 ? {text:_('Poor'),color:'#f44336'} : r>0.2 ? {text:_('Fair'),color:'#ff9800'} : {text:_('Good'),color:'#4caf50'};
}

function retryPct(s, q) {
	// NPU TX bypasses the host tx_packets counter while firmware retry
	// counters continue to advance, so a percentage would be meaningless.
	if (q && q.type === 'npu') return '';
	if (!s || !s.tx_packets) return '-';
	return (s.tx_retries/(s.tx_packets+s.tx_retries)*100).toFixed(1)+'%';
}

/* ── Mini Band Chip (compact for FE diagram) ── */
function renderBandChip(band, txQ, stats) {
	var info = bandInfo[band] || { name: _('Band %d').format(band), accent: '#888' };
	var id = 'band-'+band;
	var h = bandHealth(stats, txQ);
	var type = txQ ? txQ.type : '?';
	var rp = retryPct(stats, txQ);

	return E('div', { 'id': id, 'style': 'background:var(--soc-card-bg);border:1px solid var(--soc-border);border-left:2px solid '+info.accent+';border-radius:6px;padding:10px 12px' }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px' }, [
			E('span', { 'class': 'soc-text', 'style': 'font-size:13px;font-weight:bold' }, info.name),
			E('span', { 'style': 'background:'+(type==='npu'?'#1565c0':'#666')+';color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:600' }, type.toUpperCase())
		]),
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;font-size:12px' }, [
			E('div', { 'id': id+'-health', 'style': 'display:flex;align-items:center;gap:4px' }, [
				E('span', { 'style': 'width:7px;height:7px;border-radius:50%;background:'+h.color+';display:inline-block' }),
				E('span', { 'style': 'color:'+h.color+';font-weight:500' }, h.text)
			]),
			E('span', { 'id': id+'-clients', 'class': 'soc-muted' }, _('%d stations').format(stats.count)),
			rp ? E('span', { 'id': id+'-retries', 'class': 'soc-muted' }, rp) : E('span')
		])
	]);
}

function updateBandChip(band, stats, txQ) {
	var id = 'band-'+band, h = bandHealth(stats, txQ);
	var el = document.getElementById(id+'-health');
	if (el) { el.innerHTML = ''; el.appendChild(E('span',{'style':'width:6px;height:6px;border-radius:50%;background:'+h.color+';display:inline-block'})); el.appendChild(E('span',{'style':'color:'+h.color+';font-weight:500;font-size:11px'},h.text)); }
	var cl = document.getElementById(id+'-clients');
	if (cl) cl.textContent = _('%d stations').format(stats.count);
	var re = document.getElementById(id+'-retries');
	if (re) { var rp2 = retryPct(stats, txQ); re.textContent = rp2; }
}

/* ── Frame Engine Diagram (with WiFi bands, NPU, PPE flows) ── */
function renderFeDiagram(fe, ti, st) {
	if (!fe || fe.error) return E('div', { 'class': 'soc-muted' }, _('Not available'));
	ti = ti || {}; st = st || {};

	var ports = Array.isArray(fe.pse_ports) ? fe.pse_ports : [];

	// Helper: GDM card
	function gdmCard(key, name, label, color, pse) {
		var d = fe[key] || {};
		var active = d.tx > 0 || d.rx > 0;
		return E('div', { 'class': 'soc-card soc-card-accent', 'style': 'border-left-color:'+color + (active?';border-color:'+color:'') }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px' }, [
				E('span', { 'style': 'font-weight:bold;color:'+color+';font-size:14px' }, name),
				E('span', { 'class': 'soc-label' }, pse)
			]),
			E('div', { 'class': 'soc-label', 'style': 'margin-bottom:6px' }, label),
			E('div', { 'style': 'display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px' }, [
				E('span', { 'class': 'soc-muted' }, 'TX'), E('span', { 'class': 'soc-text', 'style': 'text-align:right' }, fmtK(d.tx)),
				E('span', { 'class': 'soc-muted' }, 'RX'), E('span', { 'class': 'soc-text', 'style': 'text-align:right' }, fmtK(d.rx))
			].concat(d.tx_drop > 0 ? [
				E('span', { 'style': 'color:#f44336' }, _('TX Drops')), E('span', { 'style': 'color:#f44336;text-align:right' }, fmtK(d.tx_drop))
			] : []).concat(d.rx_drop > 0 ? [
				E('span', { 'style': 'color:#f44336' }, _('RX Drops')), E('span', { 'style': 'color:#f44336;text-align:right' }, fmtK(d.rx_drop))
			] : []))
		]);
	}

	// Helper: CDM counters. RXHWF is one CDM path, not the global PPE
	// offload ratio, so do not derive a health percentage from it.
	function cdmCard(key, name, label, pse) {
		var d = fe[key] || {};
		var drops = (d.rx_cpu_drop||0) + (d.rx_hwf_drop||0);
		return E('div', { 'class': 'soc-card', 'style': drops ? 'border-color:#f44336' : '' }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;margin-bottom:4px' }, [
				E('span', { 'style': 'font-weight:bold;color:#607d8b;font-size:13px' }, name+' '+pse),
				E('span', { 'class': 'soc-label' }, label)
			]),
			E('div', { 'style': 'display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px' }, [
				E('span', { 'class': 'soc-muted' }, 'TX'), E('span', { 'class': 'soc-text', 'style': 'text-align:right' }, fmtK(d.tx||0)),
				E('span', { 'class': 'soc-muted' }, 'RX CPU'), E('span', { 'class': 'soc-text', 'style': 'text-align:right' }, fmtK(d.rx_cpu||0)),
				E('span', { 'class': 'soc-muted' }, 'RX HWF'), E('span', { 'class': 'soc-text', 'style': 'text-align:right' }, fmtK(d.rx_hwf||0))
			].concat(drops ? [
				E('span', { 'style': 'color:#f44336' }, _('RX Drops')), E('span', { 'style': 'color:#f44336;text-align:right' }, fmtK(drops))
			] : []))
		]);
	}

	// WiFi band chips for CDM4
	var bandChips = [];
	for (var b = 0; b < 3; b++) bandChips.push(renderBandChip(b, getTxQueue(ti, b), getBandStats(ti, b)));

	// CDM4/WDMA + WiFi bands grouped
	var p7 = ports[7] || { iq: 0, oq: 0, drops: 0 };
	var p7Counter = ti.npu_active
		? _('NPU handoff: %s').format(fmtK(p7.drops || 0))
		: _('Drops: %s').format(fmtK(p7.drops || 0));
	var cdm4WiFi = E('div', { 'class': 'soc-card soc-card-accent', 'style': 'border-left-color:#9c27b0' }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px' }, [
			E('span', { 'style': 'font-weight:bold;color:#9c27b0;font-size:14px' }, 'CDM4'),
			E('span', { 'class': 'soc-label' }, _('P7 WiFi DMA'))
		]),
		E('div', { 'style': 'display:flex;gap:12px;font-size:11px;margin-bottom:8px' }, [
			E('span', { 'class': 'soc-muted' }, 'IQ '+p7.iq),
			E('span', { 'class': 'soc-muted' }, 'OQ '+p7.oq),
			E('span', { 'class': 'soc-muted' }, p7Counter)
		].filter(Boolean)),
		// WiFi bands inside
		E('div', { 'style': 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px' }, bandChips)
	]);

	// NPU indicator
	var npuReady = !!st.npu_loaded;
	var npuActive = npuReady && !!ti.npu_active;
	var npuLabel = npuActive ? _('ACTIVE') : npuReady ? _('READY') : _('OFF');
	var npuCard = E('div', { 'class': 'soc-card', 'style': 'border-color:'+(npuActive?'#00bcd4':'var(--soc-border)') }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px' }, [
			E('span', { 'style': 'font-weight:bold;color:#00bcd4;font-size:14px' }, 'NPU'),
			E('span', { 'style': 'background:'+(npuActive?'#00695c':'#666')+';color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:600' }, npuLabel)
		]),
		E('div', { 'class': 'soc-label', 'style': 'margin-bottom:4px' }, _('%dx RISC-V via reserved RAM').format(st.npu_cores||0)),
		E('div', { 'style': 'font-size:11px' }, [
			E('span', { 'class': 'soc-muted' }, _('Manages:') + ' '),
			E('span', { 'class': 'soc-text', 'style': 'font-size:11px' }, _('PPE initialization, WDMA rings, flow statistics'))
		])
	]);

	// PPE engines with flow count
	var ppeCard = E('div', { 'class': 'soc-card', 'style': 'border-color:#2196f3' }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px' }, [
			E('span', { 'style': 'font-weight:bold;color:#2196f3;font-size:14px' }, _('PPE Engines')),
			E('span', { 'class': 'soc-label' }, 'P4 + P8')
		]),
		E('div', { 'style': 'display:flex;gap:16px;font-size:12px' }, [
			E('span', {}, [
				E('span', { 'class': 'soc-muted' }, _('Bound') + ' '),
				E('span', { 'class': 'soc-text', 'style': 'font-weight:bold', 'id': 'fe-ppe-bound' }, (st.offload_bound||0).toString()+(st.offload_truncated?'+':''))
			]),
			E('span', {}, [
				E('span', { 'class': 'soc-muted' }, _('Total') + ' '),
				E('span', { 'class': 'soc-text', 'id': 'fe-ppe-total' }, (st.offload_total||0).toString()+(st.offload_truncated?'+':''))
			])
		])
	]);

	// PSE buffer
	var pseT = (fe.pse_used||0)+(fe.pse_free||0);
	var pseP = pseT>0 ? ((fe.pse_used/pseT)*100).toFixed(1) : '0';
	var pseCol = parseFloat(pseP)>80?'#f44336':parseFloat(pseP)>50?'#ff9800':'#4caf50';

	// PSE port cells (skip P7 since it's shown in CDM4/WiFi section)
	var portCells = ports.filter(function(p){ return p.port !== 7; }).map(function(p) {
		var info = psePortMap[p.port] || { name:'P'+p.port, label:'?', color:'#666' };
		var drop = (p.drops||0) > 0;
		return E('div', { 'class': 'soc-pse-cell', 'style': drop ? 'border-color:#f44336' : '' }, [
			E('div', { 'style': 'font-weight:600;color:'+info.color+';font-size:11px' }, 'P'+p.port+' '+info.name),
			E('div', { 'style': 'display:flex;gap:8px;font-size:11px;margin-top:2px' }, [
				E('span', { 'class': 'soc-muted' }, 'IQ '+p.iq),
				E('span', { 'class': 'soc-muted' }, 'OQ '+p.oq),
				drop ? E('span', { 'style': 'color:#f44336' }, _('Drops: %s').format(fmtK(p.drops))) : null
			].filter(Boolean))
		]);
	});

	return E('div', { 'id': 'fe-diagram' }, [
		// PSE buffer bar
		E('div', { 'class': 'soc-card', 'style': 'margin-bottom:10px' }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;margin-bottom:4px' }, [
				E('span', { 'class': 'soc-text', 'style': 'font-weight:bold;font-size:13px' }, _('PSE Shared Buffer')),
				E('span', { 'class': 'soc-muted', 'style': 'font-size:12px' }, _('%d used / %d free (%s%%)').format(fe.pse_used||0, fe.pse_free||0, pseP))
			]),
			E('div', { 'class': 'soc-bar-track', 'style': 'height:8px' }, [
				E('div', { 'style': 'background:'+pseCol+';height:100%;width:'+pseP+'%;border-radius:4px;transition:width .5s' })
			])
		]),
		// Row 1: GDM ports
		E('div', { 'class': 'soc-gdm-grid' }, [
			gdmCard('gdm1', 'GDM1', _('Internal Switch (1G LAN2/3)'), '#ff9800', 'P1'),
			gdmCard('gdm2', 'GDM2', _('WAN (USXGMII 10G)'), '#4caf50', 'P2'),
			gdmCard('gdm4', 'GDM4', _('LAN1 (USXGMII 2.5G)'), '#4caf50', 'P9')
		]),
		// Row 2: CDM1/CDM2 (CPU) + CDM4/WiFi
		E('div', { 'class': 'soc-data-grid-3' }, [
			cdmCard('cdm1', 'CDM1', _('CPU DMA 1'), 'P0'),
			cdmCard('cdm2', 'CDM2', _('CPU DMA 2'), 'P5'),
			cdm4WiFi
		]),
		// Row 3: PPE + NPU
		E('div', { 'class': 'soc-data-grid-2' }, [
			ppeCard,
			npuCard
		]),
		// PSE port grid
		E('div', { 'class': 'soc-text', 'style': 'font-size:12px;font-weight:600;margin-bottom:6px' }, _('PSE Port Queue Status')),
		E('div', { 'class': 'soc-pse-grid' }, portCells)
	]);
}

/* ── CPU Frequency ── */
function freqBarState(hw, min, max, pll, gov) {
	var oc = gov==='performance' && pll>0 && (pll*1000)>max;
	return { freq: oc ? pll*1000 : Math.min(hw,max), max: oc ? pll*1000 : max, oc: oc };
}

function renderFreqBar(hw, min, max, pll, gov) {
	if (!max) return E('span',{},_('N/A'));
	var s = freqBarState(hw,min,max,pll,gov);
	var pct = Math.round(((s.freq-min)/(s.max-min))*100);
	pct = Math.max(0,Math.min(100,pct));
	var bg = s.oc ? 'linear-gradient(90deg,#e65100,#ff9800)' : 'linear-gradient(90deg,#2e7d32,#66bb6a)';
	var label = s.oc ? (pll+' MHz (OC)') : fmtFreq(s.freq);

	return E('div', { 'id':'cpu-freq-bar-wrap', 'style':'display:flex;align-items:center;gap:10px' }, [
		E('span', { 'class':'soc-muted', 'style':'font-size:90%' }, fmtFreq(min)),
		E('div', { 'style':'flex:1;border-radius:4px;height:22px;position:relative;min-width:180px;max-width:350px;overflow:hidden', 'class':'soc-bar-track' }, [
			E('div', { 'id':'cpu-freq-fill', 'style':'background:'+bg+';height:100%;border-radius:4px;width:'+pct+'%;transition:width .5s' }),
			E('span', { 'id':'cpu-freq-text', 'style':'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)' }, label)
		]),
		E('span', { 'id':'cpu-freq-max-label', 'class':'soc-muted', 'style':'font-size:90%' }, fmtFreq(s.max))
	]);
}

function updateFreqBar(hw, min, max, pll, gov) {
	var s = freqBarState(hw,min,max,pll,gov);
	var el = document.getElementById('cpu-freq-text'), fl = document.getElementById('cpu-freq-fill'), ml = document.getElementById('cpu-freq-max-label');
	if (el) el.textContent = s.oc ? (pll+' MHz (OC)') : fmtFreq(s.freq);
	if (fl && s.max>0) { var pct=Math.max(0,Math.min(100,Math.round(((s.freq-min)/(s.max-min))*100))); fl.style.width=pct+'%'; fl.style.background=s.oc?'linear-gradient(90deg,#e65100,#ff9800)':'linear-gradient(90deg,#2e7d32,#66bb6a)'; }
	if (ml) ml.textContent = fmtFreq(s.max);
}

function renderGovSelect(avail, active) {
	var gs = (avail||'').trim().split(/\s+/).filter(Boolean);
	if (!gs.length) return E('span',{},_('N/A'));
	return E('select', { 'id':'cpu-governor-select','class':'cbi-input-select','style':'min-width:140px','change':function(ev){
		var g=ev.target.value; ev.target.disabled=true;
		callSetGovernor(g).then(function(r){ev.target.disabled=false;if(r&&r.error) ui.addNotification(null,E('p',{},_('Error:')+' '+r.error),'error');}).catch(function(){ev.target.disabled=false;});
	}}, gs.map(function(g){return E('option',{'value':g,'selected':g===active?'':null},g);}));
}

function renderMaxFreqSelect(avail, cur) {
	var fs = (avail||'').trim().split(/\s+/).filter(Boolean);
	if (!fs.length) return E('span',{},_('N/A'));
	return E('select', { 'id':'cpu-maxfreq-select','class':'cbi-input-select','style':'min-width:140px','change':function(ev){
		var f=ev.target.value; ev.target.disabled=true;
		callSetMaxFreq(parseInt(f)).then(function(r){ev.target.disabled=false;if(r&&r.error) ui.addNotification(null,E('p',{},_('Error:')+' '+r.error),'error');}).catch(function(){ev.target.disabled=false;});
	}}, fs.map(function(f){return E('option',{'value':f,'selected':parseInt(f)===parseInt(cur)?'':null},(parseInt(f)/1000).toFixed(0)+' MHz');}));
}

function renderOcControls() {
	var inp = E('input',{'id':'oc-freq-input','type':'number','min':'500','max':'1600','step':'50','value':'1400','class':'cbi-input-text','style':'width:100px'});
	var btn = E('button',{'class':'cbi-button cbi-button-action','style':'margin-left:8px','click':function(){
		var f=parseInt(document.getElementById('oc-freq-input').value);
		if(isNaN(f)||f<500||f>1600){ui.addNotification(null,E('p',{},_('Must be 500-1600 MHz')),'error');return;}
		if(f>1400&&!confirm(_('Frequencies above 1400 MHz may be unstable. Continue?'))) return;
		btn.disabled=true;btn.textContent=_('Applying...');
		callSetOverclock(f).then(function(r){btn.disabled=false;btn.textContent=_('Apply');
			if(r&&r.error) ui.addNotification(null,E('p',{},_('Failed:')+' '+r.error),'error');
			else if(r&&r.result==='ok') ui.addNotification(null,E('p',{},_('CPU set to')+' '+r.actual_mhz+' MHz'),'info');
		}).catch(function(e){btn.disabled=false;btn.textContent=_('Apply');});
	}},_('Apply'));
	return E('div',{'style':'display:flex;align-items:center;gap:8px;flex-wrap:wrap'},[
		inp, E('span',{'class':'soc-muted'},'MHz'), btn,
		E('span',{'class':'soc-muted','style':'font-size:85%;margin-left:8px'},_('Direct PLL. Stock max 1200 MHz. Stable up to 1500 MHz.'))
	]);
}

/* ── PPE Table ── */
function renderPpeRows(entries) {
	return entries.slice(0,100).map(function(e) {
		var eth = e.eth||''; if(eth==='00:00:00:00:00:00->00:00:00:00:00:00') eth='-';
		return E('tr',{'class':'tr'},[
			E('td',{'class':'td'},e.index), E('td',{'class':'td'},E('span',{'class':e.state==='BND'?'label-success':''},e.state)),
			E('td',{'class':'td'},e.type), E('td',{'class':'td'},e.orig||'-'), E('td',{'class':'td'},e.new_flow||'-'), E('td',{'class':'td'},eth)
		]);
	});
}

function isEnabled(value) {
	return value === true || value === 1 || value === '1';
}

function renderOffloadBadge(enabled, id) {
	enabled = isEnabled(enabled);
	return E('span', {
		'id': id,
		'class': 'offload-badge ' + (enabled ? 'offload-on' : 'offload-off')
	}, enabled ? _('Enabled') : _('Disabled'));
}

function renderOffloadToggle(state, id, callFn, badgeId) {
	if (!state || state.available === false)
		return E('span', { 'class': 'soc-muted' }, _('Not available'));

	var enabled = isEnabled(state.enabled);
	var toggle = E('input', {
		'id': id,
		'type': 'checkbox',
		'class': 'npu-toggle-input',
		'change': function(ev) {
			var val = ev.target.checked ? 1 : 0;
			ev.target.disabled = true;
			callFn(val).then(function(r) {
				ev.target.disabled = false;
				if (r && r.error) {
					ev.target.checked = !val;
					ui.addNotification(null, E('p', {}, _('Error:') + ' ' + r.error), 'error');
				} else {
					var b = document.getElementById(badgeId);
					if (b) {
						b.className = 'offload-badge ' + (val ? 'offload-on' : 'offload-off');
						b.textContent = val ? _('Enabled') : _('Disabled');
					}
				}
			}).catch(function() {
				ev.target.checked = !val;
				ev.target.disabled = false;
			});
		}
	});
	toggle.checked = enabled;

	return E('div', { 'class': 'offload-controls' }, [
		E('label', { 'class': 'npu-toggle', 'title': enabled ? _('Click to disable') : _('Click to enable') }, [
			toggle,
			E('span', { 'class': 'npu-toggle-track' })
		]),
		renderOffloadBadge(enabled, badgeId)
	]);
}

function renderOffloadItem(title, state, id, callFn, badgeId) {
	return E('div', { 'class': 'offload-item' }, [
		E('span', { 'class': 'offload-name' }, [
			E('span', { 'class': 'offload-dot' }),
			E('span', { 'class': 'soc-text' }, title)
		]),
		renderOffloadToggle(state, id, callFn, badgeId)
	]);
}

function renderOffloadGrid(vo, po, flo, apo) {
	return E('div', { 'class': 'offload-row' }, [
		renderOffloadItem(_('VLAN Fast Path'), vo, 'vlan-offload-select', callSetVlanOffload, 'vlan-offload-badge'),
		renderOffloadItem(_('PPPoE Fast Path'), po, 'pppoe-offload-select', callSetPPPoEOffload, 'pppoe-offload-badge'),
		renderOffloadItem(_('HW Flow Offload'), flo, 'flow-offload-select', callSetFlowOffload, 'flow-offload-badge'),
		renderOffloadItem(_('AP Mode Acceleration'), apo, 'apmode-offload-select', callSetApModeOffload, 'apmode-offload-badge')
	]);
}

/* ── Main View ── */
return view.extend({
	load: function() {
		return loadStatusData();
	},

	render: function(data) {
		injectCSS();
		var st = data[0]||{}, ppe = data[1]||{}, ti = data[2]||{}, fe = data[3]||{}, vo = data[4]||{}, po = data[5]||{}, flo = data[6]||{}, ao = data[7]||{};
		var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
		st = addPpeStats(st, ppe);
		var memR = Array.isArray(st.memory_regions) ? st.memory_regions : [];
		var ns = npuState(st, ti);

		var view = E('div',{'class':'cbi-map'},[
			E('h2',{},_('Airoha SoC Status')),

			// CPU Frequency
			E('div',{'class':'cbi-section'},[
				E('h3',{},_('CPU Frequency')),
				E('table',{'class':'table'},[
					E('tr',{'class':'tr'},[ E('td',{'class':'td','width':'33%'},E('strong',{},_('Current Frequency'))), E('td',{'class':'td'}, renderFreqBar(st.cpu_cur_freq||st.cpu_hw_freq,st.cpu_min_freq,st.cpu_max_freq,st.pll_freq_mhz,st.cpu_governor)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('Governor'))), E('td',{'class':'td'}, renderGovSelect(st.cpu_avail_governors,st.cpu_governor)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('Max Frequency'))), E('td',{'class':'td'}, renderMaxFreqSelect(st.cpu_avail_freqs,st.cpu_max_freq)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('Overclock'))), E('td',{'class':'td'}, renderOcControls()) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('CPU Cores'))), E('td',{'class':'td'},(st.cpu_count||0).toString()) ])
				])
			]),

			// NPU & Frame Engine (unified)
			E('div',{'class':'cbi-section'},[
				E('h3',{},_('NPU & Offload Engine')),
				E('table',{'class':'table'},[
					E('tr',{'class':'tr'},[ E('td',{'class':'td','width':'33%'},E('strong',{},_('NPU Status'))),
						E('td',{'class':'td','id':'npu-status'}, E('span',{'class':ns.className},ns.text+(st.npu_device?' ('+st.npu_device+')':''))) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('Firmware / Clock / Cores'))),
						E('td',{'class':'td','id':'npu-info'}, (st.npu_version||_('N/A'))+' | '+(st.npu_clock?(st.npu_clock/1e6).toFixed(0)+' MHz':_('N/A'))+' | '+_('%d cores').format(st.npu_cores||0)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('Reserved Memory'))),
						E('td',{'class':'td','id':'npu-memory'}, calcTotalMem(memR)+' ('+_('%d regions').format(memR.length)+')') ]),
				]),
				renderOffloadGrid(vo, po, flo, ao),

				// Frame Engine diagram (includes WiFi bands, PPE flows, NPU indicator)
				E('div',{'style':'margin-top:12px'},[ E('h4',{'class':'soc-text','style':'font-size:14px;margin-bottom:8px'},_('Frame Engine'))]),
				E('div',{'id':'fe-container'}, renderFeDiagram(fe, ti, st))
			]),

			// PPE Flow Table
			E('div',{'class':'cbi-section'},[
				E('h3',{},_('PPE Flow Offload Entries')),
				E('div',{'class':'soc-flow-table'},E('table',{'class':'table','id':'ppe-entries-table'},[
					E('tr',{'class':'tr cbi-section-table-titles'},[
						E('th',{'class':'th'},_('Index')), E('th',{'class':'th'},_('State')), E('th',{'class':'th'},_('Type')),
						E('th',{'class':'th'},_('Original Flow')), E('th',{'class':'th'},_('New Flow')), E('th',{'class':'th'},_('Ethernet'))
					])
				].concat(renderPpeRows(entries))))
			])
		]);

		poll.add(L.bind(function() {
			return loadStatusData().then(L.bind(function(d) {
				injectCSS();
				var st=d[0]||{}, ppe=d[1]||{}, ti=d[2]||{}, fe=d[3]||{}, vo=d[4]||{}, po=d[5]||{}, flo=d[6]||{}, ao=d[7]||{};
				st = addPpeStats(st, ppe);

				updateFreqBar(st.cpu_cur_freq||st.cpu_hw_freq,st.cpu_min_freq,st.cpu_max_freq,st.pll_freq_mhz,st.cpu_governor);
				var gs=document.getElementById('cpu-governor-select'); if(gs&&!gs.matches(':focus')) gs.value=st.cpu_governor||'';
				var fs=document.getElementById('cpu-maxfreq-select'); if(fs&&!fs.matches(':focus')) fs.value=(st.cpu_max_freq||0).toString();
				function _updateOffload(selectId, badgeId, state) {
					var on = isEnabled(state && state.enabled);
					var el = document.getElementById(selectId);
					if (el && !el.matches(':focus')) el.checked = on;
					var b = document.getElementById(badgeId);
					if (b) { b.className = 'offload-badge ' + (on ? 'offload-on' : 'offload-off'); b.textContent = on ? _('Enabled') : _('Disabled'); }
				}
				_updateOffload('vlan-offload-select', 'vlan-offload-badge', vo);
				_updateOffload('pppoe-offload-select', 'pppoe-offload-badge', po);
				_updateOffload('flow-offload-select', 'flow-offload-badge', flo);
				_updateOffload('apmode-offload-select', 'apmode-offload-badge', ao);

				var se=document.getElementById('npu-status'), ns=npuState(st,ti);
				if(se){se.innerHTML='';var sp=document.createElement('span');sp.className=ns.className;sp.textContent=ns.text+(st.npu_device?' ('+st.npu_device+')':'');se.appendChild(sp);}

				var fc=document.getElementById('fe-container'); if(fc){fc.innerHTML='';fc.appendChild(renderFeDiagram(fe, ti, st));}

			},this));
		},this), 10);

		refreshPpeData();
		poll.add(refreshPpeData, 30);

		return view;
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
