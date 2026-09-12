package dev.emung.expensetracker.common.text;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TextTest {

    @Test
    void normalizeNameTrimsAndCollapsesWhitespaceKeepingCase() {
        assertThat(Text.normalizeName("  Pizza \t  Cluj ")).isEqualTo("Pizza Cluj");
        assertThat(Text.normalizeName(null)).isNull();
    }

    @Test
    void blankToNull() {
        assertThat(Text.blankToNull("   ")).isNull();
        assertThat(Text.blankToNull(" Mici ")).isEqualTo("Mici");
    }

    @ParameterizedTest
    @CsvSource({
            "0, 0 cheltuieli",
            "1, 1 cheltuială",
            "2, 2 cheltuieli",
            "19, 19 cheltuieli",
            "20, 20 de cheltuieli",
            "100, 100 de cheltuieli",
            "101, 101 cheltuieli",
            "124, 124 de cheltuieli"
    })
    void countLabelFollowsRomanianNumeralRules(long count, String expected) {
        assertThat(Text.countLabel(count, "cheltuială", "cheltuieli")).isEqualTo(expected);
    }
}
