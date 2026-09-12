package dev.emung.expensetracker.report.dto;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/** Spend per category for one month, like the "Departajare pe categorii" table of the original spreadsheet. */
public record MonthlyCategoryReport(YearMonth month, BigDecimal totalExpenseRon, BigDecimal totalRefundRon,
                                    BigDecimal netTotalRon, List<CategoryTotal> categories) {
}
