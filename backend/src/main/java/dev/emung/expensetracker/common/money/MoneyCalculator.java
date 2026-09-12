package dev.emung.expensetracker.common.money;

import dev.emung.expensetracker.common.error.BusinessRuleException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/** The single place where an entered amount is converted to the base currency (RON). */
public final class MoneyCalculator {

    public static final int AMOUNT_SCALE = 2;
    public static final int RATE_SCALE = 6;

    /** Largest value that fits {@code numeric(12,2)}. */
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

    public record Converted(BigDecimal originalAmount, CurrencyCode currency, BigDecimal fxRate, BigDecimal amountRon) {
    }

    private MoneyCalculator() {
    }

    /**
     * @param originalAmount positive amount as entered, in {@code currency}
     * @param fxRate         RON per unit of {@code currency}; must be absent (or 1) for RON, required otherwise
     */
    public static Converted toBase(BigDecimal originalAmount, CurrencyCode currency, BigDecimal fxRate) {
        Objects.requireNonNull(currency, "currency");
        if (originalAmount == null) {
            throw new BusinessRuleException("originalAmount", "Suma este obligatorie.");
        }
        BigDecimal amount = originalAmount.setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new BusinessRuleException("originalAmount", "Suma trebuie să fie mai mare decât zero.");
        }

        BigDecimal rate;
        if (currency == CurrencyCode.BASE) {
            if (fxRate != null && fxRate.compareTo(BigDecimal.ONE) != 0) {
                throw new BusinessRuleException("fxRate", "Cursul de schimb se folosește doar pentru sume în altă monedă decât lei.");
            }
            rate = BigDecimal.ONE.setScale(RATE_SCALE);
        } else {
            if (fxRate == null) {
                throw new BusinessRuleException("fxRate", "Cursul de schimb este obligatoriu pentru %s.".formatted(currency));
            }
            rate = fxRate.setScale(RATE_SCALE, RoundingMode.HALF_UP);
            if (rate.signum() <= 0) {
                throw new BusinessRuleException("fxRate", "Cursul de schimb trebuie să fie mai mare decât zero.");
            }
        }

        BigDecimal amountRon = amount.multiply(rate).setScale(AMOUNT_SCALE, RoundingMode.HALF_UP);
        if (amountRon.signum() <= 0) {
            throw new BusinessRuleException("originalAmount", "Suma în lei este prea mică.");
        }
        if (amount.compareTo(MAX_AMOUNT) > 0 || amountRon.compareTo(MAX_AMOUNT) > 0) {
            throw new BusinessRuleException("originalAmount", "Suma este prea mare.");
        }
        return new Converted(amount, currency, rate, amountRon);
    }
}
