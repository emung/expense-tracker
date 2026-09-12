package dev.emung.expensetracker.common.text;

import java.util.regex.Pattern;

public final class Text {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private Text() {
    }

    /** Trims and collapses inner whitespace, keeping case: {@code "  Pizza   Cluj "} -> {@code "Pizza Cluj"}. */
    public static String normalizeName(String value) {
        return value == null ? null : WHITESPACE.matcher(value.strip()).replaceAll(" ");
    }

    /** Blank strings become {@code null}; others are trimmed. */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    /**
     * Romanian count phrase: 1 cheltuială, 2 cheltuieli, 20 de cheltuieli.
     * Romanian inserts "de" when the number's last two digits are 00 or 20-99.
     */
    public static String countLabel(long count, String singular, String plural) {
        if (count == 1) {
            return "1 " + singular;
        }
        long lastTwo = Math.abs(count) % 100;
        boolean needsDe = count != 0 && (lastTwo == 0 || lastTwo >= 20);
        return count + (needsDe ? " de " : " ") + plural;
    }
}
