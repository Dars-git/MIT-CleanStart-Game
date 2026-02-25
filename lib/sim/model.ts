import { DecisionInput, GameState, QuarterSnapshot } from "@/lib/types";

const INDUSTRY_SALARY_PER_QUARTER = 30_000;
const HIRE_COST = 5_000;
const MAX_QUALITY = 100;
const START_CASH = 1_000_000;
const START_ENGINEERS = 4;
const START_SALES = 2;
const START_QUALITY = 50;

export function initialGameState(userId: string): GameState {
  return {
    user_id: userId,
    quarter: 1,
    cash: START_CASH,
    engineers: START_ENGINEERS,
    sales_staff: START_SALES,
    quality: START_QUALITY,
    last_revenue: 0,
    last_net_income: 0,
    total_revenue: 0,
    total_net_income: 0,
    is_over: false,
    is_won: false
  };
}

export function quarterToYearQuarter(quarter: number): { year: number; quarterInYear: number } {
  const year = Math.floor((quarter - 1) / 4) + 1;
  const quarterInYear = ((quarter - 1) % 4) + 1;
  return { year, quarterInYear };
}

function sanitizeDecision(input: DecisionInput): DecisionInput {
  return {
    price: Math.max(1, Math.round(input.price)),
    new_engineers: Math.max(0, Math.floor(input.new_engineers)),
    new_sales_staff: Math.max(0, Math.floor(input.new_sales_staff)),
    salary_pct: Math.min(200, Math.max(50, Math.round(input.salary_pct)))
  };
}

export function advanceQuarter(
  current: GameState,
  decisionRaw: DecisionInput
): { next: GameState; snapshot: QuarterSnapshot } {
  if (current.is_over) {
    const { year, quarterInYear } = quarterToYearQuarter(current.quarter);
    return {
      next: current,
      snapshot: {
        quarter: current.quarter,
        year,
        quarter_in_year: quarterInYear,
        cash: current.cash,
        revenue: current.last_revenue,
        net_income: current.last_net_income,
        engineers: current.engineers,
        sales_staff: current.sales_staff,
        quality: current.quality
      }
    };
  }

  const decision = sanitizeDecision(decisionRaw);
  const engineers = current.engineers + decision.new_engineers;
  const salesStaff = current.sales_staff + decision.new_sales_staff;

  const salaryCost = (decision.salary_pct / 100) * INDUSTRY_SALARY_PER_QUARTER;
  const updatedQuality = Math.min(MAX_QUALITY, current.quality + engineers * 0.5);
  const demand = Math.max(0, updatedQuality * 10 - decision.price * 0.0001);
  const units = Math.floor(demand * salesStaff * 0.5);
  const revenue = decision.price * units;
  const payroll = salaryCost * (engineers + salesStaff);
  const netIncome = revenue - payroll;
  const newHireCost = (decision.new_engineers + decision.new_sales_staff) * HIRE_COST;
  const cash = current.cash + netIncome - newHireCost;

  const quarter = current.quarter + 1;
  const { year, quarterInYear } = quarterToYearQuarter(quarter);
  const isOver = cash <= 0 || year >= 10;
  const isWon = year >= 10 && cash > 0;

  const next: GameState = {
    ...current,
    quarter,
    cash,
    engineers,
    sales_staff: salesStaff,
    quality: updatedQuality,
    last_revenue: revenue,
    last_net_income: netIncome,
    total_revenue: current.total_revenue + revenue,
    total_net_income: current.total_net_income + netIncome,
    is_over: isOver,
    is_won: isWon
  };

  const snapshot: QuarterSnapshot = {
    quarter,
    year,
    quarter_in_year: quarterInYear,
    cash,
    revenue,
    net_income: netIncome,
    engineers,
    sales_staff: salesStaff,
    quality: updatedQuality
  };

  return { next, snapshot };
}
