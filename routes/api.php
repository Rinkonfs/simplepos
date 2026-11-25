<?php

use App\Http\Controllers\{
    AccountingController,
    AuthController,
    CategoryController,
    DiscountCodeController,
    OrderController,
    ProductController,
    PurchaseOrderController,
    ReportController,
    SettingController,
    StockMovementController,
    VendorController
};
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/settings', [SettingController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/profile/address', [AuthController::class, 'saveAddress']);
    Route::post('/discount-codes/validate', [DiscountCodeController::class, 'validateCode']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::put('/orders/{order}', [OrderController::class, 'updateOrder']);
    Route::patch('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Seller & Super Admin
    Route::middleware('role:super_admin,seller')->group(function () {
        Route::get('/customers', [AuthController::class, 'customers']);
        Route::get('/vendors', [VendorController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::post('/products/bulk-upload', [ProductController::class, 'bulkUpload']);
        Route::post('/products/{product}', [ProductController::class, 'update']);
        Route::post('/products/{product}/batches', [ProductController::class, 'addBatch']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });

    // Super Admin ONLY
    Route::middleware('role:super_admin')->group(function () {
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        Route::get('/stock-movements', [StockMovementController::class, 'index']);
        Route::put('/stock-movements/{stockMovement}', [StockMovementController::class, 'update']);
        Route::delete('/stock-movements/{stockMovement}', [StockMovementController::class, 'destroy']);

        Route::post('/vendors', [VendorController::class, 'store']);
        Route::put('/vendors/{vendor}', [VendorController::class, 'update']);
        Route::delete('/vendors/{vendor}', [VendorController::class, 'destroy']);

        Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::patch('/purchase-orders/{purchaseOrder}/status', [PurchaseOrderController::class, 'updateStatus']);
        Route::post('/purchase-orders/{purchaseOrder}/pay', [PurchaseOrderController::class, 'recordPayment']);

        Route::get('/accounting/summary', [AccountingController::class, 'summary']);

        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::get('/discount-codes', [DiscountCodeController::class, 'index']);
        Route::post('/discount-codes', [DiscountCodeController::class, 'store']);
        Route::delete('/discount-codes/{discountCode}', [DiscountCodeController::class, 'destroy']);

        Route::put('/settings', [SettingController::class, 'update']);

        Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
        Route::get('/reports/excel', [ReportController::class, 'exportExcel']);
        Route::get('/reports/pdf', [ReportController::class, 'exportPdf']);

        Route::get('/users', [AuthController::class, 'users']);
        Route::post('/users', [AuthController::class, 'storeUser']);
        Route::post('/users/{user}', [AuthController::class, 'updateUser']);
        Route::delete('/users/{user}', [AuthController::class, 'destroyUser']);
    });
});