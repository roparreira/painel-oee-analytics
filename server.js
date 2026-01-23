const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuração dos caminhos (mesma lógica do vite.config.js)
const BASE_PATH = "W:/PRD/MAINTENANCE/ENGENHARIA MANUTENÇÃO E CONFIABILIDADE/01 - ENG.CONFIABILIDADE/96 - OEE/Portal OEE";

app.use(express.static(path.join(__dirname, 'dist')));

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

// Qualquer outra rota serve o index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Accessing network drive: ${BASE_PATH}`);
});
