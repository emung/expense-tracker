package dev.emung.expensetracker.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param sortOrder optional; new categories are appended after the last one when omitted
 * @param archived  optional; unchanged on update when omitted
 */
public record CategoryRequest(
        @NotBlank(message = "Numele este obligatoriu.")
        @Size(max = 100, message = "Numele poate avea cel mult 100 de caractere.")
        String name,
        Integer sortOrder,
        Boolean archived) {
}
