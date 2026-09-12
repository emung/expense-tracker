package dev.emung.expensetracker.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findAllByOrderBySortOrderAscNameAsc();

    List<Account> findByArchivedFalseOrderBySortOrderAscNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("select coalesce(max(a.sortOrder), 0) from Account a")
    int maxSortOrder();
}
