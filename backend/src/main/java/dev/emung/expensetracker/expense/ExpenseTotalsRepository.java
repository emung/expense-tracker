package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.common.money.MoneyCalculator;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

/** Sums over the same {@link Specification} the list uses, in a single query. */
@Repository
public class ExpenseTotalsRepository {

    private final EntityManager entityManager;

    public ExpenseTotalsRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public ExpenseTotals totals(Specification<Expense> specification) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Expense> root = query.from(Expense.class);
        query.multiselect(
                sumOfType(cb, root, EntryType.EXPENSE).alias("expense"),
                sumOfType(cb, root, EntryType.REFUND).alias("refund"));
        Predicate predicate = specification.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }
        Tuple result = entityManager.createQuery(query).getSingleResult();
        return new ExpenseTotals(scaled(result.get("expense", BigDecimal.class)), scaled(result.get("refund", BigDecimal.class)));
    }

    private static Expression<BigDecimal> sumOfType(CriteriaBuilder cb, Root<Expense> root, EntryType type) {
        Expression<BigDecimal> amountIfType = cb.<BigDecimal>selectCase()
                .when(cb.equal(root.get("type"), type), root.<BigDecimal>get("amountRon"))
                .otherwise(BigDecimal.ZERO);
        return cb.coalesce(cb.sum(amountIfType), BigDecimal.ZERO);
    }

    private static BigDecimal scaled(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(MoneyCalculator.AMOUNT_SCALE);
    }
}
