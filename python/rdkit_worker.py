#!/usr/bin/env python3
"""
RDKit Worker — called by PHP via proc_open.
Reads JSON from stdin, writes JSON to stdout.
"""

import sys
import json
import base64
import re
import warnings
import logging

# Suppress RDKit deprecation warnings to keep stdout clean
warnings.filterwarnings("ignore")
logging.getLogger("rdkit").setLevel(logging.ERROR)

def analyze(smiles: str) -> dict:
    from rdkit import Chem
    from rdkit.Chem import Descriptors, Draw, rdMolDescriptors, AllChem, QED
    from rdkit.Chem.Draw import rdMolDraw2D
    from rdkit.Contrib.SA_Score import sascorer
    from rdkit.Chem.Scaffolds import MurckoScaffold
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": "Invalid SMILES string"}

    # 2D SVG
    drawer = rdMolDraw2D.MolDraw2DSVG(400, 300)
    drawer.drawOptions().addStereoAnnotation = True
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()

    # Descriptors
    mw           = round(Descriptors.MolWt(mol), 2)
    exact_mw     = round(Descriptors.ExactMolWt(mol), 4)
    logp         = round(Descriptors.MolLogP(mol), 2)
    hbd          = int(Descriptors.NumHDonors(mol))
    hba          = int(Descriptors.NumHAcceptors(mol))
    tpsa         = round(Descriptors.TPSA(mol), 2)
    rotbonds     = int(Descriptors.NumRotatableBonds(mol))
    rings        = int(Descriptors.RingCount(mol))
    aromatic_r   = int(rdMolDescriptors.CalcNumAromaticRings(mol))
    heavy_atoms  = int(mol.GetNumHeavyAtoms())
    formula      = rdMolDescriptors.CalcMolFormula(mol)
    canonical    = Chem.MolToSmiles(mol)
    inchi        = Chem.inchi.MolToInchi(mol) or ""
    inchikey     = Chem.inchi.InchiToInchiKey(inchi) if inchi else ""
    fsp3         = round(Descriptors.FractionCSP3(mol), 3)
    num_stereo   = int(len(Chem.FindMolChiralCenters(mol, includeUnassigned=True)))
    molar_refrac = round(Descriptors.MolMR(mol), 2)

    # Lipinski Ro5
    lipinski = {
        "mw_ok":   mw <= 500,
        "logp_ok": logp <= 5,
        "hbd_ok":  hbd <= 5,
        "hba_ok":  hba <= 10,
        "pass":    (mw <= 500 and logp <= 5 and hbd <= 5 and hba <= 10)
    }

    # Veber rules (oral bioavailability)
    veber = {
        "rotbonds_ok": rotbonds <= 10,
        "tpsa_ok":     tpsa <= 140,
        "pass":        (rotbonds <= 10 and tpsa <= 140)
    }

    # Morgan fingerprint (radius=2, 2048 bits) — first 64 bits as hex
    fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)
    fp_bits = list(fp.GetOnBits())[:20]  # first 20 set bits for display

    # QED (quantitative estimate of drug-likeness)
    try:
        qed = round(float(QED.qed(mol)), 4)
    except Exception:
        qed = None

    # Synthetic accessibility score (lower is easier)
    try:
        sa_score = round(float(sascorer.calculateScore(mol)), 3)
    except Exception:
        sa_score = None

    # Murcko scaffold
    scaffold_smiles = None
    scaffold_svg = None
    try:
        scaffold_smiles = MurckoScaffold.MurckoScaffoldSmiles(mol=mol)
        if scaffold_smiles:
            smol = Chem.MolFromSmiles(scaffold_smiles)
            if smol is not None:
                sd = rdMolDraw2D.MolDraw2DSVG(300, 220)
                sd.DrawMolecule(smol)
                sd.FinishDrawing()
                scaffold_svg = sd.GetDrawingText()
    except Exception:
        scaffold_smiles = None
        scaffold_svg = None

    return {
        "svg":          svg,
        "canonical":    canonical,
        "formula":      formula,
        "inchi":        inchi,
        "inchikey":     inchikey,
        "mw":           mw,
        "exact_mw":     exact_mw,
        "logp":         logp,
        "hbd":          hbd,
        "hba":          hba,
        "tpsa":         tpsa,
        "rotbonds":     rotbonds,
        "rings":        rings,
        "aromatic_rings": aromatic_r,
        "heavy_atoms":  heavy_atoms,
        "fsp3":         fsp3,
        "stereo_centers": num_stereo,
        "molar_refractivity": molar_refrac,
        "lipinski":     lipinski,
        "veber":        veber,
        "fp_bits":      fp_bits,
        "qed":          qed,
        "sa_score":     sa_score,
        "murcko_scaffold": scaffold_smiles,
        "scaffold_svg": scaffold_svg,
    }


def similarity(smiles1: str, smiles2: str, fp_type: str = "Morgan") -> dict:
    from rdkit import Chem, DataStructs
    from rdkit.Chem import AllChem, MACCSkeys
    from rdkit.Chem.AtomPairs import Pairs, Torsions
    from rdkit.Chem.Draw import rdMolDraw2D

    mol1 = Chem.MolFromSmiles(smiles1)
    mol2 = Chem.MolFromSmiles(smiles2)

    if mol1 is None:
        return {"error": "Invalid first SMILES"}
    if mol2 is None:
        return {"error": "Invalid second SMILES"}

    fp_type = (fp_type or "Morgan").strip()

    def get_fp(mol):
        if fp_type == "MACCS":
            return MACCSkeys.GenMACCSKeys(mol)
        if fp_type == "AtomPair":
            return Pairs.GetAtomPairFingerprintAsBitVect(mol)
        if fp_type == "Torsion":
            return Torsions.GetHashedTopologicalTorsionFingerprint(mol, 2048)
        if fp_type == "RDKit":
            return Chem.RDKFingerprint(mol)
        # default Morgan
        return AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)

    try:
        fp1 = get_fp(mol1)
        fp2 = get_fp(mol2)
        tanimoto = round(float(DataStructs.TanimotoSimilarity(fp1, fp2)), 4)
        dice     = round(float(DataStructs.DiceSimilarity(fp1, fp2)), 4)
    except Exception as e:
        return {"error": f"Fingerprint error ({fp_type}): {e}"}

    def svg(mol):
        d = rdMolDraw2D.MolDraw2DSVG(280, 200)
        d.DrawMolecule(mol)
        d.FinishDrawing()
        return d.GetDrawingText()

    return {
        "tanimoto":   tanimoto,
        "dice":       dice,
        "svg1":       svg(mol1),
        "svg2":       svg(mol2),
        "canonical1": Chem.MolToSmiles(mol1),
        "canonical2": Chem.MolToSmiles(mol2),
        "fp_type":    fp_type,
    }


def substructure(mol_smiles: str, pattern_smarts: str) -> dict:
    from rdkit import Chem
    from rdkit.Chem.Draw import rdMolDraw2D

    mol     = Chem.MolFromSmiles(mol_smiles)
    pattern = Chem.MolFromSmarts(pattern_smarts)

    if mol is None:
        return {"error": "Invalid molecule SMILES"}
    if pattern is None:
        return {"error": "Invalid SMARTS pattern"}

    matches = mol.GetSubstructMatches(pattern)
    match_atoms = list(matches[0]) if matches else []
    match_bonds = []
    if match_atoms:
        for bond in mol.GetBonds():
            if bond.GetBeginAtomIdx() in match_atoms and bond.GetEndAtomIdx() in match_atoms:
                match_bonds.append(bond.GetIdx())

    drawer = rdMolDraw2D.MolDraw2DSVG(400, 300)
    drawer.DrawMolecule(
        mol,
        highlightAtoms=match_atoms,
        highlightBonds=match_bonds
    )
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()

    return {
        "match":       bool(matches),
        "match_count": len(matches),
        "match_atoms": match_atoms,
        "svg":         svg,
    }


def descriptors(smiles: str) -> dict:
    from rdkit import Chem
    from rdkit.Chem import Descriptors

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": "Invalid SMILES"}

    result = {}
    for name, fn in Descriptors.descList:
        try:
            val = fn(mol)
            result[name] = round(float(val), 4) if val is not None else None
        except Exception:
            result[name] = None
    return {"descriptors": result}


def parse_file(filepath: str, ext: str) -> dict:
    from rdkit import Chem

    mols = []
    if ext in ('sdf', 'mol'):
        supplier = Chem.SDMolSupplier(filepath, removeHs=True)
        for mol in supplier:
            if mol is not None:
                mols.append(Chem.MolToSmiles(mol))
    
    if not mols:
        return {"error": "No valid molecules found in file"}
    
    if len(mols) == 1:
        return {"smiles": mols[0]}
    
    return {"smiles_list": mols[:50]}


def generate_3d(smiles: str) -> dict:
    """Generate a 3D conformer using ETKDGv3 + MMFF94 and return as SDF string."""
    from rdkit import Chem
    from rdkit.Chem import AllChem, rdMolDescriptors

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": "Invalid SMILES string"}

    mol_h = Chem.AddHs(mol)   # add hydrogens for proper 3D

    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    result = AllChem.EmbedMolecule(mol_h, params)

    if result == -1:
        # Fallback: try without ETKDGv3
        result = AllChem.EmbedMolecule(mol_h, AllChem.ETKDG())
    if result == -1:
        return {"error": "Could not generate 3D conformer for this molecule"}

    # Optimize with MMFF94 force field
    try:
        ff_result = AllChem.MMFFOptimizeMolecule(mol_h, maxIters=2000)
    except Exception:
        ff_result = -1  # optimization failed but geometry still usable

    # Return SDF string (includes Hs for better 3D render)
    sdf = Chem.MolToMolBlock(mol_h)

    return {
        "sdf":        sdf,
        "optimized":  ff_result == 0,
        "num_atoms":  mol_h.GetNumAtoms(),
        "num_heavy":  mol.GetNumHeavyAtoms(),
        "formula":    rdMolDescriptors.CalcMolFormula(mol),
    }


def reaction(reactants: str, reaction_smarts: str) -> dict:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    from rdkit.Chem.Draw import rdMolDraw2D

    rsmarts = (reaction_smarts or "").strip()
    if not rsmarts:
        return {"error": "Reaction SMARTS is required"}

    rxn = AllChem.ReactionFromSmarts(rsmarts)
    if rxn is None:
        return {"error": "Invalid reaction SMARTS"}

    parts = [p for p in re.split(r"[,\s]+", (reactants or "").strip()) if p]
    if not parts:
        return {"error": "Reactant SMILES is required"}

    mols = []
    for p in parts:
        m = Chem.MolFromSmiles(p)
        if m is None:
            return {"error": f"Invalid reactant SMILES: {p}"}
        mols.append(m)

    try:
        product_sets = rxn.RunReactants(tuple(mols))
    except Exception as e:
        return {"error": f"Reaction failed: {e}"}

    # Draw reactants
    def svg_mol(m):
        d = rdMolDraw2D.MolDraw2DSVG(260, 180)
        d.DrawMolecule(m)
        d.FinishDrawing()
        return d.GetDrawingText()

    reactant_svg = None
    try:
        # combined molecule for display
        combined = Chem.CombineMols(*mols) if len(mols) > 1 else mols[0]
        reactant_svg = svg_mol(combined)
    except Exception:
        reactant_svg = svg_mol(mols[0])

    products = []
    seen = set()
    for combo in product_sets:
        for m in combo:
            try:
                Chem.SanitizeMol(m)
            except Exception:
                pass
            try:
                smi = Chem.MolToSmiles(m)
            except Exception:
                continue
            if smi in seen:
                continue
            seen.add(smi)
            try:
                psvg = svg_mol(m)
            except Exception:
                psvg = ""
            products.append({"smiles": smi, "svg": psvg})

    if not products:
        return {"error": "No products generated (reaction may not apply)"}

    return {
        "reactant_svg": reactant_svg,
        "products": products,
        "reactant_smiles": [Chem.MolToSmiles(m) for m in mols],
        "num_products": len(products),
    }


if __name__ == "__main__":
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        action = payload.get("action", "analyze")

        if action == "analyze":
            result = analyze(payload["smiles"])
        elif action == "similarity":
            result = similarity(payload["smiles1"], payload["smiles2"], payload.get("fp_type", "Morgan"))
        elif action == "substructure":
            result = substructure(payload["smiles"], payload["smarts"])
        elif action == "descriptors":
            result = descriptors(payload["smiles"])
        elif action == "parse_file":
            result = parse_file(payload["filepath"], payload.get("ext", "sdf"))
        elif action == "generate_3d":
            result = generate_3d(payload["smiles"])
        elif action == "reaction":
            result = reaction(payload.get("reactants", ""), payload.get("reaction_smarts", ""))
        else:
            result = {"error": f"Unknown action: {action}"}

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
