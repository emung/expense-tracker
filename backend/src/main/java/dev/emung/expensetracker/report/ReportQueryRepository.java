package dev.emung.expensetracker.report;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public class ReportQueryRepository {

    /**
     * Every active category (even with no spending, like the spreadsheet) plus archived categories that
     * have entries in the period. The date range is half-open: {@code [start, end)}.
     */
    private static final String CATEGORY_AMOUNTS_SQL = """
            SELECT c.id, c.name, c.archived, c.sort_order,
                   COALESCE(SUM(e.amount_ron) FILTER (WHERE e.entry_type = 'EXPENSE'), 0) AS expense_ron,
                   COALESCE(SUM(e.amount_ron) FILTER (WHERE e.entry_type = 'REFUND'), 0)  AS refund_ron
            FROM category c
            LEFT JOIN expense e
                   ON e.category_id = c.id
                  AND e.expense_date >= :start
                  AND e.expense_date < :end
            GROUP BY c.id, c.name, c.archived, c.sort_order
            HAVING NOT c.archived OR COUNT(e.id) > 0
            """;

    private final JdbcClient jdbc;

    public ReportQueryRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<CategoryAmounts> categoryAmounts(LocalDate start, LocalDate endExclusive) {
        return jdbc.sql(CATEGORY_AMOUNTS_SQL)
                .param("start", start)
                .param("end", endExclusive)
                .query((rs, rowNum) -> new CategoryAmounts(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getBoolean("archived"),
                        rs.getInt("sort_order"),
                        rs.getBigDecimal("expense_ron"),
                        rs.getBigDecimal("refund_ron")))
                .list();
    }
}
