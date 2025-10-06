

import * as React from 'react';
import { useState, useEffect } from 'react';
// If you see an error here, ensure @inertiajs/react is installed and types are available
import { Head, usePage } from '@inertiajs/react';
import Navbar from '../components/Navbar';

function MortgageCalculatorPage() {
  const { auth } = usePage().props;
  const [form, setForm] = useState(() => {
    const cached = localStorage.getItem('mortgageForm');
    return cached ? JSON.parse(cached) : {
      homeValue: '',
      downPayment: '',
      loanAmount: '',
      interestRate: '',
      loanTerm: '',
      startDate: '',
      propertyTax: '',
      pmi: '',
      homeInsurance: '',
      hoa: '',
      extraPaymentType: '', // 'one-time', 'monthly', 'yearly'
      extraPaymentAmount: '',
      extraPaymentStartMonth: '',
      refinanceStartMonth: '',
      refinanceInterestRate: '',
    };
  });
  const [result, setResult] = useState<{
    monthlyPayment: string,
    totalMonthly: string,
    monthlyPrincipal?: string,
    monthlyInterest?: string,
    monthlyPMI?: string,
    monthlyInsurance?: string,
    monthlyPropertyTax?: string,
    totalInterest?: string,
    totalPropertyTax?: string,
    totalHomeInsurance?: string,
    totalPayments?: string,
    totalPaymentsWithExtra?: string,
    totalPMIPaidWithExtra?: string,
    interestSaved?: string,
    newLoanTermMonths?: number,
    newLoanTermYears?: string,
    projectedPayoffDate?: string,
    totalInterestPaidSoFar?: string,
    refinanceSavings?: string
  } | null>(() => {
    const cached = localStorage.getItem('mortgageResult');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('mortgageForm', JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    if (result) {
      localStorage.setItem('mortgageResult', JSON.stringify(result));
    }
  }, [result]);


  // Helper to format as $X,XXX
  // Show raw value while typing, format on blur
  function formatCurrencyInput(value: string | undefined | null, blur = false) {
    if (typeof value !== 'string') return '';
    const cleaned = value.replace(/[^\d.]/g, '');
    if (!cleaned || isNaN(Number(cleaned))) return '';
    const num = Number(cleaned);
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return num.toLocaleString();
    }
  }

  // Helper to strip formatting for storage/calculation
  function parseCurrencyInput(value: string) {
    // Allow only digits and a single decimal point
    let cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // More than one decimal, join all after the first
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  }

  // Handles currency fields: always store raw value, only format for display
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow only digits and a single decimal point, preserve user input
    let raw = value.replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    let updatedForm = { ...form, [name]: raw };
    // Robust auto-calc: treat empty/invalid as zero, always update loanAmount
    if ((name === 'homeValue' || name === 'downPayment')) {
      const homeValueNum = parseFloat(name === 'homeValue' ? raw : updatedForm.homeValue) || 0;
      const downPaymentNum = parseFloat(name === 'downPayment' ? raw : updatedForm.downPayment) || 0;
      if (updatedForm.homeValue === '' && name !== 'homeValue') {
        updatedForm.loanAmount = '';
      } else if (updatedForm.downPayment === '' && name !== 'downPayment') {
        updatedForm.loanAmount = '';
      } else {
        updatedForm.loanAmount = (homeValueNum - downPaymentNum >= 0 ? (homeValueNum - downPaymentNum).toString() : '');
      }
    }
    setForm(updatedForm);
  };

  // Format on blur: no-op, formatting is only for display
  const handleCurrencyBlur = () => {};

  // Handles non-currency fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updatedForm = { ...form, [name]: value };
    setForm(updatedForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    // Calculate loan amount if not provided
    let loanAmount = form.loanAmount;
    if ((!loanAmount || Number(loanAmount) === 0) && form.homeValue && form.downPayment) {
      loanAmount = (Number(form.homeValue) - Number(form.downPayment)).toString();
    }
  const formToSend = { ...form, loanAmount };
    try {
      const response = await fetch('/mortgage-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
        },
        body: JSON.stringify(formToSend),
      });
      const data = await response.json();
      if (data.success) {
        setResult({
          monthlyPayment: data.monthlyPayment,
          totalMonthly: data.totalMonthly,
          monthlyPrincipal: data.monthlyPrincipal,
          monthlyInterest: data.monthlyInterest,
          monthlyPMI: data.monthlyPMI,
          monthlyInsurance: data.monthlyInsurance,
          monthlyPropertyTax: data.monthlyPropertyTax,
          totalInterest: data.totalInterest,
          totalPropertyTax: data.totalPropertyTax,
          totalHomeInsurance: data.totalHomeInsurance,
          totalPayments: data.totalPayments,
          totalPaymentsWithExtra: data.totalPaymentsWithExtra,
          totalPMIPaidWithExtra: data.totalPMIPaidWithExtra,
          interestSaved: data.interestSaved,
          newLoanTermMonths: data.newLoanTermMonths,
          newLoanTermYears: data.newLoanTermYears,
          projectedPayoffDate: data.projectedPayoffDate,
          totalInterestPaidSoFar: data.totalInterestPaidSoFar,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
  <div style={styles.page}>
      <Head title="Mortgage Calculator" />
      <Navbar user={auth?.user} />
      <form className="mortgage-form" style={styles.form} onSubmit={handleSubmit}>
        {/* ...existing input fields and extra payment section... */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Home Value</label>
          <input
            type="text"
            name="homeValue"
            className="input"
            value={document.activeElement && document.activeElement.getAttribute('name') === 'homeValue' ? form.homeValue : formatCurrencyInput(form.homeValue)}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Down Payment</label>
          <input
            type="text"
            name="downPayment"
            className="input"
            value={document.activeElement && document.activeElement.getAttribute('name') === 'downPayment' ? form.downPayment : formatCurrencyInput(form.downPayment)}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Loan Amount</label>
          <input
            type="text"
            name="loanAmount"
            className="input"
            value={document.activeElement && document.activeElement.getAttribute('name') === 'loanAmount' ? form.loanAmount : formatCurrencyInput(form.loanAmount)}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            name="interestRate"
            className="input"
            value={form.interestRate}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Loan Term (years)</label>
          <input
            type="number"
            name="loanTerm"
            className="input"
            value={form.loanTerm}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Start Date</label>
          <input
            type="date"
            name="startDate"
            className="input"
            value={form.startDate}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Property Tax (annual)</label>
          <input
            type="text"
            name="propertyTax"
            className="input"
            value={form.propertyTax}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>PMI (monthly)</label>
          <input
            type="text"
            name="pmi"
            className="input"
            value={form.pmi}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Home Insurance (annual)</label>
          <input
            type="text"
            name="homeInsurance"
            className="input"
            value={form.homeInsurance}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>HOA (monthly)</label>
          <input
            type="text"
            name="hoa"
            className="input"
            value={form.hoa}
            onChange={handleCurrencyChange}
            onBlur={handleCurrencyBlur}
            style={styles.input}
            inputMode="decimal"
            autoComplete="off"
            step="0.01"
          />
        </div>
        <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <h4>Extra Payment Calculator</h4>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Extra Payment Type</label>
            <select name="extraPaymentType" value={form.extraPaymentType} onChange={handleChange} style={styles.input}>
              <option value="">None</option>
              <option value="one-time">One-Time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Extra Payment Amount</label>
            <input
              type="text"
              name="extraPaymentAmount"
              className="input"
              value={form.extraPaymentAmount}
              onChange={handleCurrencyChange}
              onBlur={handleCurrencyBlur}
              style={styles.input}
              inputMode="decimal"
              autoComplete="off"
              step="0.01"
              disabled={!form.extraPaymentType}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Start After Month (e.g. 0 = start now, 60 = after 5 years)</label>
            <input
              type="number"
              name="extraPaymentStartMonth"
              className="input"
              value={form.extraPaymentStartMonth}
              onChange={handleChange}
              style={styles.input}
              min={0}
              disabled={!form.extraPaymentType}
            />
          </div>
        </div>

        {/* Refinance Calculator Section */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <h4>Refinance Calculator</h4>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Refinance Start After Month</label>
            <input
              type="number"
              name="refinanceStartMonth"
              className="input"
              value={form.refinanceStartMonth || ''}
              onChange={handleChange}
              style={styles.input}
              min={0}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Estimated Refinance Interest Rate (%)</label>
            <input
              type="number"
              step="0.01"
              name="refinanceInterestRate"
              className="input"
              value={form.refinanceInterestRate || ''}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          {/* Placeholder for potential savings, to be calculated in backend logic */}
          <div style={{ marginTop: '0.5rem', color: '#444' }}>
            <strong>Potential Savings:</strong> <span>{result && result.refinanceSavings !== undefined ? `$${Number(result.refinanceSavings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</span>
          </div>
        </div>

        {/* Move Calculate button below Refinance Calculator */}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>
      {result && (
        <div style={styles.result}>
          <p><strong>Monthly Principal & Interest:</strong> {result.monthlyPayment !== undefined && result.monthlyPayment !== null && result.monthlyPayment !== '' ? `$${Number(result.monthlyPayment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
          <p><strong>Total Monthly Payment:</strong> {result.totalMonthly !== undefined && result.totalMonthly !== null && result.totalMonthly !== '' ? `$${Number(result.totalMonthly).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
          <ul style={{ margin: '0 0 1rem 0', padding: '0 0 0 1.5rem' }}>
            <li><strong>Interest:</strong> {result.monthlyInterest !== undefined && result.monthlyInterest !== null && result.monthlyInterest !== '' ? `$${Number(result.monthlyInterest).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Principal:</strong> {result.monthlyPrincipal !== undefined && result.monthlyPrincipal !== null && result.monthlyPrincipal !== '' ? `$${Number(result.monthlyPrincipal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Property Tax:</strong> {result.monthlyPropertyTax !== undefined && result.monthlyPropertyTax !== null && result.monthlyPropertyTax !== '' ? `$${Number(result.monthlyPropertyTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Insurance:</strong> {result.monthlyInsurance !== undefined && result.monthlyInsurance !== null && result.monthlyInsurance !== '' ? `$${Number(result.monthlyInsurance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>PMI:</strong> {result.monthlyPMI !== undefined && result.monthlyPMI !== null && result.monthlyPMI !== '' ? `$${Number(result.monthlyPMI).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>HOA:</strong> {typeof form.hoa === 'string' && form.hoa !== '' && !isNaN(Number(form.hoa)) ? `$${Number(form.hoa).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
          </ul>
          <p><strong>Total of All Payments:</strong> {result.totalPayments !== undefined && result.totalPayments !== null && result.totalPayments !== '' ? `$${Number(result.totalPayments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
          <ul style={{ margin: '0 0 1rem 0', padding: '0 0 0 1.5rem' }}>
            <li><strong>Total Interest Paid:</strong> {result.totalInterest !== undefined && result.totalInterest !== null && result.totalInterest !== '' ? `$${Number(result.totalInterest).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Total Principal Paid:</strong> {form.loanAmount !== undefined && form.loanAmount !== null && form.loanAmount !== '' && !isNaN(Number(form.loanAmount)) ? `$${Number(form.loanAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Total Property Tax:</strong> {result.totalPropertyTax !== undefined && result.totalPropertyTax !== null && result.totalPropertyTax !== '' ? `$${Number(result.totalPropertyTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Total Insurance:</strong> {result.totalHomeInsurance !== undefined && result.totalHomeInsurance !== null && result.totalHomeInsurance !== '' ? `$${Number(result.totalHomeInsurance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Total PMI Paid:</strong> {result.totalPMIPaidWithExtra !== undefined && result.totalPMIPaidWithExtra !== null && result.totalPMIPaidWithExtra !== '' ? `$${Number(result.totalPMIPaidWithExtra).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
            <li><strong>Down Payment:</strong> {form.downPayment !== undefined && form.downPayment !== null && form.downPayment !== '' && !isNaN(Number(form.downPayment)) ? `$${Number(form.downPayment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</li>
          </ul>
          {result.totalPaymentsWithExtra && (
            <>
              <p><strong>Total of All Payments (with Extra):</strong> {result.totalPaymentsWithExtra !== undefined && result.totalPaymentsWithExtra !== null && result.totalPaymentsWithExtra !== '' ? `$${Number(result.totalPaymentsWithExtra).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
              <p><strong>Total PMI Paid (with Extra):</strong> {result.totalPMIPaidWithExtra !== undefined && result.totalPMIPaidWithExtra !== null && result.totalPMIPaidWithExtra !== '' ? `$${Number(result.totalPMIPaidWithExtra).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
              <p><strong>Interest Saved:</strong> {result.interestSaved !== undefined && result.interestSaved !== null && result.interestSaved !== '' ? `$${Number(result.interestSaved).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
              <p><strong>New Loan Term:</strong> {typeof result.newLoanTermMonths === 'number' && !isNaN(result.newLoanTermMonths) ? `${result.newLoanTermMonths} months (${result.newLoanTermYears} years)` : 'N/A'}</p>
              <p><strong>Projected Payoff Date:</strong> {result.projectedPayoffDate ? result.projectedPayoffDate : 'N/A'}</p>
              <p><strong>Total Interest Paid So Far:</strong> {result.totalInterestPaidSoFar !== undefined && result.totalInterestPaidSoFar !== null && result.totalInterestPaidSoFar !== '' ? `$${Number(result.totalInterestPaidSoFar).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</p>
            </>
          )}
        </div>
      )}

    </div>
  );
}

export default MortgageCalculatorPage;

// Styles object at the very bottom
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    background: '#fff',
    color: '#222',
    minHeight: '100vh',
  },
  form: {
    maxWidth: 500,
    margin: '2rem auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  label: {
    flex: 1,
    textAlign: 'left',
    marginRight: '1rem',
    minWidth: 160,
  },
  input: {
    border: '1px solid #888',
    borderRadius: 4,
    padding: '8px 12px',
    outline: 'none',
    flex: 1,
    textAlign: 'left',
    minWidth: 120,
  },
  button: {
    padding: '10px',
    borderRadius: 4,
    background: '#222',
    color: '#fff',
    border: 'none',
    marginTop: '1rem',
  },
  result: {
    maxWidth: 500,
    margin: '2rem auto',
    padding: '1rem',
    border: '1px solid #888',
    borderRadius: 4,
    background: '#f9f9f9',
  },
};
