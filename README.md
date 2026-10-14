# RDKit Cheminformatics Lab

A local web interface for cheminformatics powered by **RDKit**, built with **PHP 8** and Python.

## Features

| Feature | Description |
|---|---|
| 🔬 Molecule Viewer | 2D structure rendering from SMILES |
| 📊 Property Calculator | MW, LogP, TPSA, HBD, HBA, RotBonds, Fsp³, stereocenters and more |
| 💊 Lipinski Ro5 | Drug-likeness filter with pass/fail for each rule |
| 🔗 Similarity | Tanimoto + Dice similarity between two molecules (Morgan fingerprints) |
| 🔍 Substructure | SMARTS pattern search with atom highlighting |
| 📋 Descriptors | Full table of 200+ RDKit molecular descriptors |

## Quick Start

```bash
cd /home/nishant-dixit/rdkit
bash start.sh
```

Then open **http://localhost:8000** in your browser.

## Project Structure

```
rdkit/
├── public/
│   ├── index.php       # Main web UI
│   ├── api.php         # JSON API (analyze, similarity, substructure, descriptors)
│   ├── css/style.css   # Flat design stylesheet
│   └── js/app.js       # Frontend JavaScript
├── src/
│   └── RDKitWorker.php # PHP ↔ Python bridge
├── python/
│   └── rdkit_worker.py # Python RDKit computation script
├── vendor/             # Composer packages
├── composer.json
├── start.sh            # Startup script
└── README.md
```

## API Reference

All endpoints in `public/api.php` accept POST with form data.

| Action | Parameters | Returns |
|---|---|---|
| `health` | — | `{status, php, timestamp}` |
| `analyze` | `smiles` | `{svg, mw, logp, tpsa, hbd, hba, rotbonds, lipinski, veber, ...}` |
| `similarity` | `smiles1, smiles2` | `{tanimoto, dice, svg1, svg2}` |
| `substructure` | `smiles, smarts` | `{match, match_count, match_atoms, svg}` |
| `descriptors` | `smiles` | `{descriptors: {name: value, ...}}` |

## Example SMILES

| Molecule | SMILES |
|---|---|
| Aspirin | `CC(=O)OC1=CC=CC=C1C(=O)O` |
| Caffeine | `CN1C=NC2=C1C(=O)N(C(=O)N2C)C` |
| Ibuprofen | `CC(C)Cc1ccc(cc1)C(C)C(=O)O` |
| Paracetamol | `CC(=O)Nc1ccc(O)cc1` |
| Dopamine | `NCCc1ccc(O)c(O)c1` |
| Benzene | `c1ccccc1` |

## Requirements

- PHP 8.1+
- Python 3.9+
- RDKit (`pip install rdkit`)
- Composer (`ankane/rdkit`)
