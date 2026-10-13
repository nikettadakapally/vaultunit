export const currencies = [
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'THB', name: 'Thai Baht' },
];

const rateCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;

export async function getExchangeRate(fromCurrency, toCurrency, { refresh = false } = {}) {
  if (fromCurrency === toCurrency) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  const key = `${fromCurrency}-${toCurrency}`;
  const cached = rateCache.get(key);
  if (!refresh && cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
    return cached.quote;
  }

  const response = await fetch(`https://api.frankfurter.dev/v2/rate/${fromCurrency}/${toCurrency}`);
  if (!response.ok) {
    throw new Error(`Exchange rates are unavailable for ${fromCurrency} to ${toCurrency} right now.`);
  }

  const payload = await response.json();
  const quote = Array.isArray(payload) ? payload[0] : payload;
  const rate = Number(quote?.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`The exchange-rate service returned an invalid ${fromCurrency} to ${toCurrency} rate.`);
  }

  const result = {
    rate,
    date: quote.date ?? new Date().toISOString().slice(0, 10),
  };
  rateCache.set(key, { quote: result, fetchedAt: Date.now() });
  return result;
}

export function formatMoney(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseExpenseText(text, defaultCurrency = 'INR') {
  const amountMatch = text.match(/(?:[$€£₹]\s*|(?<![A-Za-z])(?:USD|EUR|GBP|INR|CAD|AUD|JPY|SGD|AED|CHF|NZD|CNY|ZAR|THB)\s*)(\d[\d,]*(?:\.\d{1,2})?)/i)
    ?? text.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*(USD|EUR|GBP|INR|CAD|AUD|JPY|SGD|AED|CHF|NZD|CNY|ZAR|THB)\b/i)
    ?? text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\b/);
  if (!amountMatch) {
    throw new Error('I couldn’t find an amount. Try something like “Spent $15 on lunch at Subway today”.');
  }

  const amount = Number(amountMatch[1].replaceAll(',', ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter a valid amount greater than zero.');
  }
  const explicitCode = text.match(/\b(USD|EUR|GBP|INR|CAD|AUD|JPY|SGD|AED|CHF|NZD|CNY|ZAR|THB)\b/i)?.[1]?.toUpperCase() ?? null;
  const dollarCurrencies = ['USD', 'CAD', 'AUD', 'NZD', 'SGD'];
  const symbolCurrency = text.includes('$') ? (dollarCurrencies.includes(defaultCurrency) ? defaultCurrency : 'USD')
    : text.includes('€') ? 'EUR'
      : text.includes('£') ? 'GBP'
        : text.includes('₹') ? 'INR'
          : null;
  const currency = explicitCode ?? symbolCurrency ?? defaultCurrency;

  const normalized = text.toLowerCase();
  const type = /\b(received|earned|salary|income|deposit|refund)\b/.test(normalized) ? 'INCOME' : 'EXPENSE';
  const date = /\byesterday\b/.test(normalized)
    ? localDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))
    : localDateString();
  const merchantMatch = text.match(/\b(?:at|from)\s+(.+?)(?:\s+\b(?:today|yesterday)\b|[.!?,]|$)/i);
  const merchant = merchantMatch?.[1]?.trim();
  const withoutAmount = text.replace(amountMatch[0], '').replace(/\b(today|yesterday)\b/ig, '').trim();
  const description = merchant || withoutAmount.replace(/\b(spent|spend|paid|bought|purchase|for|on|at|received|earned|income|deposit)\b/ig, '').trim() || 'Expense';
  const category = /\b(food|lunch|dinner|breakfast|coffee|restaurant|grocer|snack|subway|pizza)\b/i.test(text) ? 'Food'
    : /\b(uber|taxi|train|flight|fuel|gas|travel|bus|metro)\b/i.test(text) ? 'Travel'
      : /\b(bill|electric|water|internet|phone|utility|rent)\b/i.test(text) ? 'Bills'
        : /\b(shop|store|purchase|clothes|amazon)\b/i.test(text) ? 'Shopping'
          : type === 'INCOME' ? 'Salary' : 'Other';

  return {
    amount,
    currency,
    date,
    description: description.slice(0, 120),
    category,
    type,
  };
}

export function parseReceiptText(text, defaultCurrency = 'INR') {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const totalLines = lines.map((line) => ({
    line,
    priority: /\b(grand\s+total|amount\s+due|balance\s+due)\b/i.test(line) ? 3 : /\btotal\b/i.test(line) ? 2 : 0,
    amount: line.match(/(?:₹|\$|€|£)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/)?.[1],
  })).filter((item) => item.priority && item.amount).sort((left, right) => right.priority - left.priority);
  const lastMoneyLine = [...lines].reverse().find((line) => /(?:₹|\$|€|£)\s*[0-9]|[0-9][0-9,]*\.\d{2}/.test(line));
  const total = totalLines[0]?.amount ?? lastMoneyLine?.match(/(?:₹|\$|€|£)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/)?.[1];
  if (!total) {
    throw new Error('I couldn’t confidently find a total on this receipt. You can still enter the amount manually.');
  }

  const merchant = lines.find((line) =>
    line.length >= 2
    && line.length <= 60
    && !/\b(receipt|invoice|tax|gst|date|time|cashier|phone|thank you|subtotal|total|amount due)\b/i.test(line)
    && !/^\d/.test(line));
  const rawDate = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
    ?? text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  let date = localDateString();
  if (rawDate) {
    const yearFirst = rawDate[1].length === 4;
    const year = Number(yearFirst ? rawDate[1] : rawDate[3]);
    const month = Number(rawDate[2]);
    const day = Number(yearFirst ? rawDate[3] : rawDate[1]);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      date = localDateString(parsed);
    }
  }

  const parsedExpense = parseExpenseText(`${merchant ?? 'Receipt'} ${total}`, defaultCurrency);
  const dollarCurrencies = ['USD', 'CAD', 'AUD', 'NZD', 'SGD'];
  const symbolCurrency = text.includes('$') ? (dollarCurrencies.includes(defaultCurrency) ? defaultCurrency : 'USD')
    : text.includes('€') ? 'EUR'
      : text.includes('£') ? 'GBP'
        : text.includes('₹') ? 'INR'
          : null;
  const explicitCurrency = text.match(/\b(INR|USD|EUR|GBP|CAD|AUD|JPY|SGD|AED|CHF|NZD|CNY|ZAR|THB)\b/i)?.[1]?.toUpperCase();
  return {
    ...parsedExpense,
    amount: Number(total.replaceAll(',', '')),
    currency: explicitCurrency ?? symbolCurrency ?? parsedExpense.currency,
    date,
    description: merchant?.slice(0, 120) ?? 'Receipt purchase',
    category: /\b(cafe|restaurant|market|grocery|food|subway|pizza)\b/i.test(merchant ?? '') ? 'Food' : 'Other',
  };
}
