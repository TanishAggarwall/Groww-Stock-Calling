$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$site = 'https://groww-stock-calling.vercel.app'

Write-Host 'Starting Stock Calling backend on this laptop...' -ForegroundColor Cyan
Write-Host 'Keep this window open while using the Vercel site.'
Write-Host 'Your database, phone integration, and Telegram worker stay on this laptop.'

try {
  $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/telegram/status' -TimeoutSec 2 -UseBasicParsing
  if ($response.StatusCode -eq 200) {
    Write-Host 'Backend is already running.' -ForegroundColor Green
    Start-Process $site
    return
  }
} catch { }

$backend = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','start') -WorkingDirectory $PSScriptRoot -PassThru -NoNewWindow
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 1
  if ($backend.HasExited) { throw "Backend exited with code $($backend.ExitCode)." }
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/telegram/status' -TimeoutSec 2 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
      Write-Host 'Backend ready. Opening the Vercel site...' -ForegroundColor Green
      Start-Process $site
      Wait-Process -Id $backend.Id
      return
    }
  } catch { }
}
throw 'Backend did not become ready within 30 seconds. Check the error above.'
