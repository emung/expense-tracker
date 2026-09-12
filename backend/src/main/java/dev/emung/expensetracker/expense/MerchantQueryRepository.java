package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.expense.dto.MerchantSuggestion;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Merchant autocomplete: distinct merchants (case-insensitive), prefix matches first, then by frequency. */
@Repository
public class MerchantQueryRepository {

    private static final String SUGGEST_SQL = """
            WITH ranked AS (
                SELECT merchant, category_id, account_id,
                       count(*) OVER (PARTITION BY lower(merchant)) AS uses,
                       row_number() OVER (PARTITION BY lower(merchant) ORDER BY expense_date DESC, id DESC) AS recency
                FROM expense
                WHERE lower(merchant) LIKE :contains ESCAPE '\\'
            )
            SELECT merchant, uses, category_id, account_id
            FROM ranked
            WHERE recency = 1
            ORDER BY (lower(merchant) LIKE :prefix ESCAPE '\\') DESC, uses DESC, merchant
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
                        rs.getLong("account_id")))
                .list();
    }
}
