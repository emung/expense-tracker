package dev.emung.expensetracker.report;

import dev.emung.expensetracker.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, ReportQueryRepository.class})
class ReportQueryRepositoryIT {

    private static final LocalDate AUG_START = LocalDate.of(2026, 8, 1);
    private static final LocalDate SEP_START = LocalDate.of(2026, 9, 1);

    @Autowired
    private ReportQueryRepository queries;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void sumsExpensesAndRefundsPerCategoryWithinTheMonthOnly() {
        insert("2026-08-01", "Masina", "EXPENSE", "524.10");
        insert("2026-08-31", "Masina", "EXPENSE", "200.00");
        insert("2026-08-13", "Masina", "REFUND", "10.00");
        insert("2026-07-31", "Masina", "EXPENSE", "999.00");
        insert("2026-09-01", "Masina", "EXPENSE", "999.00");
        insert("2026-08-05", "Consumabile", "EXPENSE", "43.95");

        Map<String, CategoryAmounts> byName = byName(queries.categoryAmounts(AUG_START, SEP_START));

        assertThat(byName.get("Masina").expenseRon()).isEqualByComparingTo("724.10");
        assertThat(byName.get("Masina").refundRon()).isEqualByComparingTo("10.00");
        assertThat(byName.get("Consumabile").expenseRon()).isEqualByComparingTo("43.95");
        assertThat(byName.get("Consumabile").refundRon()).isEqualByComparingTo("0");
    }

    @Test
    void listsEveryActiveCategoryEvenWithoutEntries() {
        assertThat(queries.categoryAmounts(AUG_START, SEP_START)).hasSize(13)
                .allSatisfy(row -> assertThat(row.expenseRon()).isEqualByComparingTo("0"));
    }

    @Test
    void archivedCategoriesAppearOnlyInMonthsWithEntries() {
        jdbc.update("UPDATE category SET archived = true WHERE name IN ('Cadouri', 'Scoala')");
        insert("2026-08-26", "Scoala", "EXPENSE", "80.00");

        Map<String, CategoryAmounts> august = byName(queries.categoryAmounts(AUG_START, SEP_START));
        assertThat(august).containsKey("Scoala").doesNotContainKey("Cadouri");
        assertThat(august.get("Scoala").archived()).isTrue();

        assertThat(byName(queries.categoryAmounts(SEP_START, LocalDate.of(2026, 10, 1))))
                .doesNotContainKeys("Scoala", "Cadouri");
    }

    private void insert(String date, String category, String type, String amountRon) {
        jdbc.update("""
                INSERT INTO expense (expense_date, merchant, category_id, account_id, entry_type,
                                     original_amount, original_currency, fx_rate, amount_ron)
                VALUES (CAST(? AS date), 'Test', (SELECT id FROM category WHERE name = ?), (SELECT min(id) FROM account),
                        ?, CAST(? AS numeric), 'RON', 1, CAST(? AS numeric))
                """, date, category, type, amountRon, amountRon);
    }

    private static Map<String, CategoryAmounts> byName(List<CategoryAmounts> rows) {
        return rows.stream().collect(Collectors.toMap(CategoryAmounts::name, Function.identity()));
    }
}
