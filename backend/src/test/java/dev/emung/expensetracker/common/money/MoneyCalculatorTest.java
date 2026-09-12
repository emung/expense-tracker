package dev.emung.expensetracker.common.money;

import dev.emung.expensetracker.common.error.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyCalculatorTest {

    @Test
    void ronWithoutRateKeepsAmountAndStoresRateOne() {
        var converted = MoneyCalculator.toBase(new BigDecimal("49.75"), CurrencyCode.RON, null);

        assertThat(converted.amountRon()).isEqualByComparingTo("49.75");
        assertThat(converted.fxRate()).isEqualByComparingTo("1");
        assertThat(converted.originalAmount()).isEqualByComparingTo("49.75");
    }

    @Test
    void ronAcceptsExplicitRateOne() {
        assertThat(MoneyCalculator.toBase(BigDecimal.TEN, CurrencyCode.RON, new BigDecimal("1.000000")).amountRon())
                .isEqualByComparingTo("10.00");
    }

    @Test
    void ronRejectsOtherRates() {
        assertThatThrownBy(() -> MoneyCalculator.toBase(BigDecimal.TEN, CurrencyCode.RON, new BigDecimal("5")))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("fxRate");
    }

    /** Real conversions from the original spreadsheet, plus a HALF_UP boundary (HALF_EVEN would give 1.00). */
    @ParameterizedTest
    @CsvSource({
            "300, 5.227133, 1568.14",   // rent: -300*5.227133
            "19.98, 5.2452, 104.80",    // Revolut termination fee: -19.98*5.2452
            "1.00, 1.005, 1.01"
    })
    void eurIsConvertedAndRoundedHalfUp(String amount, String rate, String expectedRon) {
        var converted = MoneyCalculator.toBase(new BigDecimal(amount), CurrencyCode.EUR, new BigDecimal(rate));

        assertThat(converted.amountRon()).isEqualByComparingTo(expectedRon);
        assertThat(converted.amountRon().scale()).isEqualTo(2);
        assertThat(converted.fxRate()).isEqualByComparingTo(rate);
    }

    @Test
    void eurRequiresRate() {
        assertThatThrownBy(() -> MoneyCalculator.toBase(BigDecimal.TEN, CurrencyCode.EUR, null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("EUR")
                .extracting("field").isEqualTo("fxRate");
    }

    @Test
    void rejectsNonPositiveRate() {
        assertThatThrownBy(() -> MoneyCalculator.toBase(BigDecimal.TEN, CurrencyCode.EUR, new BigDecimal("0.0000001")))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("fxRate");
    }

    @Test
    void rejectsZeroNegativeAndSubCentAmounts() {
        assertThatThrownBy(() -> MoneyCalculator.toBase(BigDecimal.ZERO, CurrencyCode.RON, null)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> MoneyCalculator.toBase(new BigDecimal("-5"), CurrencyCode.RON, null)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> MoneyCalculator.toBase(new BigDecimal("0.004"), CurrencyCode.RON, null)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void rejectsConversionThatDropsBelowOneBan() {
        assertThatThrownBy(() -> MoneyCalculator.toBase(new BigDecimal("0.01"), CurrencyCode.EUR, new BigDecimal("0.4")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("prea mică");
    }

    @Test
    void rejectsAmountsThatOverflowTheColumn() {
        assertThatThrownBy(() -> MoneyCalculator.toBase(new BigDecimal("9999999999.99"), CurrencyCode.EUR, new BigDecimal("5")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("prea mare");
    }
}
