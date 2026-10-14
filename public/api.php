<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\RDKitWorker;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Parse action from GET or POST
$action = $_GET['action'] ?? $_POST['action'] ?? 'health';

// Parse JSON body fallback
$rawBody = file_get_contents('php://input');
if (!empty($rawBody) && empty($_POST)) {
    $jsonBody = json_decode($rawBody, true) ?? [];
    $_POST    = array_merge($_POST, $jsonBody);
}

$rdkit = new RDKitWorker();

try {
    switch ($action) {

        // ── Health check ──────────────────────────────
        case 'health':
            echo json_encode([
                'status'    => 'ok',
                'php'       => PHP_VERSION,
                'timestamp' => date('c'),
            ]);
            break;

        // ── Analyze SMILES ────────────────────────────
        case 'analyze':
            $smiles = trim($_POST['smiles'] ?? '');
            if (empty($smiles)) {
                http_response_code(400);
                echo json_encode(['error' => 'smiles parameter is required']);
                break;
            }
            echo json_encode($rdkit->analyze($smiles));
            break;

        // ── Tanimoto Similarity ───────────────────────
        case 'similarity':
            $s1 = trim($_POST['smiles1'] ?? '');
            $s2 = trim($_POST['smiles2'] ?? '');
            $fp = trim($_POST['fp_type'] ?? 'Morgan') ?: 'Morgan';
            if (empty($s1) || empty($s2)) {
                http_response_code(400);
                echo json_encode(['error' => 'smiles1 and smiles2 are required']);
                break;
            }
            echo json_encode($rdkit->similarity($s1, $s2, $fp));
            break;

        // ── Reaction SMARTS ───────────────────────────
        case 'reaction':
            $reactants = trim($_POST['reactants'] ?? '');
            $smarts    = trim($_POST['reaction_smarts'] ?? '');
            if (empty($reactants) || empty($smarts)) {
                http_response_code(400);
                echo json_encode(['error' => 'reactants and reaction_smarts are required']);
                break;
            }
            echo json_encode($rdkit->reaction($reactants, $smarts));
            break;

        // ── Substructure Search ───────────────────────
        case 'substructure':
            $smiles = trim($_POST['smiles'] ?? '');
            $smarts = trim($_POST['smarts'] ?? '');
            if (empty($smiles) || empty($smarts)) {
                http_response_code(400);
                echo json_encode(['error' => 'smiles and smarts are required']);
                break;
            }
            echo json_encode($rdkit->substructure($smiles, $smarts));
            break;

        // ── Full descriptor table ─────────────────────
        case 'descriptors':
            $smiles = trim($_POST['smiles'] ?? '');
            if (empty($smiles)) {
                http_response_code(400);
                echo json_encode(['error' => 'smiles parameter is required']);
                break;
            }
            echo json_encode($rdkit->descriptors($smiles));
            break;

        // ── Generate 3D coordinates ───────────────────
        case 'generate_3d':
            $smiles = trim($_POST['smiles'] ?? '');
            if (empty($smiles)) {
                http_response_code(400);
                echo json_encode(['error' => 'smiles parameter is required']);
                break;
            }
            echo json_encode($rdkit->generate3d($smiles));
            break;

        // ── Parse uploaded file ───────────────────────
        case 'parse_file':
            $filename = trim($_POST['filename'] ?? 'file.sdf');
            $ext      = strtolower(trim($_POST['ext'] ?? pathinfo($filename, PATHINFO_EXTENSION)));
            $b64      = trim($_POST['content_b64'] ?? '');

            // Validate
            if (empty($b64)) {
                http_response_code(400);
                echo json_encode(['error' => 'No file content received (content_b64 is empty)']);
                break;
            }

            $content = base64_decode($b64, strict: false);
            if ($content === false || strlen($content) === 0) {
                echo json_encode(['error' => 'Failed to decode file content']);
                break;
            }

            if (in_array($ext, ['smi', 'smiles', 'txt'])) {
                // Plain SMILES file
                $lines = array_values(array_filter(
                    array_map(fn($l) => strtok(trim($l), " \t"),
                    explode("\n", $content)),
                    fn($l) => !empty($l) && $l[0] !== '#'
                ));
                if (empty($lines)) {
                    echo json_encode(['error' => 'No valid SMILES found in file']);
                    break;
                }
                echo json_encode(count($lines) === 1
                    ? ['smiles'      => $lines[0]]
                    : ['smiles_list' => array_slice($lines, 0, 50)]
                );
                break;
            }

            if (in_array($ext, ['sdf', 'mol'])) {
                // Write to temp file, parse with Python, then delete
                $tmpPath = tempnam(sys_get_temp_dir(), 'rdkit_') . '.' . $ext;
                file_put_contents($tmpPath, $content);
                $result = $rdkit->parseFile($tmpPath, $ext);
                if (file_exists($tmpPath)) unlink($tmpPath);
                echo json_encode($result);
                break;
            }

            echo json_encode(['error' => "Unsupported file type: .$ext"]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => "Unknown action: $action"]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
