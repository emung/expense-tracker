package dev.emung.expensetracker.merchant;

import dev.emung.expensetracker.TestcontainersConfiguration;
import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.account.AccountRepository;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.category.CategoryRepository;
import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.merchant.dto.MerchantRuleRequest;
import dev.emung.expensetracker.merchant.dto.MerchantRuleResponse;
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
@Import({TestcontainersConfiguration.class, MerchantRuleService.class})
class MerchantRuleServiceIT {

    @Autowired
    private MerchantRuleService service;
    @Autowired
    private CategoryRepository categories;
    @Autowired
    private AccountRepository accounts;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void learnCreatesThenUpdatesAnUnpinnedRule() {
        service.learn("  Profi   Cluj ", category("Consumabile"), account("SaltBank"));

        // The key is normalized the same way the expense's merchant is.
        assertThat(service.list("profi")).singleElement()
                .satisfies(rule -> {
                    assertThat(rule.merchantKey()).isEqualTo("Profi Cluj");
                    assertThat(rule.categoryName()).isEqualTo("Consumabile");
                    assertThat(rule.accountName()).isEqualTo("SaltBank");
                    assertThat(rule.hitCount()).isEqualTo(1);
                    assertThat(rule.pinned()).isFalse();
                });

        service.learn("PROFI CLUJ", category("Altele"), account("Revolut"));

        assertThat(service.list("profi")).singleElement()
                .satisfies(rule -> {
                    assertThat(rule.categoryName()).isEqualTo("Altele");
                    assertThat(rule.accountName()).isEqualTo("Revolut");
                    assertThat(rule.hitCount()).isEqualTo(2);
                });
    }

    @Test
    void learnKeepsThePinnedChoiceAndStillCounts() {
        service.learn("Dedeman", category("Articole casnice"), account("SaltBank"));
        long id = service.list("dedeman").getFirst().id();
        service.update(id, new MerchantRuleRequest("Dedeman", categoryId("Consumabile"), null));

        service.learn("Dedeman", category("Cadouri"), account("Revolut"));

        assertThat(service.list("dedeman")).singleElement()
                .satisfies(rule -> {
                    assertThat(rule.categoryName()).isEqualTo("Consumabile");
                    assertThat(rule.accountId()).isNull();
                    assertThat(rule.pinned()).isTrue();
                    assertThat(rule.hitCount()).isEqualTo(2);
                });
    }

    @Test
    void learnIgnoresABlankMerchant() {
        service.learn("   ", category("Consumabile"), account("SaltBank"));

        assertThat(service.list(null)).isEmpty();
    }

    @Test
    void listIsOrderedByUseAndFiltersCaseInsensitively() {
        service.learn("Lidl", category("Consumabile"), null);
        service.learn("Kaufland", category("Consumabile"), null);
        service.learn("Kaufland", category("Consumabile"), null);

        assertThat(service.list(null)).extracting(MerchantRuleResponse::merchantKey).containsExactly("Kaufland", "Lidl");
        assertThat(service.list("LID")).extracting(MerchantRuleResponse::merchantKey).containsExactly("Lidl");
    }

    /** The search box is a plain text field: a typed % must not match everything. */
    @Test
    void searchTreatsLikeWildcardsLiterally() {
        service.learn("Lidl", category("Consumabile"), null);
        service.learn("100% Natural", category("Consumabile"), null);

        assertThat(service.list("%")).extracting(MerchantRuleResponse::merchantKey).containsExactly("100% Natural");
    }

    @Test
    void createdAndEditedRulesArePinned() {
        MerchantRuleResponse created = service.create(new MerchantRuleRequest(" Penny ", categoryId("Consumabile"), accountId("Revolut")));

        assertThat(created.merchantKey()).isEqualTo("Penny");
        assertThat(created.pinned()).isTrue();
        assertThat(created.hitCount()).isZero();

        MerchantRuleResponse updated = service.update(created.id(), new MerchantRuleRequest("Penny", categoryId("Altele"), null));

        assertThat(updated.categoryName()).isEqualTo("Altele");
        assertThat(updated.accountId()).isNull();
    }

    @Test
    void createRejectsADuplicateMerchantRegardlessOfCase() {
        service.create(new MerchantRuleRequest("Penny", categoryId("Consumabile"), null));

        assertThatThrownBy(() -> service.create(new MerchantRuleRequest("penny", categoryId("Altele"), null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("penny");
    }

    @Test
    void rulesCannotTargetArchivedCategoriesOrAccounts() {
        jdbc.update("UPDATE category SET archived = true WHERE name = 'Cadouri'");
        jdbc.update("UPDATE account SET archived = true WHERE name = 'Revolut'");

        assertThatThrownBy(() -> service.create(new MerchantRuleRequest("Penny", categoryId("Cadouri"), null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("arhivată");
        assertThatThrownBy(() -> service.create(new MerchantRuleRequest("Penny", categoryId("Consumabile"), accountId("Revolut"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("arhivat");
    }

    @Test
    void deleteRemovesTheRule() {
        long id = service.create(new MerchantRuleRequest("Penny", categoryId("Consumabile"), null)).id();

        service.delete(id);

        assertThat(service.list(null)).isEmpty();
        assertThatThrownBy(() -> service.delete(id)).isInstanceOf(NotFoundException.class);
    }

    private Category category(String name) {
        return categories.findById(categoryId(name)).orElseThrow();
    }

    private Account account(String name) {
        return accounts.findById(accountId(name)).orElseThrow();
    }

    private long categoryId(String name) {
        return jdbc.queryForObject("SELECT id FROM category WHERE name = ?", Long.class, name);
    }

    private long accountId(String name) {
        return jdbc.queryForObject("SELECT id FROM account WHERE name = ?", Long.class, name);
    }
}
