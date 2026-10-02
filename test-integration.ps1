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

function ExpectHttpError($name, $scriptBlock, $expectedCode) {
  try {
    & $scriptBlock | Out-Null
    Fail $name "Expected API error $expectedCode but request succeeded"
  } catch {
    $body = $null
    try { $body = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
    if ($body -and $body.error.code -eq $expectedCode) { Pass $name }
    elseif ($body -and $body.error.code) { Fail $name $body.error.code }
    else { Fail $name $_.Exception.Message }
  }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       MealQ Merchant + Backend Integration      " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

try {
  $health = Invoke-RestMethod -Uri "$backend/health" -TimeoutSec 5
  if ($health.status -eq "ok" -and $health.database -eq "connected") { Pass "Backend + MongoDB health" }
  else { Fail "Backend + MongoDB health" "Unexpected health response" }
} catch { Fail "Backend + MongoDB health" $_.Exception.Message }

try {
  $restaurants = Invoke-RestMethod -Uri "$backend/restaurants" -TimeoutSec 5
  if (@($restaurants.restaurants).Count -gt 0) { Pass "GET restaurants" }
  else { Fail "GET restaurants" "No seeded restaurants. Run npm run seed." }
} catch { Fail "GET restaurants" $_.Exception.Message }

try {
  $menu = Invoke-RestMethod -Uri "$backend/restaurants/pa-daeng/menu" -TimeoutSec 5
  if (@($menu.menus | Where-Object { $_.clientId -eq "kaprao-moo-krob" }).Count -gt 0) { Pass "GET seeded restaurant menu" }
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
$pickupCode = $null
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
  $pickupCode = $created.order.pickupCode
  if ($orderNumber -and $created.order.queueNumber -and $pickupCode) { Pass "Customer creates order -> MongoDB" }
  else { Fail "Customer creates order -> MongoDB" "Order number / queue / pickup code missing" }
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

try {
  $store = Invoke-RestMethod -Uri "$backend/merchant/store" -WebSession $merchantSession
  if ($store.store.id -and $store.store.queue.maxQueue -gt 0) { Pass "Merchant reads store from backend" }
  else { Fail "Merchant reads store from backend" "Store / queue settings missing" }
} catch { Fail "Merchant reads store from backend" $_.Exception.Message }

if ($orderNumber) {
  try {
    $orders = Invoke-RestMethod -Uri "$backend/merchant/orders" -WebSession $merchantSession
    if (@($orders.orders | Where-Object { $_.orderNumber -eq $orderNumber }).Count -gt 0) { Pass "Merchant receives customer order" }
    else { Fail "Merchant receives customer order" "Created order not found in merchant orders" }
  } catch { Fail "Merchant receives customer order" $_.Exception.Message }

  foreach ($step in @("confirmed", "preparing", "ready")) {
    try {
      $body = JsonBody @{ status = $step }
      $updated = Invoke-RestMethod -Method Patch -Uri "$backend/merchant/orders/$orderNumber/status" -WebSession $merchantSession -ContentType "application/json" -Body $body
      if ($updated.order.status -eq $step) { Pass "Merchant status -> $step" }
      else { Fail "Merchant status -> $step" "Status did not change" }
    } catch { Fail "Merchant status -> $step" $_.Exception.Message }
  }

  ExpectHttpError "Backend rejects wrong pickup code" {
    Invoke-RestMethod -Method Post -Uri "$backend/merchant/orders/$orderNumber/receive" -WebSession $merchantSession -ContentType "application/json" -Body (JsonBody @{ receiveCode = "0000" })
  } "RECEIVE_CODE_MISMATCH"

  if ($pickupCode) {
    try {
      $received = Invoke-RestMethod -Method Post -Uri "$backend/merchant/orders/$orderNumber/receive" -WebSession $merchantSession -ContentType "application/json" -Body (JsonBody @{ receiveCode = $pickupCode })
      if ($received.order.status -eq "completed" -and $received.order.receiveTime) { Pass "Backend verifies pickup code and completes order" }
      else { Fail "Backend verifies pickup code and completes order" "Order not completed / receiveTime missing" }
    } catch { Fail "Backend verifies pickup code and completes order" $_.Exception.Message }
  }
}

try {
  $menus = Invoke-RestMethod -Uri "$backend/merchant/menu" -WebSession $merchantSession
  if (@($menus.menus).Count -gt 0) { Pass "Merchant reads menus from MongoDB" }
  else { Fail "Merchant reads menus from MongoDB" "No menu found" }
} catch { Fail "Merchant reads menus from MongoDB" $_.Exception.Message }

$createdMenuId = $null
try {
  $body = JsonBody @{
    name = "Integration Test Menu"
    description = "Created by test-integration.ps1"
    category = "single"
    price = 99
    cookTime = 5
    isAvailable = $false
  }
  $createdMenu = Invoke-RestMethod -Method Post -Uri "$backend/merchant/menu" -WebSession $merchantSession -ContentType "application/json" -Body $body
  $createdMenuId = $createdMenu.menu.id
  if ($createdMenuId -and $createdMenu.menu.isAvailable -eq $false) { Pass "Merchant creates unavailable menu in one request" }
  else { Fail "Merchant creates unavailable menu in one request" "Menu was not created with isAvailable=false" }
} catch { Fail "Merchant creates unavailable menu in one request" $_.Exception.Message }

if ($createdMenuId) {
  try {
    $body = JsonBody @{ price = 109; isAvailable = $true }
    $updatedMenu = Invoke-RestMethod -Method Patch -Uri "$backend/merchant/menu/$createdMenuId" -WebSession $merchantSession -ContentType "application/json" -Body $body
    if ($updatedMenu.menu.price -eq 109 -and $updatedMenu.menu.isAvailable) { Pass "Merchant updates menu" }
    else { Fail "Merchant updates menu" "Menu values did not update" }
  } catch { Fail "Merchant updates menu" $_.Exception.Message }

  try {
    $deleted = Invoke-RestMethod -Method Delete -Uri "$backend/merchant/menu/$createdMenuId" -WebSession $merchantSession
    if ($deleted.ok) { Pass "Merchant deletes menu" }
    else { Fail "Merchant deletes menu" "Delete response not ok" }
  } catch { Fail "Merchant deletes menu" $_.Exception.Message }
}

try {
  $currentStore = Invoke-RestMethod -Uri "$backend/merchant/store" -WebSession $merchantSession
  $originalDetail = $currentStore.store.address.detail
  $originalMaxQueue = $currentStore.store.queue.maxQueue
  $body = JsonBody @{
    address = @{ detail = $originalDetail }
    maxQueue = $originalMaxQueue
  }
  $savedStore = Invoke-RestMethod -Method Patch -Uri "$backend/merchant/store" -WebSession $merchantSession -ContentType "application/json" -Body $body
  if ($savedStore.store.queue.maxQueue -eq $originalMaxQueue) { Pass "Merchant saves store settings" }
  else { Fail "Merchant saves store settings" "Store settings did not persist" }
} catch { Fail "Merchant saves store settings" $_.Exception.Message }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Summary: Passed=$passed Failed=$failed" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
if ($failed -eq 0) {
  Write-Host "ALL MERCHANT INTEGRATION TESTS PASSED" -ForegroundColor Green
  exit 0
}
exit 1
