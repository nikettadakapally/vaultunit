$ErrorActionPreference = "Stop"

$port = if ($env:SERVER_PORT) { [int]$env:SERVER_PORT } else { 8080 }
$apiUrl = "http://127.0.0.1:$port/api/auth/csrf"
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 3 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        try {
            $token = $response.Content | ConvertFrom-Json
            if ($token.headerName -and $token.parameterName) {
                Write-Output "VaultUnit API is already responding on port $port; skipping duplicate startup."
                exit 0
            }
        } catch {
            # A successful but unexpected response is treated as a port conflict below.
        }
    }
} catch {
    # No healthy VaultUnit API answered; check whether another process owns the port.
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($listener) {
    throw "Port $port is already in use by process $($listener.OwningProcess), but it did not return a VaultUnit CSRF response. Stop that process or set SERVER_PORT before starting the backend."
}

& "$PSScriptRoot\mvnw.cmd" spring-boot:run
exit $LASTEXITCODE
