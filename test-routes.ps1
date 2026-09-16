# ==========================================================
# MealQ Full Smoke Test
# ==========================================================
# ทดสอบระบบเบื้องต้นทั้งหมด:
#
# 1. Customer Frontend Routes
# 2. Merchant Frontend Routes
# 3. Backend Health API
# 4. MongoDB Connection
#
# Frontend : http://localhost:5173
# Backend  : http://localhost:5000
#
# หมายเหตุ:
# Route Test นี้ตรวจว่า URL ตอบ HTTP 200 หรือไม่
# แต่ไม่ได้รัน JavaScript ใน Browser จริง
# ดังนั้นหลังผ่าน Test ควรลองกด Flow ใน Browser ด้วย
# ==========================================================


# ----------------------------------------------------------
# URL หลัก
# ----------------------------------------------------------

$frontendBase = "http://localhost:5173"
$backendBase  = "http://localhost:5000"


# ----------------------------------------------------------
# Customer Routes
# ----------------------------------------------------------

$customerRoutes = @(
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


# ----------------------------------------------------------
# Merchant Routes
# ----------------------------------------------------------

$merchantRoutes = @(
    "/merchant/login",
    "/merchant/dashboard",
    "/merchant/orders",
    "/merchant/orders/1001",
    "/merchant/menu",
    "/merchant/menu/new",
    "/merchant/menu/1/edit",
    "/merchant/settings"
)


# ----------------------------------------------------------
# ตัวนับผลการทดสอบ
# ----------------------------------------------------------

$passed = 0
$failed = 0


# ==========================================================
# Header
# ==========================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "              MealQ Full Smoke Test               " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""


# ==========================================================
# CUSTOMER TEST
# ==========================================================

Write-Host "CUSTOMER ROUTE TESTS" -ForegroundColor Yellow
Write-Host "--------------------"


foreach ($route in $customerRoutes) {

    $url = "$frontendBase$route"

    try {

        $response = Invoke-WebRequest `
            -Uri $url `
            -UseBasicParsing `
            -TimeoutSec 5

        if ($response.StatusCode -eq 200) {

            Write-Host "[PASS] $url -> 200 OK" -ForegroundColor Green
            $passed++

        }
        else {

            Write-Host "[FAIL] $url -> HTTP $($response.StatusCode)" -ForegroundColor Red
            $failed++

        }

    }
    catch {

        Write-Host "[FAIL] $url" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed

        $failed++
    }
}


Write-Host ""


# ==========================================================
# MERCHANT TEST
# ==========================================================

Write-Host "MERCHANT ROUTE TESTS" -ForegroundColor Yellow
Write-Host "--------------------"


foreach ($route in $merchantRoutes) {

    $url = "$frontendBase$route"

    try {

        $response = Invoke-WebRequest `
            -Uri $url `
            -UseBasicParsing `
            -TimeoutSec 5

        if ($response.StatusCode -eq 200) {

            Write-Host "[PASS] $url -> 200 OK" -ForegroundColor Green
            $passed++

        }
        else {

            Write-Host "[FAIL] $url -> HTTP $($response.StatusCode)" -ForegroundColor Red
            $failed++

        }

    }
    catch {

        Write-Host "[FAIL] $url" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed

        $failed++
    }
}


Write-Host ""


# ==========================================================
# BACKEND TEST
# ==========================================================

Write-Host "BACKEND TESTS" -ForegroundColor Yellow
Write-Host "-------------"


try {

    # เรียก Health API
    $health = Invoke-RestMethod `
        -Uri "$backendBase/api/v1/health" `
        -TimeoutSec 5


    # ------------------------------------------------------
    # ตรวจ Backend
    # ------------------------------------------------------

    if ($health.status -eq "ok") {

        Write-Host "[PASS] Backend API -> OK" -ForegroundColor Green
        $passed++

    }
    else {

        Write-Host "[FAIL] Backend API -> Unexpected status" -ForegroundColor Red
        $failed++

    }


    # ------------------------------------------------------
    # ตรวจ MongoDB
    # ------------------------------------------------------

    if ($health.database -eq "connected") {

        Write-Host "[PASS] MongoDB -> Connected" -ForegroundColor Green
        $passed++

    }
    else {

        Write-Host "[FAIL] MongoDB -> Not Connected" -ForegroundColor Red
        $failed++

    }

}
catch {

    Write-Host "[FAIL] Backend API" -ForegroundColor Red
    Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed

    # Backend ล้ม หมายความว่าตรวจ Backend + Mongo ไม่สำเร็จ
    $failed += 2
}


# ==========================================================
# SUMMARY
# ==========================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "                   TEST SUMMARY                   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$total = $passed + $failed

Write-Host "Total : $total"
Write-Host "Passed: $passed" -ForegroundColor Green


if ($failed -eq 0) {

    Write-Host "Failed: $failed" -ForegroundColor Green

    Write-Host ""
    Write-Host "ALL TESTS PASSED" -ForegroundColor Green
    Write-Host ""

}
else {

    Write-Host "Failed: $failed" -ForegroundColor Red

    Write-Host ""
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    Write-Host ""

}


# ==========================================================
# Expected Result
# ==========================================================
#
# Customer Routes = 10 Tests
# Merchant Routes = 8 Tests
# Backend          = 1 Test
# MongoDB          = 1 Test
#
# Total            = 20 Tests
#
# ถ้าทุกอย่างทำงาน:
#
# Total : 20
# Passed: 20
# Failed: 0
#
# ALL TESTS PASSED
# ==========================================================


# ถ้ามี Test fail ให้คืน Exit Code 1
# มีประโยชน์ถ้าอนาคตเอา Script ไปใช้กับ CI/CD

if ($failed -gt 0) {
    exit 1
}

exit 0