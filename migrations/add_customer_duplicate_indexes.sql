-- Migration: Add indexes for customer duplicate prevention
-- Date: 2026-01-03
-- Description: Adds indexes for email and is_deleted fields to improve query performance
--              and support duplicate prevention logic

-- Add index for email field (improves duplicate email checks)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Add index for is_deleted field (improves filtering of deleted customers)
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON customers(is_deleted);

-- Optional: Add partial unique indexes for extra database-level protection
-- These ensure uniqueness at the database level for non-deleted customers

-- Unique index for phone (only for non-deleted customers with non-null phone)
-- Note: This is optional as validation is handled in the application layer
-- Uncomment if you want database-level enforcement:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique 
-- ON customers (phone) 
-- WHERE is_deleted = false AND phone IS NOT NULL AND phone != '';

-- Unique index for email (only for non-deleted customers with non-null email)
-- Note: This is optional as validation is handled in the application layer
-- Uncomment if you want database-level enforcement:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique 
-- ON customers (email) 
-- WHERE is_deleted = false AND email IS NOT NULL AND email != '';

-- Verify indexes were created
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'customers' 
    AND schemaname = 'public'
ORDER BY 
    indexname;
