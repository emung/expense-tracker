package dev.emung.expensetracker.report;

import java.math.BigDecimal;

/** Raw per-category sums for one period, as read from the database. */
public record CategoryAmounts(Long categoryId, String name, boolean archived, int sortOrder,
                              BigDecimal expenseRon, BigDecimal refundRon) {
}
