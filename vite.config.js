import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin customizado para carregar arquivos da rede
const networkLoaderPlugin = () => ({
  name: 'network-loader',
  configureServer(server) {
    server.middlewares.use('/api/load-network-files', async (req, res) => {
      try {
        const BASE_PATH = "W:/PRD/MAINTENANCE/ENGENHARIA MANUTENÇÃO E CONFIABILIDADE/01 - ENG.CONFIABILIDADE/96 - OEE/Portal OEE";

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
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), networkLoaderPlugin()],
})
