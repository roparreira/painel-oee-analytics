# ============================================================
# Script: sync_af_acoes.ps1
# Descrição: Exporta dados de Ações (RCFA) do Oracle/Maximo para JSON
# Uso: Execute este script para atualizar os dados de ações do dashboard
# IMPORTANTE: Executar com PowerShell 32-bit
# ============================================================

# Configuração da conexão ODBC
$connectionString = "Driver={Oracle em OraClient12Home1_32bit};Dbq=maximo_prd;Uid=consulta_maximo;Pwd=m4x1m0;"

# Query SQL (com filtro LIKE para evitar problemas de encoding)
$query = @"
SELECT
  PROBLEM.TICKETID AS RCFA,
  PROBLEM.STATUS AS STATUS_RCFA,
  PROBLEM.PLUSGINVESTLEAD AS LIDER_RCFA,
  PROBLEM.DESCRIPTION AS DESCRICAO_RCFA,
  PROBLEM.REPORTDATE AS OCORRENCIA,
  PROBLEM.LOCATION AS LOCAL,
  RELATEDRECORD.RECORDKEY AS ACAO,
  PLUSGACT.PLUSGACTIONTYPE AS TIPO_ACAO,
  PLUSGACT.DESCRIPTION AS DESCRICAO_ACAO,
  PLUSGACT.STATUS AS STATUS_ACAO,
  PLUSGACT.REPORTDATE AS DIGITADO_EM,
  PLUSGACT.ACTFINISH AS CONCLUSAO_REAL,
  PLUSGACT.OWNER AS RESPONSAVEL,
  PLUSGACT.TARGCOMPDATE AS PRAZO,
  PLUSGACT.SC_EXTENDDATE AS PRAZO_EXTENDIDO,
  (SELECT MAX(WS.CHANGEDATE) FROM MAXIMO.WOSTATUS WS WHERE WS.WONUM = RELATEDRECORD.RECORDKEY AND WS.STATUS IN ('COMP', 'FECHAR')) AS DATA_STATUS_ACAO
FROM
  MAXIMO.PROBLEM
  FULL JOIN MAXIMO.RELATEDRECORD ON PROBLEM.TICKETID = RELATEDRECORD.RELATEDRECKEY
  FULL JOIN MAXIMO.PLUSGACT ON PLUSGACT.WONUM = RELATEDRECORD.RECORDKEY
WHERE
  PROBLEM.CLASS LIKE 'INVESTIGA%' AND
  PROBLEM.REPORTDATE >= TO_DATE('2014-01-01', 'YYYY-MM-DD') AND
  PLUSGACT.STATUS != 'CANCEL' AND
  PROBLEM.STATUS != 'CANCEL'
"@

# Caminho de saída (pasta public do projeto React)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputPath = Join-Path (Split-Path -Parent $scriptPath) "public\af_acoes.json"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Sincronizando dados de Ações (RCFA)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Conectando ao Oracle via ODBC..." -ForegroundColor Yellow

try {
    # Carregar assembly System.Data
    Add-Type -AssemblyName System.Data
    
    # Criar conexão ODBC
    $connection = New-Object System.Data.Odbc.OdbcConnection($connectionString)
    $connection.Open()
    
    Write-Host "Conexão estabelecida!" -ForegroundColor Green
    Write-Host "Executando query..." -ForegroundColor Yellow
    
    # Executar query
    $command = $connection.CreateCommand()
    $command.CommandText = $query
    $command.CommandTimeout = 180  # 3 minutos (query mais pesada)
    
    $adapter = New-Object System.Data.Odbc.OdbcDataAdapter($command)
    $dataTable = New-Object System.Data.DataTable
    $adapter.Fill($dataTable) | Out-Null
    
    Write-Host "Query executada! $($dataTable.Rows.Count) registros encontrados." -ForegroundColor Green
    
    # Converter para array de objetos
    $results = @()
    
    foreach ($row in $dataTable.Rows) {
        $obj = @{}
        
        foreach ($column in $dataTable.Columns) {
            $value = $row[$column.ColumnName]
            
            if ($value -is [DBNull]) {
                $obj[$column.ColumnName] = $null
            }
            elseif ($value -is [datetime]) {
                $obj[$column.ColumnName] = $value.ToString("yyyy-MM-dd")
            }
            else {
                $obj[$column.ColumnName] = $value.ToString()
            }
        }
        
        # Adicionar campos calculados
        if ($obj["OCORRENCIA"]) {
            try {
                $date = [datetime]::Parse($obj["OCORRENCIA"])
                $obj["MES"] = $date.Month
                $obj["ANO"] = $date.Year
            }
            catch {
                $obj["MES"] = $null
                $obj["ANO"] = $null
            }
        }
        
        # Calcular STATUS_CALCULADO baseado na fórmula do Excel
        # Se PRAZO_EXTENDIDO vazio:
        #   Se DATA_STATUS_ACAO preenchido (finalizado):
        #     Se DATA_STATUS_ACAO > PRAZO → "Finalizado Atrasado"
        #     Senão → "Finalizado"
        #   Senão (não finalizado):
        #     Se PRAZO >= HOJE → "No Prazo"
        #     Senão → "Atrasado"
        # Se PRAZO_EXTENDIDO preenchido:
        #   Se DATA_STATUS_ACAO preenchido (finalizado):
        #     Se DATA_STATUS_ACAO > PRAZO_EXTENDIDO → "Finalizado Atrasado"
        #     Senão → "Finalizado"
        #   Senão (não finalizado):
        #     Se PRAZO_EXTENDIDO >= HOJE → "No Prazo"
        #     Senão → "Atrasado"
        
        $hoje = Get-Date
        $statusCalculado = "N/A"
        $atrasada = $false
        $diasAtraso = 0
        
        try {
            $prazo = if ($obj["PRAZO"]) { [datetime]::Parse($obj["PRAZO"]) } else { $null }
            $prazoExtendido = if ($obj["PRAZO_EXTENDIDO"]) { [datetime]::Parse($obj["PRAZO_EXTENDIDO"]) } else { $null }
            $dataStatusAcao = if ($obj["DATA_STATUS_ACAO"]) { [datetime]::Parse($obj["DATA_STATUS_ACAO"]) } else { $null }
            
            # Determinar qual prazo usar (estendido tem prioridade se existir)
            $prazoEfetivo = if ($prazoExtendido) { $prazoExtendido } else { $prazo }
            
            if ($prazoEfetivo) {
                if ($dataStatusAcao) {
                    # Ação finalizada
                    if ($dataStatusAcao -gt $prazoEfetivo) {
                        $statusCalculado = "Finalizado Atrasado"
                    }
                    else {
                        $statusCalculado = "Finalizado"
                    }
                }
                else {
                    # Ação não finalizada
                    if ($prazoEfetivo -ge $hoje) {
                        $statusCalculado = "No Prazo"
                    }
                    else {
                        $statusCalculado = "Atrasado"
                        $atrasada = $true
                        $diasAtraso = [math]::Floor(($hoje - $prazoEfetivo).TotalDays)
                    }
                }
            }
        }
        catch {
            $statusCalculado = "N/A"
        }
        
        $obj["STATUS_CALCULADO"] = $statusCalculado
        $obj["ATRASADA"] = $atrasada
        $obj["DIAS_ATRASO"] = $diasAtraso
        
        $results += $obj
    }
    
    # Fechar conexão
    $connection.Close()
    
    # Criar objeto de saída com metadados
    $output = @{
        lastUpdated  = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        totalRecords = $results.Count
        data         = $results
    }
    
    # Exportar para JSON
    $jsonContent = $output | ConvertTo-Json -Depth 10 -Compress:$false
    
    # Garantir que a pasta existe
    $outputDir = Split-Path -Parent $outputPath
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    # Salvar arquivo (UTF8 sem BOM)
    [System.IO.File]::WriteAllText($outputPath, $jsonContent, [System.Text.UTF8Encoding]::new($false))
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host " Exportação concluída com sucesso!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Arquivo: $outputPath"
    Write-Host "Registros: $($results.Count)"
    Write-Host "Atualizado em: $((Get-Date).ToString('dd/MM/yyyy HH:mm:ss'))"
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host " ERRO durante a sincronização" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
