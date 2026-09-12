/** Mirrors of the backend DTOs. Dates are ISO strings (`YYYY-MM-DD`, `YYYY-MM`), amounts are JSON numbers. */

export type EntryType = 'EXPENSE' | 'REFUND';
export type Currency = 'RON' | 'EUR';

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  archived: boolean;
  expenseCount: number;
}

export interface CategoryRequest {
  name: string;
  sortOrder?: number | null;
  archived?: boolean | null;
}

export interface Account {
  id: number;
  name: string;
  defaultCurrency: Currency;
  sortOrder: number;
  archived: boolean;
  expenseCount: number;
}

export interface AccountRequest {
  name: string;
  defaultCurrency?: Currency | null;
  sortOrder?: number | null;
  archived?: boolean | null;
}

export interface Expense {
  id: number;
  expenseDate: string;
  merchant: string;
  categoryId: number;
  categoryName: string;
  accountId: number;
  accountName: string;
  type: EntryType;
  originalAmount: number;
  originalCurrency: Currency;
  fxRate: number;
  amountRon: number;
  /** Negative for expenses, positive for refunds. */
  signedAmountRon: number;
  amountExpression: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  expenseDate: string;
  merchant: string;
  categoryId: number;
  accountId: number;
  type: EntryType;
  /** Always positive; the sign is expressed by `type`. */
  originalAmount: number;
  originalCurrency: Currency;
  fxRate: number | null;
  amountExpression: string | null;
  details: string | null;
}

export interface ExpenseList {
  content: Expense[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  totalExpenseRon: number;
  totalRefundRon: number;
  /** Spend after refunds. */
  netRon: number;
}

export interface ExpenseFilters {
  month: string;
  categoryId?: number;
  accountId?: number;
  type?: EntryType;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MerchantSuggestion {
  merchant: string;
  uses: number;
  lastCategoryId: number;
  lastAccountId: number;
}

export interface CategoryTotal {
  categoryId: number;
  name: string;
  archived: boolean;
  expenseRon: number;
  refundRon: number;
  netRon: number;
  /** Share of the month's net total in percentage points (0-100). */
  percentage: number;
}

export interface MonthlyCategoryReport {
  month: string;
  totalExpenseRon: number;
  totalRefundRon: number;
  netTotalRon: number;
  categories: CategoryTotal[];
}

export interface FieldViolation {
  field: string;
  message: string;
}

/** RFC 9457 error body produced by the backend's GlobalExceptionHandler. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: FieldViolation[];
}
