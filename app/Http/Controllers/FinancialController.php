<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;


class FinancialController extends Controller
{
    public function index()
    {
        return Inertia::render('mortgage-calculator');
    }

    public function calculateMortgage(Request $request)
    {
        // Ge
        $data = $request->only([
            'homeValue', 'downPayment', 'loanAmount', 'interestRate', 'loanTerm',
            'startDate', 'propertyTax', 'pmi', 'homeInsurance', 'hoa',
            'extraPaymentType', 'extraPaymentAmount', 'extraPaymentStartMonth',
            'refinanceStartMonth', 'refinanceInterestRate'
        ]);

        // Helper to truncate to 2 decimals (no rounding)
        $truncate2 = function($value) {
            return number_format(floor($value * 100) / 100, 2, '.', '');
        };

        // Mortgage calculation logic
        $principal = (float)($data['loanAmount'] ?? 0);
        $annualInterestRate = (float)($data['interestRate'] ?? 0);
        $years = (int)($data['loanTerm'] ?? 0);
        $monthlyInterestRate = $annualInterestRate > 0 ? $annualInterestRate / 100 / 12 : 0;
        $numPayments = $years * 12;
        $monthlyPayment = 0;
        if ($principal > 0 && $monthlyInterestRate > 0 && $numPayments > 0) {
            $monthlyPayment = $principal * ($monthlyInterestRate * pow(1 + $monthlyInterestRate, $numPayments)) / (pow(1 + $monthlyInterestRate, $numPayments) - 1);
        }

    // Always define these before refinance block so they're available
    $propertyTax = (float)($data['propertyTax'] ?? 0);
    $homeInsurance = (float)($data['homeInsurance'] ?? 0);
    $pmi = (float)($data['pmi'] ?? 0);

    // Calculate original total interest (before refinance)
    $monthlyPropertyTax = $propertyTax / 12;
    $monthlyHomeInsurance = $homeInsurance / 12;
    $monthlyPMI = $pmi;
    $remainingPrincipalOrig = $principal;
    $totalInterest = 0;
    $interestPaidBeforeRefi = 0;
    $pmiPaidBeforeRefi = 0;
    $remainingPrincipalAtRefi = $principal;
    $pmiActiveBeforeRefi = $pmi > 0;
    $currentEquityBeforeRefi = (float)($data['downPayment'] ?? 0);
    $homeValueBeforeRefi = (float)($data['homeValue'] ?? 0);
    $targetEquityBeforeRefi = 0.20 * $homeValueBeforeRefi;
    for ($i = 0; $i < $numPayments; $i++) {
        $interest = $remainingPrincipalAtRefi * $monthlyInterestRate;
        $principalPaid = $monthlyPayment - $interest;
        if ($principalPaid > $remainingPrincipalAtRefi) {
            $principalPaid = $remainingPrincipalAtRefi;
        }
        $remainingPrincipalAtRefi -= $principalPaid;
        $currentEquityBeforeRefi = $homeValueBeforeRefi - $remainingPrincipalAtRefi;
            if ($i < (isset($data['refinanceStartMonth']) ? (int)$data['refinanceStartMonth'] : 0)) {
                $interestPaidBeforeRefi += $interest;
                if ($pmiActiveBeforeRefi && $currentEquityBeforeRefi < $targetEquityBeforeRefi) {
                    $pmiPaidBeforeRefi += $pmi;
                }
                $currentEquityBeforeRefi += $principalPaid;
                if ($pmiActiveBeforeRefi && $currentEquityBeforeRefi >= $targetEquityBeforeRefi) {
                    $pmiActiveBeforeRefi = false;
                }
            }
        $totalInterest += $interest;
        if ($remainingPrincipalAtRefi <= 0.01) break;
    }

    // Refinance calculation (if requested)
    $refinanceTotals = null;
    if (!empty($data['refinanceInterestRate']) && !empty($data['refinanceStartMonth'])) {
            $refiRate = (float)$data['refinanceInterestRate'];
            $refiStartMonth = (int)$data['refinanceStartMonth'];
            // Calculate remaining principal and interest paid before refinance
            $refiPrincipal = $principal;
            $refiMonthly = $monthlyPayment;
            $interestPaidBeforeRefinance = 0;
            for ($i = 0; $i < $refiStartMonth; $i++) {
                $interest = $refiPrincipal * $monthlyInterestRate;
                $principalPaid = $refiMonthly - $interest;
                if ($principalPaid > $refiPrincipal) {
                    $principalPaid = $refiPrincipal;
                }
                $refiPrincipal -= $principalPaid;
                $interestPaidBeforeRefinance += $interest;
            }
            // Now calculate new payment with new rate/term (use original term minus months paid)
            $refiTermMonths = $numPayments - $refiStartMonth;
            $refiMonthlyRate = $refiRate > 0 ? $refiRate / 100 / 12 : 0;
            $refiMonthlyPayment = 0;
            if ($refiPrincipal > 0 && $refiMonthlyRate > 0 && $refiTermMonths > 0) {
                $refiMonthlyPayment = $refiPrincipal * ($refiMonthlyRate * pow(1 + $refiMonthlyRate, $refiTermMonths)) / (pow(1 + $refiMonthlyRate, $refiTermMonths) - 1);
            }
            $downPayment = (float)($data['downPayment'] ?? 0);

            $refiTotalInterest = 0;
            $refiTotalPrincipal = 0;
            $refiTotalPropertyTax = 0;
            $refiTotalHomeInsurance = 0;
            $refiTotalPMI = 0;
            $refiRemaining = $refiPrincipal;
            $refiCurrentEquity = $downPayment;
            $refiPMI = (float)($data['pmi'] ?? 0);
            $refiPropertyTax = (float)($data['propertyTax'] ?? 0) / 12;
            $refiHomeInsurance = (float)($data['homeInsurance'] ?? 0) / 12;
            $refiHOA = (float)($data['hoa'] ?? 0);
            $refiHomeValue = (float)($data['homeValue'] ?? 0);
            $refiTargetEquity = 0.20 * $refiHomeValue;
            $refiPMIPaid = 0;
            $refiMonthsWithPMI = 0;
            $refiPMIActive = $refiPMI > 0;
            for ($i = 0; $i < $refiTermMonths; $i++) {
                $interest = $refiRemaining * $refiMonthlyRate;
                $principalPaid = $refiMonthlyPayment - $interest;
                if ($principalPaid > $refiRemaining) {
                    $principalPaid = $refiRemaining;
                }
                $refiRemaining -= $principalPaid;
                $refiCurrentEquity = $refiHomeValue - $refiRemaining;
                $refiTotalInterest += $interest;
                $refiTotalPrincipal += $principalPaid;
                $refiTotalPropertyTax += $refiPropertyTax;
                $refiTotalHomeInsurance += $refiHomeInsurance;
                if ($refiPMIActive && $refiCurrentEquity < $refiTargetEquity) {
                    $refiMonthsWithPMI++;
                    $refiPMIPaid += $refiPMI;
                    $refiTotalPMI += $refiPMI;
                }
                if ($refiPMIActive && $refiCurrentEquity >= $refiTargetEquity) {
                    $refiPMIActive = false;
                }
                if ($refiRemaining <= 0.01) break;
            }
            $totalInterestPaidRefinance = $interestPaidBeforeRefinance + $refiTotalInterest;
            $totalPMIPaidRefinance = $pmiPaidBeforeRefi + $refiTotalPMI;
            $refiTotalPayments = $totalInterestPaidRefinance + $refiTotalPrincipal + $refiTotalPropertyTax + $refiTotalHomeInsurance + $totalPMIPaidRefinance + $downPayment;
            // Calculate interest for remaining term at original rate
            $interestRemainingOrig = 0;
            $remainingPrincipalForOrig = $refiPrincipal;
            $origMonthlyPayment = $remainingPrincipalForOrig * ($monthlyInterestRate * pow(1 + $monthlyInterestRate, $refiTermMonths)) / (pow(1 + $monthlyInterestRate, $refiTermMonths) - 1);
            for ($i = 0; $i < $refiTermMonths; $i++) {
                $interest = $remainingPrincipalForOrig * $monthlyInterestRate;
                $principalPaid = $origMonthlyPayment - $interest;
                if ($principalPaid > $remainingPrincipalForOrig) {
                    $principalPaid = $remainingPrincipalForOrig;
                }
                $remainingPrincipalForOrig -= $principalPaid;
                $interestRemainingOrig += $interest;
                if ($remainingPrincipalForOrig <= 0.01) break;
            }
            // Interest saved is the difference between original and refi interest for the remaining term
            $interestSavedRefinance = $interestRemainingOrig - $refiTotalInterest;
            $refinanceTotals = [
                // Total interest and PMI paid should include pre-refi and post-refi
                'totalPayments' => $truncate2($principal + $interestPaidBeforeRefinance + $refiTotalInterest + ($propertyTax * $years) + ($homeInsurance * $years) + ($pmiPaidBeforeRefi + $refiTotalPMI) + $downPayment),
                'interest' => $truncate2($interestPaidBeforeRefinance + $refiTotalInterest),
                'interestPaidBeforeRefinance' => $truncate2($interestPaidBeforeRefinance),
                'interestPaidAfterRefinance' => $truncate2($refiTotalInterest),
                'principal' => $truncate2($principal),
                'propertyTax' => $truncate2($propertyTax * $years),
                'insurance' => $truncate2($homeInsurance * $years),
                'pmi' => $truncate2($pmiPaidBeforeRefi + $refiTotalPMI),
                'downPayment' => $truncate2($downPayment),
                'interestSavedRefinance' => $interestSavedRefinance !== null ? $truncate2($interestSavedRefinance) : $truncate2(0),
            ];
        }

        // Extra payment logic (define before use)
        $extraType = $data['extraPaymentType'] ?? null; // 'one-time', 'monthly', 'yearly'
        $extraAmount = (float)($data['extraPaymentAmount'] ?? 0);
        $extraStartMonth = (int)($data['extraPaymentStartMonth'] ?? 0); // 0-based month

        // Amortization with extra payments, and track interest paid so far
        $remainingPrincipal = $principal;
        $totalInterestWithExtra = 0;
        $totalInterestPaidSoFar = 0;
        $month = 0;
        $monthsWithPMI = 0;
        $homeValue = (float)($data['homeValue'] ?? 0);
        $downPayment = (float)($data['downPayment'] ?? 0);
        $targetEquity = 0.20 * $homeValue;
        $currentEquity = $downPayment;
        $pmi = (float)($data['pmi'] ?? 0);
        $propertyTax = (float)($data['propertyTax'] ?? 0) / 12;
        $homeInsurance = (float)($data['homeInsurance'] ?? 0) / 12;
        $hoa = (float)($data['hoa'] ?? 0);
        $pmiPaid = 0;
        $schedule = [];
        $pmiActive = $pmi > 0;
        $extraApplied = false;
        $today = new \DateTimeImmutable('today');
        $startDateObj = !empty($data['startDate']) ? new \DateTimeImmutable($data['startDate']) : null;
        $monthsElapsed = 0;
        if ($startDateObj) {
            $monthsElapsed = ($startDateObj < $today) ? (($today->format('Y') - $startDateObj->format('Y')) * 12 + ($today->format('n') - $startDateObj->format('n'))) : 0;
        }

        // Track all payment components for accurate totals
        $totalInterestWithExtra = 0;
        $totalPrincipalWithExtra = 0;
        $totalPropertyTaxWithExtra = 0;
        $totalHomeInsuranceWithExtra = 0;
        $totalHOAWithExtra = 0;
        $totalPMIPaidWithExtra = 0;
        $monthsWithPMI = 0;
        $pmiPaid = 0;
        $totalPaymentsWithExtra = 0;
        $month = 0;
        $extraApplied = false;
        $remainingPrincipal = $principal;
        $currentEquity = $downPayment;
        $pmiActive = $pmi > 0;
        while ($remainingPrincipal > 0.01 && $month < 1000) {
            $extra = 0;
            if ($extraType && $extraAmount > 0 && $month >= $extraStartMonth) {
                if ($extraType === 'one-time' && !$extraApplied) {
                    $extra = $extraAmount;
                    $extraApplied = true;
                } elseif ($extraType === 'monthly') {
                    $extra = $extraAmount;
                } elseif ($extraType === 'yearly' && (($month - $extraStartMonth) % 12 === 0)) {
                    $extra = $extraAmount;
                }
            }
            // If extra payment pays off the full balance immediately, no interest should be accrued
            if ($extra > 0 && $extra >= $remainingPrincipal) {
                $principalPaid = $remainingPrincipal;
                $interest = 0;
            } else {
                $interest = $remainingPrincipal * $monthlyInterestRate;
                $principalPaid = $monthlyPayment - $interest + $extra;
                if ($principalPaid > $remainingPrincipal) {
                    $principalPaid = $remainingPrincipal;
                }
            }
            $remainingPrincipal -= $principalPaid;
            $currentEquity = $homeValue - $remainingPrincipal;
            $totalInterestWithExtra += $interest;
            if ($month < $monthsElapsed) {
                $totalInterestPaidSoFar += $interest;
            }
            $totalPrincipalWithExtra += $principalPaid;
            $totalPropertyTaxWithExtra += $propertyTax;
            $totalHomeInsuranceWithExtra += $homeInsurance;
            $totalHOAWithExtra += $hoa;
            if ($pmiActive && $currentEquity < $targetEquity) {
                $monthsWithPMI++;
                $pmiPaid += $pmi;
                $totalPMIPaidWithExtra += $pmi;
            }
            if ($pmiActive && $currentEquity >= $targetEquity) {
                $pmiActive = false;
            }
            $totalPaymentsWithExtra += $interest + $principalPaid + $propertyTax + $homeInsurance + $hoa;
            if ($pmiActive || ($currentEquity < $targetEquity)) {
                $totalPaymentsWithExtra += $pmi;
            }
            $month++;
        }
    $totalMonthsWithExtra = $month;
    $interestSaved = ($monthlyPayment * $numPayments - $principal) - $totalInterestWithExtra;
    // Now set totalPaymentsWithExtra as requested (moved after $totalPayments is defined)
    $yearsLeft = $totalMonthsWithExtra / 12;

        // Add taxes, insurance, PMI, HOA
        $propertyTax = (float)($data['propertyTax'] ?? 0) / 12;
        $pmi = (float)($data['pmi'] ?? 0);
        $homeInsurance = (float)($data['homeInsurance'] ?? 0) / 12;
        $hoa = (float)($data['hoa'] ?? 0);

        // Monthly breakdown
        $monthlyPrincipal = $monthlyPayment > 0 && $monthlyInterestRate > 0 ? $monthlyPayment - ($principal * $monthlyInterestRate) : $monthlyPayment;
        $monthlyInterest = $monthlyPayment > 0 && $monthlyInterestRate > 0 ? $principal * $monthlyInterestRate : 0;
        $monthlyPMI = $pmi;
        $monthlyInsurance = $homeInsurance;
        $monthlyPropertyTax = $propertyTax;
        $totalMonthly = $monthlyPayment + $propertyTax + $pmi + $homeInsurance + $hoa;

        // Calculate how many months until 20% equity (PMI drops) for original schedule
        $remainingPrincipalOrig = $principal;
        $currentEquityOrig = $downPayment;
        $monthsWithPMIOrig = 0;
        $pmiActiveOrig = $pmi > 0;
        for ($i = 0; $i < $numPayments; $i++) {
            $interest = $remainingPrincipalOrig * $monthlyInterestRate;
            $principalPaid = $monthlyPayment - $interest;
            $remainingPrincipalOrig -= $principalPaid;
            $currentEquityOrig = $homeValue - $remainingPrincipalOrig;
            // Only pay PMI if equity is below 20% at the START of the month
            if ($pmiActiveOrig && $currentEquityOrig < $targetEquity) {
                $monthsWithPMIOrig++;
            }
            if ($pmiActiveOrig && $currentEquityOrig >= $targetEquity) {
                $pmiActiveOrig = false;
            }
            if ($remainingPrincipalOrig <= 0.01) {
                break;
            }
        }
        $totalPMIPaidOrig = $pmi * $monthsWithPMIOrig;

    $totalPayments = ($monthlyPayment + $propertyTax + $homeInsurance + $hoa) * $numPayments + $totalPMIPaidOrig + $downPayment;
    // Now set totalPaymentsWithExtra as requested
    $totalPaymentsWithExtra = $totalPayments - $interestSaved;

        // Calculate total interest paid
        $totalPaid = $monthlyPayment * $numPayments;
        $totalInterest = $totalPaid - $principal;

        // Calculate total property tax and insurance over the loan term
        $totalPropertyTax = $propertyTax * 12 * $years;
        $totalHomeInsurance = $homeInsurance * 12 * $years;

        // Calculate projected payoff date if startDate is provided
        $payoffDate = null;
        if (!empty($data['startDate'])) {
            try {
                $startDate = new \DateTime($data['startDate']);
                $interval = new \DateInterval('P' . $totalMonthsWithExtra . 'M');
                $payoffDateObj = clone $startDate;
                $payoffDateObj->add($interval);
                $payoffDate = $payoffDateObj->format('Y-m-d');
            } catch (\Exception $e) {
                $payoffDate = null;
            }
        }

        return response()->json([
            'success' => true,
            'monthlyPayment' => $truncate2($monthlyPayment),
            'totalMonthly' => $truncate2($totalMonthly),
            'monthlyPrincipal' => $truncate2($monthlyPrincipal),
            'monthlyInterest' => $truncate2($monthlyInterest),
            'monthlyPMI' => $truncate2($monthlyPMI),
            'monthlyInsurance' => $truncate2($monthlyInsurance),
            'monthlyPropertyTax' => $truncate2($monthlyPropertyTax),
            'totalInterest' => $truncate2($totalInterest),
            'totalPropertyTax' => $truncate2($totalPropertyTax),
            'totalHomeInsurance' => $truncate2($totalHomeInsurance),
            'totalPayments' => $truncate2($totalPayments),
            'totalPaymentsWithExtra' => $truncate2($totalPaymentsWithExtra),
            'totalPMIPaidWithExtra' => $truncate2($totalPMIPaidWithExtra),
            'interestSaved' => $truncate2($interestSaved),
            'newLoanTermMonths' => $totalMonthsWithExtra,
            'newLoanTermYears' => $truncate2($yearsLeft),
            'projectedPayoffDate' => $payoffDate,
            'totalInterestPaidSoFar' => $truncate2($totalInterestPaidSoFar),
            'refinanceTotals' => $refinanceTotals,
        ]);
    }
}
