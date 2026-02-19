-- Database Migration Scripts related to Tax Logic and Returns

-- 1. Updates to sale_return_items table
-- Adding tax related fields to track tax on returned items
ALTER TABLE sale_return_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0 COMMENT 'Tax percentage applied to this item';
ALTER TABLE sale_return_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0 COMMENT 'Tax amount calculated for this item';
ALTER TABLE sale_return_items ADD COLUMN IF NOT EXISTS tax_type ENUM('percentage', 'fixed', 'none') DEFAULT 'none';

-- 2. Updates to customer_refund_items table
-- Adding tax related fields to refunds
ALTER TABLE customer_refund_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE customer_refund_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;

-- 3. Updates to sales table
-- Adding field to track total tax refunded in a sale transaction (simultaneous return)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS return_tax_amount DECIMAL(15, 2) DEFAULT 0 COMMENT 'Tax amount refunded on returned items';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS return_total_amount DECIMAL(15, 2) DEFAULT 0 COMMENT 'Total amount refunded on returned items';

-- 4. Updates to customer_refunds table
-- Adding breakdown fields
ALTER TABLE customer_refunds ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE customer_refunds ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;

-- 5. Updates to sale_items table
-- Ensure tax fields exist for item-wise tax calculation
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_type ENUM('percentage', 'fixed', 'none') DEFAULT 'none';

-- 6. Updates to held_bills table
-- Add support for return items in held bills
ALTER TABLE held_bills ADD COLUMN IF NOT EXISTS return_items JSON COMMENT 'Array of return items';

-- Note: 'IF NOT EXISTS' is standard in MariaDB/MySQL 5.7+ for ADD COLUMN.
-- If running on older versions or if syntax error occurs, remove 'IF NOT EXISTS'.
