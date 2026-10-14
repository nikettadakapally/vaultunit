import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  cancelMoneyRequest,
  createChallenge,
  createMoneyRequest,
  createTransaction,
  declineMoneyRequest,
  deleteTransaction,
  getChallenges,
  getConnectionErrorMessage,
  getCsrfToken,
  getCurrentUser,
  getDashboard,
  getMoneyRequests,
  getTransactions,
  joinChallenge,
  leaveChallenge,
  logout,
  markMoneyRequestPaid,
  updatePreferences,
} from './api.js';
import AuthPage from './AuthPage.jsx';
import AssistantChat from './AssistantChat.jsx';
import { currencies, formatMoney, getExchangeRate, localDateString, parseExpenseText, parseReceiptText } from './currency.js';

const money = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const categoryColors = {
  Food: '#6958e8',
  Travel: '#22b981',
  Shopping: '#ff9c45',
  Bills: '#3885f6',
  Other: '#f15a78',
  Salary: '#22b981',
};

const categoryIcons = {
  Food: '◉',
  Travel: '↗',
  Shopping: '◇',
  Bills: '▤',
  Other: '✦',
  Salary: '↙',
};

const insightCategories = ['Food', 'Travel', 'Shopping', 'Bills', 'Other'];
const achievementCatalog = [
  { id: 'first-expense', title: 'First expense logged', description: 'Record your first expense to start tracking your money.', icon: '🧾' },
  { id: 'savings-goal', title: 'Goal setter', description: 'Save a savings goal in the What-If Simulator.', icon: '🎯' },
  { id: 'expense-streak', title: 'Consistent tracker', description: 'Log expenses on 7 different days.', icon: '📅' },
  { id: 'challenge-complete', title: 'Challenge champion', description: 'Complete a community no-spend challenge.', icon: '🏆' },
];

function Icon({ name, size = 20 }) {
  const paths = {
    wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 9h18M16 15h.01" /><path d="M5 6V4a1 1 0 0 1 1-1h12l2 3" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 14 4-4 3 2 5-6" /><path d="M16 6h3v3" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 14 1 2.5 2.5 1L20 18.5 19 21l-1-2.5-2.5-1 2.5-1L19 14Z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    moon: <path d="M20.8 13A8.6 8.6 0 0 1 11 3.2 8.8 8.8 0 1 0 20.8 13Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={onToggle}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}

function BillSplitter() {
  const [total, setTotal] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [peopleCount, setPeopleCount] = useState('2');
  const [reading, setReading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleBillUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setStatus('');
    if (!file.type.startsWith('image/')) {
      setError('Choose a bill image to scan.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Bill images must be 10 MB or smaller.');
      return;
    }

    setReading(true);
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng');
      const { data } = await worker.recognize(file);
      try {
        const parsedBill = parseReceiptText(data.text, currency);
        setTotal(String(parsedBill.amount));
        setCurrency(parsedBill.currency);
        setStatus('Bill total detected. Check it below, then adjust if needed.');
      } catch (parseError) {
        setStatus(`${parseError.message} Enter the bill total below to calculate the split.`);
      }
    } catch (scanError) {
      setError(scanError.message || 'Could not scan that bill. Enter the total manually instead.');
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (cleanupError) {
          setError((current) => [current, `Could not close the bill scanner cleanly: ${cleanupError.message}`].filter(Boolean).join(' '));
        }
      }
      setReading(false);
    }
  }

  const validTotal = Number(total);
  const validPeopleCount = Number(peopleCount);
  const hasSplit = Number.isFinite(validTotal)
    && validTotal > 0
    && Number.isInteger(validPeopleCount)
    && validPeopleCount >= 2
    && validPeopleCount <= 1000;

  return (
    <section className="bill-split-section" aria-labelledby="bill-split-title">
      <div className="bill-split-heading">
        <div>
          <span className="eyebrow">SHARE A BILL</span>
          <h2 id="bill-split-title">Split it equally</h2>
          <p>Upload a bill image or enter the total, then divide it between everyone.</p>
        </div>
        <span className="bill-split-icon" aria-hidden="true">÷</span>
      </div>

      {error && <div className="settings-feedback error" role="alert">{error}</div>}
      {status && <div className="settings-feedback success" role="status">{status}</div>}

      <div className="bill-split-controls">
        <label className="bill-upload-button secondary-button">
          {reading ? 'Scanning bill…' : 'Upload bill image'}
          <input type="file" accept="image/*" capture="environment" disabled={reading} onChange={handleBillUpload} aria-label="Upload a bill image" />
        </label>
        <label>
          <span>Bill total</span>
          <input type="number" min="0.01" max="100000000" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="Enter total" aria-label="Bill total" />
        </label>
        <label>
          <span>Currency</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Bill currency">
            {currencies.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
          </select>
        </label>
        <label>
          <span>Number of people</span>
          <input type="number" min="2" max="1000" step="1" value={peopleCount} onChange={(event) => setPeopleCount(event.target.value)} aria-label="Number of people sharing the bill" />
        </label>
      </div>

      {hasSplit && (
        <div className="bill-split-result" role="status" aria-live="polite">
          <div><span>Each person pays</span><strong>{formatMoney(validTotal / validPeopleCount, currency)}</strong></div>
          <p>{formatMoney(validTotal, currency)} split equally between {validPeopleCount} people. Each share is rounded to the currency’s standard precision.</p>
        </div>
      )}
      <p className="bill-split-privacy">Bill images are scanned in your browser and are not saved or added as transactions.</p>
    </section>
  );
}

function Logo() {
  return (
    <a className="brand" href="#overview" aria-label="VaultUnit home">
      <span className="brand-mark"><Icon name="wallet" size={21} /></span>
      <span>vault<span>unit</span><small>YOUR MONEY, IN FOCUS</small></span>
    </a>
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState(() => (
    window.localStorage.getItem('vaultunit-theme') === 'dark' ? 'dark' : 'light'
  ));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('vaultunit-theme', theme);
  }, [theme]);

  const checkSession = useCallback(async () => {
    setAuthError('');
    try {
      await getCsrfToken();
      setUser(await getCurrentUser());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      } else {
        setUser(null);
        setAuthError(getConnectionErrorMessage(error));
      }
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (!authReady) {
    return <div className="auth-loading"><span className="auth-spinner" />Securing your workspace…</div>;
  }

  if (!user) {
    return <AuthPage onAuthenticated={setUser} initialError={authError} onRetry={checkSession} />;
  }

  return <FinanceDashboard user={user} onLogout={handleLogout} onUserUpdated={setUser} theme={theme} onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />;
}

function FinanceDashboard({ user, onLogout, onUserUpdated, theme, onThemeToggle }) {
  const avatarStorageKey = `vaultunit-avatar-${user.id}`;
  const budgetStorageKey = `vaultunit-budgets-${user.id}`;
  const savingsGoalStorageKey = `vaultunit-savings-goal-${user.id}`;
  const achievementsStorageKey = `vaultunit-achievements-${user.id}`;
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [avatarPhoto, setAvatarPhoto] = useState('');
  const [monthlyBudgets, setMonthlyBudgets] = useState({});
  const [budgetDraft, setBudgetDraft] = useState({});
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [budgetError, setBudgetError] = useState('');
  const [unlockedAchievements, setUnlockedAchievements] = useState({});
  const [achievementsLoaded, setAchievementsLoaded] = useState(false);
  const [hasSavedSavingsGoal, setHasSavedSavingsGoal] = useState(false);
  const [savingsGoalLoaded, setSavingsGoalLoaded] = useState(false);
  const [achievementNotice, setAchievementNotice] = useState('');
  const [achievementError, setAchievementError] = useState('');
  const [simulatorInputs, setSimulatorInputs] = useState({
    monthlySpendingReduction: '500',
    monthlyIncomeIncrease: '2000',
    savedAmount: '34000',
    goalAmount: '50000',
  });
  const [settingsFeedback, setSettingsFeedback] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [challengeFormOpen, setChallengeFormOpen] = useState(false);
  const [challengeSaving, setChallengeSaving] = useState(false);
  const [challengeActionId, setChallengeActionId] = useState(null);
  const [challengeError, setChallengeError] = useState('');
  const [challengeForm, setChallengeForm] = useState({
    title: '7-day no-eating-out challenge',
    category: 'Food',
    durationDays: 7,
  });
  const [moneyRequestFormOpen, setMoneyRequestFormOpen] = useState(false);
  const [moneyRequestSaving, setMoneyRequestSaving] = useState(false);
  const [moneyRequestActionId, setMoneyRequestActionId] = useState(null);
  const [moneyRequestError, setMoneyRequestError] = useState('');
  const [moneyRequestForm, setMoneyRequestForm] = useState({
    recipientEmail: '',
    amount: '',
    currency: user.homeCurrency ?? 'INR',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [homeRate, setHomeRate] = useState(user.homeCurrency === 'INR' ? { rate: 1, date: localDateString() } : null);
  const [homeRateError, setHomeRateError] = useState('');
  const [formRate, setFormRate] = useState({ rate: 1, date: localDateString() });
  const [formRateError, setFormRateError] = useState('');
  const [quickEntry, setQuickEntry] = useState('');
  const [quickEntryError, setQuickEntryError] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const receiptInputRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const homeRateRequestRef = useRef(0);
  const [form, setForm] = useState({
    description: '',
    category: 'Food',
    type: 'EXPENSE',
    amount: '',
    currency: user.homeCurrency ?? 'INR',
    date: localDateString(),
    paymentMethod: 'UPI',
  });

  useEffect(() => {
    try {
      setAvatarPhoto(window.localStorage.getItem(avatarStorageKey) ?? '');
    } catch (storageError) {
      setSettingsFeedback({ type: 'error', text: `Could not load your profile photo: ${storageError.message}` });
    }
  }, [avatarStorageKey]);

  useEffect(() => {
    try {
      const storedBudgets = window.localStorage.getItem(budgetStorageKey);
      const parsedBudgets = storedBudgets ? JSON.parse(storedBudgets) : {};
      if (!parsedBudgets || typeof parsedBudgets !== 'object' || Array.isArray(parsedBudgets)) {
        throw new Error('Saved monthly budgets are invalid.');
      }
      const validBudgets = Object.fromEntries(
        Object.entries(parsedBudgets).filter(
          ([category, amount]) => insightCategories.includes(category) && Number.isFinite(amount) && amount > 0,
        ),
      );
      setMonthlyBudgets(validBudgets);
    } catch (storageError) {
      setBudgetError(`Could not load your spending budgets: ${storageError.message}`);
    }
  }, [budgetStorageKey]);

  useEffect(() => {
    try {
      const storedGoal = window.localStorage.getItem(savingsGoalStorageKey);
      if (storedGoal) {
        const goal = JSON.parse(storedGoal);
        if (!goal || !Number.isFinite(goal.savedAmount) || goal.savedAmount < 0
          || !Number.isFinite(goal.goalAmount) || goal.goalAmount <= 0) {
          throw new Error('Saved goal amounts are invalid.');
        }
        setSimulatorInputs((current) => ({
          ...current,
          savedAmount: String(goal.savedAmount),
          goalAmount: String(goal.goalAmount),
        }));
        setHasSavedSavingsGoal(true);
      }
    } catch (storageError) {
      setAchievementError(`Could not load your savings goal: ${storageError.message}`);
    } finally {
      setSavingsGoalLoaded(true);
    }
  }, [savingsGoalStorageKey]);

  useEffect(() => {
    try {
      const storedAchievements = window.localStorage.getItem(achievementsStorageKey);
      const parsedAchievements = storedAchievements ? JSON.parse(storedAchievements) : {};
      if (!parsedAchievements || typeof parsedAchievements !== 'object' || Array.isArray(parsedAchievements)) {
        throw new Error('Saved achievement data is invalid.');
      }
      setUnlockedAchievements(Object.fromEntries(
        Object.entries(parsedAchievements).filter(
          ([id, earnedAt]) => achievementCatalog.some((achievement) => achievement.id === id)
            && typeof earnedAt === 'string'
            && Number.isFinite(Date.parse(earnedAt)),
        ),
      ));
    } catch (storageError) {
      setAchievementError(`Could not load your achievements: ${storageError.message}`);
    } finally {
      setAchievementsLoaded(true);
    }
  }, [achievementsStorageKey]);

  useEffect(() => {
    if (!navigationOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setNavigationOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [navigationOpen]);

  const refreshHomeRate = useCallback(async (currency, refresh = false) => {
    const requestId = ++homeRateRequestRef.current;
    setHomeRateError('');
    try {
      const quote = await getExchangeRate('INR', currency, { refresh });
      if (requestId === homeRateRequestRef.current) setHomeRate(quote);
    } catch (rateError) {
      if (requestId === homeRateRequestRef.current) {
        setHomeRate(null);
        setHomeRateError(rateError.message);
      }
    }
  }, []);

  useEffect(() => {
    refreshHomeRate(user.homeCurrency ?? 'INR');
  }, [refreshHomeRate, user.homeCurrency]);

  useEffect(() => {
    let active = true;
    setFormRate(form.currency === 'INR' ? { rate: 1, date: localDateString() } : null);
    setFormRateError('');
    getExchangeRate(form.currency, 'INR')
      .then((quote) => {
        if (active) setFormRate(quote);
      })
      .catch((rateError) => {
        if (active) {
          setFormRate(null);
          setFormRateError(rateError.message);
        }
      });
    return () => { active = false; };
  }, [form.currency]);

  useEffect(() => {
    if (form.amount === '') {
      setForm((current) => ({ ...current, currency: user.homeCurrency ?? 'INR' }));
    }
  }, [user.homeCurrency]);

  const refresh = useCallback(async () => {
    const [nextDashboard, nextTransactions, nextChallenges, nextMoneyRequests] = await Promise.all([
      getDashboard(),
      getTransactions(),
      getChallenges(),
      getMoneyRequests(),
    ]);
    setDashboard(nextDashboard);
    setTransactions(nextTransactions);
    setChallenges(nextChallenges);
    setMoneyRequests(nextMoneyRequests);
  }, []);

  useEffect(() => {
    refresh()
      .catch((loadError) => setError(getConnectionErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, [refresh]);

  const spendingTotal = dashboard?.monthlySpending ?? 0;
  const pendingIncomingRequestCount = moneyRequests.filter(
    (item) => !item.requestedByMe && item.status === 'PENDING',
  ).length;
  const categoryData = useMemo(
    () => dashboard?.spendingByCategory ?? [],
    [dashboard],
  );
  const topCategory = categoryData[0]?.category ?? 'Food';
  const formatHomeMoney = useCallback((amountInInr) => formatMoney(
    (amountInInr ?? 0) * (user.homeCurrency === 'INR' ? 1 : homeRate?.rate ?? 1),
    user.homeCurrency === 'INR' || homeRate ? user.homeCurrency : 'INR',
  ), [homeRate, user.homeCurrency]);
  const smartInsights = useMemo(() => {
    const today = new Date();
    const currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const comparisonEnd = new Date(
      previousStart.getFullYear(),
      previousStart.getMonth(),
      Math.min(today.getDate(), new Date(today.getFullYear(), today.getMonth(), 0).getDate()),
    );
    const toDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const currentStartString = toDateString(currentStart);
    const previousStartString = toDateString(previousStart);
    const comparisonEndString = toDateString(comparisonEnd);
    const currentByCategory = {};
    const previousByCategory = {};

    transactions.forEach((transaction) => {
      if (transaction.type !== 'EXPENSE' || !transaction.date) return;
      const amount = Number(transaction.amountInInr ?? transaction.amount);
      if (!Number.isFinite(amount) || amount < 0) return;
      if (transaction.date >= currentStartString && transaction.date <= toDateString(today)) {
        currentByCategory[transaction.category] = (currentByCategory[transaction.category] ?? 0) + amount;
      } else if (transaction.date >= previousStartString && transaction.date <= comparisonEndString) {
        previousByCategory[transaction.category] = (previousByCategory[transaction.category] ?? 0) + amount;
      }
    });

    const currentTotal = Object.values(currentByCategory).reduce((sum, amount) => sum + amount, 0);
    const topCurrentCategory = Object.entries(currentByCategory).sort((left, right) => right[1] - left[1])[0];
    const insights = [];
    const categoryChanges = [...new Set([...Object.keys(currentByCategory), ...Object.keys(previousByCategory)])]
      .map((category) => ({
        category,
        change: (currentByCategory[category] ?? 0) - (previousByCategory[category] ?? 0),
      }))
      .filter((item) => item.change !== 0)
      .sort((left, right) => Math.abs(right.change) - Math.abs(left.change));

    if (categoryChanges.length > 0) {
      const { category, change } = categoryChanges[0];
      insights.push({
        id: 'month-comparison',
        text: `You spent ${formatHomeMoney(Math.abs(change))} ${change > 0 ? 'more' : 'less'} on ${category.toLowerCase()} than by this point last month.`,
      });
    }

    if (topCurrentCategory && currentTotal > 0) {
      const share = Math.round((topCurrentCategory[1] / currentTotal) * 100);
      insights.push({
        id: 'category-share',
        text: `${topCurrentCategory[0]} accounts for ${share}% of your expenses this month.`,
      });
    }

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    Object.entries(monthlyBudgets).forEach(([category, budget]) => {
      const spent = currentByCategory[category] ?? 0;
      const projected = (spent / today.getDate()) * daysInMonth;
      if (spent > 0 && projected > budget) {
        insights.push({
          id: `budget-${category}`,
          text: `At your current spending pace, you'll exceed your ${category.toLowerCase()} budget by about ${formatHomeMoney(projected - budget)}.`,
          warning: true,
        });
      }
    });

    return insights;
  }, [transactions, monthlyBudgets, formatHomeMoney]);
  const savingsRate =
    dashboard?.monthlyIncome > 0
      ? Math.round((dashboard.monthlySavings / dashboard.monthlyIncome) * 100)
      : 0;
  const simulatorCurrencyRate = user.homeCurrency === 'INR' ? 1 : homeRate?.rate;
  const parsedSimulatorInputs = Object.fromEntries(
    Object.entries(simulatorInputs).map(([key, value]) => [key, value.trim() === '' ? Number.NaN : Number(value)]),
  );
  const simulatorInputsValid = Object.values(parsedSimulatorInputs).every(
    (amount) => Number.isFinite(amount) && amount >= 0,
  );
  const goalAmountRemaining = simulatorInputsValid
    ? Math.max(0, parsedSimulatorInputs.goalAmount - parsedSimulatorInputs.savedAmount)
    : 0;
  const goalProgress = Number.isFinite(parsedSimulatorInputs.savedAmount)
    && parsedSimulatorInputs.savedAmount >= 0
    && Number.isFinite(parsedSimulatorInputs.goalAmount)
    && parsedSimulatorInputs.goalAmount > 0
    ? Math.min((parsedSimulatorInputs.savedAmount / parsedSimulatorInputs.goalAmount) * 100, 100)
    : 0;
  const currentMonthlySavings = simulatorCurrencyRate
    ? (dashboard?.monthlySavings ?? 0) * simulatorCurrencyRate
    : null;
  const hypotheticalMonthlySavings = currentMonthlySavings === null
    ? null
    : currentMonthlySavings
      + parsedSimulatorInputs.monthlySpendingReduction
      + parsedSimulatorInputs.monthlyIncomeIncrease;
  const monthsAtCurrentPace = currentMonthlySavings > 0 && goalAmountRemaining > 0
    ? Math.ceil(goalAmountRemaining / currentMonthlySavings)
    : null;
  const monthsAtWhatIfPace = hypotheticalMonthlySavings > 0 && goalAmountRemaining > 0
    ? Math.ceil(goalAmountRemaining / hypotheticalMonthlySavings)
    : null;
  const monthsSavedByWhatIf = monthsAtCurrentPace !== null && monthsAtWhatIfPace !== null
    ? Math.max(0, monthsAtCurrentPace - monthsAtWhatIfPace)
    : null;
  const eligibleAchievementIds = useMemo(() => {
    const ids = [];
    if (transactions.some((transaction) => transaction.type === 'EXPENSE')) ids.push('first-expense');
    if (hasSavedSavingsGoal) ids.push('savings-goal');
    const today = localDateString();
    const loggedExpenseDates = new Set(
      transactions
        .filter((transaction) => transaction.type === 'EXPENSE' && transaction.date && transaction.date <= today)
        .map((transaction) => transaction.date),
    );
    if (loggedExpenseDates.size >= 7) ids.push('expense-streak');
    if (challenges.some((challenge) => {
      if (!challenge.joinedByMe || challenge.active || challenge.category !== 'ALL') return false;
      const myProgress = challenge.participants.find((participant) => participant.userId === user.id);
      return myProgress?.daysCompleted >= challenge.durationDays;
    })) {
      ids.push('challenge-complete');
    }
    return ids;
  }, [transactions, hasSavedSavingsGoal, challenges, user.id]);
  const expenseLogDayCount = useMemo(() => new Set(
    transactions
      .filter((transaction) => transaction.type === 'EXPENSE'
        && transaction.date
        && transaction.date <= localDateString())
      .map((transaction) => transaction.date),
  ).size, [transactions]);
  const activeNoSpendProgress = useMemo(() => challenges
    .filter((challenge) => challenge.joinedByMe && challenge.category === 'ALL')
    .map((challenge) => ({
      challenge,
      progress: challenge.participants.find((participant) => participant.userId === user.id),
    }))
    .filter((entry) => entry.progress)
    .sort((left, right) => right.progress.progressPercent - left.progress.progressPercent)[0] ?? null,
  [challenges, user.id]);

  useEffect(() => {
    if (loading || !achievementsLoaded || !savingsGoalLoaded) return;
    const newlyUnlocked = achievementCatalog.filter(
      (achievement) => eligibleAchievementIds.includes(achievement.id) && !unlockedAchievements[achievement.id],
    );
    if (newlyUnlocked.length === 0) return;

    const earnedAt = new Date().toISOString();
    const nextAchievements = { ...unlockedAchievements };
    newlyUnlocked.forEach((achievement) => {
      nextAchievements[achievement.id] = earnedAt;
    });
    try {
      window.localStorage.setItem(achievementsStorageKey, JSON.stringify(nextAchievements));
      setUnlockedAchievements(nextAchievements);
      setAchievementNotice(`Achievement unlocked: ${newlyUnlocked.map((achievement) => achievement.title).join(', ')}!`);
      setAchievementError('');
    } catch (storageError) {
      setAchievementError(`Could not save your achievement: ${storageError.message}`);
    }
  }, [
    achievementsLoaded,
    achievementsStorageKey,
    eligibleAchievementIds,
    loading,
    savingsGoalLoaded,
    unlockedAchievements,
  ]);

  function openBudgetEditor() {
    const conversionRate = user.homeCurrency === 'INR' ? 1 : homeRate?.rate;
    setBudgetDraft(Object.fromEntries(insightCategories.map((category) => {
      const amount = monthlyBudgets[category];
      return [category, amount && conversionRate ? String(Number((amount * conversionRate).toFixed(2))) : ''];
    })));
    setBudgetEditorOpen(true);
  }

  function saveMonthlyBudgets(event) {
    event.preventDefault();
    const conversionRate = user.homeCurrency === 'INR' ? 1 : homeRate?.rate;
    if (!conversionRate || conversionRate <= 0) {
      setBudgetError('Could not save budgets because the home-currency exchange rate is unavailable.');
      return;
    }
    const nextBudgets = {};
    for (const category of insightCategories) {
      const value = budgetDraft[category]?.trim() ?? '';
      if (!value) continue;
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        setBudgetError(`Enter a valid positive monthly budget for ${category}, or leave it blank.`);
        return;
      }
      nextBudgets[category] = Number((amount / conversionRate).toFixed(2));
    }
    try {
      window.localStorage.setItem(budgetStorageKey, JSON.stringify(nextBudgets));
      setMonthlyBudgets(nextBudgets);
      setBudgetEditorOpen(false);
      setBudgetError('');
    } catch (storageError) {
      setBudgetError(`Could not save your spending budgets: ${storageError.message}`);
    }
  }

  function saveSavingsGoal() {
    const savedAmount = Number(simulatorInputs.savedAmount);
    const goalAmount = Number(simulatorInputs.goalAmount);
    if (!Number.isFinite(savedAmount) || savedAmount < 0 || !Number.isFinite(goalAmount) || goalAmount <= 0) {
      setAchievementError('Enter a savings amount of zero or more and a goal greater than zero.');
      return;
    }
    try {
      window.localStorage.setItem(savingsGoalStorageKey, JSON.stringify({ savedAmount, goalAmount }));
      setHasSavedSavingsGoal(true);
      setAchievementError('');
      setAchievementNotice('Savings goal saved. Keep making progress toward it!');
    } catch (storageError) {
      setAchievementError(`Could not save your savings goal: ${storageError.message}`);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const quote = form.currency === 'INR' ? { rate: 1 } : await getExchangeRate(form.currency, 'INR');
      const amount = Number(form.amount);
      await createTransaction({
        ...form,
        amount,
        amountInInr: Number((amount * quote.rate).toFixed(2)),
      });
      setForm({
        description: '',
        category: 'Food',
        type: 'EXPENSE',
        amount: '',
        currency: user.homeCurrency ?? 'INR',
        date: localDateString(),
        paymentMethod: 'UPI',
      });
      setModalOpen(false);
      setQuickEntry('');
      setQuickEntryError('');
      await refresh();
    } catch (saveError) {
      setError(getConnectionErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleHomeCurrencyChange(event) {
    const homeCurrency = event.target.value;
    setSavingCurrency(true);
    setError('');
    try {
      const updatedUser = await updatePreferences({ homeCurrency });
      onUserUpdated(updatedUser);
      if (activeView === 'settings') {
        setSettingsFeedback({ type: 'success', text: 'Home currency updated.' });
      }
    } catch (preferenceError) {
      setError(getConnectionErrorMessage(preferenceError));
      if (activeView === 'settings') {
        const message = getConnectionErrorMessage(preferenceError);
        if (message) {
          setSettingsFeedback({ type: 'error', text: `Could not update home currency: ${message}` });
        }
      }
    } finally {
      setSavingCurrency(false);
    }
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setSettingsFeedback({ type: 'error', text: 'Choose a JPG, PNG, WEBP, or GIF image.' });
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setSettingsFeedback({ type: 'error', text: 'Profile photos must be 1.5 MB or smaller.' });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setSettingsFeedback({ type: 'error', text: 'Could not read that image. Please try another file.' });
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setSettingsFeedback({ type: 'error', text: 'Could not read that image. Please try another file.' });
        return;
      }
      try {
        window.localStorage.setItem(avatarStorageKey, reader.result);
        setAvatarPhoto(reader.result);
        setSettingsFeedback({ type: 'success', text: 'Profile photo updated.' });
      } catch (storageError) {
        setSettingsFeedback({ type: 'error', text: `Could not save your profile photo: ${storageError.message}` });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    try {
      window.localStorage.removeItem(avatarStorageKey);
      setAvatarPhoto('');
      setSettingsFeedback({ type: 'success', text: 'Profile photo removed.' });
    } catch (storageError) {
      setSettingsFeedback({ type: 'error', text: `Could not remove your profile photo: ${storageError.message}` });
    }
  }

  function applyParsedEntry(parsed) {
    setForm((current) => ({
      ...current,
      ...parsed,
      amount: String(parsed.amount),
      paymentMethod: current.paymentMethod,
    }));
  }

  function handleParseQuickEntry() {
    setQuickEntryError('');
    try {
      applyParsedEntry(parseExpenseText(quickEntry, user.homeCurrency ?? 'INR'));
      setQuickEntry('');
    } catch (parseError) {
      setQuickEntryError(parseError.message);
    }
  }

  async function handleReceiptUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setOcrStatus('');
      setOcrError('Choose a receipt image to scan.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrStatus('');
      setOcrError('Receipt images must be 10 MB or smaller.');
      return;
    }
    setOcrStatus('Reading receipt…');
    setOcrError('');
    let worker;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng');
      const { data } = await worker.recognize(file);
      applyParsedEntry(parseReceiptText(data.text, user.homeCurrency ?? 'INR'));
      setOcrStatus('Receipt scanned. Review the extracted details before saving.');
    } catch (scanError) {
      setOcrStatus('');
      setOcrError(scanError.message || 'Could not read the receipt. Please enter its details manually.');
    } finally {
      try {
        await worker?.terminate();
      } catch (cleanupError) {
        setOcrError((current) => [current, `Could not close the OCR worker cleanly: ${cleanupError.message}`].filter(Boolean).join(' '));
      }
    }
  }

  function handleVoiceInput() {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setQuickEntryError('Voice input is not supported by this browser. You can type the expense instead.');
      return;
    }
    setQuickEntryError('');
    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setQuickEntry(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      setQuickEntryError(`Voice input failed (${event.error}). You can type the expense instead.`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  async function handleDelete(id) {
    setError('');
    try {
      await deleteTransaction(id);
      await refresh();
    } catch (deleteError) {
      setError(getConnectionErrorMessage(deleteError));
    }
  }

  async function handleCreateChallenge(event) {
    event.preventDefault();
    setChallengeSaving(true);
    setChallengeError('');
    try {
      await createChallenge({
        ...challengeForm,
        title: challengeForm.title.trim(),
        durationDays: Number(challengeForm.durationDays),
      });
      setChallengeFormOpen(false);
      setChallengeForm({
        title: challengeForm.category === 'Food' ? '7-day no-eating-out challenge' : '7-day no-spend challenge',
        category: challengeForm.category,
        durationDays: 7,
      });
      await refresh();
    } catch (createError) {
      setChallengeError(getConnectionErrorMessage(createError));
    } finally {
      setChallengeSaving(false);
    }
  }

  async function handleChallengeMembership(challenge) {
    setChallengeActionId(challenge.id);
    setChallengeError('');
    try {
      if (challenge.joinedByMe) {
        await leaveChallenge(challenge.id);
      } else {
        await joinChallenge(challenge.id);
      }
      setChallenges(await getChallenges());
    } catch (membershipError) {
      setChallengeError(getConnectionErrorMessage(membershipError));
    } finally {
      setChallengeActionId(null);
    }
  }

  async function handleCreateMoneyRequest(event) {
    event.preventDefault();
    setMoneyRequestSaving(true);
    setMoneyRequestError('');
    try {
      await createMoneyRequest({
        ...moneyRequestForm,
        recipientEmail: moneyRequestForm.recipientEmail.trim(),
        amount: Number(moneyRequestForm.amount),
        note: moneyRequestForm.note.trim() || null,
      });
      setMoneyRequestForm({
        recipientEmail: '',
        amount: '',
        currency: user.homeCurrency ?? 'INR',
        note: '',
      });
      setMoneyRequestFormOpen(false);
      setMoneyRequests(await getMoneyRequests());
    } catch (requestError) {
      setMoneyRequestError(getConnectionErrorMessage(requestError));
    } finally {
      setMoneyRequestSaving(false);
    }
  }

  async function handleMoneyRequestAction(request, action) {
    setMoneyRequestActionId(request.id);
    setMoneyRequestError('');
    try {
      if (action === 'paid') await markMoneyRequestPaid(request.id);
      else if (action === 'decline') await declineMoneyRequest(request.id);
      else await cancelMoneyRequest(request.id);
      setMoneyRequests(await getMoneyRequests());
    } catch (actionError) {
      setMoneyRequestError(getConnectionErrorMessage(actionError));
    } finally {
      setMoneyRequestActionId(null);
    }
  }

  return (
    <div className="app-shell" id="overview">
      {navigationOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavigationOpen(false)}
        />
      )}
      <aside id="workspace-navigation" className={`sidebar ${navigationOpen ? 'is-open' : ''}`}>
        <Logo />
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className={`nav-link ${activeView === 'overview' ? 'active' : ''}`} href="#overview" onClick={() => { setActiveView('overview'); setNavigationOpen(false); }}><Icon name="grid" />Overview</a>
          <a className={`nav-link ${activeView === 'transactions' ? 'active' : ''}`} href="#transactions" onClick={() => { setActiveView('transactions'); setNavigationOpen(false); }}><Icon name="card" />Transactions</a>
          <a className={`nav-link ${activeView === 'insights' ? 'active' : ''}`} href="#insights" onClick={() => { setActiveView('insights'); setNavigationOpen(false); }}><Icon name="chart" />Insights</a>
          <a className="nav-link" href="#goals" onClick={() => { setActiveView('overview'); setNavigationOpen(false); }}><Icon name="target" />Savings goals</a>
          <a className="nav-link" href="#achievements" onClick={() => { setActiveView('achievements'); setNavigationOpen(false); }}><Icon name="spark" />Achievements</a>
          <a className="nav-link" href="#challenges" onClick={() => { setActiveView('overview'); setNavigationOpen(false); }}><Icon name="spark" />Challenges</a>
          <a className="nav-link" href="#money-requests" onClick={() => { setActiveView('overview'); setNavigationOpen(false); }}><Icon name="card" />Money requests</a>
          <button className={`nav-link settings-nav-link ${activeView === 'settings' ? 'active' : ''}`} type="button" onClick={() => { setActiveView('settings'); setNavigationOpen(false); }}><Icon name="settings" />Settings</button>
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <span className="upgrade-spark"><Icon name="spark" size={18} /></span>
            <strong>Small steps add up.</strong>
            <p>Every smart money habit starts with knowing where you stand.</p>
            <a href="#insights">Explore your insights <Icon name="arrow" size={14} /></a>
          </div>
          <div className="profile">
            <div className="avatar">{avatarPhoto ? <img src={avatarPhoto} alt={`${user.name}'s profile`} /> : user.name.charAt(0).toUpperCase()}</div>
            <div><strong>{user.name}</strong><span>{user.email}</span></div>
            <button className="icon-button profile-menu" aria-label="Sign out" title="Sign out" onClick={onLogout}><Icon name="arrow" size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            type="button"
            aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={navigationOpen}
            aria-controls="workspace-navigation"
            title={navigationOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setNavigationOpen((open) => !open)}
          >
            <Icon name={navigationOpen ? 'close' : 'menu'} />
          </button>
          <div className="breadcrumb">Workspace <Icon name="chevron" size={15} /> <span>{activeView === 'settings' ? 'Settings' : 'Overview'}</span></div>
          <div className="topbar-right">
            <span className="live-status"><i /> All accounts synced</span>
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            <a className="request-notification-link" href="#money-requests" aria-label={`${pendingIncomingRequestCount} pending money requests`}>
              <Icon name="bell" size={19} />
              {pendingIncomingRequestCount > 0 && (
                <span>{pendingIncomingRequestCount}</span>
              )}
            </a>
            <label className="home-currency-control">
              <span className="sr-only">Home currency</span>
              <select aria-label="Home currency" value={user.homeCurrency ?? 'INR'} disabled={savingCurrency} onChange={handleHomeCurrencyChange}>
                {currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
              </select>
            </label>
            {user.homeCurrency !== 'INR' && (
              <button className="rate-refresh" type="button" onClick={() => refreshHomeRate(user.homeCurrency, true)} disabled={savingCurrency} title={homeRateError || (homeRate ? `Rate date: ${homeRate.date}` : 'Refresh exchange rate')}>
                {homeRate ? `Rates · ${homeRate.date}` : 'Rates unavailable'}
              </button>
            )}
            <button className="top-avatar account-avatar" aria-label={`Sign out ${user.name}`} title="Sign out" onClick={onLogout}>{avatarPhoto ? <img src={avatarPhoto} alt="" /> : user.name.charAt(0).toUpperCase()}</button>
          </div>
        </header>

        <nav className="mobile-bottom-nav" aria-label="Quick navigation">
          <a className={`mobile-bottom-link ${activeView === 'overview' ? 'active' : ''}`} href="#overview" onClick={() => setActiveView('overview')}><Icon name="grid" size={19} /><span>Home</span></a>
          <a className={`mobile-bottom-link ${activeView === 'transactions' ? 'active' : ''}`} href="#transactions" onClick={() => setActiveView('transactions')}><Icon name="card" size={19} /><span>Activity</span></a>
          <a className={`mobile-bottom-link ${activeView === 'insights' ? 'active' : ''}`} href="#insights" onClick={() => setActiveView('insights')}><Icon name="chart" size={19} /><span>Insights</span></a>
          <button className={`mobile-bottom-link ${activeView === 'settings' ? 'active' : ''}`} type="button" onClick={() => setActiveView('settings')}><Icon name="settings" size={19} /><span>Settings</span></button>
        </nav>

        <div className="page-content">
          {activeView === 'settings' ? (
            <section className="settings-page" aria-labelledby="settings-title">
              <div className="welcome-row settings-welcome">
                <div>
                  <div className="eyebrow">MAKE VAULTUNIT YOURS</div>
                  <h1 id="settings-title">Settings</h1>
                  <p>Manage your profile and the preferences that shape your workspace.</p>
                </div>
                <button className="secondary-button settings-back-button" type="button" onClick={() => setActiveView('overview')}>
                  <Icon name="arrow" size={15} /> Back to overview
                </button>
              </div>

              {settingsFeedback && (
                <div className={`settings-feedback ${settingsFeedback.type}`} role={settingsFeedback.type === 'error' ? 'alert' : 'status'}>
                  {settingsFeedback.text}
                  <button type="button" aria-label="Dismiss message" onClick={() => setSettingsFeedback(null)}>×</button>
                </div>
              )}

              <div className="settings-grid">
                <article className="panel settings-card">
                  <div className="panel-heading"><div><h2>Profile</h2><p>Your account identity and profile photo</p></div></div>
                  <div className="settings-profile">
                    <div className="settings-avatar">{avatarPhoto ? <img src={avatarPhoto} alt={`${user.name}'s profile`} /> : user.name.charAt(0).toUpperCase()}</div>
                    <div className="settings-profile-details"><strong>{user.name}</strong><span>{user.email}</span></div>
                  </div>
                  <div className="settings-photo-actions">
                    <label className="primary-button settings-upload-button">
                      {avatarPhoto ? 'Change photo' : 'Add a photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} aria-label="Choose a profile photo" />
                    </label>
                    {avatarPhoto && <button className="secondary-button" type="button" onClick={handleRemoveAvatar}>Remove photo</button>}
                  </div>
                  <p className="settings-help">JPG, PNG, WEBP, or GIF · up to 1.5 MB. Your photo is saved on this device.</p>
                </article>

                <article className="panel settings-card">
                  <div className="panel-heading"><div><h2>Preferences</h2><p>Choose how VaultUnit looks and displays amounts</p></div></div>
                  <div className="settings-preference-row">
                    <div><strong>Home currency</strong><span>Used for dashboard totals and new transactions</span></div>
                    <label className="home-currency-control">
                      <span className="sr-only">Home currency</span>
                      <select aria-label="Home currency" value={user.homeCurrency ?? 'INR'} disabled={savingCurrency} onChange={handleHomeCurrencyChange}>
                        {currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="settings-preference-row">
                    <div><strong>Appearance</strong><span>Choose a comfortable display theme</span></div>
                    <ThemeToggle theme={theme} onToggle={onThemeToggle} />
                  </div>
                </article>
              </div>
            </section>
          ) : (
            <>
          <section className="welcome-row">
            <div>
              <div className="eyebrow">GOOD MORNING · {new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</div>
              <h1>Your money, <span>in focus.</span></h1>
              <p>A clearer picture today makes a stronger plan for tomorrow.</p>
            </div>
            <button className="primary-button" onClick={() => setModalOpen(true)}><Icon name="plus" size={18} />Add transaction</button>
          </section>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => refresh().catch((loadError) => setError(getConnectionErrorMessage(loadError)))}>Retry</button>
            </div>
          )}
          {homeRateError && user.homeCurrency !== 'INR' && (
            <div className="error-banner currency-rate-warning" role="alert">
              <span>{homeRateError} Dashboard values are shown in INR until a home-currency rate is available.</span>
              <button onClick={() => refreshHomeRate(user.homeCurrency, true)}>Retry rates</button>
            </div>
          )}

          <section className="stats-grid" aria-label="Financial overview">
            <article className="stat-card balance-card">
              <div className="stat-card-top"><span>Total balance</span><span className="stat-icon"><Icon name="wallet" size={17} /></span></div>
              <div className="stat-value">{loading ? '—' : formatHomeMoney(dashboard?.totalBalance)}</div>
              <div className="stat-foot"><span className="trend-chip positive">↗ {dashboard?.balanceChange ?? 0}%</span><span>vs. last month</span><span className="mini-bars"><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>Monthly spending</span><span className="stat-icon peach"><Icon name="chart" size={17} /></span></div>
              <div className="stat-value">{loading ? '—' : formatHomeMoney(spendingTotal)}</div>
              <div className="stat-foot"><span className="trend-chip positive">↘ 8%</span><span>vs. last month</span><span className="mini-bars mint"><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>Monthly savings</span><span className="stat-icon mint-bg"><Icon name="target" size={17} /></span></div>
              <div className="stat-value">{loading ? '—' : formatHomeMoney(dashboard?.monthlySavings)}</div>
              <div className="stat-foot"><span className="trend-chip positive">↗ {savingsRate}%</span><span>of monthly income</span><span className="mini-bars purple"><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel spending-panel" id="insights">
              <div className="panel-heading"><div><h2>Spending breakdown</h2><p>See where your money goes this month</p></div><button className="period-select" aria-label="Showing this month">This month <span>⌄</span></button></div>
              {categoryData.length === 0 ? (
                <div className="empty-state">Add an expense to see your spending breakdown.</div>
              ) : (
                <div className="spending-content">
                  <div
                    className="donut-chart"
                    style={{
                      background: `conic-gradient(${categoryData.map((item, index) => {
                        const from = categoryData.slice(0, index).reduce((sum, current) => sum + current.percentage, 0);
                        const to = from + item.percentage;
                        return `${categoryColors[item.category] ?? '#8f9bad'} ${from}% ${to}%`;
                      }).join(', ')})`,
                    }}
                    role="img"
                    aria-label={`Spending chart. Total expenses ${formatHomeMoney(spendingTotal)}`}
                  >
                    <div className="donut-hole"><strong>{formatHomeMoney(spendingTotal)}</strong><span>spent this month</span></div>
                  </div>
                  <div className="category-list">
                    {categoryData.map((item) => (
                      <div className="category-row" key={item.category}>
                        <span className="category-dot" style={{ background: categoryColors[item.category] ?? '#8f9bad' }} />
                        <span>{item.category}</span><strong>{formatHomeMoney(item.amount)}</strong><small>{item.percentage}%</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="spending-insight"><span className="insight-bulb"><Icon name="spark" size={16} /></span><span><strong>{topCategory}</strong> is your top spending category this month.</span><Icon name="arrow" size={15} /></div>
            </article>

            <article className="panel trend-panel">
              <div className="panel-heading"><div><h2>Spending trend</h2><p>Your monthly activity at a glance</p></div><button className="chart-menu" aria-label="Chart options">···</button></div>
              <div className="trend-chart">
                <div className="chart-y-labels"><span>{formatHomeMoney(spendingTotal * 1.2)}</span><span>{formatHomeMoney(spendingTotal * 0.8)}</span><span>{formatHomeMoney(spendingTotal * 0.4)}</span><span>{formatHomeMoney(0)}</span></div>
                <svg viewBox="0 0 480 160" preserveAspectRatio="none" role="img" aria-label="Illustrative monthly spending trend">
                  <defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#58bd9d" stopOpacity=".20" /><stop offset="100%" stopColor="#58bd9d" stopOpacity="0" /></linearGradient></defs>
                  <path className="chart-gridline" d="M0 25H480M0 65H480M0 105H480M0 145H480" />
                  <path className="chart-area" d="M0 116 C24 108 29 90 55 96 S91 112 115 86 S153 78 177 91 S215 66 239 72 S278 88 300 63 S342 70 358 48 S392 58 414 38 S447 52 480 15 L480 155 L0 155Z" />
                  <path className="chart-line" d="M0 116 C24 108 29 90 55 96 S91 112 115 86 S153 78 177 91 S215 66 239 72 S278 88 300 63 S342 70 358 48 S392 58 414 38 S447 52 480 15" />
                  <circle cx="480" cy="15" r="4.5" className="chart-point" />
                </svg>
                <div className="chart-x-labels"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
              </div>
              <div className="trend-caption"><span><i className="legend-dot" />Monthly spend</span><span className="caption-note">Looking steady <b>↗</b></span></div>
            </article>
          </section>

          <section className="panel smart-insights-panel" aria-labelledby="smart-insights-title">
            <div className="panel-heading">
              <div><h2 id="smart-insights-title">Smart spending insights</h2><p>What your spending data means this month</p></div>
              <button className="secondary-button insight-budget-toggle" type="button" onClick={budgetEditorOpen ? () => setBudgetEditorOpen(false) : openBudgetEditor}>
                {budgetEditorOpen ? 'Close budgets' : 'Set budgets'}
              </button>
            </div>
            {loading ? (
              <div className="empty-state">Preparing insights from your transactions…</div>
            ) : smartInsights.length > 0 ? (
              <ul className="smart-insights-list">
                {smartInsights.map((insight) => (
                  <li className={`smart-insight-item${insight.warning ? ' warning' : ''}`} key={insight.id}>
                    <span className="insight-bulb"><Icon name="spark" size={16} /></span>
                    <span>{insight.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">Add expenses to see comparisons and category insights. Set a monthly budget to get spending-pace alerts.</div>
            )}
            {budgetError && <p className="budget-error" role="alert">{budgetError}</p>}
            {budgetEditorOpen && (
              <form className="budget-editor" onSubmit={saveMonthlyBudgets}>
                <p>Set optional monthly limits. Budgets are saved on this device for your account.</p>
                <div className="budget-fields">
                  {insightCategories.map((category) => (
                    <label key={category}>
                      <span>{category}</span>
                      <span className="budget-input-wrap">
                        <span>{user.homeCurrency ?? 'INR'}</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`${category} monthly budget`}
                          placeholder="No limit"
                          value={budgetDraft[category] ?? ''}
                          onChange={(event) => setBudgetDraft((current) => ({ ...current, [category]: event.target.value }))}
                        />
                      </span>
                    </label>
                  ))}
                </div>
                {user.homeCurrency !== 'INR' && !homeRate && <p className="budget-rate-note" role="status">A current exchange rate is needed to save budgets in {user.homeCurrency}.</p>}
                <div className="budget-editor-actions">
                  <button className="secondary-button" type="button" onClick={() => setBudgetEditorOpen(false)}>Cancel</button>
                  <button className="primary-button" type="submit" disabled={user.homeCurrency !== 'INR' && !homeRate}>Save budgets</button>
                </div>
              </form>
            )}
          </section>

          <section className="lower-grid">
            <article className="panel transactions-panel" id="transactions">
              <div className="panel-heading"><div><h2>Recent transactions</h2><p>Your latest money moves</p></div><a className="text-link" href="#transactions">View all <Icon name="arrow" size={15} /></a></div>
              <div className="transaction-table">
                <div className="table-header"><span>Transaction</span><span>Category</span><span>Date</span><span>Amount</span><span /></div>
                {loading ? <div className="empty-state">Loading your transactions…</div> : transactions.slice(0, 6).map((transaction) => (
                  <div className="transaction-row" key={transaction.id}>
                    <div className="transaction-name"><span className="transaction-avatar" style={{ color: categoryColors[transaction.category] ?? '#65748b', background: `${categoryColors[transaction.category] ?? '#65748b'}18` }}>{categoryIcons[transaction.category] ?? '•'}</span><span><strong>{transaction.description}</strong><small>{transaction.paymentMethod}</small></span></div>
                    <span className="transaction-category">{transaction.category}</span>
                    <span className="transaction-date">{formatDate(transaction.date)}</span>
                    <strong className={`transaction-amount ${transaction.type === 'INCOME' ? 'income' : ''}`} title={`About ${formatHomeMoney(transaction.amountInInr ?? transaction.amount)}`}>
                      {transaction.type === 'INCOME' ? '+' : '−'}{formatMoney(transaction.amount, transaction.currency ?? 'INR')}
                      {(transaction.currency ?? 'INR') !== (user.homeCurrency ?? 'INR') && (
                        <small>{formatHomeMoney(transaction.amountInInr ?? transaction.amount)}</small>
                      )}
                    </strong>
                    <button className="delete-button" aria-label={`Delete ${transaction.description}`} onClick={() => handleDelete(transaction.id)}><Icon name="trash" size={15} /></button>
                  </div>
                ))}
                {!loading && transactions.length === 0 && <div className="empty-state">No transactions yet. Add one to get started.</div>}
              </div>
            </article>

            <article className="panel goals-panel" id="goals">
              <div className="panel-heading"><div><h2>Savings goals</h2><p>A little progress goes a long way</p></div><span className="goal-heading-icon"><Icon name="target" size={17} /></span></div>
              <div className="goal-card">
                <div className="goal-top"><span className="goal-emoji">✈</span><span className="goal-status">ON TRACK</span></div>
                <strong>Weekend getaway</strong>
                <p>A little break, well deserved.</p>
                <div className="goal-progress-track"><span style={{ width: `${goalProgress}%` }} /></div>
                <div className="goal-numbers"><strong>{formatMoney(simulatorInputsValid ? parsedSimulatorInputs.savedAmount : 34000, user.homeCurrency ?? 'INR')} <span>saved</span></strong><span>of {formatMoney(simulatorInputsValid ? parsedSimulatorInputs.goalAmount : 50000, user.homeCurrency ?? 'INR')}</span></div>
              </div>
              <div className="goal-tip"><span><Icon name="spark" size={16} /></span><p>You’ve saved <strong>{formatHomeMoney(dashboard?.monthlySavings ?? 0)}</strong> this month. Keep that momentum going.</p></div>
              <section className="what-if-simulator" aria-labelledby="what-if-title">
                <div className="what-if-heading">
                  <span className="insight-bulb"><Icon name="spark" size={16} /></span>
                  <div><h3 id="what-if-title">What-if money simulator</h3><p>Explore changes without affecting your budget or transactions. Estimates assume your monthly savings pace stays constant.</p></div>
                </div>
                <div className="what-if-fields">
                  <label>
                    <span>Monthly expense reduction (e.g. eating out)</span>
                    <span className="what-if-input-wrap"><span>{user.homeCurrency ?? 'INR'}</span><input type="number" min="0" step="0.01" inputMode="decimal" aria-label="Hypothetical monthly spending reduction" value={simulatorInputs.monthlySpendingReduction} onChange={(event) => setSimulatorInputs((current) => ({ ...current, monthlySpendingReduction: event.target.value }))} /></span>
                  </label>
                  <label>
                    <span>Monthly income increase</span>
                    <span className="what-if-input-wrap"><span>{user.homeCurrency ?? 'INR'}</span><input type="number" min="0" step="0.01" inputMode="decimal" aria-label="Hypothetical monthly income increase" value={simulatorInputs.monthlyIncomeIncrease} onChange={(event) => setSimulatorInputs((current) => ({ ...current, monthlyIncomeIncrease: event.target.value }))} /></span>
                  </label>
                  <label>
                    <span>Already saved</span>
                    <span className="what-if-input-wrap"><span>{user.homeCurrency ?? 'INR'}</span><input type="number" min="0" step="0.01" inputMode="decimal" aria-label="Amount already saved toward goal" value={simulatorInputs.savedAmount} onChange={(event) => setSimulatorInputs((current) => ({ ...current, savedAmount: event.target.value }))} /></span>
                  </label>
                  <label>
                    <span>Savings goal</span>
                    <span className="what-if-input-wrap"><span>{user.homeCurrency ?? 'INR'}</span><input type="number" min="0" step="0.01" inputMode="decimal" aria-label="Savings goal target amount" value={simulatorInputs.goalAmount} onChange={(event) => setSimulatorInputs((current) => ({ ...current, goalAmount: event.target.value }))} /></span>
                  </label>
                </div>
                <div className="what-if-goal-actions">
                  <span>{hasSavedSavingsGoal ? 'Your goal is saved on this device.' : 'Save your goal to keep it and unlock an achievement.'}</span>
                  <button className="secondary-button" type="button" onClick={saveSavingsGoal}>Save savings goal</button>
                </div>
                {!simulatorInputsValid ? (
                  <p className="what-if-result error" role="alert">Enter valid amounts of zero or more to calculate the scenario.</p>
                ) : user.homeCurrency !== 'INR' && !simulatorCurrencyRate ? (
                  <p className="what-if-result" role="status">A current exchange rate is needed to estimate your goal timeline in {user.homeCurrency}.</p>
                ) : loading ? (
                  <p className="what-if-result" role="status">Loading your current savings pace…</p>
                ) : goalAmountRemaining === 0 ? (
                  <p className="what-if-result" role="status">Your savings goal is already reached based on the amounts above.</p>
                ) : hypotheticalMonthlySavings <= 0 ? (
                  <p className="what-if-result" role="status">With these changes, projected monthly savings are still at or below zero, so the goal timeline cannot be estimated yet.</p>
                ) : monthsAtCurrentPace === null ? (
                  <p className="what-if-result" role="status">At this what-if pace, you could reach your goal in about {monthsAtWhatIfPace} {monthsAtWhatIfPace === 1 ? 'month' : 'months'}. Your current pace is not enough to reach it yet.</p>
                ) : monthsSavedByWhatIf > 0 ? (
                  <p className="what-if-result" role="status">At your current pace of {formatHomeMoney(currentMonthlySavings / simulatorCurrencyRate)} saved monthly, the goal takes about {monthsAtCurrentPace} months. With these changes, you could reach it in about {monthsAtWhatIfPace} months — around {monthsSavedByWhatIf} {monthsSavedByWhatIf === 1 ? 'month' : 'months'} sooner.</p>
                ) : (
                  <p className="what-if-result" role="status">With these changes, you could reach your goal in about {monthsAtWhatIfPace} {monthsAtWhatIfPace === 1 ? 'month' : 'months'} (current pace: about {monthsAtCurrentPace} {monthsAtCurrentPace === 1 ? 'month' : 'months'}).</p>
                )}
                {simulatorInputsValid && simulatorCurrencyRate && !loading && hypotheticalMonthlySavings !== null && (
                  <p className="what-if-projection">Estimated monthly savings with this scenario: <strong>{formatHomeMoney(hypotheticalMonthlySavings / simulatorCurrencyRate)}</strong></p>
                )}
              </section>
            </article>
          </section>

          <section className="panel achievements-panel" id="achievements" aria-labelledby="achievements-title">
            <div className="panel-heading">
              <div><h2 id="achievements-title">Your achievements</h2><p>Complete money tasks to earn badges</p></div>
              <span className="achievement-count">{Object.keys(unlockedAchievements).length}/{achievementCatalog.length} earned</span>
            </div>
            {achievementNotice && <p className="achievement-notice" role="status">{achievementNotice}</p>}
            {achievementError && <p className="achievement-error" role="alert">{achievementError}</p>}
            <div className="achievement-grid">
              {achievementCatalog.map((achievement) => {
                const earnedAt = unlockedAchievements[achievement.id];
                const taskProgressText = achievement.id === 'first-expense'
                  ? 'Add your first expense.'
                  : achievement.id === 'savings-goal'
                    ? 'Save a goal in the What-If Simulator.'
                    : achievement.id === 'expense-streak'
                      ? `${Math.min(expenseLogDayCount, 7)}/7 different expense days logged.`
                      : activeNoSpendProgress
                        ? `${activeNoSpendProgress.progress.daysCompleted}/${activeNoSpendProgress.challenge.durationDays} no-spend days on ${activeNoSpendProgress.challenge.title}.`
                        : 'Join a community no-spend challenge.';
                return (
                  <article className={`achievement-card${earnedAt ? ' earned' : ''}`} key={achievement.id}>
                    <span className="achievement-icon" aria-hidden="true">{earnedAt ? achievement.icon : '🔒'}</span>
                    <div className="achievement-copy">
                      <strong>{achievement.title}</strong>
                      <p>{achievement.description}</p>
                      <span className="achievement-state">{earnedAt ? `Earned ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(earnedAt))}` : taskProgressText}</span>
                    </div>
                    {earnedAt && <span className="achievement-check" aria-label="Achievement earned">✓</span>}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="money-requests-section" id="money-requests" aria-labelledby="money-requests-title">
            <div className="challenges-heading money-requests-heading">
              <div>
                <span className="eyebrow">FRIENDLY IOUS, MADE SIMPLE</span>
                <h2 id="money-requests-title">Money requests</h2>
                <p>Request money from another VaultUnit member and keep track of what’s settled.</p>
              </div>
              <button className="primary-button challenge-create-toggle" type="button" onClick={() => { setMoneyRequestFormOpen((open) => !open); setMoneyRequestError(''); }}>
                <Icon name="plus" size={17} />{moneyRequestFormOpen ? 'Close' : 'Request money'}
              </button>
            </div>
            {moneyRequestError && <div className="error-banner challenge-error" role="alert"><span>{moneyRequestError}</span><button onClick={() => setMoneyRequestError('')}>Dismiss</button></div>}
            {moneyRequestFormOpen && (
              <form className="money-request-form" onSubmit={handleCreateMoneyRequest}>
                <label><span>VaultUnit account email</span><input type="email" required maxLength="254" value={moneyRequestForm.recipientEmail} onChange={(event) => setMoneyRequestForm({ ...moneyRequestForm, recipientEmail: event.target.value })} placeholder="friend@example.com" /></label>
                <label><span>Amount</span><input type="number" required min="0.01" max="100000000" step="0.01" value={moneyRequestForm.amount} onChange={(event) => setMoneyRequestForm({ ...moneyRequestForm, amount: event.target.value })} placeholder="0.00" /></label>
                <label><span>Currency</span><select value={moneyRequestForm.currency} onChange={(event) => setMoneyRequestForm({ ...moneyRequestForm, currency: event.target.value })}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></label>
                <label className="money-request-note-field"><span>Note <small>optional</small></span><input maxLength="160" value={moneyRequestForm.note} onChange={(event) => setMoneyRequestForm({ ...moneyRequestForm, note: event.target.value })} placeholder="e.g. Dinner last Friday" /></label>
                <button className="primary-button" type="submit" disabled={moneyRequestSaving}>{moneyRequestSaving ? 'Sending…' : 'Send request'} <Icon name="arrow" size={16} /></button>
                <p className="money-request-form-note">Requests are only sent to existing VaultUnit accounts. No payment is collected in the app.</p>
              </form>
            )}
            {loading ? (
              <div className="challenges-empty">Loading money requests…</div>
            ) : moneyRequests.length === 0 ? (
              <div className="challenges-empty"><span className="challenge-empty-icon">↗</span><strong>No money requests yet</strong><span>When you request money or someone sends you a request, it’ll show up here.</span></div>
            ) : (
              <div className="money-request-list">
                {moneyRequests.map((request) => {
                  const incoming = !request.requestedByMe;
                  const otherPerson = incoming ? request.requesterName : request.recipientName;
                  const busy = moneyRequestActionId === request.id;
                  return (
                    <article className="money-request-card" key={request.id}>
                      <div className={`money-request-avatar ${incoming ? 'incoming' : ''}`} aria-hidden="true">{otherPerson.charAt(0).toUpperCase()}</div>
                      <div className="money-request-details">
                        <div className="money-request-title"><strong>{incoming ? `${request.requesterName} requested money` : `Request to ${request.recipientName}`}</strong><span className={`money-request-status ${request.status.toLowerCase()}`}>{request.status.toLowerCase()}</span></div>
                        <span className="money-request-email">{incoming ? request.requesterEmail : request.recipientEmail} · {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(request.createdAt))}</span>
                        {request.note && <p>{request.note}</p>}
                      </div>
                      <strong className="money-request-amount">{formatMoney(request.amount, request.currency)}</strong>
                      <div className="money-request-actions">
                        {request.status === 'PENDING' && incoming && (
                          <>
                            <button className="money-request-paid" type="button" disabled={busy} onClick={() => handleMoneyRequestAction(request, 'paid')}>{busy ? 'Updating…' : 'Mark paid'}</button>
                            <button className="money-request-decline" type="button" disabled={busy} onClick={() => handleMoneyRequestAction(request, 'decline')}>Decline</button>
                          </>
                        )}
                        {request.status === 'PENDING' && !incoming && (
                          <button className="money-request-decline" type="button" disabled={busy} onClick={() => handleMoneyRequestAction(request, 'cancel')}>{busy ? 'Updating…' : 'Cancel request'}</button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="challenges-section" id="challenges" aria-labelledby="challenges-title">
            <div className="challenges-heading">
              <div>
                <span className="eyebrow">SMALL WINS, TOGETHER</span>
                <h2 id="challenges-title">Community challenges</h2>
                <p>Build better money habits with other VaultUnit members. Your transactions stay private.</p>
              </div>
              <button className="primary-button challenge-create-toggle" type="button" onClick={() => { setChallengeFormOpen((open) => !open); setChallengeError(''); }}>
                <Icon name="plus" size={17} />{challengeFormOpen ? 'Close' : 'Start a challenge'}
              </button>
            </div>

            {challengeError && <div className="error-banner challenge-error" role="alert"><span>{challengeError}</span><button onClick={() => setChallengeError('')}>Dismiss</button></div>}

            {challengeFormOpen && (
              <form className="challenge-create-form" onSubmit={handleCreateChallenge}>
                <label><span>Challenge name</span><input required maxLength="80" value={challengeForm.title} onChange={(event) => setChallengeForm({ ...challengeForm, title: event.target.value })} placeholder="e.g. 7-day no-eating-out challenge" /></label>
                <label><span>Skip spending on</span><select value={challengeForm.category} onChange={(event) => setChallengeForm({ ...challengeForm, category: event.target.value, title: event.target.value === 'Food' ? '7-day no-eating-out challenge' : event.target.value === 'ALL' ? '7-day no-spend challenge' : `7-day ${event.target.value.toLowerCase()} break` })}><option value="ALL">All expenses · No-spend</option><option value="Food">Food · No eating out</option><option value="Shopping">Shopping</option><option value="Travel">Travel</option><option value="Bills">Bills</option></select></label>
                <label><span>Duration</span><select value={challengeForm.durationDays} onChange={(event) => setChallengeForm((current) => ({ ...current, durationDays: Number(event.target.value), title: current.title.replace(/^\d+-day/i, `${event.target.value}-day`) }))}><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="21">21 days</option><option value="30">30 days</option></select></label>
                <button className="primary-button" type="submit" disabled={challengeSaving}>{challengeSaving ? 'Starting…' : 'Start and join'}</button>
              </form>
            )}

            {loading ? (
              <div className="challenges-empty">Loading community challenges…</div>
            ) : challenges.length === 0 ? (
              <div className="challenges-empty"><span className="challenge-empty-icon">✦</span><strong>Be the first to start a challenge</strong><span>Choose a spending category, invite the community, and earn your first progress badge.</span></div>
            ) : (
              <div className="challenge-cards">
                {challenges.map((challenge) => {
                  const myProgress = challenge.participants.find((participant) => participant.userId === user.id);
                  const remainingDays = Math.max(1, Math.ceil((new Date(`${challenge.endDate}T00:00:00`) - new Date(`${localDateString()}T00:00:00`)) / 86400000) + 1);
                  return (
                    <article className="challenge-card" key={challenge.id}>
                      <div className="challenge-card-top">
                        <span className={`challenge-category-icon ${challenge.category === 'Food' ? 'food' : ''}`} aria-hidden="true">{challenge.category === 'Food' ? '♨' : challenge.category === 'ALL' ? '✦' : '◇'}</span>
                        <span className={`challenge-state ${challenge.active ? 'active' : 'ended'}`}>{challenge.active ? 'IN PROGRESS' : 'COMPLETED'}</span>
                      </div>
                      <h3>{challenge.title}</h3>
                      <p className="challenge-summary">{challenge.category === 'ALL' ? 'Skip all expense categories' : `No ${challenge.category.toLowerCase()} spending`} · {challenge.durationDays} days</p>
                      <div className="challenge-community-line"><span>Started by {challenge.creatorName}</span><span>{challenge.participantCount} {challenge.participantCount === 1 ? 'member' : 'members'}</span></div>
                      {myProgress ? (
                        <div className="challenge-my-progress">
                          <div className="challenge-progress-label"><span>Your progress</span><strong>{myProgress.daysCompleted}/{challenge.durationDays} days</strong></div>
                          <div className="challenge-progress-track"><span style={{ width: `${myProgress.progressPercent}%` }} /></div>
                          <div className="challenge-badge-row"><span className="challenge-badge" aria-label={`Badge: ${myProgress.badge}`}>{myProgress.daysCompleted >= challenge.durationDays ? '🏆' : myProgress.currentStreak >= 3 ? '🔥' : myProgress.daysCompleted >= 1 ? '🌱' : '✨'} {myProgress.badge}</span><span>{myProgress.currentStreak}-day streak</span></div>
                        </div>
                      ) : (
                        <div className="challenge-open-note">Join in and track your own no-spend progress.</div>
                      )}
                      <div className="challenge-members" aria-label="Participant progress">
                        {challenge.participants.slice(0, 5).map((participant) => (
                          <div className="challenge-member" key={participant.userId}>
                            <div className="challenge-member-avatar" title={participant.name}>{participant.name.charAt(0).toUpperCase()}</div>
                            <span>{participant.userId === user.id ? 'You' : participant.name.split(' ')[0]}</span>
                            <strong>{participant.daysCompleted}d</strong>
                          </div>
                        ))}
                        {challenge.participantCount > 5 && <span className="challenge-member-overflow">+{challenge.participantCount - 5}</span>}
                      </div>
                      <div className="challenge-card-bottom">
                        <span>{challenge.active ? `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left` : 'Challenge ended'}</span>
                        {challenge.active && (
                          <button className={challenge.joinedByMe ? 'challenge-leave-button' : 'challenge-join-button'} type="button" disabled={challengeActionId === challenge.id} onClick={() => handleChallengeMembership(challenge)}>
                            {challengeActionId === challenge.id ? 'Updating…' : challenge.joinedByMe ? 'Leave' : 'Join challenge'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <BillSplitter />

          <footer className="page-footer"><span>VaultUnit <i>·</i> Your money, in focus.</span><span>Small steps today. Stronger finances tomorrow.</span></footer>
            </>
          )}
        </div>
      </main>

      <AssistantChat
        dashboard={dashboard}
        categories={categoryData}
        transactions={transactions}
        loading={loading}
        currency={user.homeCurrency ?? 'INR'}
        exchangeRate={user.homeCurrency === 'INR' ? 1 : homeRate?.rate}
      />

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModalOpen(false);
        }}>
          <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading"><div><span className="eyebrow">MONEY IN, MONEY OUT</span><h2 id="modal-title">Add a transaction</h2></div><button className="icon-button close-button" onClick={() => setModalOpen(false)} aria-label="Close">×</button></div>
            <section className="smart-entry" aria-label="Smart transaction entry">
              <div className="smart-entry-heading"><span className="smart-entry-icon">✦</span><div><strong>Log it naturally</strong><small>Try “Spent $15 on lunch at Subway today”</small></div></div>
              <textarea
                aria-label="Describe a transaction"
                rows="2"
                maxLength="300"
                placeholder="Type an expense or income in your own words…"
                value={quickEntry}
                onChange={(event) => { setQuickEntry(event.target.value); setQuickEntryError(''); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleParseQuickEntry();
                  }
                }}
              />
              <div className="smart-entry-actions">
                <button type="button" className="secondary-button" onClick={handleParseQuickEntry}>Fill transaction</button>
                <button type="button" className="secondary-button voice-button" onClick={handleVoiceInput}>{isListening ? 'Listening…' : '🎙 Voice'}</button>
                <button type="button" className="secondary-button receipt-button" onClick={() => receiptInputRef.current?.click()} disabled={Boolean(ocrStatus && ocrStatus.includes('Reading'))}>▧ Take photo / upload receipt</button>
                <input ref={receiptInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={handleReceiptUpload} aria-label="Upload or take a receipt photo" />
              </div>
              <small className="receipt-entry-hint">Take a photo on your phone, or choose an image file on your computer.</small>
              {quickEntryError && <div className="smart-entry-feedback error" role="alert">{quickEntryError}</div>}
              {ocrStatus && <div className="smart-entry-feedback" role="status">{ocrStatus}</div>}
              {ocrError && <div className="smart-entry-feedback error" role="alert">{ocrError}</div>}
            </section>
            <form onSubmit={handleSubmit}>
              <label className="field-label">Type</label>
              <div className="type-toggle"><button type="button" className={form.type === 'EXPENSE' ? 'selected expense-choice' : ''} onClick={() => setForm({ ...form, type: 'EXPENSE' })}>Expense</button><button type="button" className={form.type === 'INCOME' ? 'selected income-choice' : ''} onClick={() => setForm({ ...form, type: 'INCOME' })}>Income</button></div>
              <label className="field-label" htmlFor="description">Description</label><input id="description" required maxLength="120" placeholder="e.g. Coffee with friends" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <div className="form-row">
                <div><label className="field-label" htmlFor="amount">Amount ({form.currency})</label><input id="amount" type="number" required min="0.01" max="100000000" step="0.01" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
                <div><label className="field-label" htmlFor="transaction-currency">Currency</label><select id="transaction-currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="currency-conversion-note" role="status">
                  {formRateError ? formRateError : formRate && form.amount
                    ? `${formatMoney(Number(form.amount) * formRate.rate, 'INR')} normalized to INR · rate date ${formRate.date}`
                    : form.currency === 'INR' ? 'Stored as INR.' : 'Fetching the latest available rate…'}
                </div>
                <div><label className="field-label" htmlFor="category">Category</label><select id="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Food', 'Travel', 'Shopping', 'Bills', 'Other', 'Salary'].map((category) => <option key={category}>{category}</option>)}</select></div>
              </div>
              <div className="form-row"><div><label className="field-label" htmlFor="date">Date</label><input id="date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div><div><label className="field-label" htmlFor="payment">Payment method</label><select id="payment" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>{['UPI', 'Card', 'Bank transfer', 'Cash'].map((method) => <option key={method}>{method}</option>)}</select></div></div>
              <button className="primary-button modal-submit" type="submit" disabled={saving || Boolean(formRateError) || !formRate}>{saving ? 'Saving…' : 'Save transaction'} <Icon name="arrow" size={17} /></button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
