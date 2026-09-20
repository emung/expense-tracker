package dev.emung.expensetracker.merchant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param merchantKey the merchant name this rule matches, case-insensitively
 * @param accountId   optional; null means "don't pre-fill an account"
 */
public record MerchantRuleRequest(
        @NotBlank(message = "Magazinul este obligatoriu.")
        @Size(max = 200, message = "Magazinul poate avea cel mult 200 de caractere.")
        String merchantKey,

        @NotNull(message = "Categoria este obligatorie.")
        Long categoryId,

        Long accountId) {
}
