package dev.emung.expensetracker.common.error;

/** Maps to 404. The message is user-facing (Romanian). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
