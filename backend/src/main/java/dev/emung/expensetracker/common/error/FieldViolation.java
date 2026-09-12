package dev.emung.expensetracker.common.error;

/** One entry of the {@code errors} property on a 400 ProblemDetail. */
public record FieldViolation(String field, String message) {
}
