import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'

// Configuração
const BASE_PATH = "W:/PRD/MAINTENANCE/ENGENHARIA MANUTENÇÃO E CONFIABILIDADE/01 - ENG.CONFIABILIDADE/96 - OEE/Portal OEE";
const PS_32BIT = 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe';

// Função para executar script de sync
function runSyncScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const projectRoot = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
    const fullPath = path.join(projectRoot, 'scripts', scriptPath);

    if (!fs.existsSync(fullPath)) {
      return reject(new Error(`Script não encontrado: ${fullPath}`));
    }

    console.log(`[SYNC] Executando ${scriptPath}...`);
    const startTime = Date.now();

    execFile(PS_32BIT, ['-ExecutionPolicy', 'Bypass', '-File', fullPath], {
      cwd: projectRoot,
      timeout: 300000
    }, (error, stdout, stderr) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (error) {
        console.error(`[SYNC] ERRO em ${scriptPath} (${elapsed}s):`, error.message);
        reject(error);
      } else {
        console.log(`[SYNC] ${scriptPath} concluído em ${elapsed}s`);
        resolve({ script: scriptPath, elapsed, success: true });
      }
    });
  });
}

let syncRunning = false;

async function syncAllData() {
  if (syncRunning) return { skipped: true };
  syncRunning = true;
  console.log('[SYNC] ===== Iniciando sincronização =====');
  const results = {};
  for (const script of ['sync_af_data.ps1', 'sync_af_acoes.ps1', 'sync_tbm_data.ps1']) {
    try {
      results[script] = await runSyncScript(script);
    } catch (err) {
      results[script] = { script, success: false, error: err.message };
    }
  }
  syncRunning = false;
  console.log('[SYNC] ===== Sincronização finalizada =====');
  return results;
}

// Plugin customizado para carregar arquivos da rede
const networkLoaderPlugin = () => ({
  name: 'network-loader',
  configureServer(server) {
    // API: Carregar arquivos de rede (OEE)
    server.middlewares.use('/api/load-network-files', async (req, res) => {
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

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, files: results }));
      } catch (error) {
        console.error("Error accessing network files:", error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });

    // API: Sincronizar dados de Análise de Falhas (POST)
    server.middlewares.use('/api/sync-af-data', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const results = await syncAllData();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, results }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), networkLoaderPlugin()],
})
