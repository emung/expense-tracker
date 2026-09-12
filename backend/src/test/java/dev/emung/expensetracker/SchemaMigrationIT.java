package dev.emung.expensetracker;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.account.AccountRepository;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.category.CategoryRepository;
import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.expense.EntryType;
import dev.emung.expensetracker.expense.Expense;
import dev.emung.expensetracker.expense.ExpenseRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Liquibase applies cleanly, Hibernate validates the mapping, and the DB enforces its invariants. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class SchemaMigrationIT {

    private static final String INSERT_EXPENSE = """
            INSERT INTO expense (expense_date, merchant, category_id, account_id, entry_type,
                                 original_amount, original_currency, fx_rate, amount_ron)
            VALUES (DATE '2026-08-01', ?, (SELECT min(id) FROM category), (SELECT min(id) FROM account), ?, ?, ?, ?, ?)
            """;

    @Autowired
    private CategoryRepository categories;
    @Autowired
    private AccountRepository accounts;
    @Autowired
    private ExpenseRepository expenses;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void seedsCategoriesFromTheSpreadsheetInOrder() {
        assertThat(categories.findAll(Sort.by("sortOrder")))
                .extracting(Category::getName)
                .containsExactly("Abonamente", "Activitati", "Altele", "Articole casnice", "Cadouri",
                        "Chirie & Utilitati", "Consumabile", "Facturi & Rate", "Imbracaminte", "Masina",
                        "Restaurant", "Sanatate", "Scoala");
    }

    @Test
    void seedsRonAccounts() {
        assertThat(accounts.findAll(Sort.by("sortOrder")))
                .extracting(Account::getName, Account::getDefaultCurrency)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("SaltBank", CurrencyCode.RON),
                        org.assertj.core.groups.Tuple.tuple("Revolut", CurrencyCode.RON));
    }

    @Test
    void roundTripsAnEurExpense() {
        var expense = new Expense();
        expense.setExpenseDate(LocalDate.of(2026, 8, 25));
        expense.setMerchant("Carme");
        expense.setCategory(categories.findAll().getFirst());
        expense.setAccount(accounts.findAll().getFirst());
        expense.setType(EntryType.EXPENSE);
        expense.setAmount(new BigDecimal("300.00"), CurrencyCode.EUR, new BigDecimal("5.227133"), new BigDecimal("1568.14"));
        expense.setAmountExpression("300*5,227133");
        Long id = expenses.saveAndFlush(expense).getId();
        entityManager.clear();

        Expense loaded = expenses.findById(id).orElseThrow();
        assertThat(loaded.getOriginalCurrency()).isEqualTo(CurrencyCode.EUR);
        assertThat(loaded.getFxRate()).isEqualByComparingTo("5.227133");
        assertThat(loaded.getAmountRon()).isEqualByComparingTo("1568.14");
        assertThat(loaded.getType()).isEqualTo(EntryType.EXPENSE);
        assertThat(loaded.getCreatedAt()).isNotNull();
    }

    @Test
    void acceptsValidRawInsert() {
        jdbc.update(INSERT_EXPENSE, "Penny", "REFUND", new BigDecimal("10"), "RON", BigDecimal.ONE, new BigDecimal("10"));
        assertThat(expenses.count()).isEqualTo(1);
    }

    @Test
    void rejectsRonExpenseWithFxRateOtherThanOne() {
        assertThatThrownBy(() -> jdbc.update(INSERT_EXPENSE, "Penny", "EXPENSE", new BigDecimal("10"), "RON", new BigDecimal("5"), new BigDecimal("50")))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_expense_ron_rate");
    }

    @Test
    void rejectsNonPositiveAmount() {
        // Only original_amount is invalid, so exactly that constraint must fire.
        assertThatThrownBy(() -> jdbc.update(INSERT_EXPENSE, "Penny", "EXPENSE", BigDecimal.ZERO, "RON", BigDecimal.ONE, BigDecimal.TEN))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_expense_original_amount_positive");
    }

    @Test
    void rejectsUnknownEntryTypeAndCurrency() {
        assertThatThrownBy(() -> jdbc.update(INSERT_EXPENSE, "Penny", "INCOME", BigDecimal.TEN, "RON", BigDecimal.ONE, BigDecimal.TEN))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_expense_entry_type");
    }

    @Test
    void rejectsBlankMerchant() {
        assertThatThrownBy(() -> jdbc.update(INSERT_EXPENSE, "   ", "EXPENSE", BigDecimal.TEN, "RON", BigDecimal.ONE, BigDecimal.TEN))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_expense_merchant_not_blank");
    }

    @Test
    void categoryNamesAreUniqueCaseInsensitively() {
        assertThatThrownBy(() -> jdbc.update("INSERT INTO category (name) VALUES ('masina')"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ux_category_name");
    }

    @Test
    void referencedCategoryCannotBeDeleted() {
        jdbc.update(INSERT_EXPENSE, "Penny", "EXPENSE", BigDecimal.TEN, "RON", BigDecimal.ONE, BigDecimal.TEN);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM category WHERE id = (SELECT min(id) FROM category)"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_expense_category");
    }
}
