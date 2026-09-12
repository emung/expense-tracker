package dev.emung.expensetracker.account;

import dev.emung.expensetracker.TestcontainersConfiguration;
import dev.emung.expensetracker.account.dto.AccountRequest;
import dev.emung.expensetracker.account.dto.AccountResponse;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.money.CurrencyCode;
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
@Import({TestcontainersConfiguration.class, AccountService.class})
class AccountServiceIT {

    @Autowired
    private AccountService service;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void createDefaultsToRonAndAppends() {
        AccountResponse created = service.create(new AccountRequest("Cash", null, null, null));

        assertThat(created.defaultCurrency()).isEqualTo(CurrencyCode.RON);
        assertThat(created.sortOrder()).isEqualTo(30);
    }

    @Test
    void updateKeepsCurrencyWhenOmitted() {
        long id = service.create(new AccountRequest("Card EUR", CurrencyCode.EUR, null, null)).id();

        AccountResponse updated = service.update(id, new AccountRequest("Card EUR Revolut", null, null, null));

        assertThat(updated.defaultCurrency()).isEqualTo(CurrencyCode.EUR);
        assertThat(updated.name()).isEqualTo("Card EUR Revolut");
    }

    @Test
    void deleteRefusesAccountInUse() {
        long saltBank = jdbc.queryForObject("SELECT id FROM account WHERE name = 'SaltBank'", Long.class);
        jdbc.update("""
                INSERT INTO expense (expense_date, merchant, category_id, account_id, entry_type,
                                     original_amount, original_currency, fx_rate, amount_ron)
                VALUES (DATE '2026-08-01', 'Penny', (SELECT min(id) FROM category), ?, 'EXPENSE', 10, 'RON', 1, 10)
                """, saltBank);

        assertThatThrownBy(() -> service.delete(saltBank))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("SaltBank");
    }
}
