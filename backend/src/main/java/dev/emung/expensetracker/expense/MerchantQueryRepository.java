package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.expense.dto.MerchantSuggestion;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Merchant autocomplete: distinct merchants (case-insensitive), prefix matches first, then by frequency. */
@Repository
public class MerchantQueryRepository {

    /**
     * The pre-fill comes from the merchant's rule when there is one, and falls back to the most recent
     * expense otherwise. Archived targets are treated as absent, because the form would reject them.
     */
    private static final String SUGGEST_SQL = """
            WITH ranked AS (
                SELECT merchant, category_id, account_id, amount_ron,
                       count(*) OVER (PARTITION BY lower(merchant)) AS uses,
                       row_number() OVER (PARTITION BY lower(merchant) ORDER BY expense_date DESC, id DESC) AS recency
                FROM expense
                WHERE lower(merchant) LIKE :contains ESCAPE '\\'
            )
            SELECT r.merchant, r.uses, r.amount_ron,
                   COALESCE(rule_category.id, r.category_id) AS category_id,
                   COALESCE(rule_account.id, r.account_id)   AS account_id,
                   rule_category.id IS NOT NULL              AS from_rule
            FROM ranked r
            LEFT JOIN merchant_rule mr ON lower(mr.merchant_key) = lower(r.merchant)
            LEFT JOIN category rule_category ON rule_category.id = mr.category_id AND NOT rule_category.archived
            LEFT JOIN account rule_account ON rule_account.id = mr.account_id AND NOT rule_account.archived
            WHERE r.recency = 1
            ORDER BY (lower(r.merchant) LIKE :prefix ESCAPE '\\') DESC, r.uses DESC, r.merchant
            LIMIT :limit
            """;

    private final JdbcClient jdbc;

    public MerchantQueryRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<MerchantSuggestion> suggest(String query, int limit) {
        String needle = query == null ? "" : ExpenseSpecifications.escapeLike(query);
        return jdbc.sql(SUGGEST_SQL)
                .param("contains", "%" + needle + "%")
                .param("prefix", needle + "%")
                .param("limit", limit)
                .query((rs, rowNum) -> new MerchantSuggestion(
                        rs.getString("merchant"),
                        rs.getLong("uses"),
                        rs.getLong("category_id"),
                        rs.getLong("account_id"),
                        rs.getBigDecimal("amount_ron"),
                        rs.getBoolean("from_rule")))
                .list();
    }
}
