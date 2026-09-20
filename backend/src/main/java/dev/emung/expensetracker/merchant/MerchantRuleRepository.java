package dev.emung.expensetracker.merchant;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MerchantRuleRepository extends JpaRepository<MerchantRule, Long> {

    Optional<MerchantRule> findByMerchantKeyIgnoreCase(String merchantKey);

    boolean existsByMerchantKeyIgnoreCase(String merchantKey);

    boolean existsByMerchantKeyIgnoreCaseAndIdNot(String merchantKey, Long id);

    /**
     * Most-used first: the rules worth reviewing are the ones deciding the most rows. The entity graph
     * loads the category and account the response needs, instead of one query per row.
     *
     * <p>Searching and listing are separate methods on purpose. A single query with
     * {@code where :query is null or ...} leaves the parameter untyped when nothing is searched, and
     * Postgres then resolves {@code lower(?)} against {@code bytea} and fails.
     */
    @EntityGraph(attributePaths = {"category", "account"})
    List<MerchantRule> findByOrderByHitCountDescMerchantKeyAsc();

    /** {@code Containing} escapes LIKE wildcards, so a typed {@code %} searches for a literal one. */
    @EntityGraph(attributePaths = {"category", "account"})
    List<MerchantRule> findByMerchantKeyContainingIgnoreCaseOrderByHitCountDescMerchantKeyAsc(String merchantKey);
}
