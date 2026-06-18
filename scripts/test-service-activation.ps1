# Test GET listing service-activation (via Vite proxy ou backend direct)
# Usage:
#   .\scripts\test-service-activation.ps1 -ListingId 685aab22b19110002f9421e1
#   .\scripts\test-service-activation.ps1 -ListingId 685aab22b19110002f9421e1 -Direct http://127.0.0.1:4001

param(
  [Parameter(Mandatory = $true)]
  [string]$ListingId,
  [string]$ViaVite = "http://127.0.0.1:4174",
  [string]$Direct = "",
  [string]$Token = $env:VITE_DEV_TOKEN
)

$path = "/api/v1/listing/listings/$ListingId/service-activation"
$headers = @{}
if ($Token) {
  $headers["Authorization"] = "Bearer $Token"
  $headers["X-Dev-Token"] = $Token
}

Write-Host "=== Via Vite proxy ($ViaVite) ===" -ForegroundColor Cyan
curl.exe -i -H "Authorization: Bearer $Token" -H "X-Dev-Token: $Token" "$ViaVite$path"

if ($Direct) {
  Write-Host "`n=== Direct srv-listing ($Direct) ===" -ForegroundColor Cyan
  curl.exe -i -H "Authorization: Bearer $Token" -H "X-Dev-Token: $Token" "$Direct$path"
}

Write-Host "`n=== Direct dev.sojori.com ===" -ForegroundColor Cyan
curl.exe -i -H "Authorization: Bearer $Token" -H "X-Dev-Token: $Token" "https://dev.sojori.com$path"

Write-Host "`nExpected: 200 with services[] (auth OK), 401 without JWT, 404 only if route not deployed." -ForegroundColor Yellow
