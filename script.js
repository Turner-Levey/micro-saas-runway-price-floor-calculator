const DEFAULTS = {
  customers: 42,
  price: 39,
  churn: 4,
  newCustomers: 6,
  grossMargin: 86,
  overhead: 950,
  founderIncome: 3500,
  growthBudget: 400,
  cash: 12000,
  buffer: 3
};

const els = {
  form: document.querySelector("#calculator-form"),
  customers: document.querySelector("#customers"),
  price: document.querySelector("#price"),
  churn: document.querySelector("#churn"),
  churnOutput: document.querySelector("#churn-output"),
  newCustomers: document.querySelector("#new-customers"),
  grossMargin: document.querySelector("#gross-margin"),
  grossMarginOutput: document.querySelector("#gross-margin-output"),
  overhead: document.querySelector("#overhead"),
  founderIncome: document.querySelector("#founder-income"),
  growthBudget: document.querySelector("#growth-budget"),
  cash: document.querySelector("#cash"),
  buffer: document.querySelector("#buffer"),
  bufferOutput: document.querySelector("#buffer-output"),
  priceFloor: document.querySelector("#price-floor"),
  floorLabel: document.querySelector("#floor-label"),
  breakEven: document.querySelector("#break-even"),
  monthlyGap: document.querySelector("#monthly-gap"),
  gapLabel: document.querySelector("#gap-label"),
  runway: document.querySelector("#runway"),
  runwayLabel: document.querySelector("#runway-label"),
  statusPill: document.querySelector("#status-pill"),
  noteList: document.querySelector("#note-list"),
  notes: document.querySelector("#notes"),
  report: document.querySelector("#report"),
  reset: document.querySelector("#reset"),
  copyReport: document.querySelector("#copy-report"),
  downloadReport: document.querySelector("#download-report"),
  downloadCsv: document.querySelector("#download-csv")
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function numberValue(input, fallback = 0) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function inputs() {
  return {
    customers: Math.max(1, numberValue(els.customers, DEFAULTS.customers)),
    price: Math.max(0, numberValue(els.price, DEFAULTS.price)),
    churn: Math.max(0, numberValue(els.churn, DEFAULTS.churn)),
    newCustomers: Math.max(0, numberValue(els.newCustomers, DEFAULTS.newCustomers)),
    grossMargin: Math.min(100, Math.max(1, numberValue(els.grossMargin, DEFAULTS.grossMargin))),
    overhead: Math.max(0, numberValue(els.overhead, DEFAULTS.overhead)),
    founderIncome: Math.max(0, numberValue(els.founderIncome, DEFAULTS.founderIncome)),
    growthBudget: Math.max(0, numberValue(els.growthBudget, DEFAULTS.growthBudget)),
    cash: Math.max(0, numberValue(els.cash, DEFAULTS.cash)),
    buffer: Math.max(0, numberValue(els.buffer, DEFAULTS.buffer))
  };
}

function calculate(values) {
  const churnedCustomers = values.customers * (values.churn / 100);
  const activeAfterChurn = Math.max(1, values.customers - churnedCustomers + values.newCustomers);
  const marginRate = values.grossMargin / 100;
  const monthlyTarget = values.overhead + values.founderIncome + values.growthBudget;
  const bufferTarget = monthlyTarget * values.buffer;
  const priceFloor = monthlyTarget / activeAfterChurn / marginRate;
  const breakEvenCustomers = values.price > 0
    ? Math.ceil(monthlyTarget / (values.price * marginRate))
    : Number.POSITIVE_INFINITY;
  const grossMrr = values.customers * values.price;
  const marginRevenue = grossMrr * marginRate;
  const monthlyGap = monthlyTarget - marginRevenue;
  const runwayMonths = monthlyGap > 0 ? values.cash / monthlyGap : Number.POSITIVE_INFINITY;
  const floorDelta = priceFloor - values.price;

  return {
    churnedCustomers,
    activeAfterChurn,
    marginRate,
    monthlyTarget,
    bufferTarget,
    priceFloor,
    breakEvenCustomers,
    grossMrr,
    marginRevenue,
    monthlyGap,
    runwayMonths,
    floorDelta
  };
}

function money(value) {
  return currency.format(Math.round(value));
}

function decimal(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "Flat";
}

function status(result) {
  if (result.floorDelta <= 0 && result.monthlyGap <= 0) return ["Above floor", "good"];
  if (result.runwayMonths >= 12) return ["Watch gap", "watch"];
  if (result.runwayMonths >= 6) return ["Narrow gap", "watch"];
  return ["Below floor", "risk"];
}

function buildNotes(values, result) {
  const notes = [];
  if (result.floorDelta > 0) {
    notes.push([
      "Price floor gap",
      `Current ARPA is ${money(values.price)}, about ${money(result.floorDelta)} below the estimated floor.`
    ]);
  } else {
    notes.push([
      "Current ARPA clears the floor",
      `Current ARPA is ${money(Math.abs(result.floorDelta))} above the estimated floor.`
    ]);
  }

  if (result.breakEvenCustomers > values.customers && Number.isFinite(result.breakEvenCustomers)) {
    notes.push([
      "Customer count gap",
      `${result.breakEvenCustomers - values.customers} more active customers are needed at current ARPA to cover the monthly target.`
    ]);
  } else if (Number.isFinite(result.breakEvenCustomers)) {
    notes.push([
      "Customer count clears target",
      "The current customer count can cover the monthly target at the current ARPA and gross margin."
    ]);
  }

  if (values.churn >= 8) {
    notes.push([
      "Churn pressure",
      "Monthly churn is high enough that retention work may lower the floor faster than acquisition alone."
    ]);
  }

  if (values.buffer > 0 && values.cash < result.bufferTarget) {
    notes.push([
      "Buffer shortfall",
      `${money(result.bufferTarget - values.cash)} more cash would be needed for a ${values.buffer}-month buffer at the target spend level.`
    ]);
  }

  if (result.monthlyGap > 0) {
    notes.push([
      "Runway risk",
      `At the current gap, the entered cash reserve lasts about ${decimal(result.runwayMonths)} months.`
    ]);
  } else {
    notes.push([
      "No operating gap",
      "Margin revenue clears the monthly target before using the cash reserve."
    ]);
  }

  return notes;
}

function reportText(values, result) {
  const noteText = els.notes.value.trim() || "None";
  const statusText = status(result)[0];
  return [
    "# Micro-SaaS Runway Price Floor Note",
    "",
    `Status: ${statusText}`,
    `Estimated monthly price floor: ${money(result.priceFloor)}`,
    `Current monthly ARPA: ${money(values.price)}`,
    `Monthly target: ${money(result.monthlyTarget)}`,
    `Gross MRR: ${money(result.grossMrr)}`,
    `Margin revenue: ${money(result.marginRevenue)}`,
    `Monthly gap after gross margin: ${money(result.monthlyGap)}`,
    `Break-even customers at current ARPA: ${Number.isFinite(result.breakEvenCustomers) ? result.breakEvenCustomers : "No current ARPA"}`,
    `Active customers after churn and additions: ${decimal(result.activeAfterChurn)}`,
    `Runway at current gap: ${Number.isFinite(result.runwayMonths) ? `${decimal(result.runwayMonths)} months` : "No operating gap"}`,
    "",
    "## Inputs",
    `- Active customers: ${values.customers}`,
    `- New customers per month: ${values.newCustomers}`,
    `- Monthly churn: ${values.churn}%`,
    `- Gross margin: ${values.grossMargin}%`,
    `- Fixed overhead: ${money(values.overhead)}`,
    `- Founder income target: ${money(values.founderIncome)}`,
    `- Growth budget target: ${money(values.growthBudget)}`,
    `- Cash reserve: ${money(values.cash)}`,
    `- Target runway buffer: ${values.buffer} months`,
    "",
    "## Notes",
    ...buildNotes(values, result).map((note) => `- ${note[0]}: ${note[1]}`),
    "",
    "## Context",
    noteText,
    "",
    "Planning worksheet only. Not legal, financial, tax, accounting, or investment advice."
  ].join("\n");
}

function csvText(values, result) {
  const rows = [
    ["metric", "value"],
    ["active_customers", values.customers],
    ["current_monthly_arpa", values.price],
    ["monthly_churn_percent", values.churn],
    ["new_customers_per_month", values.newCustomers],
    ["gross_margin_percent", values.grossMargin],
    ["fixed_monthly_overhead", values.overhead],
    ["founder_income_target", values.founderIncome],
    ["growth_budget_target", values.growthBudget],
    ["cash_reserve", values.cash],
    ["target_runway_buffer_months", values.buffer],
    ["estimated_price_floor", Math.round(result.priceFloor)],
    ["monthly_target", result.monthlyTarget],
    ["gross_mrr", result.grossMrr],
    ["margin_revenue", Math.round(result.marginRevenue)],
    ["monthly_gap_after_margin", Math.round(result.monthlyGap)],
    ["break_even_customers_at_current_arpa", Number.isFinite(result.breakEvenCustomers) ? result.breakEvenCustomers : ""],
    ["runway_months_at_gap", Number.isFinite(result.runwayMonths) ? result.runwayMonths.toFixed(1) : "flat"]
  ];
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function render() {
  const values = inputs();
  const result = calculate(values);
  const [statusText, statusClass] = status(result);

  els.churnOutput.textContent = `${values.churn}%`;
  els.grossMarginOutput.textContent = `${values.grossMargin}%`;
  els.bufferOutput.textContent = `${values.buffer} ${values.buffer === 1 ? "month" : "months"}`;

  els.priceFloor.textContent = money(result.priceFloor);
  els.floorLabel.textContent = result.floorDelta > 0
    ? `${money(result.floorDelta)} over current ARPA`
    : `${money(Math.abs(result.floorDelta))} below current ARPA`;
  els.breakEven.textContent = Number.isFinite(result.breakEvenCustomers) ? String(result.breakEvenCustomers) : "No ARPA";
  els.monthlyGap.textContent = money(result.monthlyGap);
  els.gapLabel.textContent = result.monthlyGap > 0 ? "Shortfall after margin" : "Surplus after margin";
  els.runway.textContent = Number.isFinite(result.runwayMonths) ? `${decimal(result.runwayMonths)} mo` : "Flat";
  els.runwayLabel.textContent = result.monthlyGap > 0 ? "Cash reserve divided by gap" : "No gap against target";

  els.statusPill.textContent = statusText;
  els.statusPill.className = statusClass;
  els.noteList.textContent = "";
  for (const note of buildNotes(values, result)) {
    const item = document.createElement("div");
    item.className = "note";
    item.innerHTML = `<strong>${note[0]}</strong><p>${note[1]}</p>`;
    els.noteList.append(item);
  }

  els.report.value = reportText(values, result);
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function reset() {
  els.customers.value = DEFAULTS.customers;
  els.price.value = DEFAULTS.price;
  els.churn.value = DEFAULTS.churn;
  els.newCustomers.value = DEFAULTS.newCustomers;
  els.grossMargin.value = DEFAULTS.grossMargin;
  els.overhead.value = DEFAULTS.overhead;
  els.founderIncome.value = DEFAULTS.founderIncome;
  els.growthBudget.value = DEFAULTS.growthBudget;
  els.cash.value = DEFAULTS.cash;
  els.buffer.value = DEFAULTS.buffer;
  els.notes.value = "";
  render();
}

document.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("input", render);
});

els.reset.addEventListener("click", reset);
els.copyReport.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.report.value);
  els.copyReport.textContent = "Copied";
  window.setTimeout(() => {
    els.copyReport.textContent = "Copy Markdown";
  }, 1200);
});
els.downloadReport.addEventListener("click", () => {
  download("micro-saas-runway-price-floor-note.md", els.report.value, "text/markdown");
});
els.downloadCsv.addEventListener("click", () => {
  const values = inputs();
  download("micro-saas-runway-price-floor.csv", csvText(values, calculate(values)), "text/csv");
});

render();
