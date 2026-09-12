package dev.emung.expensetracker.common.error;

/** Maps to 400 for requests that are well-formed but violate a domain rule. The message is user-facing (Romanian). */
public class BusinessRuleException extends RuntimeException {

    private final String field;

    public BusinessRuleException(String message) {
        this(null, message);
    }

    /** @param field the request field the violation belongs to, so the UI can highlight it */
    public BusinessRuleException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
