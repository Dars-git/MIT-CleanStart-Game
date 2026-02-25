export type GameState = {
  user_id: string;
  quarter: number;
  cash: number;
  engineers: number;
  sales_staff: number;
  quality: number;
  last_revenue: number;
  last_net_income: number;
  total_revenue: number;
  total_net_income: number;
  is_over: boolean;
  is_won: boolean;
};

export type QuarterSnapshot = {
  quarter: number;
  year: number;
  quarter_in_year: number;
  cash: number;
  revenue: number;
  net_income: number;
  engineers: number;
  sales_staff: number;
  quality: number;
};

export type DecisionInput = {
  price: number;
  new_engineers: number;
  new_sales_staff: number;
  salary_pct: number;
};
