import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { NotFoundPage, RouteErrorPage } from './components/ErrorPages';
import { ExpensesPage } from './features/expenses/ExpensesPage';
import { SettingsPage } from './features/settings/SettingsPage';

export const paths = {
  expenses: '/cheltuieli',
  report: '/raport',
  settings: '/setari',
} as const;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={paths.expenses} replace /> },
      { path: paths.expenses.slice(1), element: <ExpensesPage /> },
      {
        path: paths.report.slice(1),
        // The charting library is only needed here, so it is loaded on first visit instead of with the app.
        lazy: () => import('./features/reports/MonthlyReportPage').then((module) => ({ Component: module.MonthlyReportPage })),
      },
      { path: paths.settings.slice(1), element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
