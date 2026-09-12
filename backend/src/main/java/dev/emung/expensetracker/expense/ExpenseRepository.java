package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.common.persistence.IdCount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {

    /** Fetches category and account with the page to avoid N+1 when mapping list responses. */
    @Override
    @EntityGraph(attributePaths = {"category", "account"})
    Page<Expense> findAll(Specification<Expense> specification, Pageable pageable);

    long countByCategoryId(Long categoryId);

    long countByAccountId(Long accountId);

    @Query("select e.category.id as id, count(e) as total from Expense e group by e.category.id")
    List<IdCount> countPerCategory();

    @Query("select e.account.id as id, count(e) as total from Expense e group by e.account.id")
    List<IdCount> countPerAccount();
}
