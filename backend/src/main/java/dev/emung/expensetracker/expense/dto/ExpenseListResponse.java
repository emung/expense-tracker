package dev.emung.expensetracker.expense.dto;

import dev.emung.expensetracker.expense.ExpenseTotals;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

/**
 * One page of expenses plus totals over <em>all</em> rows matching the filter (not just this page).
 *
 * @param netRon spend after refunds: {@code totalExpenseRon - totalRefundRon}
 */
public record ExpenseListResponse(
        List<ExpenseResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        BigDecimal totalExpenseRon,
        BigDecimal totalRefundRon,
        BigDecimal netRon) {

    public static ExpenseListResponse of(Page<ExpenseResponse> page, ExpenseTotals totals) {
        return new ExpenseListResponse(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages(), totals.expenseRon(), totals.refundRon(), totals.netRon());
    }
}
