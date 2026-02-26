# ============================================================
# Script: sync_tbm_data.ps1
# Descrição: Exporta dados de TBM (Manutenção Baseada no Tempo) do Oracle/Maximo para JSON
# Uso: Execute este script para atualizar os dados do dashboard TBM
# IMPORTANTE: Executar como 32-bit se o driver Oracle for 32-bit
# ============================================================

# Configuração da conexão ODBC
$connectionString = "Driver={Oracle em OraClient12Home1_32bit};Dbq=maximo_prd;Uid=consulta_maximo;Pwd=m4x1m0;"

# Query SQL fornecida
$query = @"
select
  p.pmnum as MP,
  p.description as DESCRICAO_MP,
  p.status as STATUS_MP,
  p.crewid as EQUIPE,
  p.location as LOCAL_MP,
  p.frequency as FREQUENCIA,
  p.jpnum as PLANO,
  t.jptask as TAREFA_ID,
  t.description as DESCRICAO_TAREFA,
  t.sc_location as LOCAL_TAREFA,
  (case
    when jl.craft in ('LUBRIFICADOR','INSPETOR','MECÂNICO','OPERADOR','CK-MECM','TEC MECA','PW-MECM','LUBRI-SK','MQ-MECM','MQ-SLDM','TEC INSP', 'TEC INSP', 'INSP-SK', 'MEC-MS') then 'MECÂNICO'
    when jl.craft in ('SD-TECINST','CK-METR','TEC INST','CK-INST','PW-INST','MQ-INST', 'PW-ANALIT', 'PW-ANALI', 'SD-TECANAL') then 'INSTRUMENTISTA'
    when jl.craft in ('MQ-ELET','CK-ELET','TEC ELET','PW-ELET') then 'ELETRICISTA'
    when jl.craft in ('AUTOMA SUN') then 'TEC_AUTOMAÇÃO'
    else jl.craft
  end) as MAO_DE_OBRA,
  (jl.laborhrs * jl.quantity) as TOTAL_HORAS,
  p.nextdate as PROXIMO_VENCIMENTO
from
  maximo.pm p
  join maximo.jobplan j on j.jpnum = p.jpnum
  join maximo.joblabor jl on jl.jobplanid = j.jobplanid
  left join maximo.jobtask t on t.jpnum = j.jpnum and t.pluscjprevnum = j.PLUSCREVNUM and t.jptask = jl.jptask
where
  (p.frequency <> 0 and p.frequency <= 370) and
  p.crewid not in ('LIMP MOV MAT', 'REFRATARIO', 'SEG INSP')
"@

# Caminho de saída (pasta public do projeto React)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputPath = Join-Path (Split-Path -Parent $scriptPath) "public\tbm_data.json"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Sincronizando dados de TBM (Time Based Maintenance)" -ForegroundColor Cyan
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
    $command.CommandTimeout = 300  # 5 minutos
    
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
                # Tratar valores numéricos específicos se necessário, ou manter string e converter no frontend
                if ($column.ColumnName -eq "TOTAL_HORAS" -or $column.ColumnName -eq "FREQUENCIA") {
                    try { $obj[$column.ColumnName] = [double]$value } catch { $obj[$column.ColumnName] = $value.ToString() }
                }
                else {
                    $obj[$column.ColumnName] = $value.ToString()
                }
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
    exit 1
}
