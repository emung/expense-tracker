package dev.emung.expensetracker.account.dto;

import dev.emung.expensetracker.common.money.CurrencyCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param defaultCurrency optional; RON when omitted on create, unchanged on update
 * @param sortOrder       optional; new accounts are appended after the last one when omitted
 * @param archived        optional; unchanged on update when omitted
 */
public record AccountRequest(
        @NotBlank(message = "Numele este obligatoriu.")
        @Size(max = 100, message = "Numele poate avea cel mult 100 de caractere.")
        String name,
        CurrencyCode defaultCurrency,
        Integer sortOrder,
        Boolean archived) {
}
