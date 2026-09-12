package dev.emung.expensetracker.common.error;

/** Maps to 409, e.g. duplicate names or deleting something still in use. The message is user-facing (Romanian). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
