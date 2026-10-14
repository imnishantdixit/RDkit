<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RDKit Lab — Cheminformatics</title>
  <meta name="description" content="Analyze molecular structures, compute physicochemical properties, check drug-likeness and find molecular similarities using RDKit.">
  <link rel="stylesheet" href="css/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚗️</text></svg>">
  <!-- 3Dmol.js for interactive 3D molecular visualization -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://3dmol.org/build/3Dmol-min.js"></script>
</head>
<body>

<!-- ═══════════════ 3D VIEWER MODAL ═══════════════ -->
<div id="viewer-modal" style="
  display:none;position:fixed;inset:0;z-index:1000;
  background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);
  align-items:center;justify-content:center;padding:20px;
">
  <div style="
    background:var(--bg-2);border:1px solid var(--border-2);
    border-radius:14px;width:100%;max-width:820px;
    display:flex;flex-direction:column;overflow:hidden;
    box-shadow:0 24px 80px rgba(0,0,0,.6);
  ">
    <!-- Modal header -->
    <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border)">
      <span style="font-size:.9rem;font-weight:700;color:var(--t1)">⚛️ 3D Molecular Viewer</span>
      <span id="mol3d-title" style="font-size:.78rem;color:var(--t2);font-family:var(--mono)"></span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
        <!-- Style picker -->
        <div style="display:flex;background:var(--bg-3);border:1px solid var(--border);border-radius:6px;padding:2px;gap:2px" id="style-btns">
          <button class="style-btn active-style" data-style="stick"    title="Stick">🔗 Stick</button>
          <button class="style-btn"              data-style="ballstick" title="Ball & Stick">⚽ Ball+Stick</button>
          <button class="style-btn"              data-style="sphere"   title="CPK Spheres">🔵 Sphere</button>
          <button class="style-btn"              data-style="line"     title="Wire">〰 Line</button>
          <button class="style-btn"              data-style="surface"  title="Molecular surface">🫧 Surface</button>
        </div>
        <!-- Spin toggle -->
        <button id="spin-toggle" title="Toggle auto-spin" style="
          background:var(--bg-3);border:1px solid var(--border);
          border-radius:6px;padding:4px 10px;color:var(--t2);
          font-size:.75rem;cursor:pointer;transition:all .18s;
        ">⟳ Spin</button>
        <!-- Background toggle -->
        <button id="bg-toggle" title="Toggle background" style="
          background:var(--bg-3);border:1px solid var(--border);
          border-radius:6px;padding:4px 10px;color:var(--t2);
          font-size:.75rem;cursor:pointer;transition:all .18s;
        ">◑ BG</button>
        <!-- Close -->
        <button onclick="close3DModal()" style="
          background:none;border:1px solid var(--border);border-radius:6px;
          padding:4px 10px;color:var(--t2);font-size:.8rem;cursor:pointer;
          transition:all .18s;
        ">✕ Close</button>
      </div>
    </div>
    <!-- Viewer container -->
    <div id="mol3d-container" style="width:100%;height:480px;position:relative;background:#1a1a2e">
      <div id="mol3d-loading" style="
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:12px;
        background:#1a1a2e;color:var(--t2);font-size:.85rem;z-index:10;
      ">
        <div class="spinner" style="width:28px;height:28px;border-width:3px"></div>
        <span>Generating 3D conformer…</span>
        <span style="font-size:.72rem;color:var(--t3)">RDKit ETKDGv3 + MMFF94 optimization</span>
      </div>
    </div>
    <!-- Modal footer / info -->
    <div style="padding:10px 18px;border-top:1px solid var(--border);display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span id="mol3d-info" style="font-size:.75rem;color:var(--t2)"></span>
      <span style="font-size:.72rem;color:var(--t3);margin-left:auto">Drag to rotate · Scroll to zoom · Right-drag to pan</span>
    </div>
  </div>
</div>

<!-- ═══════════════ TOP BAR ═══════════════ -->
<header class="topbar">
  <a class="logo" href="/">
    <div class="logo-box">Rd</div>
    <span class="logo-name">RDKit Lab</span>
  </a>
  <span class="logo-chip">Cheminformatics</span>
  <div class="topbar-spacer"></div>
  <nav class="topbar-nav">
    <a class="nav-link" href="https://www.rdkit.org/docs/" target="_blank" rel="noopener">
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
      Documentation
    </a>
    <a class="nav-link" href="https://github.com/rdkit/rdkit" target="_blank" rel="noopener">
      <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      GitHub
    </a>
  </nav>
  <span class="version-tag">RDKit 2026.9.1</span>
</header>

<!-- ═══════════════ HERO ═══════════════ -->
<section class="hero">
  <div class="hero-wrap">
    <h1>Molecular <span class="hi">Analysis</span> Lab</h1>
    <p>Enter a SMILES string to analyze molecular structure, compute physicochemical properties,<br>and check drug-likeness using RDKit.</p>

    <!-- File upload info bar -->
    <div class="upload-info" id="upload-info">
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3z"/></svg>
      <span>Loaded file: </span>
      <span class="upload-file-name" id="upload-file-name">—</span>
      <button class="upload-clear" id="upload-clear-btn" onclick="clearUpload()">✕ Clear</button>
    </div>

    <!-- SMILES input row -->
    <div class="input-row">
      <div class="smiles-wrap">
        <!-- flask icon -->
        <span class="smiles-icon">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 3h6m-3 0v7l4 9H8L4 10V3"/>
          </svg>
        </span>
        <input
          id="smiles-input"
          class="smiles-input"
          type="text"
          placeholder="e.g. CN1C=NC2=C1C(=O)N(C(=O)N2C)C"
          autocomplete="off"
          spellcheck="false"
          aria-label="SMILES string"
        >
        <button class="smiles-clear" id="smiles-clear" onclick="clearSmiles()" title="Clear">✕</button>
      </div>

      <!-- Upload button -->
      <button class="upload-btn" id="upload-trigger" onclick="document.getElementById('file-input').click()">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
        Upload File
      </button>
      <input type="file" id="file-input" accept=".sdf,.mol,.smi,.smiles,.txt" onchange="handleFileUpload(event)">

      <button class="btn-analyze" id="analyze-btn" onclick="runAnalyze()">
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
          <path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
        </svg>
        Analyze
      </button>
    </div>

    <!-- Quick load chips -->
    <div class="chips-row">
      <span class="chips-label">Quick load:</span>
      <span class="chip" data-smiles="CC(=O)OC1=CC=CC=C1C(=O)O">Aspirin</span>
      <span class="chip" data-smiles="CN1C=NC2=C1C(=O)N(C(=O)N2C)C">Caffeine</span>
      <span class="chip" data-smiles="CC(C)Cc1ccc(cc1)C(C)C(=O)O">Ibuprofen</span>
      <span class="chip" data-smiles="CC(=O)Nc1ccc(O)cc1">Paracetamol</span>
      <span class="chip" data-smiles="NCCc1ccc(O)c(O)c1">Dopamine</span>
      <span class="chip" data-smiles="c1ccccc1">Benzene</span>
    </div>

  </div>
</section>

<!-- ═══════════════ MAIN ═══════════════ -->
<main class="main-wrap">

  <!-- Empty state -->
  <div class="content-empty" id="empty-state">
    <div class="empty-ico">⚗️</div>
    <div class="empty-title">No molecule loaded</div>
    <div class="empty-sub">Enter a SMILES above, click a quick-load chip, or upload a .sdf / .mol file</div>
  </div>

  <!-- Results (hidden until analysis) -->
  <div id="results" style="display:none"></div>

  <hr class="divider">

  <!-- ─── TOOL TABS ─── -->
  <div class="tab-bar" role="tablist">
    <button class="tab-btn active" data-tab="similarity">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
      Similarity
    </button>
    <button class="tab-btn" data-tab="substructure">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      Substructure Search
    </button>
    <button class="tab-btn" data-tab="descriptors">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M10 3v18"/></svg>
      All Descriptors
    </button>
    <button class="tab-btn" data-tab="upload">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      Upload &amp; Batch
    </button>
    <button class="tab-btn" data-tab="reaction">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      Reaction
    </button>
  </div>

  <!-- ── Tab: Similarity ── -->
  <div class="tab-panel active" id="tab-similarity">
    <div class="card">
      <div class="card-head">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        <span class="card-title">Tanimoto Molecular Similarity</span>
      </div>
      <div style="padding:16px">
        <div class="sim-inputs">
          <div class="inp-group">
            <label class="inp-label" for="sim-s1">Molecule A (SMILES)</label>
            <input id="sim-s1" class="field" type="text" placeholder="e.g. CCO" spellcheck="false">
          </div>
          <div class="inp-group">
            <label class="inp-label" for="sim-s2">Molecule B (SMILES)</label>
            <input id="sim-s2" class="field" type="text" placeholder="e.g. CCCO" spellcheck="false">
          </div>
        </div>
        <div class="inp-group" style="margin-bottom:10px">
          <label class="inp-label" for="sim-fp">Fingerprint</label>
          <select id="sim-fp" class="field" style="width:100%">
            <option value="Morgan">Morgan (ECFP4)</option>
            <option value="MACCS">MACCS keys</option>
            <option value="AtomPair">Atom Pairs</option>
            <option value="Torsion">Topological Torsion</option>
            <option value="RDKit">RDKit fingerprint</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="sim-btn">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/></svg>
          Calculate Similarity
        </button>
        <div id="sim-out" style="margin-top:16px"></div>
      </div>
    </div>
  </div>

  <!-- ── Tab: Substructure ── -->
  <div class="tab-panel" id="tab-substructure">
    <div class="card">
      <div class="card-head">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <span class="card-title">SMARTS Substructure Search</span>
      </div>
      <div style="padding:16px">
        <div class="sub-inputs">
          <div class="inp-group">
            <label class="inp-label" for="sub-mol">Target Molecule (SMILES)</label>
            <input id="sub-mol" class="field" type="text" placeholder="e.g. CC(=O)OC1=CC=CC=C1C(=O)O" spellcheck="false">
          </div>
          <div class="inp-group">
            <label class="inp-label" for="sub-pat">SMARTS Pattern</label>
            <input id="sub-pat" class="field" type="text" placeholder="e.g. C(=O)O" spellcheck="false">
          </div>
        </div>
        <div class="smarts-chips">
          <span class="chips-label">Common:</span>
          <span class="chip" onclick="document.getElementById('sub-pat').value='C(=O)O'">Carboxylic acid</span>
          <span class="chip" onclick="document.getElementById('sub-pat').value='c1ccccc1'">Benzene</span>
          <span class="chip" onclick="document.getElementById('sub-pat').value='[OH]'">Hydroxyl</span>
          <span class="chip" onclick="document.getElementById('sub-pat').value='[NH2]'">Amine</span>
          <span class="chip" onclick="document.getElementById('sub-pat').value='C(=O)N'">Amide</span>
          <span class="chip" onclick="document.getElementById('sub-pat').value='[#6]1~[#6]~[#6]~[#6]~[#6]~[#6]1'">Any ring</span>
        </div>
        <button class="btn btn-primary btn-sm" id="sub-btn">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          Search
        </button>
        <div id="sub-out" style="margin-top:16px"></div>
      </div>
    </div>
  </div>

  <!-- ── Tab: Descriptors ── -->
  <div class="tab-panel" id="tab-descriptors">
    <div class="card">
      <div class="card-head">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M10 3v18"/></svg>
        <span class="card-title">Full Descriptor Table</span>
        <div class="card-head-right">
          <span class="badge badge-info" id="desc-cnt" style="font-family:var(--mono)">—</span>
        </div>
      </div>
      <div style="padding:16px">
        <div style="font-size:.78rem;color:var(--t2);margin-bottom:12px">
          200+ RDKit physicochemical and topological descriptors for the analyzed molecule.
        </div>
        <button class="btn btn-primary btn-sm" id="desc-btn" style="margin-bottom:14px">Load All Descriptors</button>
        <div class="desc-bar">
          <input id="desc-search" class="desc-search" type="text" placeholder="Filter descriptor name…">
          <span class="desc-count" id="desc-count-txt"></span>
        </div>
        <div class="desc-wrap">
          <table class="desc-table">
            <thead><tr><th>Descriptor</th><th style="text-align:right">Value</th></tr></thead>
            <tbody id="desc-tbody">
              <tr><td colspan="2" style="color:var(--t3);padding:20px;font-size:.8rem">Analyze a molecule first, then click "Load All Descriptors".</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Tab: Upload ── -->
  <div class="tab-panel" id="tab-upload">
    <div class="card">
      <div class="card-head">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        <span class="card-title">Upload Molecular File</span>
      </div>
      <div style="padding:20px">
        <div
          class="drop-zone"
          id="drop-zone"
          onclick="document.getElementById('file-input-tab').click()"
          ondragover="handleDragOver(event)"
          ondragleave="handleDragLeave(event)"
          ondrop="handleDrop(event)"
        >
          <div class="drop-ico">📂</div>
          <div class="drop-title">Drop a file here or click to browse</div>
          <div class="drop-sub">Supported formats:</div>
          <div class="accepted-types">
            <span class="type-pill">.sdf</span>
            <span class="type-pill">.mol</span>
            <span class="type-pill">.smi</span>
            <span class="type-pill">.smiles</span>
            <span class="type-pill">.txt</span>
          </div>
        </div>
        <!-- Sample files row -->
        <div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:.75rem;color:var(--t3)">Try sample files:</span>
          <a href="samples/molecules.sdf" download style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;background:var(--bg-3);border:1px solid var(--border-2);color:var(--t2);font-size:.75rem;text-decoration:none;transition:all .18s" onmouseover="this.style.color='var(--teal)';this.style.borderColor='var(--teal)'" onmouseout="this.style.color='var(--t2)';this.style.borderColor='var(--border-2)'">
            ⬇ molecules.sdf <span style="font-size:.65rem;color:var(--t3)">(5 drugs)</span>
          </a>
          <a href="samples/molecules.smi" download style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;background:var(--bg-3);border:1px solid var(--border-2);color:var(--t2);font-size:.75rem;text-decoration:none;transition:all .18s" onmouseover="this.style.color='var(--teal)';this.style.borderColor='var(--teal)'" onmouseout="this.style.color='var(--t2)';this.style.borderColor='var(--border-2)'">
            ⬇ molecules.smi <span style="font-size:.65rem;color:var(--t3)">(5 SMILES)</span>
          </a>
        </div>
        <input type="file" id="file-input-tab" accept=".sdf,.mol,.smi,.smiles,.txt" style="display:none" onchange="handleFileUpload(event)">
        <div id="upload-result" style="margin-top:16px"></div>
      </div>
    </div>
  </div>

  <!-- ── Tab: Reaction ── -->
  <div class="tab-panel" id="tab-reaction">
    <div class="card">
      <div class="card-head">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <span class="card-title">Reaction SMARTS</span>
      </div>
      <div style="padding:16px">
        <div class="inp-group" style="margin-bottom:10px">
          <label class="inp-label" for="rxn-reactants">Reactants (SMILES, separate multiple with comma/space)</label>
          <input id="rxn-reactants" class="field" type="text" placeholder="e.g. CC(=O)O" spellcheck="false">
        </div>
        <div class="inp-group" style="margin-bottom:10px">
          <label class="inp-label" for="rxn-smarts">Reaction SMARTS</label>
          <input id="rxn-smarts" class="field" type="text" placeholder="e.g. [C:1](=O)[OH:2]>>[C:1](=O)[Cl:2]" spellcheck="false">
        </div>
        <div class="smarts-chips" style="margin-bottom:10px">
          <span class="chips-label">Examples:</span>
          <span class="chip" onclick="document.getElementById('rxn-smarts').value='[C:1](=O)[OH:2]>>[C:1](=O)[Cl:2]'">Acid → Acyl chloride</span>
          <span class="chip" onclick="document.getElementById('rxn-smarts').value='[N:1][H]>>[N:1]C'">N-methylation</span>
        </div>
        <button class="btn btn-primary btn-sm" id="rxn-btn">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Run Reaction
        </button>
        <div id="rxn-out" style="margin-top:16px"></div>
      </div>
    </div>
  </div>

</main>

<!-- ═══════════════ FOOTER ═══════════════ -->
<footer class="footer">
  Powered by <a href="https://www.rdkit.org/" target="_blank" rel="noopener">RDKit</a> &mdash;
  Open-Source Cheminformatics &nbsp;|&nbsp;
  PHP <?= PHP_VERSION ?> &amp; Python &nbsp;|&nbsp;
  BSD License
</footer>

<div id="toast" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--bg-2);border:1px solid var(--border-2);color:var(--t1);padding:10px 18px;border-radius:8px;font-size:.82rem;opacity:0;pointer-events:none;transition:all .2s;z-index:2000;max-width:90vw;text-align:center"></div>
<script src="js/app.js"></script>
</body>
</html>
