package dev.emung.expensetracker.expense;

import java.math.BigDecimal;

/** Sums in RON over a filtered set of expenses. */
public record ExpenseTotals(BigDecimal expenseRon, BigDecimal refundRon) {

    /** Spend after refunds. */
    public BigDecimal netRon() {
        return expenseRon.subtract(refundRon);
    }
}
