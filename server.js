const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuração dos caminhos (mesma lógica do vite.config.js)
const BASE_PATH = "W:/PRD/MAINTENANCE/ENGENHARIA MANUTENÇÃO E CONFIABILIDADE/01 - ENG.CONFIABILIDADE/96 - OEE/Portal OEE";

// ============================================================
// Sincronização automática dos dados de Análise de Falhas
// ============================================================
const PS_32BIT = 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe';
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

let syncStatus = { running: false, lastRun: null, lastError: null, results: {} };

function runSyncScript(scriptName) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_DIR, scriptName);
        if (!fs.existsSync(scriptPath)) {
            return reject(new Error(`Script não encontrado: ${scriptPath}`));
        }

        console.log(`[SYNC] Executando ${scriptName}...`);
        const startTime = Date.now();

        execFile(PS_32BIT, ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            cwd: __dirname,
            timeout: 300000 // 5 minutos
        }, (error, stdout, stderr) => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            if (error) {
                console.error(`[SYNC] ERRO em ${scriptName} (${elapsed}s):`, error.message);
                reject(error);
            } else {
                console.log(`[SYNC] ${scriptName} concluído em ${elapsed}s`);
                if (stdout) console.log(stdout.trim());
                resolve({ script: scriptName, elapsed, success: true });
            }
        });
    });
}

async function syncAllData() {
    if (syncStatus.running) {
        console.log('[SYNC] Sincronização já em andamento, ignorando...');
        return { skipped: true };
    }

    syncStatus.running = true;
    syncStatus.lastError = null;
    console.log('[SYNC] ===== Iniciando sincronização de dados =====');

    const results = {};
    const scripts = ['sync_af_data.ps1', 'sync_af_acoes.ps1', 'sync_tbm_data.ps1'];

    for (const script of scripts) {
        try {
            results[script] = await runSyncScript(script);
        } catch (err) {
            results[script] = { script, success: false, error: err.message };
            syncStatus.lastError = err.message;
        }
    }

    // Após sincronizar, copiar os JSONs atualizados para dist/ se existir
    const publicDir = path.join(__dirname, 'public');
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
        for (const file of ['af_data.json', 'af_acoes.json', 'tbm_data.json']) {
            const src = path.join(publicDir, file);
            const dest = path.join(distDir, file);
            if (fs.existsSync(src)) {
                try {
                    fs.copyFileSync(src, dest);
                    console.log(`[SYNC] Copiado ${file} para dist/`);
                } catch (e) {
                    console.error(`[SYNC] Erro ao copiar ${file} para dist/:`, e.message);
                }
            }
        }
    }

    syncStatus.running = false;
    syncStatus.lastRun = new Date().toISOString();
    syncStatus.results = results;

    console.log('[SYNC] ===== Sincronização finalizada =====');
    return results;
}

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// API: Carregar arquivos de rede (OEE)
app.get('/api/load-network-files', (req, res) => {
    try {
        const filesToLoad = [
            { key: 'stop', path: path.join(BASE_PATH, 'Apontamento_Parada.xlsx') },
            { key: 'prod_25', path: "W:/PRD/REPORTS/Daily Production Report/Meses Anteriores/Anos anteriores/2025/Vitória Operation Summary 2025 (valor).xlsm" },
            { key: 'prod_26', path: "W:/PRD/REPORTS/Daily Production Report/Meses Anteriores/2026/Vitória Operation Summary 2026 (valor).xlsm" },
            { key: 'despacho', path: path.join(BASE_PATH, 'Totalizador_do_Despacho.xlsx') },
            { key: 'recebimento', path: path.join(BASE_PATH, 'Totalizador_do_Recebimento_da_BC_216.xlsx') }
        ];

        const results = {};

        for (const fileDef of filesToLoad) {
            const filePath = fileDef.path;
            if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                results[fileDef.key] = {
                    name: path.basename(filePath),
                    data: fileBuffer.toString('base64'),
                    size: fileBuffer.length
                };
            } else {
                console.warn(`File not found: ${filePath}`);
            }
        }

        res.json({ success: true, files: results });
    } catch (error) {
        console.error("Error accessing network files:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Disparar sincronização manual dos dados de Análise de Falhas
app.post('/api/sync-af-data', async (req, res) => {
    try {
        const results = await syncAllData();
        res.json({ success: true, results, syncStatus });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Status da última sincronização
app.get('/api/sync-status', (req, res) => {
    res.json({ success: true, ...syncStatus });
});

// Qualquer outra rota serve o index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Accessing network drive: ${BASE_PATH}`);

    // Sincronizar dados ao iniciar o servidor
    console.log('[SYNC] Sincronização automática ao iniciar...');
    syncAllData().then(() => {
        console.log('[SYNC] Sincronização inicial concluída.');
    }).catch(err => {
        console.error('[SYNC] Erro na sincronização inicial:', err.message);
    });

    // Agendar sincronização periódica (a cada 6 horas)
    setInterval(() => {
        console.log('[SYNC] Sincronização periódica agendada...');
        syncAllData().catch(err => {
            console.error('[SYNC] Erro na sincronização periódica:', err.message);
        });
    }, SYNC_INTERVAL_MS);

    console.log(`[SYNC] Próxima sincronização em ${SYNC_INTERVAL_MS / 3600000}h`);
});
