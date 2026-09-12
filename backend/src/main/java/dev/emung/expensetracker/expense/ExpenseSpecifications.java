package dev.emung.expensetracker.expense;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class ExpenseSpecifications {

    static final char LIKE_ESCAPE = '\\';

    private ExpenseSpecifications() {
    }

    static Specification<Expense> matching(ExpenseFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("expenseDate"), filter.from()));
            }
            if (filter.toExclusive() != null) {
                predicates.add(cb.lessThan(root.<LocalDate>get("expenseDate"), filter.toExclusive()));
            }
            if (filter.categoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), filter.categoryId()));
            }
            if (filter.accountId() != null) {
                predicates.add(cb.equal(root.get("account").get("id"), filter.accountId()));
            }
            if (filter.type() != null) {
                predicates.add(cb.equal(root.get("type"), filter.type()));
            }
            if (filter.query() != null) {
                String pattern = containsPattern(filter.query());
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("merchant")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.<String>get("details")), pattern, LIKE_ESCAPE)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Case-insensitive "contains" LIKE pattern with the user's {@code %} and {@code _} taken literally. */
    static String containsPattern(String text) {
        return "%" + escapeLike(text) + "%";
    }

    static String escapeLike(String text) {
        return text.strip().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
