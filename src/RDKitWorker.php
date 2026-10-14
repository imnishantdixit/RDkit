<?php

declare(strict_types=1);

namespace App;

class RDKitWorker
{
    private string $pythonBin;
    private string $workerScript;

    public function __construct()
    {
        // Detect python binary (pyenv or system)
        $pyenv = getenv('HOME') . '/.pyenv/versions/3.11.9/bin/python3';
        $this->pythonBin    = file_exists($pyenv) ? $pyenv : (trim(shell_exec('which python3') ?? '') ?: 'python3');
        $this->workerScript = dirname(__DIR__) . '/python/rdkit_worker.py';
    }

    /**
     * Call the Python RDKit worker with a JSON payload.
     * Returns decoded associative array.
     */
    public function call(array $payload): array
    {
        $input = json_encode($payload, JSON_THROW_ON_ERROR);

        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open(
            escapeshellcmd($this->pythonBin) . ' ' . escapeshellarg($this->workerScript),
            $descriptorSpec,
            $pipes
        );

        if (!is_resource($process)) {
            return ['error' => 'Could not start Python process'];
        }

        fwrite($pipes[0], $input);
        fclose($pipes[0]);

        $output = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        if (empty($output)) {
            return ['error' => 'No output from Python worker. ' . ($stderr ?: '')];
        }

        $result = json_decode($output, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'Invalid JSON from Python: ' . $output];
        }

        return $result;
    }

    public function analyze(string $smiles): array
    {
        return $this->call(['action' => 'analyze', 'smiles' => $smiles]);
    }

    public function similarity(string $smiles1, string $smiles2, string $fpType = 'Morgan'): array
    {
        return $this->call(['action' => 'similarity', 'smiles1' => $smiles1, 'smiles2' => $smiles2, 'fp_type' => $fpType]);
    }

    public function reaction(string $reactants, string $smarts): array
    {
        return $this->call(['action' => 'reaction', 'reactants' => $reactants, 'reaction_smarts' => $smarts]);
    }

    public function substructure(string $smiles, string $smarts): array
    {
        return $this->call(['action' => 'substructure', 'smiles' => $smiles, 'smarts' => $smarts]);
    }

    public function descriptors(string $smiles): array
    {
        return $this->call(['action' => 'descriptors', 'smiles' => $smiles]);
    }

    public function parseFile(string $filePath, string $ext): array
    {
        return $this->call(['action' => 'parse_file', 'filepath' => $filePath, 'ext' => $ext]);
    }

    public function generate3d(string $smiles): array
    {
        return $this->call(['action' => 'generate_3d', 'smiles' => $smiles]);
    }
}
