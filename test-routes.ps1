# ---------------------------------------------
# MealQ Route Smoke Test
# ทดสอบว่า Frontend routes และ Backend health เปิดได้
# ---------------------------------------------

$frontendBase = "http://localhost:5173"
$backendBase  = "http://localhost:5000"

# Route ฝั่ง Customer ที่มีตอนนี้
$frontendRoutes = @(
    "/",
    "/login",
    "/register",
    "/restaurants",
    "/restaurants/1",
    "/cart",
    "/checkout",
    "/orders",
    "/orders/1001",
    "/profile"
)

Write-Host ""
Write-Host "=== MealQ Smoke Test ==="
Write-Host ""

# -----------------------------
# Test Frontend
# -----------------------------
Write-Host "Frontend Tests"
Write-Host "--------------"

foreach ($route in $frontendRoutes) {

    $url = "$frontendBase$route"

    try {
        $response = Invoke-WebRequest `
            -Uri $url `
            -UseBasicParsing `
            -TimeoutSec 5

        if ($response.StatusCode -eq 200) {
            Write-Host "[PASS] $url -> 200 OK" -ForegroundColor Green
        }
        else {
            Write-Host "[WARN] $url -> $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[FAIL] $url" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed
    }
}

Write-Host ""

# -----------------------------
# Test Backend
# -----------------------------
Write-Host "Backend Tests"
Write-Host "-------------"

try {

    $health = Invoke-RestMethod `
        -Uri "$backendBase/api/v1/health" `
        -TimeoutSec 5

    if (
        $health.status -eq "ok" -and
        $health.database -eq "connected"
    ) {
        Write-Host "[PASS] Backend API -> OK" -ForegroundColor Green
        Write-Host "[PASS] MongoDB -> Connected" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Backend responded but status is unexpected" -ForegroundColor Yellow
        Write-Host ($health | ConvertTo-Json)
    }

}
catch {
    Write-Host "[FAIL] Backend API" -ForegroundColor Red
    Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed
}

Write-Host ""
Write-Host "=== Test Finished ==="
Write-Host ""