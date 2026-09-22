# MealQ API Integration Test
# Prerequisite:
#   docker compose up -d
#   cd backend; npm run seed; npm run dev
#   cd frontend; npm run dev

$ErrorActionPreference = "Stop"
$backend = "http://localhost:5000/api/v1"
$passed = 0
$failed = 0

function Pass($name) {
  $script:passed++
  Write-Host "[PASS] $name" -ForegroundColor Green
}

function Fail($name, $message) {
  $script:failed++
  Write-Host "[FAIL] $name" -ForegroundColor Red
  Write-Host "       $message" -ForegroundColor DarkRed
}

function JsonBody($value) {
  return ($value | ConvertTo-Json -Depth 10)
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "          MealQ API Integration Test             " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

try {
  $health = Invoke-RestMethod -Uri "$backend/health" -TimeoutSec 5
  if ($health.status -eq "ok" -and $health.database -eq "connected") { Pass "Backend + MongoDB health" }
  else { Fail "Backend + MongoDB health" "Unexpected health response" }
} catch { Fail "Backend + MongoDB health" $_.Exception.Message }

try {
  $restaurants = Invoke-RestMethod -Uri "$backend/restaurants" -TimeoutSec 5
  if ($restaurants.restaurants.Count -gt 0) { Pass "GET restaurants" }
  else { Fail "GET restaurants" "No seeded restaurants. Run npm run seed." }
} catch { Fail "GET restaurants" $_.Exception.Message }

try {
  $menu = Invoke-RestMethod -Uri "$backend/restaurants/pa-daeng/menu" -TimeoutSec 5
  if (($menu.menus | Where-Object { $_.clientId -eq "kaprao-moo-krob" }).Count -gt 0) { Pass "GET seeded restaurant menu" }
  else { Fail "GET seeded restaurant menu" "kaprao-moo-krob not found. Run npm run seed." }
} catch { Fail "GET seeded restaurant menu" $_.Exception.Message }

$customerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $body = JsonBody @{
    email = "customer@mealq.local"
    password = "Customer123!"
    portal = "CUSTOMER"
    rememberMe = $true
  }
  $customerLogin = Invoke-RestMethod -Method Post -Uri "$backend/auth/login" -WebSession $customerSession -ContentType "application/json" -Body $body
  if ($customerLogin.user.role -eq "CUSTOMER") { Pass "Customer login" }
  else { Fail "Customer login" "Unexpected role" }
} catch { Fail "Customer login" $_.Exception.Message }

$orderNumber = $null
try {
  $body = JsonBody @{
    items = @(
      @{
        menuId = "kaprao-moo-krob"
        quantity = 1
        selections = @{ spice = @("normal"); extras = @("fried-egg") }
        note = "Integration test"
      }
    )
    couponCode = "LUNCH10"
    paymentMethod = "promptpay"
  }
  $created = Invoke-RestMethod -Method Post -Uri "$backend/orders" -WebSession $customerSession -ContentType "application/json" -Body $body
  $orderNumber = $created.order.orderNumber
  if ($orderNumber -and $created.order.queueNumber) { Pass "Customer creates order -> MongoDB" }
  else { Fail "Customer creates order -> MongoDB" "Order number / queue missing" }
} catch { Fail "Customer creates order -> MongoDB" $_.Exception.Message }

$merchantSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $body = JsonBody @{
    email = "merchant@mealq.local"
    password = "Merchant123!"
    portal = "MERCHANT"
    rememberMe = $true
  }
  $merchantLogin = Invoke-RestMethod -Method Post -Uri "$backend/auth/login" -WebSession $merchantSession -ContentType "application/json" -Body $body
  if ($merchantLogin.user.role -eq "MERCHANT") { Pass "Merchant login" }
  else { Fail "Merchant login" "Unexpected role" }
} catch { Fail "Merchant login" $_.Exception.Message }

if ($orderNumber) {
  try {
    $orders = Invoke-RestMethod -Uri "$backend/merchant/orders" -WebSession $merchantSession
    if (($orders.orders | Where-Object { $_.orderNumber -eq $orderNumber }).Count -gt 0) { Pass "Merchant receives customer order" }
    else { Fail "Merchant receives customer order" "Created order not found in merchant orders" }
  } catch { Fail "Merchant receives customer order" $_.Exception.Message }

  try {
    $body = JsonBody @{ status = "preparing" }
    $updated = Invoke-RestMethod -Method Patch -Uri "$backend/merchant/orders/$orderNumber/status" -WebSession $merchantSession -ContentType "application/json" -Body $body
    if ($updated.order.status -eq "preparing") { Pass "Merchant updates order status" }
    else { Fail "Merchant updates order status" "Status did not change" }
  } catch { Fail "Merchant updates order status" $_.Exception.Message }
}

try {
  $menus = Invoke-RestMethod -Uri "$backend/merchant/menu" -WebSession $merchantSession
  if ($menus.menus.Count -gt 0) { Pass "Merchant reads menus from MongoDB" }
  else { Fail "Merchant reads menus from MongoDB" "No menu found" }
} catch { Fail "Merchant reads menus from MongoDB" $_.Exception.Message }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Summary: Passed=$passed Failed=$failed" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
if ($failed -eq 0) {
  Write-Host "ALL INTEGRATION TESTS PASSED" -ForegroundColor Green
  exit 0
}
exit 1
