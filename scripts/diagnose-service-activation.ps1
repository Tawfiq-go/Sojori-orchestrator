# Diagnose listing service-activation against deployed backend (frontend-only setup).
# Usage:
#   .\scripts\diagnose-service-activation.ps1 -ListingId 685aab22b19110002f9421e1
#   .\scripts\diagnose-service-activation.ps1 -ListingId 685aab22b19110002f9421e1 -Jwt "<access-token>" -Refresh "<refresh-token>"
# Optional: -Gateway https://dev.sojori.com

param(
  [Parameter(Mandatory = $true)]
  [string]$ListingId,
  [string]$Gateway = "https://dev.sojori.com",
  [string]$Jwt = "",
  [string]$Refresh = ""
)

$activationPath = "/api/v1/listing/listings/$ListingId/service-activation"
$effectivePath = "/api/v1/listing/listings/$ListingId/orchestration-effective"

function Test-Endpoint {
  param([string]$Label, [string]$Url, [hashtable]$Headers = @{})

  Write-Host ""
  Write-Host "=== $Label ===" -ForegroundColor Cyan
  Write-Host "GET $Url"

  $headerArgs = @()
  foreach ($k in $Headers.Keys) {
    if ($Headers[$k]) { $headerArgs += @("-H", "${k}: $($Headers[$k])") }
  }

  $raw = curl.exe -s -w "`n__HTTP_CODE__:%{http_code}" @headerArgs $Url 2>&1
  $lines = $raw -split "`n"
  $httpLine = $lines | Where-Object { $_ -match '^__HTTP_CODE__:' } | Select-Object -Last 1
  $code = if ($httpLine) { ($httpLine -replace '^__HTTP_CODE__:', '').Trim() } else { '???' }
  $body = ($lines | Where-Object { $_ -notmatch '^__HTTP_CODE__:' }) -join "`n"

  Write-Host "HTTP: $code"
  $preview = if ($body.Length -gt 500) { $body.Substring(0, 500) + "..." } else { $body }
  Write-Host "Body: $preview"

  if ($body -match 'Not Found\(App\)') {
    Write-Host "→ Route NOT registered on this gateway (srv-listing catch-all 404). Deploy srv-listing." -ForegroundColor Red
  } elseif ($body -match 'Listing not found|orchestration not migrated') {
    Write-Host "→ Route EXISTS — listing/orchestration issue on remote DB." -ForegroundColor Yellow
  } elseif ($body -match 'Session expired|Unauthorized') {
    Write-Host "→ Auth layer reached — add -Jwt and -Refresh from browser localStorage." -ForegroundColor Yellow
  } elseif ($code -eq '200') {
    Write-Host "→ OK" -ForegroundColor Green
  } elseif ($body -match '<!doctype html|<html') {
    Write-Host "→ HTML response — check URL / proxy." -ForegroundColor Red
  }

  return $code
}

Write-Host "Listing activation diagnostic (deployed backend)"
Write-Host "Gateway: $Gateway"
Write-Host "Frontend proxy (if pnpm dev): http://127.0.0.1:4174$activationPath → $Gateway$activationPath"

Test-Endpoint -Label "1. Deployed gateway — service-activation (no auth)" -Url "$Gateway$activationPath"
Test-Endpoint -Label "2. Deployed gateway — orchestration-effective (no auth)" -Url "$Gateway$effectivePath"
Test-Endpoint -Label "3. Local Vite proxy — service-activation (no auth)" -Url "http://127.0.0.1:4174$activationPath"

if ($Jwt) {
  $h = @{ Authorization = "Bearer $Jwt" }
  if ($Refresh) { $h["x-refresh-token"] = $Refresh }
  Test-Endpoint -Label "4. Deployed gateway — service-activation (JWT)" -Url "$Gateway$activationPath" -Headers $h
  Test-Endpoint -Label "5. Local Vite proxy — service-activation (JWT)" -Url "http://127.0.0.1:4174$activationPath" -Headers $h
} else {
  Write-Host ""
  Write-Host "Tip: copy sojori_token + sojori_refresh_token from browser DevTools → Application → Local Storage"
  Write-Host "     .\scripts\diagnose-service-activation.ps1 -ListingId $ListingId -Jwt `"<token>`" -Refresh `"<refresh>`""
}

Write-Host ""
Write-Host "Expected public dashboard routes (authenticated JWT, not internal):"
Write-Host "  GET/PUT $Gateway/api/v1/listing/listings/:listingId/service-activation"
