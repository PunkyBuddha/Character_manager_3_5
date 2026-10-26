# Servidor HTTP Local para iPhone / Wi-Fi em PowerShell (TcpListener - 100% compativel)
param([int]$Port = 8080)

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Obter IP da rede local de forma robusta (com fallback para ipconfig)
$localIp = $null
try {
    $netIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { 
        $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1'
    } | Select-Object -First 1
    if ($netIp) { $localIp = $netIp.IPAddress }
} catch {}

if (-not $localIp) {
    try {
        $ipLines = ipconfig | Select-String 'IPv4' | Out-String
        $match = [regex]::Match($ipLines, '\b(?!127\.)(?!169\.254\.)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b')
        if ($match.Success) {
            $localIp = $match.Value
        }
    } catch {}
}

if (-not $localIp) {
    $localIp = "127.0.0.1"
}

$listener = $null
try {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
} catch {
    $Port = 8081
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
}

Clear-Host
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  COMPENDIO D&D 3.5 & MESTRE DAS MUITAS FORMAS - SERVIDOR IPHONE" -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Certifique-se de que seu iPhone esta no MESMO Wi-Fi que este computador." -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. No Safari do seu iPhone, digite exatamente este endereco:" -ForegroundColor White
Write-Host ""
Write-Host "     http://$($localIp):$Port/" -ForegroundColor Yellow -BackgroundColor DarkGreen
Write-Host ""
Write-Host "  3. DICA DE OURO PARA IPHONE (PWA):" -ForegroundColor Cyan
Write-Host "     No Safari, toque no botao de Compartilhar (icone de quadrado com seta para cima)" -ForegroundColor Gray
Write-Host "     e selecione 'Adicionar a Tela de Inicio'." -ForegroundColor Green
Write-Host "     O app ficara com icone proprio e rodara em TELA CHEIA, 100% offline!" -ForegroundColor Gray
Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  Servidor rodando na porta $Port... Pressione Ctrl+C nesta janela para parar." -ForegroundColor DarkGray
Write-Host ""

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $buffer = New-Object byte[] 8192
        $read = $stream.Read($buffer, 0, $buffer.Length)
        
        if ($read -le 0) {
            $client.Close()
            continue
        }
        
        $requestStr = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
        $firstLine = ($requestStr -split "`r?`n")[0]
        $parts = $firstLine -split '\s+'
        $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
        
        $pathOnly = ($rawPath -split '\?')[0]
        $urlPath = [System.Uri]::UnescapeDataString($pathOnly.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "index.html"
        }
        
        $urlPath = $urlPath -replace '\.\.', ''
        $filePath = Join-Path $appDir $urlPath
        
        if (Test-Path -Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $header = "HTTP/1.1 200 OK`r`n" +
                      "Content-Type: $mime`r`n" +
                      "Content-Length: $($bytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Service-Worker-Allowed: /`r`n" +
                      "Cache-Control: no-cache`r`n" +
                      "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Flush()
        } else {
            $body = "Arquivo nao encontrado"
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            $header = "HTTP/1.1 404 Not Found`r`n" +
                      "Content-Type: text/plain; charset=utf-8`r`n" +
                      "Content-Length: $($bodyBytes.Length)`r`n" +
                      "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            $stream.Flush()
        }
        $client.Close()
    } catch {
        # Ignorar erros normais de desconexao de cliente
    }
}
