/* =================================================
   RDKit Lab — app.js (redesigned)
   ================================================= */

const API = 'api.php';

let currentSmiles   = '';
let descriptorCache = null;

// ── DOM shortcuts ─────────────────────────────────
const $ = id => document.getElementById(id);
const smilesInput = $('smiles-input');

// ── Tabs ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Quick-load chips ──────────────────────────────
document.querySelectorAll('.chip[data-smiles]').forEach(chip => {
  chip.addEventListener('click', () => {
    smilesInput.value = chip.dataset.smiles;
    clearUploadBar();
    runAnalyze();
  });
});

// ── Clear SMILES ──────────────────────────────────
window.clearSmiles = () => {
  smilesInput.value = '';
  smilesInput.focus();
};

// ── Keyboard: Enter to analyze ────────────────────
smilesInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') runAnalyze();
});

// ── ANALYZE ───────────────────────────────────────
async function runAnalyze() {
  const smiles = smilesInput.value.trim();
  if (!smiles) { smilesInput.focus(); return; }
  currentSmiles   = smiles;
  descriptorCache = null;

  const btn = $('analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Analyzing…';

  $('empty-state').style.display = 'none';
  const res = $('results');
  res.style.display = 'block';
  res.innerHTML = skeletonHTML();

  try {
    const fd = new FormData();
    fd.append('action', 'analyze');
    fd.append('smiles', smiles);
    const r = await fetch(API, { method: 'POST', body: fd });
    const data = await r.json();

    if (data.error) {
      res.innerHTML = errBox(data.error);
    } else {
      res.innerHTML = buildResults(data);
      res.querySelectorAll('.fade-up').forEach((el, i) => {
        el.style.animationDelay = i * 0.04 + 's';
      });
    }
  } catch (e) {
    res.innerHTML = errBox('Network error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
      <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
      <path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
    </svg> Analyze`;
  }
}
$('analyze-btn').addEventListener('click', runAnalyze);

// ── Build results HTML ────────────────────────────
function buildResults(d) {
  const lip = d.lipinski;
  const veb = d.veber;

  return `
  <div class="results-grid fade-up">

    <!-- LEFT COL -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Structure card -->
      <div class="card fade-up">
        <div class="card-head">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
          <span class="card-title">Molecular Structure</span>
          <div class="card-head-right">
            <div class="view-toggle">
              <button class="vtbtn active" id="vt-2d">2D</button>
              <button class="vtbtn" id="vt-3d" title="Open interactive 3D view">3D</button>
            </div>
          </div>
        </div>
        <div class="mol-display" id="mol-svg-wrap">
          ${d.svg}
        </div>
        <div class="mol-smiles-bar">
          <span class="mol-smiles-text" title="${esc(d.canonical)}">${esc(d.canonical)}</span>
          <button class="copy-btn" onclick="copyText('${esc(d.canonical)}',this)">
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
          </button>
        </div>
      </div>

      <!-- Identifiers card -->
      <div class="card fade-up">
        <div class="card-head">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3z"/></svg>
          <span class="card-title">Identifiers</span>
        </div>
        <div class="id-row"><span class="id-label">Formula</span><span class="id-value">${esc(d.formula)}</span></div>
        <div class="id-row"><span class="id-label">Exact Mass</span><span class="id-value">${d.exact_mw} Da</span></div>
        <div class="id-row"><span class="id-label">InChIKey</span><span class="id-value" style="font-size:.68rem">${esc(d.inchikey||'—')}</span></div>
         <div class="id-row"><span class="id-label">QED</span><span class="id-value">${d.qed ?? '—'}</span></div>
         <div class="id-row"><span class="id-label">SA Score</span><span class="id-value">${d.sa_score ?? '—'} <span style="font-size:.65rem;color:var(--t3)">(lower = easier)</span></span></div>
         <div class="id-row"><span class="id-label">Murcko Scaffold</span><span class="id-value" style="font-size:.68rem">${esc(d.murcko_scaffold||'—')}</span></div>
       </div>
       ${d.scaffold_svg ? `<div class="card fade-up">
         <div class="card-head"><span class="card-title">Murcko Scaffold</span></div>
         <div class="mol-display">${d.scaffold_svg}</div>
       </div>` : ''}
    </div>

    <!-- RIGHT COL -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Properties card -->
      <div class="card fade-up">
        <div class="props-head">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm1 3v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5H1z"/></svg>
          <span class="card-title" style="font-size:.82rem;font-weight:600;color:var(--t1)">Molecular Properties</span>
          <div class="unit-toggle">
            <button class="utbtn active">Da</button>
            <button class="utbtn">g/mol</button>
          </div>
        </div>
        <div class="prop-tiles">
          ${tile('⚖️','tile-blue',  d.mw,        'Da',  'Molecular Weight')}
          ${tile('🧪','tile-teal',  d.logp,       '',    'LogP')}
          ${tile('💧','tile-purple',d.tpsa,       'Å²',  'TPSA')}
          ${tile('🔵','tile-orange',d.hbd,        '',    'H-Bond Donors')}
          ${tile('🔷','tile-blue',  d.hba,        '',    'H-Bond Acceptors')}
          ${tile('🔄','tile-amber', d.rotbonds,   '',    'Rotatable Bonds')}
          ${tile('⬡','tile-green',  d.rings,      '',    'Rings')}
          ${tile('⬡','tile-teal',  d.aromatic_rings,'', 'Aromatic Rings')}
          ${tile('⚛️','tile-purple',d.heavy_atoms,'',    'Heavy Atoms')}
          ${tile('📐','tile-pink',  d.fsp3,       '',    'Fsp³')}
        </div>
      </div>

      <!-- Lipinski card -->
      <div class="card fade-up">
        <div class="card-head">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524z"/></svg>
          <span class="card-title">Lipinski Rule of Five</span>
        </div>
        <div class="lip-wrap">
          <table class="lip-table">
            <thead><tr><th>Rule</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Molecular Weight</td><td class="mono">${d.mw} Da</td><td>≤ 500</td><td>${bdg(lip.mw_ok)}</td></tr>
              <tr><td>LogP</td>            <td class="mono">${d.logp}</td>   <td>≤ 5</td>  <td>${bdg(lip.logp_ok)}</td></tr>
              <tr><td>H-Bond Donors</td>   <td class="mono">${d.hbd}</td>    <td>≤ 5</td>  <td>${bdg(lip.hbd_ok)}</td></tr>
              <tr><td>H-Bond Acceptors</td><td class="mono">${d.hba}</td>    <td>≤ 10</td> <td>${bdg(lip.hba_ok)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="lip-verdict ${lip.pass ? 'lip-pass' : 'lip-fail'}">
          <div class="lip-verdict-icon">${lip.pass ? '✓' : '✗'}</div>
          <div>
            <div class="lip-verdict-title">${lip.pass ? 'Passes Lipinski Ro5' : 'Fails Lipinski Ro5'}</div>
            <div class="lip-verdict-sub">
              Veber rules (oral bioavailability):
              <span class="lip-check"><span class="${veb.rotbonds_ok?'lip-check-ok':'lip-check-fail'}">${veb.rotbonds_ok?'✓':'✗'}</span> RotBonds</span>
              <span class="lip-check"><span class="${veb.tpsa_ok?'lip-check-ok':'lip-check-fail'}">${veb.tpsa_ok?'✓':'✗'}</span> TPSA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Prop tile builder ─────────────────────────────
function tile(icon, cls, val, unit, name) {
  return `<div class="prop-tile ${cls}">
    <div class="prop-tile-icon">${icon}</div>
    <div class="prop-tile-val">${val ?? '—'}<span class="prop-tile-unit">${unit}</span></div>
    <div class="prop-tile-name">${name}</div>
  </div>`;
}

// ── Similarity ────────────────────────────────────
$('sim-btn').addEventListener('click', async () => {
  const s1 = $('sim-s1').value.trim();
  const s2 = $('sim-s2').value.trim();
  const out = $('sim-out');
  if (!s1 || !s2) return;

  out.innerHTML = `<div class="skel" style="height:120px;border-radius:10px"></div>`;
  const data = await postAPI('similarity', { smiles1: s1, smiles2: s2, fp_type: $('sim-fp').value });

  if (data.error) { out.innerHTML = errBox(data.error); return; }

  const pct = Math.round(data.tanimoto * 100);
  const fillColor = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
  const label = pct >= 85 ? '🔵 Very similar'
              : pct >= 70 ? '🟢 High similarity'
              : pct >= 40 ? '🟡 Moderate'
              : '🔴 Low similarity';

  out.innerHTML = `
    <div class="sim-result-grid fade-up">
      <div class="sim-scores">
        <div class="sim-score-card">
          <div class="sim-val" style="color:${fillColor}">${data.tanimoto.toFixed(4)}</div>
          <div class="sim-name">Tanimoto</div>
          <div class="progress-bg"><div class="progress-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        </div>
        <div class="sim-score-card">
          <div class="sim-val" style="color:var(--purple)">${data.dice.toFixed(4)}</div>
          <div class="sim-name">Dice</div>
        </div>
        <div class="sim-score-card" style="min-width:0;text-align:left;padding:12px 14px">
          <div style="font-size:.75rem;color:var(--t2);margin-bottom:4px">Interpretation</div>
          <div style="font-size:.85rem;font-weight:600">${label}</div>
          <div style="font-size:.72rem;color:var(--t3);margin-top:4px">${esc(data.fp_type || 'Morgan')} fingerprint</div>
        </div>
      </div>
      <div class="sim-mols">
        <div class="sim-mol-card">
          <div class="sim-mol-label">Molecule A</div>
          ${data.svg1}
          <div class="sim-mol-smiles">${esc(data.canonical1)}</div>
        </div>
        <div class="sim-mol-card">
          <div class="sim-mol-label">Molecule B</div>
          ${data.svg2}
          <div class="sim-mol-smiles">${esc(data.canonical2)}</div>
        </div>
      </div>
    </div>`;
});

// ── Substructure ──────────────────────────────────
$('sub-btn').addEventListener('click', async () => {
  const smiles = $('sub-mol').value.trim();
  const smarts = $('sub-pat').value.trim();
  const out    = $('sub-out');
  if (!smiles || !smarts) return;

  out.innerHTML = `<div class="skel" style="height:100px;border-radius:10px"></div>`;
  const data = await postAPI('substructure', { smiles, smarts });

  if (data.error) { out.innerHTML = errBox(data.error); return; }

  out.innerHTML = `
    <div class="fade-up">
      <div class="match-banner ${data.match ? 'match-yes' : 'match-no'}">
        ${data.match ? '✓' : '✗'}
        ${data.match
          ? `Match found &mdash; <strong>${data.match_count}</strong> occurrence(s). Matching atoms: ${data.match_atoms.join(', ')}`
          : 'No match &mdash; pattern not found in molecule.'}
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Highlighted Structure</span></div>
        <div class="mol-display">${data.svg}</div>
      </div>
    </div>`;
});

// ── Descriptors ───────────────────────────────────
$('desc-btn').addEventListener('click', async () => {
  const smiles = currentSmiles || smilesInput.value.trim();
  if (!smiles) { alert('Analyze a molecule first.'); return; }

  const tbody = $('desc-tbody');
  const cnt   = $('desc-cnt');
  const cntTxt = $('desc-count-txt');

  if (descriptorCache) { renderDesc(descriptorCache, tbody, cnt, cntTxt); return; }

  tbody.innerHTML = `<tr><td colspan="2"><div class="skel" style="height:12px;margin:8px 0;border-radius:4px"></div><div class="skel" style="height:12px;width:60%;border-radius:4px"></div></td></tr>`;

  const data = await postAPI('descriptors', { smiles });
  if (data.error) { tbody.innerHTML = `<tr><td colspan="2">${errBox(data.error)}</td></tr>`; return; }

  descriptorCache = data.descriptors;
  renderDesc(descriptorCache, tbody, cnt, cntTxt);
});

function renderDesc(descs, tbody, cnt, cntTxt) {
  const entries = Object.entries(descs).filter(([,v]) => v !== null);
  cnt.textContent    = entries.length;
  cntTxt.textContent = entries.length + ' descriptors';
  tbody.innerHTML    = entries.map(([k,v]) =>
    `<tr><td>${esc(k)}</td><td>${typeof v === 'number' ? v.toFixed(4) : v}</td></tr>`
  ).join('');
}

$('desc-search').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll('#desc-tbody tr').forEach(row => {
    row.style.display = (row.cells[0]?.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
});

// ── File Upload ───────────────────────────────────
window.handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  processFile(file);
};

async function processFile(file) {
  const name = file.name;
  const ext  = name.split('.').pop().toLowerCase();

  // Show upload info bar
  $('upload-info').classList.add('show');
  $('upload-file-name').textContent = name;

  // ── Plain SMILES / SMI / TXT — parse entirely in browser ──
  if (['smi', 'smiles', 'txt'].includes(ext)) {
    const text  = await file.text();
    const lines = text.split('\n')
      .map(l => l.trim().split(/\s+/)[0])       // first token per line
      .filter(l => l && !l.startsWith('#'));     // skip blanks & comments

    if (lines.length === 0) {
      showTabUpload();
      $('upload-result').innerHTML = errBox('No valid SMILES lines found in file.');
      return;
    }
    if (lines.length === 1) {
      smilesInput.value = lines[0];
      runAnalyze();
      return;
    }
    // Multiple SMILES — batch table
    showBatchResults(lines.slice(0, 50), name);
    return;
  }

  // ── SDF / MOL — send as base64 to avoid PHP $_FILES issues ──
  if (['sdf', 'mol'].includes(ext)) {
    showTabUpload();
    const uploadOut = $('upload-result');
    uploadOut.innerHTML = `<div class="skel" style="height:60px;border-radius:8px"></div>`;

    try {
      // Read as base64
      const buf   = await file.arrayBuffer();
      const b64   = btoa(String.fromCharCode(...new Uint8Array(buf)));

      const fd = new FormData();
      fd.append('action',   'parse_file');
      fd.append('content_b64', b64);
      fd.append('filename', name);
      fd.append('ext',      ext);

      const r    = await fetch(API, { method: 'POST', body: fd });
      const data = await r.json();

      if (data.error) { uploadOut.innerHTML = errBox(data.error); return; }

      if (data.smiles_list && data.smiles_list.length > 0) {
        showBatchResults(data.smiles_list, name);
      } else if (data.smiles) {
        uploadOut.innerHTML = `<div class="match-banner match-yes">✓ Parsed <strong>${esc(name)}</strong> — loading analysis…</div>`;
        smilesInput.value   = data.smiles;
        // Small delay so user sees the success banner, then scroll up & analyze
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          runAnalyze();
        }, 600);
      } else {
        uploadOut.innerHTML = errBox('No valid molecules found in file.');
      }
    } catch(e) {
      $('upload-result').innerHTML = errBox('Parse error: ' + e.message);
    }
    return;
  }

  // Unsupported
  showTabUpload();
  $('upload-result').innerHTML = errBox(`Unsupported file type: .${ext}. Use .sdf, .mol, .smi, .smiles or .txt`);
}

function showTabUpload() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="upload"]').classList.add('active');
  $('tab-upload').classList.add('active');
}

function showBatchResults(lines, filename) {
  const uploadOut = $('upload-result');

  // switch to upload tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="upload"]').classList.add('active');
  $('tab-upload').classList.add('active');

  uploadOut.innerHTML = `
    <div class="fade-up">
      <div class="match-banner match-yes" style="margin-bottom:12px">
        ✓ Loaded <strong>${esc(filename)}</strong> — ${lines.length} molecule(s) found.
        Click any row to analyze it.
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Molecules in file</span><span class="badge badge-info" style="margin-left:auto">${lines.length}</span></div>
        <div style="overflow-x:auto;max-height:360px;overflow-y:auto">
          <table class="desc-table">
            <thead><tr><th>#</th><th>SMILES</th><th></th></tr></thead>
            <tbody>
              ${lines.map((s,i) => `
                <tr>
                  <td style="color:var(--t3);width:40px">${i+1}</td>
                  <td style="font-family:var(--mono);font-size:.75rem">${esc(s)}</td>
                  <td style="width:80px">
                    <button class="btn btn-primary btn-sm batch-analyze-btn" data-smiles="${esc(s)}">
                      Analyze
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// Batch analyze buttons — event delegation (handles dynamically rendered rows)
document.addEventListener('click', e => {
  const btn = e.target.closest('.batch-analyze-btn');
  if (!btn) return;
  const smiles = btn.dataset.smiles;
  if (!smiles) return;
  smilesInput.value = smiles;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  runAnalyze();
});

// Upload bar clear
window.clearUpload = () => {
  clearUploadBar();
  $('file-input').value    = '';
  $('file-input-tab').value = '';
};
function clearUploadBar() {
  $('upload-info').classList.remove('show');
  $('upload-file-name').textContent = '—';
}

// Drag & drop
window.handleDragOver = (e) => {
  e.preventDefault();
  $('drop-zone').classList.add('drag-over');
};
window.handleDragLeave = () => {
  $('drop-zone').classList.remove('drag-over');
};
window.handleDrop = (e) => {
  e.preventDefault();
  $('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files?.[0];
  if (file) processFile(file);
};

// ── Helpers ───────────────────────────────────────
async function postAPI(action, body) {
  const fd = new FormData();
  fd.append('action', action);
  for (const [k,v] of Object.entries(body)) fd.append(k, v);
  try {
    const r = await fetch(API, { method: 'POST', body: fd });
    return await r.json();
  } catch(e) {
    return { error: e.message };
  }
}

function skeletonHTML() {
  return `<div class="results-grid">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="skel" style="height:280px;border-radius:14px"></div>
      <div class="skel" style="height:100px;border-radius:14px"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="skel" style="height:220px;border-radius:14px"></div>
      <div class="skel" style="height:200px;border-radius:14px"></div>
    </div>
  </div>`;
}

function errBox(msg) {
  return `<div class="error-box">
    <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
    </svg>
    ${esc(msg)}
  </div>`;
}

function bdg(pass) {
  return pass
    ? '<span class="badge badge-pass">✓ Pass</span>'
    : '<span class="badge badge-fail">✗ Fail</span>';
}

window.copyText = (text, btn) => {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.textContent = '✓';
    setTimeout(() => { btn.innerHTML = orig; }, 1400);
  });
};

// ── Reaction ──────────────────────────────────────────
const _rxnBtn = $('rxn-btn');
if (_rxnBtn) {
  _rxnBtn.addEventListener('click', async () => {
    const reactants = $('rxn-reactants').value.trim();
    const smarts    = $('rxn-smarts').value.trim();
    const out       = $('rxn-out');
    if (!reactants || !smarts) return;
    out.innerHTML = `<div class="skel" style="height:120px;border-radius:10px"></div>`;
    const data = await postAPI('reaction', { reactants, reaction_smarts: smarts });
    if (data.error) { out.innerHTML = errBox(data.error); return; }
    out.innerHTML = `
      <div class="fade-up">
        <div class="sim-mols" style="margin-bottom:12px">
          <div class="sim-mol-card">
            <div class="sim-mol-label">Reactant(s)</div>
            ${data.reactant_svg || ''}
          </div>
          <div class="sim-mol-card">
            <div class="sim-mol-label">Products (${data.num_products})</div>
            ${data.products.map(p => p.svg).join('')}
          </div>
        </div>
        <div class="match-banner match-yes" style="margin-bottom:8px">
          ${data.products.map(p => `<code style="font-family:var(--mono)">${esc(p.smiles)}</code>`).join(' &nbsp;·&nbsp; ')}
        </div>
      </div>`;
  });
}

/* ── UX helpers ─────────────────────────────────────── */

let toastTimer = null;
window.showToast = function (msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 1800);
};

/* Enter to submit in secondary inputs */
function wireEnter(id, btnId) {
  const el = $(id), btn = btnId ? $(btnId) : null;
  if (!el) return;
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (btn) btn.click(); }
  });
}
wireEnter('sim-s1', 'sim-btn');
wireEnter('sim-s2', 'sim-btn');
wireEnter('rxn-reactants', 'rxn-btn');
wireEnter('rxn-smarts', 'rxn-btn');
wireEnter('sub-mol', 'sub-btn');
wireEnter('sub-pat', 'sub-btn');

// Override copyText to use toast
const _origCopy = window.copyText;
window.copyText = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) { const orig = btn.innerHTML; btn.textContent = '✓'; setTimeout(() => { btn.innerHTML = orig; }, 1400); }
    showToast('Copied to clipboard');
  }).catch(() => showToast('Copy failed'));
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   3D Molecular Viewer
   ============================================================ */

let mol3dViewer    = null;
let mol3dStyle     = 'stick';
let mol3dBgDark    = true;
let mol3dSpin      = false;
let mol3dLoadingEl = null;

function open3DModal(smiles) {
  const s = (smiles || currentSmiles || smilesInput.value || '').trim();
  if (!s) { alert('Analyze a molecule first.'); return; }

  const modal = $('viewer-modal');
  const title = $('mol3d-title');
  const info  = $('mol3d-info');
  const cont  = $('mol3d-container');
  if (!modal || !cont) return;

  current3DSmiles = s;
  mol3dSpin = false;
  const spinBtnEarly = $('spin-toggle');
  if (spinBtnEarly) { spinBtnEarly.style.background = 'var(--bg-3)'; spinBtnEarly.style.color = 'var(--t2)'; }
  title.textContent = s;
  info.textContent  = 'Generating 3D conformer…';
  cont.innerHTML    = `
    <div id="mol3d-loading" style="
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:12px;
      background:#1a1a2e;color:var(--t2);font-size:.85rem;z-index:10;
    ">
      <div class="spinner" style="width:28px;height:28px;border-width:3px"></div>
      <span>Generating 3D conformer…</span>
      <span style="font-size:.72rem;color:var(--t3)">RDKit ETKDGv3 + MMFF94 optimization</span>
    </div>`;
  modal.style.display = 'flex';
  renderMol3D(s);
}

async function renderMol3D(smiles) {
  const cont = $('mol3d-container');
  const info = $('mol3d-info');
  try {
    if (typeof $3Dmol === 'undefined') {
      throw new Error('3Dmol.js library failed to load. Check your network connection.');
    }
    const data = await postAPI('generate_3d', { smiles });
    if (data.error) throw new Error(data.error);

    // remove loading overlay
    cont.innerHTML = '';

    mol3dViewer = $3Dmol.createViewer(cont, {
      backgroundColor: mol3dBgDark ? '#1a1a2e' : '#ffffff',
      antialias: true,
    });
    mol3dViewer.addModel(data.sdf, 'sdf');
    applyMol3DStyle(mol3dViewer, mol3dStyle);
    mol3dViewer.zoomTo();
    mol3dViewer.render();

    if (info) {
      info.textContent = `${data.formula || ''} · ${data.num_heavy} heavy atoms · ${data.num_atoms} total (incl. H)${data.optimized ? ' · MMFF94 optimized' : ''}`;
    }
  } catch (e) {
    cont.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#ff6b6b;font-size:.85rem;padding:20px;text-align:center">
        <div style="font-size:1.6rem">⚠</div>
        <div>${esc(e.message || 'Failed to render 3D structure')}</div>
      </div>`;
    if (info) info.textContent = '3D render failed';
  }
}

function applyMol3DStyle(viewer, style) {
  if (!viewer) return;
  try { viewer.removeAllSurfaces(); } catch(_) {}
  switch (style) {
    case 'stick':
      viewer.setStyle({}, { stick: {} });
      break;
    case 'ballstick':
      viewer.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.32 } });
      break;
    case 'sphere':
      viewer.setStyle({}, { sphere: {} });
      break;
    case 'line':
      viewer.setStyle({}, { line: {} });
      break;
    case 'surface':
      viewer.setStyle({}, { stick: {} });
      try { viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.75, color: 'white' }); } catch(_) {}
      break;
    default:
      viewer.setStyle({}, { stick: {} });
  }
  viewer.render();
}

window.close3DModal = function() {
  const modal = $('viewer-modal');
  const cont  = $('mol3d-container');
  if (modal) modal.style.display = 'none';
  if (cont)  cont.innerHTML = '';
  mol3dSpin = false;
  const spinBtnClose = $('spin-toggle');
  if (spinBtnClose) { spinBtnClose.style.background = 'var(--bg-3)'; spinBtnClose.style.color = 'var(--t2)'; }
  if (mol3dViewer) {
    try { mol3dViewer.spin(false); } catch(_) {}
    try { mol3dViewer.clear(); } catch(_) {}
    mol3dViewer = null;
  }
  // reset toggle to 2D
  const btn2 = $('vt-2d'), btn3 = $('vt-3d');
  if (btn2) btn2.classList.add('active');
  if (btn3) btn3.classList.remove('active');
};

// style buttons
document.querySelectorAll('.style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active-style'));
    btn.classList.add('active-style');
    mol3dStyle = btn.dataset.style;
    if (mol3dViewer) applyMol3DStyle(mol3dViewer, mol3dStyle);
  });
});

// bg toggle
const bgToggle = $('bg-toggle');
if (bgToggle) {
  bgToggle.addEventListener('click', () => {
    mol3dBgDark = !mol3dBgDark;
    const cont = $('mol3d-container');
    cont.style.background = mol3dBgDark ? '#1a1a2e' : '#ffffff';
    if (mol3dViewer) {
      try { mol3dViewer.setBackgroundColor(mol3dBgDark ? '#1a1a2e' : '#ffffff'); } catch(_) {}
      mol3dViewer.render();
    }
  });
}

// spin toggle
const spinToggle = $('spin-toggle');
if (spinToggle) {
  spinToggle.addEventListener('click', () => {
    mol3dSpin = !mol3dSpin;
    spinToggle.style.background = mol3dSpin ? 'var(--blue)' : 'var(--bg-3)';
    spinToggle.style.color = mol3dSpin ? '#fff' : 'var(--t2)';
    if (mol3dViewer) {
      try { mol3dViewer.spin(mol3dSpin); } catch(_) {}
    }
  });
}

// ESC to close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const m = $('viewer-modal');
    if (m && m.style.display !== 'none') close3DModal();
  }
});

// Delegated clicks for 2D/3D toggle inside result cards
document.addEventListener('click', e => {
  const btn = e.target.closest('.vtbtn');
  if (!btn) return;
  const id = btn.id;
  if (id === 'vt-2d') {
    document.querySelectorAll('.vtbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    close3DModal();
  } else if (id === 'vt-3d') {
    document.querySelectorAll('.vtbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    open3DModal();
  }
});

let current3DSmiles = '';
