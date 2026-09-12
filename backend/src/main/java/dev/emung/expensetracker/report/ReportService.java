package dev.emung.expensetracker.report;

import dev.emung.expensetracker.report.dto.MonthlyCategoryReport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final ReportQueryRepository queries;

    public ReportService(ReportQueryRepository queries) {
        this.queries = queries;
    }

    public MonthlyCategoryReport monthlyByCategory(YearMonth month) {
        var rows = queries.categoryAmounts(month.atDay(1), month.plusMonths(1).atDay(1));
        return ReportCalculator.monthly(month, rows);
    }
}
