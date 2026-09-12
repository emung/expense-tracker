package dev.emung.expensetracker.report;

import dev.emung.expensetracker.common.money.MoneyCalculator;
import dev.emung.expensetracker.report.dto.CategoryTotal;
import dev.emung.expensetracker.report.dto.MonthlyCategoryReport;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

/** Pure report math: net per category, totals and percentage shares. */
public final class ReportCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(MoneyCalculator.AMOUNT_SCALE);

    private ReportCalculator() {
    }

    /** Categories are ordered by net spend (highest first), then by their configured order. */
    public static MonthlyCategoryReport monthly(YearMonth month, List<CategoryAmounts> rows) {
        BigDecimal totalExpense = rows.stream().map(row -> scaled(row.expenseRon())).reduce(ZERO, BigDecimal::add);
        BigDecimal totalRefund = rows.stream().map(row -> scaled(row.refundRon())).reduce(ZERO, BigDecimal::add);
        BigDecimal netTotal = totalExpense.subtract(totalRefund);

        List<CategoryTotal> categories = rows.stream()
                .sorted(Comparator.comparing((CategoryAmounts row) -> net(row)).reversed()
                        .thenComparingInt(CategoryAmounts::sortOrder)
                        .thenComparing(CategoryAmounts::name))
                .map(row -> {
                    BigDecimal net = net(row);
                    return new CategoryTotal(row.categoryId(), row.name(), row.archived(),
                            scaled(row.expenseRon()), scaled(row.refundRon()), net, percentage(net, netTotal));
                })
                .toList();

        return new MonthlyCategoryReport(month, totalExpense, totalRefund, netTotal, categories);
    }

    private static BigDecimal net(CategoryAmounts row) {
        return scaled(row.expenseRon()).subtract(scaled(row.refundRon()));
    }

    private static BigDecimal percentage(BigDecimal part, BigDecimal total) {
        if (total.signum() <= 0) {
            return ZERO;
        }
        return part.multiply(HUNDRED).divide(total, MoneyCalculator.AMOUNT_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal scaled(BigDecimal value) {
        return value == null ? ZERO : value.setScale(MoneyCalculator.AMOUNT_SCALE, RoundingMode.HALF_UP);
    }
}
