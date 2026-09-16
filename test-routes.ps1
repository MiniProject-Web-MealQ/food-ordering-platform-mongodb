# --------------------------------------------------
# MealQ Route Smoke Test
# --------------------------------------------------
# ใช้ทดสอบว่า:
# 1. Frontend เปิดได้
# 2. Customer Routes ตอบ HTTP 200
# 3. Backend API ทำงาน
# 4. MongoDB เชื่อมต่ออยู่
#
# หมายเหตุ:
# การทดสอบ Frontend แบบนี้เป็น HTTP Smoke Test
# ยังไม่ได้ยืนยันว่า React Component ในแต่ละ Route
# แสดงผลถูกต้อง 100%
# --------------------------------------------------


# URL หลักของ Frontend
$frontendBase = "http://localhost:5173"

# URL หลักของ Backend
$backendBase = "http://localhost:5000"


# --------------------------------------------------
# Customer Routes ที่ต้องการทดสอบ
# --------------------------------------------------
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


# ตัวนับผลการทดสอบ
$passed = 0
$failed = 0


Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "       MealQ Customer Smoke Test      " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""


# --------------------------------------------------
# FRONTEND TEST
# --------------------------------------------------

Write-Host "Frontend Route Tests" -ForegroundColor Yellow
Write-Host "--------------------"


foreach ($route in $frontendRoutes) {

    # รวม URL เช่น
    # http://localhost:5173/restaurants
    $url = "$frontendBase$route"

    try {

        # ส่ง HTTP request ไปยัง URL
        $response = Invoke-WebRequest `
            -Uri $url `
            -UseBasicParsing `
            -TimeoutSec 5

        # ถ้าได้ HTTP 200
        if ($response.StatusCode -eq 200) {

            Write-Host "[PASS] $url -> 200 OK" -ForegroundColor Green
            $passed++

        }
        else {

            Write-Host "[FAIL] $url -> $($response.StatusCode)" -ForegroundColor Red
            $failed++

        }

    }
    catch {

        # ถ้าเปิด URL ไม่ได้
        Write-Host "[FAIL] $url" -ForegroundColor Red
        Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed

        $failed++
    }
}


Write-Host ""


# --------------------------------------------------
# BACKEND TEST
# --------------------------------------------------

Write-Host "Backend Tests" -ForegroundColor Yellow
Write-Host "-------------"


try {

    # เรียก Health API ของ Backend
    $health = Invoke-RestMethod `
        -Uri "$backendBase/api/v1/health" `
        -TimeoutSec 5


    # ตรวจสถานะ Backend
    if ($health.status -eq "ok") {

        Write-Host "[PASS] Backend API -> OK" -ForegroundColor Green
        $passed++

    }
    else {

        Write-Host "[FAIL] Backend API status is not OK" -ForegroundColor Red
        $failed++

    }


    # ตรวจสถานะ MongoDB
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

    $failed++
}


# --------------------------------------------------
# SUMMARY
# --------------------------------------------------

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "              Test Summary            " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Passed: $passed" -ForegroundColor Green

if ($failed -eq 0) {

    Write-Host "Failed: $failed" -ForegroundColor Green

    Write-Host ""
    Write-Host "ALL TESTS PASSED" -ForegroundColor Green

}
else {

    Write-Host "Failed: $failed" -ForegroundColor Red

    Write-Host ""
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red

}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""