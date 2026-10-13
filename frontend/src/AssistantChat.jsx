import { useEffect, useRef, useState } from 'react';
import { formatMoney } from './currency.js';

const welcomeMessage = {
  role: 'assistant',
  text: "Hi! I'm your VaultUnit assistant. Ask me about your spending, savings, or anything else on your mind.",
};

const jokes = [
  'My budget and I had a serious talk. It said we need to spend more time apart.',
  'I tried to make a belt out of old receipts. It was a waist of money.',
  'Why did the spreadsheet get promoted? It knew how to balance its responsibilities.',
  'I told my wallet a joke. It was in stitches—but still not opening up.',
];

const smallTalk = {
  greeting: [
    'Hey! Good to see you. What would you like to chat about?',
    'Hi there! I’m here for money questions or a bit of everyday conversation.',
    'Hello! What’s on your mind today?',
  ],
  howAreYou: [
    'Doing well, thanks for asking! Ready to help with a money question or just chat.',
    'All good here—especially now that we’re talking. How can I help?',
    'I’m doing great, thank you! What would you like to explore?',
  ],
  thanks: [
    'You’re welcome! Happy to help.',
    'Anytime. Let me know what else is on your mind.',
    'Glad that helped! I’m here if you need anything else.',
  ],
  goodbye: [
    'Take care! I’ll be here whenever you want to pick this back up.',
    'See you next time—and may your budget have a pleasant surprise.',
    'Bye for now! Wishing you a good day.',
  ],
};

function chooseVariant(options, topic, usedReplies) {
  const used = usedReplies.current[topic] ?? [];
  const available = options.filter((option) => !used.includes(option));
  const candidates = available.length ? available : options.filter((option) => option !== used.at(-1));
  const reply = candidates[Math.floor(Math.random() * candidates.length)] ?? options[0];
  usedReplies.current[topic] = [...used, reply].slice(-(options.length - 1));
  return reply;
}

function answerQuestion(question, context, usedReplies) {
  const text = question.trim();
  const normalized = text.toLowerCase();
  const choose = (topic, options) => chooseVariant(options, topic, usedReplies);
  const money = (amount) => formatMoney(
    (amount ?? 0) * (context.currency === 'INR' ? 1 : context.exchangeRate ?? 1),
    context.currency === 'INR' || context.exchangeRate ? context.currency : 'INR',
  );
  const dashboard = context.dashboard;
  const hasDashboard = dashboard && !context.loading;

  if (/\b(joke|make me laugh|something funny|humou?r)\b/.test(normalized)) {
    return choose('joke', jokes);
  }
  if (/^(hi|hello|hey|hiya|good morning|good afternoon|good evening)[!. ]*$/.test(normalized)) {
    return choose('greeting', smallTalk.greeting);
  }
  if (/\bhow are you\b|\bhow's it going\b/.test(normalized)) {
    return choose('howAreYou', smallTalk.howAreYou);
  }
  if (/^(thanks|thank you|thx|cheers)[!. ]*$/.test(normalized)) {
    return choose('thanks', smallTalk.thanks);
  }
  if (/^(bye|goodbye|see you|take care)[!. ]*$/.test(normalized)) {
    return choose('goodbye', smallTalk.goodbye);
  }
  if (/\b(who are you|what can you do|what do you do)\b/.test(normalized)) {
    return choose('about', [
      'I’m VaultUnit’s assistant. I can explain your dashboard, offer practical budgeting ideas, or just chat.',
      'Think of me as a helpful money companion: I can use your VaultUnit totals for context, share budgeting basics, and keep the conversation casual.',
      'I’m here to make your money picture easier to understand—and I’m always up for a normal conversation too.',
    ]);
  }
  if (/\b(balance|account total|how much.*have)\b/.test(normalized)) {
    if (!hasDashboard) return 'I can check that as soon as your dashboard finishes loading. Try asking again in a moment.';
    return choose('balance', [
      `Your current dashboard balance is ${money(dashboard.totalBalance)}. That’s the total shown in VaultUnit right now.`,
      `VaultUnit currently shows a balance of ${money(dashboard.totalBalance)}. This reflects the transactions recorded in your account.`,
      `Your recorded balance is ${money(dashboard.totalBalance)}. If that looks off, check that your latest income and expenses are entered.`,
      `The balance on your dashboard is ${money(dashboard.totalBalance)}. I’m using the figures currently saved in VaultUnit.`,
    ]);
  }
  if (/\b(spend|spent|spending|expense|expenses)\b/.test(normalized)) {
    if (!hasDashboard) return 'Your dashboard is still loading, so I can’t check the spending figures yet. Please try again shortly.';
    const categories = context.categories ?? [];
    if (/\b(category|categories|breakdown|where|most|highest|top)\b/.test(normalized) && categories.length > 0) {
      const top = categories[0];
      const categorySummary = categories.slice(0, 3).map((item) => `${item.category}: ${money(item.amount)}`).join('; ');
      return choose('spendingBreakdown', [
        `This month, your top category is ${top.category} at ${money(top.amount)}. Your leading categories are ${categorySummary}.`,
        `Your spending is led by ${top.category} (${money(top.amount)}). For context, your top three are ${categorySummary}.`,
        `Looking at this month’s breakdown, ${top.category} is highest at ${money(top.amount)}. The next categories are ${categorySummary}.`,
        `The current top category is ${top.category}, with ${money(top.amount)} recorded. Top-three view: ${categorySummary}.`,
      ]);
    }
    return choose('spending', [
      `Your recorded spending this month is ${money(dashboard.monthlySpending)}. That’s based on expenses entered in VaultUnit.`,
      `VaultUnit shows ${money(dashboard.monthlySpending)} in spending for this month so far.`,
      `Your month-to-date expenses add up to ${money(dashboard.monthlySpending)} in the current dashboard.`,
      `So far this month, the expense total on your dashboard is ${money(dashboard.monthlySpending)}.`,
    ]);
  }
  if (/\b(sav(e|ing|ings)|put aside|save more)\b/.test(normalized)) {
    if (hasDashboard) {
      const savings = dashboard.monthlySavings ?? 0;
      const income = dashboard.monthlyIncome ?? 0;
      const rate = income > 0 ? Math.round((savings / income) * 100) : null;
      const contextLine = rate === null
        ? `Your dashboard currently shows ${money(savings)} in monthly savings.`
        : `Your dashboard shows ${money(savings)} saved this month, about ${rate}% of recorded income.`;
      return choose('savings', [
        `${contextLine} A practical next step is to set a small automatic transfer just after payday, then review your largest flexible expense each week.`,
        `${contextLine} Consider choosing one realistic weekly savings amount and moving it automatically. Small, consistent transfers are easier to sustain than a drastic cut.`,
        `${contextLine} To build momentum, pick one category to review and set a savings target you can repeat every payday.`,
        `${contextLine} A useful starting point is to automate a manageable amount, then adjust it after tracking a full month of expenses.`,
      ]);
    }
    return choose('savingsGeneric', [
      'A practical starting point is to track spending for a month, choose one category to trim, and automate a small transfer on payday.',
      'Try setting a specific, realistic target and moving that amount to savings automatically when income arrives. Review it monthly.',
      'Start with a manageable weekly amount, build an emergency buffer, and increase your target only when it feels sustainable.',
      'Make saving a planned expense: set a goal, automate a repeatable amount, and check progress once a month.',
    ]);
  }
  if (/\b(income|salary|earned|earnings)\b/.test(normalized)) {
    if (!hasDashboard) return 'Your dashboard is still loading. I’ll be able to check the recorded income once it’s ready.';
    return choose('income', [
      `Your recorded income for this month is ${money(dashboard.monthlyIncome)}.`,
      `VaultUnit shows ${money(dashboard.monthlyIncome)} in income so far this month.`,
      `This month’s income total on your dashboard is ${money(dashboard.monthlyIncome)}.`,
      `The income recorded for the current month adds up to ${money(dashboard.monthlyIncome)}.`,
    ]);
  }
  if (/\b(transaction|transactions|recent purchases|latest expenses)\b/.test(normalized)) {
    if (!hasDashboard) return 'Your dashboard is still loading. Please try again in a moment and I can summarize your recent transactions.';
    const recentTransactions = context.transactions.slice(0, 4);
    if (recentTransactions.length === 0) return 'There are no transactions recorded yet. Add one from your dashboard and I can help you review it.';
    const summary = recentTransactions.map((item) => `${item.description} (${item.type === 'INCOME' ? '+' : '−'}${money(item.amount)})`).join(', ');
    return choose('transactions', [
      `Your latest recorded transactions are: ${summary}.`,
      `Here’s a quick look at your most recent activity: ${summary}.`,
      `The newest entries in VaultUnit are ${summary}.`,
      `I found these recent transactions in your account: ${summary}.`,
    ]);
  }
  if (/\b(budget|budgeting|50.?30.?20|financial plan|plan my)\b/.test(normalized)) {
    const recorded = hasDashboard
      ? `Your dashboard has ${money(dashboard.monthlyIncome)} in income and ${money(dashboard.monthlySpending)} in spending recorded this month. `
      : '';
    return choose('budget', [
      `${recorded}A useful starting framework is 50/30/20: essentials, wants, and savings/debt payments. Treat it as a flexible guide, not a rule—your fixed costs and priorities matter.`,
      `${recorded}For a first budget, list fixed essentials, set a reasonable cap for flexible spending, and schedule savings. The 50/30/20 split can be a reference point, but adjust it to fit your circumstances.`,
      `${recorded}Try planning from take-home income: cover essentials first, assign limits to discretionary categories, then automate savings or debt payments. Review the plan after a month.`,
      `${recorded}A simple plan separates needs, wants, and future goals. Track actual spending for a few weeks before choosing limits, so the budget reflects your real life.`,
    ]);
  }
  if (/\b(invest|investment|stock|share market|crypto|mutual fund|tax|loan|credit card)\b/.test(normalized)) {
    return choose('financialGuidance', [
      'I can explain general concepts, but I can’t assess suitability or provide regulated investment, tax, or credit advice. For a decision, verify current rules and consult a qualified professional.',
      'That’s an important financial decision. I can help outline general factors to compare, but I’m not a licensed adviser and can’t give personalized investment, tax, or lending recommendations.',
      'I can give an educational overview, though your circumstances and current regulations matter. Please confirm details with an appropriately qualified financial or tax professional before acting.',
      'I can help you understand the basics and questions to ask, but this isn’t personalized financial advice. For recommendations, check current information with a qualified professional.',
    ]);
  }
  if (/\b(why|explain more|tell me more|what do you mean|elaborate)\b/.test(normalized) && context.lastAssistantReply) {
    return choose('followUp', [
      `Sure. The key point is: ${context.lastAssistantReply} Which part would you like me to unpack?`,
      `Happy to explain. In short, ${context.lastAssistantReply} Want an example using your numbers?`,
      `Of course—the practical takeaway is ${context.lastAssistantReply} I can also break that into steps.`,
      `Absolutely. Here’s the main idea again: ${context.lastAssistantReply} What would be most useful to clarify?`,
    ]);
  }
  if (/\b(weather|news|latest|today's|current price|live price)\b/.test(normalized)) {
    return choose('currentInfo', [
      'I don’t have live web or market data in this chat. If you share what you’ve found, I can help explain or compare it.',
      'I can’t look up live updates from here. Share a source or the details you’re considering and I’ll help make sense of them.',
      'I don’t have real-time information available, but I can help you evaluate details you provide.',
      'Live data isn’t connected to this assistant. If you paste the information, I can help summarize it.',
    ]);
  }
  if (/\b(what is|what's|who is|how does|can you explain)\b/.test(normalized)) {
    return choose('generalQuestion', [
      'I can help with that. Could you add a little context about what you mean? I’ll give you a clearer answer.',
      'Happy to chat about it. What angle are you most curious about?',
      'I’m listening—could you share one more detail so I can tailor my answer?',
      'That’s an interesting question. A bit more context will help me give you a useful response.',
    ]);
  }
  return choose('openConversation', [
    'I’m listening. Tell me a little more about what you’re thinking, and we can work through it together.',
    'Got it. What would be most helpful next: a practical suggestion, a quick explanation, or just a conversation?',
    'I can help with that. Give me a bit more detail and I’ll do my best to make the answer useful.',
    'Thanks for sharing. Want to tell me more, or should we switch to a money question?',
  ]);
}

function AssistantChat({ dashboard, categories, transactions, loading, currency, exchangeRate }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const messagesEndRef = useRef(null);
  const usedRepliesRef = useRef({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking, open]);

  function sendMessage(message) {
    const question = message.trim();
    if (!question || thinking) return;

    setDraft('');
    setMessages((current) => [...current, { role: 'user', text: question }]);
    setThinking(true);
    window.setTimeout(() => {
      setMessages((current) => {
        const lastAssistantReply = [...current].reverse().find((item) => item.role === 'assistant')?.text;
        const text = answerQuestion(question, {
          dashboard,
          categories,
          transactions,
          loading,
          currency,
          exchangeRate,
          lastAssistantReply,
        }, usedRepliesRef);
        return [...current, { role: 'assistant', text }];
      });
      setThinking(false);
    }, 450 + Math.random() * 350);
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <>
      {!open && (
        <button className="assistant-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open VaultUnit assistant">
          <span className="assistant-launcher-icon" aria-hidden="true">✦</span>
          <span>Ask Vault</span>
        </button>
      )}

      {open && (
        <section className="assistant-window" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
          <header className="assistant-header">
            <div className="assistant-avatar" aria-hidden="true">✦</div>
            <div className="assistant-heading">
              <strong id="assistant-title">VaultUnit assistant</strong>
              <span><i /> Finance-aware · ready to chat</span>
            </div>
            <button className="assistant-header-button" type="button" onClick={() => setMessages([welcomeMessage])} aria-label="Start a new chat" title="New chat">↻</button>
            <button className="assistant-header-button" type="button" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close">×</button>
          </header>

          <div className="assistant-messages" aria-live="polite" aria-relevant="additions text">
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>
                {message.role === 'assistant' && <span className="assistant-message-icon" aria-hidden="true">✦</span>}
                <p>{message.text}</p>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="assistant-suggestions">
                <span>Try asking</span>
                {['How much did I spend this month?', 'How can I save more?', 'Tell me a finance joke'].map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}<span aria-hidden="true">↗</span></button>
                ))}
              </div>
            )}
            {thinking && <div className="assistant-thinking" role="status"><span /><span /><span /><span className="sr-only">Thinking</span></div>}
            <div ref={messagesEndRef} />
          </div>

          <form className="assistant-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="assistant-prompt">Message VaultUnit assistant</label>
            <textarea
              id="assistant-prompt"
              rows="1"
              maxLength="1000"
              placeholder="Ask about your money or anything else…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              disabled={thinking}
            />
            <button type="submit" disabled={!draft.trim() || thinking} aria-label="Send message">↑</button>
            <span className="assistant-disclaimer">Dashboard answers use your saved data. For guidance only, not financial advice.</span>
          </form>
        </section>
      )}
    </>
  );
}

export default AssistantChat;
