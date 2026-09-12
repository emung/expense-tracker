package dev.emung.expensetracker.category;

import dev.emung.expensetracker.TestcontainersConfiguration;
import dev.emung.expensetracker.category.dto.CategoryRequest;
import dev.emung.expensetracker.category.dto.CategoryResponse;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, CategoryService.class})
class CategoryServiceIT {

    @Autowired
    private CategoryService service;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void createNormalizesNameAndAppendsAfterLastCategory() {
        CategoryResponse created = service.create(new CategoryRequest("  Vacanta   de vara ", null, null));

        assertThat(created.name()).isEqualTo("Vacanta de vara");
        assertThat(created.sortOrder()).isEqualTo(140);
        assertThat(created.archived()).isFalse();
    }

    @Test
    void createRejectsDuplicateNameIgnoringCase() {
        assertThatThrownBy(() -> service.create(new CategoryRequest("MASINA", null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("MASINA");
    }

    @Test
    void updateCanChangeCaseOfOwnNameAndArchive() {
        long id = idOf("Masina");

        CategoryResponse updated = service.update(id, new CategoryRequest("MASINA", null, true));

        assertThat(updated.name()).isEqualTo("MASINA");
        assertThat(updated.archived()).isTrue();
        assertThat(service.list(false)).extracting(CategoryResponse::id).doesNotContain(id);
        assertThat(service.list(true)).extracting(CategoryResponse::id).contains(id);
    }

    @Test
    void updateRejectsNameOfAnotherCategory() {
        assertThatThrownBy(() -> service.update(idOf("Masina"), new CategoryRequest("restaurant", null, null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void listReportsExpenseCounts() {
        long masina = idOf("Masina");
        insertExpense(masina);
        insertExpense(masina);

        assertThat(service.list(false))
                .filteredOn(category -> category.id() == masina)
                .singleElement()
                .extracting(CategoryResponse::expenseCount)
                .isEqualTo(2L);
    }

    @Test
    void deleteRefusesCategoryInUse() {
        long masina = idOf("Masina");
        insertExpense(masina);

        assertThatThrownBy(() -> service.delete(masina))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("1 cheltuială");
    }

    @Test
    void deleteRemovesUnusedCategory() {
        long id = service.create(new CategoryRequest("Temporar", null, null)).id();

        service.delete(id);

        assertThatThrownBy(() -> service.get(id)).isInstanceOf(NotFoundException.class);
    }

    private long idOf(String name) {
        return jdbc.queryForObject("SELECT id FROM category WHERE name = ?", Long.class, name);
    }

    private void insertExpense(long categoryId) {
        jdbc.update("""
                INSERT INTO expense (expense_date, merchant, category_id, account_id, entry_type,
                                     original_amount, original_currency, fx_rate, amount_ron)
                VALUES (DATE '2026-08-01', 'RomPetrol', ?, (SELECT min(id) FROM account), 'EXPENSE', 100, 'RON', 1, 100)
                """, categoryId);
    }
}
