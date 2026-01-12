# ============================================================
# Script: sync_af_data.ps1
# Descrição: Exporta dados de Análise de Falhas do Oracle/Maximo para JSON
# Uso: Execute este script para atualizar os dados do dashboard
# IMPORTANTE: Executar como 32-bit se o driver Oracle for 32-bit
# ============================================================

# Configuração da conexão ODBC
$connectionString = "Driver={Oracle em OraClient12Home1_32bit};Dbq=maximo_prd;Uid=consulta_maximo;Pwd=m4x1m0;"

# Query SQL (com filtro de classe usando LIKE para evitar problemas de encoding)
$query = @"
select
  P.ticketid as RCFA,
  P.status as STATUS_RCFA,
  P.plusginvestlead as LIDER,
  P.description as DESCRICAO_RCFA,
  P.reportdate as OCORRENCIA,
  P.sc_rcamethodology as METODOLOGIA,
  P.sc_rcatype as TIPO,
  P.sc_raclevel as NIVEL,
  P.location as LOCAL,
  p.SC_REVACTUALCOST as CUSTO
from
  maximo.problem P
where
  P.class LIKE 'INVESTIGA%' and
  P.reportdate >= TO_DATE('2014-01-01', 'YYYY-MM-DD') and
  P.status != 'CANCEL'
"@

# Caminho de saída (pasta public do projeto React)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputPath = Join-Path (Split-Path -Parent $scriptPath) "public\af_data.json"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Sincronizando dados de Análise de Falhas" -ForegroundColor Cyan
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
    $command.CommandTimeout = 120  # 2 minutos
    
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
        
        # Adicionar campos calculados (Mês e Ano)
        if ($obj["OCORRENCIA"]) {
            try {
                $date = [datetime]::Parse($obj["OCORRENCIA"])
                $obj["MES"] = $date.Month
                $obj["ANO"] = $date.Year
                $obj["MES_ANO"] = $date.ToString("yyyy-MM")
            }
            catch {
                $obj["MES"] = $null
                $obj["ANO"] = $null
                $obj["MES_ANO"] = $null
            }
        }
        
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
    Write-Host "Detalhes:" -ForegroundColor Yellow
    Write-Host $_.Exception.ToString() -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Se a VPN/rede está conectada"
    Write-Host "  2. Se as credenciais estão corretas"
    Write-Host "  3. Se o Oracle está acessível"
    Write-Host "  4. Execute com PowerShell 32-bit se necessário:"
    Write-Host "     C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe -File .\scripts\sync_af_data.ps1"
    Write-Host ""
    exit 1
}
