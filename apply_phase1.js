const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

// 1. Add Tailwind CDN
if (!html.includes('tailwindcss.com')) {
    html = html.replace('</head>', '    <script src="https://cdn.tailwindcss.com"></script>\n</head>');
}

// 2. Change :root CSS variables for the light "government style" professional theme
const oldRoot = `:root {
  --bg:       #080b10;
  --surface:  #0d1117;
  --surface2: #131920;
  --border:   #1c2535;
  --border2:  #243044;
  --accent:   #0ea5e9;
  --accent2:  #38bdf8;
  --danger:   #ef4444;
  --good:     #22c55e;
  --warn:     #f59e0b;
  --purple:   #8b5cf6;
  --text:     #e2e8f0;
  --text2:    #94a3b8;
  --text3:    #475569;
  --radius:   10px;
  --radius-sm:6px;
  --shadow:   0 4px 24px rgba(0,0,0,0.4);
}`;

const newRoot = `:root {
  --bg:       #f8fafc;
  --surface:  #ffffff;
  --surface2: #f1f5f9;
  --border:   #e2e8f0;
  --border2:  #cbd5e1;
  --accent:   #0284c7;  /* Professional blue */
  --accent2:  #0369a1;
  --danger:   #dc2626;
  --good:     #16a34a;
  --warn:     #d97706;
  --purple:   #7c3aed;
  --text:     #0f172a;
  --text2:    #334155;
  --text3:    #475569;
  --radius:   10px;
  --radius-sm:6px;
  --shadow:   0 4px 20px rgba(0,0,0,0.05);
  --accentbg: #e0f2fe;
  --dangerbg: #fee2e2;
  --warnbg:   #fef3c7;
  --goodbg:   #dcfce7;
}`;

html = html.replace(oldRoot, newRoot);

// 3. Remove the subtle grid overlay (dark theme feature) to make it cleaner
html = html.replace(`body::before {
  content:'';
  position:fixed;inset:0;
  background-image:
    linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px);
  background-size:40px 40px;
  pointer-events:none;z-index:0;
}`, '');

// 4. Update the header styling to use Tailwind classes and a light color scheme
html = html.replace(/class="app-header"/g, 'class="app-header bg-white border-b border-slate-200"');
html = html.replace(/background:linear-gradient\(135deg,var\(--surface\) 0%,#0a1020 100%\);/g, 'background: white;');

// Update logo text to professional dark blue
html = html.replace(/background:linear-gradient\(90deg,#0ea5e9 0%,#e2e8f0 45%,#0ea5e9 100%\);/g, 'background:linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%);');

// 5. Update Mapbox tile URL (to use regular street view rather than dark satellite by default for the dashboard)
// Wait, the client uses OSM/Mapbox. I'll leave the verification map alone since it's satellite verified.

fs.writeFileSync('index.html', html);
console.log('Successfully updated index.html for Phase 1');
