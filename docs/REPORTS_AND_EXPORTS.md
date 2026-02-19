# Reports and Excel Exports Guide

This document provides detailed information about the reporting and data export features implemented in the POS System Backend.

## 📊 Feature Overview

The Reporting module provides two main types of data:
1.  **JSON Statistics**: Real-time aggregated data for dashboards and charts.
2.  **Excel Exports**: Professional `.xlsx` workbooks for offline auditing and record-keeping.

All reports support dynamic time periods and branch-specific filtering.

---

## 🚀 Endpoints

### 1. Sales Reports
Endpoints for analyzing sales performance, revenue, and profitability.

| Endpoint | Method | Description | Permission |
| :--- | :--- | :--- | :--- |
| `/api/reports/sales/statistics` | `GET` | Get Sales summary stats | `view_stats_report` |
| `/api/reports/sales/export` | `GET` | Export Sales to Excel | `export_report` |

### 2. Payment Reports
Endpoints for tracking collections and payment methods.

| Endpoint | Method | Description | Permission |
| :--- | :--- | :--- | :--- |
| `/api/reports/payments/statistics` | `GET` | Get Payment summary stats | `view_stats_report` |
| `/api/reports/payments/export` | `GET` | Export Payments to Excel | `export_report` |

---

## 🛠️ Query Parameters

The following parameters are supported by **all** report endpoints:

| Parameter | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `period` | `string` | `daily`, `weekly`, `monthly`, `annually` | `daily` |
| `date` | `string` | Reference date in `YYYY-MM-DD` format | Current Date |
| `branchId` | `integer` | Filter data for a specific branch | User's Branch |

---

## 📅 Supported Periods

- **Daily**: Data for the specific day provided in `date`.
- **Weekly**: Data for the full week containing the `date` (starts from Monday).
- **Monthly**: Data for the entire calendar month of the `date`.
- **Annually**: Data for the entire calendar year of the `date`.

---

## 📈 Statistics Response Structure

### Sales Statistics
```json
{
  "success": true,
  "period": "monthly",
  "range": { "start": "2025-12-01T00:00:00Z", "end": "2025-12-31T23:59:59Z" },
  "data": {
    "summary": {
      "totalSales": 150,
      "totalRevenue": 45000.00,
      "totalCost": 30000.00,
      "totalProfit": 15000.00,
      "totalDiscount": 500.00,
      "totalTax": 4500.00,
      "avgProfitMargin": 33.33
    },
    "payments": [
      { "method": "cash", "amount": 25000.00 },
      { "method": "card", "amount": 20000.00 }
    ]
  }
}
```

---

## 📑 Excel Sheet Format

The generated Excel files include:
- **Stylized Headers**: Bold text with background fill.
- **Auto-fit Columns**: Column widths adjusted to content.
- **Summation Formulas**: The "TOTAL" row at the bottom uses live Excel formulas (`SUM`) for financial columns.

### Sales Excel Columns:
`Date`, `Sale Number`, `Customer`, `Cashier`, `Subtotal`, `Discount`, `Tax`, `Total`, `Paid`, `Status`.

### Payment Excel Columns:
`Date`, `Reference`, `Method`, `Amount`, `Balance`, `Processed By`, `Note`.

---

## 🔐 Permissions

The system uses an auto-permission generator. Ensure the following permissions are assigned to your role:
1.  `view_stats_report`: Required for statistics endpoints.
2.  `export_report`: Required for downloading Excel files.

---

## 📝 Example Requests

### Get Monthly Sales Statistics
```bash
curl -X GET "http://localhost:5000/api/reports/sales/statistics?period=monthly&date=2025-12-19" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

### Download Weekly Sales Excel
```bash
curl -X GET "http://localhost:5000/api/reports/sales/export?period=weekly" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     --output Weekly_Sales_Report.xlsx
```

### Get Annual Payment Stats for Branch #2
```bash
curl -X GET "http://localhost:5000/api/reports/payments/statistics?period=annually&branchId=2" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

---
**Version**: 1.0.0  
**Last Updated**: December 2025  
