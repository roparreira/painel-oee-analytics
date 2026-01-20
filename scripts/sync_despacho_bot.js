
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- Configuração ---
const URL = 'http://vtomes01:8080/#/totalizadorDespacho';
const TARGET_DIR = path.join(__dirname, '..', 'public');
const DOWNLOAD_DIR = path.join(__dirname, 'temp_downloads');
const FINAL_FILENAME = 'despacho_auto.xlsx';

// Garante que diretórios existem
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

(async () => {
    console.log('🤖 Iniciando Robô de Sincronização Despacho (Modo Debug)...');

    const browser = await puppeteer.launch({
        headless: false, // False para ver ao vivo
        defaultViewport: null,
        args: ['--start-maximized']
    });

    try {
        const page = await browser.newPage();

        // 1. Configurar Download
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: DOWNLOAD_DIR
        });

        // 2. Navegar
        console.log(`🌐 Navegando para: ${URL}`);
        await page.goto(URL, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000)); // Espera inicial carregamento

        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'step0_loaded.png') });

        // 3. Preencher Datas
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const formatDateBR = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const startDateStr = formatDateBR(startOfMonth);
        const endDateStr = formatDateBR(today);

        console.log(`📅 Tentando preencher datas: ${startDateStr} a ${endDateStr}`);

        await page.evaluate(async (start, end) => {
            const inputs = Array.from(document.querySelectorAll('input.el-input__inner'));
            if (inputs.length >= 2) {
                const triggerEvents = (el) => {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                };

                // Focar e digitar (mais robusto que apenas setar value)
                inputs[0].focus();
                inputs[0].value = start;
                triggerEvents(inputs[0]);

                await new Promise(r => setTimeout(r, 500));

                inputs[1].focus();
                inputs[1].value = end;
                triggerEvents(inputs[1]);
            } else {
                console.warn("⚠️ Inputs de data não encontrados (el-input__inner)");
            }
        }, startDateStr, endDateStr);

        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'step1_dates_filled.png') });

        // 4. Clicar em Buscar
        console.log('🔍 Clicando em Buscar...');
        const searchClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const searchBtn = buttons.find(b =>
                b.innerText.trim() === 'search' ||
                (b.className.includes('bg-primary') && b.className.includes('q-btn-round'))
            );

            if (searchBtn) {
                searchBtn.click();
                return true;
            }
            return false;
        });

        if (!searchClicked) console.error("❌ Botão Buscar não encontrado!");
        else await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'step2_search_clicked.png') });

        // 5. Esperar Resultados (Importante!)
        console.log('⏳ Aguardando processamento (10s)...');
        await new Promise(r => setTimeout(r, 10000));
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'step3_results_ready.png') });

        // 6. Clicar em Exportar
        console.log('💾 Clicando em Exportar (Excel)...');
        const exportClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const exportBtn = buttons.find(b => b.innerText.includes('EXPORTAR EXCEL'));
            if (exportBtn) {
                exportBtn.click();
                return true;
            }
            return false;
        });

        if (!exportClicked) console.error("❌ Botão EXPORTAR EXCEL não encontrado!");

        // 7. Aguardar Download
        console.log('⏳ Monitorando download por 60s...');
        let downloadedFile = null;
        for (let i = 0; i < 60; i++) {
            if (!fs.existsSync(DOWNLOAD_DIR)) break;
            const files = fs.readdirSync(DOWNLOAD_DIR);
            // Procura qualquer .xlsx que não seja temporário
            const found = files.find(f => f.endsWith('.xlsx') && !f.includes('crdownload'));

            if (found) {
                downloadedFile = path.join(DOWNLOAD_DIR, found);
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (downloadedFile) {
            console.log(`✅ Download detectado: ${downloadedFile}`);
            const targetPath = path.join(TARGET_DIR, FINAL_FILENAME);

            // Substituir arquivo antigo
            if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
            fs.renameSync(downloadedFile, targetPath);

            console.log(`🚀 SUCESSO! Arquivo salvo em: ${targetPath}`);
        } else {
            console.error('❌ Nenhum arquivo .xlsx baixado após 60 segundos.');
            await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'error_no_download.png') });
        }

    } catch (err) {
        console.error('❌ Erro Fatal:', err);
        if (browser) await (await browser.pages())[0].screenshot({ path: path.join(DOWNLOAD_DIR, 'error_fatal.png') });
    } finally {
        await browser.close();
        console.log(`\nℹ️ Verifique as capturas de tela na pasta: ${DOWNLOAD_DIR}`);
    }

})();
