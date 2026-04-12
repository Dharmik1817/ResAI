const fs = require('fs');
const file = 'C:\\Users\\moksh\\.gemini\\antigravity\\scratch\\index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace CSS Theme
const oldTheme = /\/\* ═══════════════════════════════════════════════════\s*RESILIENTPATH AI — PROFESSIONAL REDESIGN[\s\S]*?:root \{([\s\S]*?)\}/;
const newTheme = `/* ═══════════════════════════════════════════════════
   RESILIENTPATH AI — FINTECH GLASSMORPHISM
═══════════════════════════════════════════════════ */
:root {
  --bg:       linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%);
  --surface:  rgba(255, 255, 255, 0.7);
  --surface2: rgba(255, 255, 255, 0.4);
  --border:   rgba(255, 255, 255, 0.5);
  --border2:  rgba(255, 255, 255, 0.8);
  --accent:   #0f172a;
  --accent2:  #1e293b;
  --danger:   #e11d48;
  --good:     #059669;
  --warn:     #d97706;
  --purple:   #7c3aed;
  --text:     #0f172a;
  --text2:    #334155;
  --text3:    #475569;
  --radius:   16px;
  --radius-sm:10px;
  --shadow:   0 10px 30px rgba(0,0,0,0.06);
  --accentbg: rgba(15, 23, 42, 0.05);
  --dangerbg: rgba(225, 29, 72, 0.08);
  --warnbg:   rgba(217, 119, 6, 0.08);
  --goodbg:   rgba(5, 150, 105, 0.08);
}`;
content = content.replace(oldTheme, newTheme);

// Also add glassmorphism backdrop blur to dash-section
content = content.replace(/\.dash-section\{([\s\S]*?)\}/, `.dash-section{
  background:var(--surface);border:1px solid var(--border);
  backdrop-filter: blur(12px);-webkit-backdrop-filter: blur(12px);
  border-radius:var(--radius);padding:16px;margin-bottom:12px;
  box-shadow:var(--shadow);
}`);
content = content.replace(/\.tab-bar \{([\s\S]*?)\}/, `.tab-bar {
  width:100%;display:flex;
  background:rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:20;
}`);
content = content.replace(/\.app-header \{([\s\S]*?)\}/, `.app-header {
  width:100%;
  background:rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px);
  border-bottom:1px solid var(--border);
  display:flex;flex-direction:column;align-items:center;
  padding:18px 20px 14px;
  position:relative;overflow:hidden;
}`);

content = content.replace(/body \{([\s\S]*?)\}/, `body {
  background: var(--bg);
  background-attachment: fixed;
  color:var(--text);
  font-family:'Rajdhani',sans-serif;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  overflow-x:hidden;
}`);

// 2. Remove Desktop Citizen Upload form
// The code looks like:
/*
        <!-- Citizen upload -->
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
          <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:1px;margin-bottom:10px">CITIZEN COMPLAINT UPLOAD</div>
...
          </div>
        </div>
*/
const citizenUploadRegex = /<!-- Citizen upload -->[\s\S]*?<div style="margin-top:12px;border-top:1px solid var\(--border\);padding-top:12px">[\s\S]*?CITIZEN COMPLAINT UPLOAD[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newCitizenQueue = `<!-- View Citizen Reports -->
        <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:1px;">CITIZEN COMPLAINTS QUEUE</div>
            <button class="btn btn-sm" onclick="showToast('Queue refreshed')">Refresh</button>
          </div>
          <div id="citizen-queue-list" style="max-height:150px;overflow-y:auto;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border);padding:10px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);text-align:center;">
             No pending citizen reports for verification at this time.
          </div>
        </div>
      </div>`;

content = content.replace(citizenUploadRegex, newCitizenQueue);

// 3. Rename "Vyapar Simulation Engine" to "Civic-Yield Simulator"
content = content.replace(/Vyapar Simulation Engine/g, "Civic-Yield Simulator");
content = content.replace(/<canvas id="vyaparChart"><\/canvas>/g, '<canvas id="civicYieldChart"></canvas>');

// 4. Implement collapsible text "progressive disclosure" functionality
// We can add a simple toggle JS function and apply it to dense blocks.
const toggleScript = `
  function toggleCollapsible(id) {
    const el = document.getElementById(id);
    if (el.style.display === 'none') {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }
`;
content = content.replace(/<script>/, "<script>\n" + toggleScript);

// Wrap Blockchain Dig Ledger rows in a collapsible div
const ledgerStart = `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);line-height:1.9">`;
const ledgerHeader = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer;" onclick="toggleCollapsible('dig-ledger-details')">
            <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--warn);letter-spacing:1px;">BLOCKCHAIN DIG LEDGER ▾</div>
          </div>
          <div id="dig-ledger-details" style="display:none;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);line-height:1.9">`;

content = content.replace(/<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var\(--warn\);letter-spacing:1px;margin-bottom:10px">BLOCKCHAIN DIG LEDGER<\/div>\s*<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var\(--text3\);line-height:1\.9">/, ledgerHeader);


// Wrap RHI Ward Scorecard demo data note in collapse or simplify header
// Actually, let's make the sub-headers collapsible in Predictive Risk Engine, AI Dispatch Engine.
content = content.replace(/<div class="dash-title">AI Dispatch Engine<\/div>\s*<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var\(--text3\);margin-top:2px">All signals auto-fetched &mdash; zero manual input<\/div>/, `<div class="dash-title" style="cursor:pointer" onclick="toggleCollapsible('dispatch-desc')">AI Dispatch Engine ▾</div>
            <div id="dispatch-desc" style="display:none;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);margin-top:2px">All signals auto-fetched &mdash; zero manual input</div>`);

content = content.replace(/<div class="dash-title">Predictive Risk Engine<\/div>\s*<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var\(--text3\);margin-top:2px">AI forecasts which roads will fail next &mdash; before they are reported<\/div>/, `<div class="dash-title" style="cursor:pointer" onclick="toggleCollapsible('predict-desc')">Predictive Risk Engine ▾</div>
            <div id="predict-desc" style="display:none;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);margin-top:2px">AI forecasts which roads will fail next &mdash; before they are reported</div>`);

content = content.replace(/<div class="dash-title">Civic-Yield Simulator<\/div>\s*<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var\(--text3\);margin-top:2px">Simulate Contractor A vs B economics over 36 months<\/div>/, `<div class="dash-title" style="cursor:pointer" onclick="toggleCollapsible('civic-desc')">Civic-Yield Simulator ▾</div>
            <div id="civic-desc" style="display:none;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);margin-top:2px">Simulate Contractor A vs B economics over 36 months</div>`);

// Make the dispatch results text slightly cleaner
content = content.replace(/<div class="priority-banner \$\{pClass\}">/g, '<div class="priority-banner ${pClass}" style="background:var(--surface2);">');

fs.writeFileSync(file, content);
console.log("Rewritten index.html");
