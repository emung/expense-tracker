package dev.emung.expensetracker.report.dto;

import java.math.BigDecimal;

/**
 * @param netRon     {@code expenseRon - refundRon}; negative when refunds exceed spending
 * @param percentage share of the month's net total, 0-100 with 2 decimals (0 when the net total is not positive)
 */
public record CategoryTotal(Long categoryId, String name, boolean archived,
                            BigDecimal expenseRon, BigDecimal refundRon, BigDecimal netRon, BigDecimal percentage) {
}
