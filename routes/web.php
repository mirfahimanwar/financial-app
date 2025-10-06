<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\FinancialController;

// Home Page
Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

// Mortgage Calculator
Route::get('/mortgage-calculator', [FinancialController::class, 'index'])->name('mortgage');
Route::post('/mortgage-calculator', [FinancialController::class, 'calculateMortgage'])->name('mortgage.calculate');

// Other
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
