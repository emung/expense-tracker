package dev.emung.expensetracker.report;

import dev.emung.expensetracker.report.dto.CategoryTotal;
import dev.emung.expensetracker.report.dto.MonthlyCategoryReport;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class ReportCalculatorTest {

    private static final YearMonth AUGUST = YearMonth.of(2026, 8);

    @Test
    void netsRefundsPerCategoryAndComputesShares() {
        MonthlyCategoryReport report = ReportCalculator.monthly(AUGUST, List.of(
                row(1, "Consumabile", 70, "2779.95", "0"),
                row(2, "Masina", 100, "7089.85", "10.00"),
                row(3, "Imbracaminte", 90, "746.96", "44.55")));

        assertThat(report.totalExpenseRon()).isEqualByComparingTo("10616.76");
        assertThat(report.totalRefundRon()).isEqualByComparingTo("54.55");
        assertThat(report.netTotalRon()).isEqualByComparingTo("10562.21");
        assertThat(report.categories())
                .extracting(CategoryTotal::name, CategoryTotal::netRon, CategoryTotal::percentage)
                .containsExactly(
                        tuple("Masina", new BigDecimal("7079.85"), new BigDecimal("67.03")),
                        tuple("Consumabile", new BigDecimal("2779.95"), new BigDecimal("26.32")),
                        tuple("Imbracaminte", new BigDecimal("702.41"), new BigDecimal("6.65")));
    }

    @Test
    void emptyCategoriesStayListedWithZeroShareAfterActiveOnes() {
        MonthlyCategoryReport report = ReportCalculator.monthly(AUGUST, List.of(
                row(5, "Cadouri", 50, "0", "0"),
                row(1, "Abonamente", 10, "0", "0"),
                row(7, "Consumabile", 70, "100", "0")));

        assertThat(report.categories())
                .extracting(CategoryTotal::name, CategoryTotal::percentage)
                .containsExactly(
                        tuple("Consumabile", new BigDecimal("100.00")),
                        tuple("Abonamente", new BigDecimal("0.00")),
                        tuple("Cadouri", new BigDecimal("0.00")));
    }

    @Test
    void sharesAreZeroWhenNothingWasSpent() {
        MonthlyCategoryReport report = ReportCalculator.monthly(AUGUST, List.of(
                row(1, "Masina", 100, "0", "25"),
                row(2, "Consumabile", 70, "0", "0")));

        assertThat(report.netTotalRon()).isEqualByComparingTo("-25");
        assertThat(report.categories()).allSatisfy(total -> assertThat(total.percentage()).isEqualByComparingTo("0"));
    }

    @Test
    void categoryWhoseRefundsExceedSpendingHasNegativeNet() {
        MonthlyCategoryReport report = ReportCalculator.monthly(AUGUST, List.of(
                row(1, "Consumabile", 70, "200", "0"),
                row(2, "Imbracaminte", 90, "20", "70")));

        CategoryTotal clothes = report.categories().getLast();
        assertThat(clothes.name()).isEqualTo("Imbracaminte");
        assertThat(clothes.netRon()).isEqualByComparingTo("-50");
        assertThat(clothes.percentage()).isEqualByComparingTo("-33.33");
    }

    @Test
    void amountsAreReturnedWithTwoDecimals() {
        MonthlyCategoryReport report = ReportCalculator.monthly(AUGUST, List.of(row(1, "Masina", 100, "10", "0")));

        assertThat(report.totalExpenseRon().scale()).isEqualTo(2);
        assertThat(report.categories().getFirst().expenseRon().toPlainString()).isEqualTo("10.00");
    }

    @Test
    void noCategoriesProducesEmptyReport() {
        MonthlyCategoryReport report = ReportCalculator.monthly(AUGUST, List.of());

        assertThat(report.categories()).isEmpty();
        assertThat(report.netTotalRon()).isEqualByComparingTo("0");
    }

    private static CategoryAmounts row(long id, String name, int sortOrder, String expense, String refund) {
        return new CategoryAmounts(id, name, false, sortOrder, new BigDecimal(expense), new BigDecimal(refund));
    }
}
