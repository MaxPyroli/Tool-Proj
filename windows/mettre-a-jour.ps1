# Tool Proj : télécharge la dernière version publiée sur GitHub, la range dans le dossier "site" à côté de ce fichier,
# puis la sert sur http://localhost:8088/ et ouvre le navigateur. Ctrl+C pour arrêter.
$ErrorActionPreference = 'Stop'
$repo   = 'MaxPyroli/Tool-Proj'
$branch = 'claude/app-project-tracker-0h71xn'
$port   = 8088
$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$site   = Join-Path $here 'site'
$url    = "http://localhost:$port/"

Write-Host "Téléchargement de la dernière version..." -ForegroundColor Cyan
$tmp = Join-Path $env:TEMP ('toolproj-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $zip = Join-Path $tmp 'src.zip'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$repo/zip/refs/heads/$branch" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $root = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1
  $src  = Join-Path $root.FullName 'public'
  if (-not (Test-Path $src)) { throw "Dossier 'public' introuvable dans le téléchargement." }
  if (-not (Test-Path $site)) { New-Item -ItemType Directory -Path $site | Out-Null }
  robocopy $src $site /MIR /NFL /NDL /NJH /NJS /NP | Out-Null   # (robocopy renvoie 1 quand il copie : c'est normal)
  $ver = (Select-String -Path (Join-Path $site 'app.js') -Pattern "APP_VERSION\s*=\s*'([^']+)'" | Select-Object -First 1).Matches.Groups[1].Value
  Write-Host "Version installée : $ver" -ForegroundColor Green
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

$types = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.webmanifest'='application/manifest+json'
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.ico'='image/x-icon'
  '.woff2'='font/woff2'; '.woff'='font/woff'; '.ttf'='font/ttf'; '.md'='text/plain; charset=utf-8'; '.txt'='text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try { $listener.Start() }
catch {
  Write-Host "Le serveur tourne déjà (ou le port $port est pris) : j'ouvre simplement le navigateur." -ForegroundColor Yellow
  Start-Process $url
  return
}
Write-Host "L'app tourne sur $url  (Ctrl+C pour arrêter)" -ForegroundColor Green
Start-Process $url

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      if ($path.StartsWith('/Tool-Proj/')) { $path = $path.Substring(10) }   # ancienne adresse du site
      if ($path.EndsWith('/')) { $path += 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $site $path.TrimStart('/')))
      if (-not $file.StartsWith($site) -or -not (Test-Path $file -PathType Leaf)) {
        $ctx.Response.StatusCode = 404
      } else {
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
        $bytes = [IO.File]::ReadAllBytes($file)
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch { try { $ctx.Response.StatusCode = 500 } catch {} }
    finally { try { $ctx.Response.Close() } catch {} }
  }
} finally { $listener.Stop() }
