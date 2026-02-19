const fs = require('fs');

const START_DATE = new Date();
START_DATE.setDate(START_DATE.getDate() - 90);
const END_DATE = new Date();
const BRANCH_ID = 1;
const COMPANY_ID = 1;

function fmt(d) {
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

function escape(s) {
    if (s === null || s === undefined) return "NULL";
    return "'" + String(s).replace(/'/g, "''") + "'";
}

const sql_lines = [];
sql_lines.push("USE pos_db;");
sql_lines.push("SET FOREIGN_KEY_CHECKS = 0;");

// 1. Users
const users = [
    [2, 'Cashier', 'One', 'cashier1', 'hashed', 5, '0771111111'],
    [3, 'Cashier', 'Two', 'cashier2', 'hashed', 5, '0772222222'],
    [4, 'Manager', 'One', 'manager1', 'hashed', 3, '0773333333'],
];
users.forEach(u => {
    sql_lines.push(`INSERT IGNORE INTO users (id, first_name, last_name, user_name, password, role_id, branch_id, phone, is_disabled, created_at, updated_at) VALUES (${u[0]}, '${u[1]}', '${u[2]}', '${u[3]}', '${u[4]}', ${u[5]}, ${BRANCH_ID}, '${u[6]}', 0, NOW(), NOW());`);
});

const CASHIER_IDS = [1, 2, 3];

// 2. Suppliers
const suppliers = [
    [101, 'Global Imports', 'SUP101', 'info@global.com', '0112345678'],
    [102, 'Local Traders', 'SUP102', 'info@local.com', '0119876543'],
    [103, 'Best Distributors', 'SUP103', 'best@dist.com', '0115555555'],
    [104, 'Mega Supplies', 'SUP104', 'mega@supplies.com', '0114444444'],
    [105, 'Prime Goods', 'SUP105', 'prime@goods.com', '0113333333'],
];
suppliers.forEach(s => {
    sql_lines.push(`INSERT IGNORE INTO suppliers (id, company_id, supplier_code, name, email, phone, branch_id, is_active, created_at, updated_at) VALUES (${s[0]}, ${COMPANY_ID}, '${s[2]}', '${s[1]}', '${s[3]}', '${s[4]}', ${BRANCH_ID}, 1, NOW(), NOW());`);
});

// 3. Customers - Guaranteed safe IDs
const customer_ids = [];
for (let i = 1; i <= 50; i++) {
    const cid = 60000 + i;
    customer_ids.push(cid);
    const name = `Customer ${i}`;
    const phone = `077${Math.floor(1000000 + Math.random() * 9000000)}`;
    const code = `CUST-${cid}`;
    sql_lines.push(`INSERT IGNORE INTO customers (id, customer_code, customer_name, phone, customer_type, is_active, created_by, branch_id, created_at, updated_at) VALUES (${cid}, '${code}', '${name}', '${phone}', 'retail', 1, 1, ${BRANCH_ID}, NOW(), NOW());`);
}

// 4. Products - From CSV content, explicitly inserting with new IDs
const csvContent = `name,product_code,description,category_id,unit_of_measure,cost_price,selling_price,mrp,min_stock_level,reorder_level,supplier_id,brand_id,branch_id,is_active
Amino Power 300g,4792001000001,Essential amino acids blend,1,pcs,2500.00,3200.00,3500.00,10,20,1,1,1,1
Amino Complex 500g,4792001000002,Complete amino acid formula,1,pcs,3800.00,4800.00,5200.00,8,15,1,2,1,1
Antioxidant Defense 60 caps,4792002000001,Powerful antioxidant formula,2,pcs,1800.00,2400.00,2600.00,15,25,1,1,1,1
Antioxidant Plus 90 caps,4792002000002,Advanced antioxidant support,2,pcs,2200.00,2900.00,3200.00,12,20,1,2,1,1
BCAA Powder 400g,4792003000001,2:1:1 BCAA ratio formula,3,pcs,3200.00,4100.00,4500.00,15,25,1,1,1,1
BCAA Elite 500g,4792003000002,Premium BCAA supplement,3,pcs,3800.00,4900.00,5300.00,12,20,1,2,1,1
Beef Protein Isolate 2lb,4792004000001,100% beef protein powder,4,pcs,6500.00,8200.00,8800.00,8,15,1,1,1,1
Beef Protein Prime 3lb,4792004000002,Grass-fed beef protein,4,pcs,9200.00,11500.00,12500.00,6,12,1,2,1,1
Training Belt Large,4792005000001,Premium leather lifting belt,5,pcs,4500.00,5800.00,6200.00,5,10,1,1,1,1
Power Belt XL,4792005000002,Heavy duty weight belt,5,pcs,5200.00,6500.00,7000.00,5,10,1,2,1,1
Casein Protein 2lb,4792006000001,Slow-release protein formula,6,pcs,5800.00,7400.00,8000.00,10,18,1,1,1,1
Micellar Casein 4lb,4792006000002,Premium night protein,6,pcs,10500.00,13200.00,14000.00,8,15,1,2,1,1
Collagen Peptides 300g,4792007000001,Hydrolyzed collagen powder,7,pcs,3200.00,4100.00,4500.00,12,20,1,1,1,1
Marine Collagen 500g,4792007000002,Type 1 collagen supplement,7,pcs,4800.00,6100.00,6600.00,10,18,1,2,1,1
Creatine Monohydrate 300g,4792008000001,Pure creatine powder,8,pcs,1800.00,2400.00,2600.00,20,35,1,1,1,1
Creatine HCL 200g,4792008000002,Advanced creatine formula,8,pcs,2800.00,3600.00,3900.00,15,25,1,2,1,1
Fat Burner Extreme 60 caps,4792009000001,Thermogenic fat burner,9,pcs,3500.00,4500.00,4900.00,12,20,1,1,1,1
Fat Burner Pro 90 caps,4792009000002,Advanced weight loss formula,9,pcs,4200.00,5400.00,5800.00,10,18,1,2,1,1
Omega-3 Fish Oil 100 caps,4792010000001,1000mg EPA/DHA per serving,10,pcs,2200.00,2900.00,3200.00,15,25,1,1,1,1
Triple Fish Oil 180 caps,4792010000002,High potency omega-3,10,pcs,3800.00,4900.00,5300.00,12,20,1,2,1,1
Resistance Bands Set,4792011000001,5-piece exercise band set,11,pcs,2500.00,3200.00,3500.00,8,15,1,1,1,1
Jump Rope Pro,4792011000002,Speed jump rope for fitness,11,pcs,1200.00,1600.00,1800.00,10,18,1,2,1,1
Gift Box Premium,4792012000001,Deluxe supplement gift box,12,pcs,8500.00,11000.00,12000.00,5,10,1,1,1,1
Gift Voucher Rs.5000,4792012000002,Redeemable gift voucher,12,pcs,5000.00,5000.00,5000.00,20,30,1,2,1,1
L-Glutamine 500g,4792013000001,Pure glutamine powder,13,pcs,3200.00,4100.00,4500.00,15,25,1,1,1,1
Glutamine Recovery 1kg,4792013000002,Post-workout glutamine,13,pcs,5800.00,7400.00,8000.00,10,18,1,2,1,1
Gym Bag Large,4792014000001,Spacious sports duffle bag,14,pcs,3500.00,4500.00,4900.00,8,15,1,1,1,1
Gym Backpack Pro,4792014000002,Multi-compartment gym bag,14,pcs,4200.00,5400.00,5800.00,8,15,1,2,1,1
Hair Skin Nails 60 caps,4792015000001,Beauty supplement formula,15,pcs,2800.00,3600.00,3900.00,12,20,1,1,1,1
Biotin Complex 90 caps,4792015000002,Hair growth support,15,pcs,2200.00,2900.00,3200.00,15,25,1,2,1,1
Hydrolyzed Whey 2lb,4792016000001,Fast-absorbing whey protein,16,pcs,6200.00,7900.00,8500.00,12,20,1,1,1,1
Hydrolyzed Whey Pro 5lb,4792016000002,Premium hydrolyzed protein,16,pcs,14500.00,18200.00,19500.00,8,15,1,2,1,1
Joint Support Formula 60 caps,4792017000001,Glucosamine & chondroitin,17,pcs,3200.00,4100.00,4500.00,10,18,1,1,1,1
Joint Health Plus 120 caps,4792017000002,Advanced joint support,17,pcs,5200.00,6600.00,7200.00,8,15,1,2,1,1
Knee Sleeves 7mm Pair,4792018000001,Neoprene knee support,18,pcs,2800.00,3600.00,3900.00,10,18,1,1,1,1
Knee Sleeves Heavy Duty,4792018000002,Competition grade sleeves,18,pcs,3800.00,4900.00,5300.00,8,15,1,2,1,1
Knee Wraps 2m Pair,4792019000001,Elastic knee wraps,19,pcs,1800.00,2400.00,2600.00,10,18,1,1,1,1
Knee Wraps Competition,4792019000002,Professional knee wraps,19,pcs,2500.00,3200.00,3500.00,8,15,1,2,1,1
Magnesium Glycinate 120 caps,4792020000001,High absorption magnesium,20,pcs,2200.00,2900.00,3200.00,15,25,1,1,1,1
Magnesium Complex 180 caps,4792020000002,Multi-form magnesium blend,20,pcs,2800.00,3600.00,3900.00,12,20,1,2,1,1
Mass Gainer 5lb,4792021000001,High calorie weight gainer,21,pcs,8500.00,10800.00,11500.00,10,18,1,1,1,1
Mass Gainer Pro 12lb,4792021000002,Premium mass building formula,21,pcs,18500.00,23500.00,25000.00,6,12,1,2,1,1
Plant Protein 2lb,4792022000001,Vegan protein blend,22,pcs,4800.00,6100.00,6600.00,12,20,1,1,1,1
Pea Protein Isolate 3lb,4792022000002,100% plant-based protein,22,pcs,6500.00,8200.00,8800.00,10,18,1,2,1,1
Pre-Workout Energy 300g,4792023000001,Explosive energy formula,23,pcs,3800.00,4900.00,5300.00,15,25,1,1,1,1
Pre-Workout Extreme 450g,4792023000002,High-stim pre-workout,23,pcs,4800.00,6100.00,6600.00,12,20,1,2,1,1
Whey Protein 2lb,4792024000001,Quality whey protein blend,24,pcs,4500.00,5800.00,6200.00,15,25,1,1,1,1
Whey Protein 5lb,4792024000002,Economy whey protein,24,pcs,9800.00,12500.00,13500.00,10,18,1,2,1,1
Recovery Formula 500g,4792025000001,Post-workout recovery blend,25,pcs,3500.00,4500.00,4900.00,12,20,1,1,1,1
Recovery Plus 1kg,4792025000002,Advanced recovery support,25,pcs,6200.00,7900.00,8500.00,10,18,1,2,1,1
Protein Bar Box 12pcs,4792026000001,Ready-to-drink protein bars,26,pcs,2800.00,3600.00,3900.00,20,35,1,1,1,1
RTD Protein Shake 330ml,4792026000002,Ready-to-drink protein,26,pcs,450.00,600.00,650.00,30,50,1,2,1,1
Shaker Bottle 700ml,4792027000001,BPA-free protein shaker,27,pcs,580.00,750.00,850.00,20,35,1,1,1,1
Shaker Premium 1L,4792027000002,Deluxe shaker with storage,27,pcs,980.00,1250.00,1400.00,15,25,1,2,1,1
Collagen Gummies 60pcs,4792028000001,Beauty support supplement,28,pcs,2200.00,2900.00,3200.00,15,25,1,1,1,1
Vitamin C Complex 90 caps,4792028000002,Skin brightening formula,28,pcs,1800.00,2400.00,2600.00,18,30,1,2,1,1
Protein Chips 40g,4792029000001,High protein snack,29,pcs,280.00,380.00,420.00,30,50,1,1,1,1
Protein Cookie 75g,4792029000002,Delicious protein snack,29,pcs,420.00,550.00,600.00,25,40,1,2,1,1
Testosterone Booster 60 caps,4792030000001,Natural test support,30,pcs,3800.00,4900.00,5300.00,10,18,1,1,1,1
Test Booster Pro 90 caps,4792030000002,Advanced testosterone formula,30,pcs,4800.00,6100.00,6600.00,8,15,1,2,1,1
Supplement Sample Pack,4792031000001,Try before you buy pack,31,pcs,1200.00,1600.00,1800.00,15,25,1,1,1,1
Mixed Supplement Box,4792031000002,Variety supplement pack,31,pcs,2500.00,3200.00,3500.00,10,18,1,2,1,1
Multivitamin 100 tabs,4792032000001,Daily vitamin supplement,32,pcs,1800.00,2400.00,2600.00,20,35,1,1,1,1
Vitamin D3 5000IU 120 caps,4792032000002,High potency vitamin D,32,pcs,1500.00,2000.00,2200.00,18,30,1,2,1,1
Whey Blend 4lb,4792033000001,Quality protein blend,33,pcs,7500.00,9500.00,10200.00,12,20,1,1,1,1
Whey Blend Premium 6lb,4792033000002,Superior whey protein mix,33,pcs,10800.00,13800.00,14800.00,10,18,1,2,1,1
Whey Isolate 2lb,4792034000001,Pure whey protein isolate,34,pcs,6800.00,8600.00,9200.00,12,20,1,1,1,1
Whey Isolate Pro 5lb,4792034000002,Premium isolate protein,34,pcs,15800.00,20000.00,21500.00,8,15,1,2,1,1
Wrist Wraps 18 inch,4792035000001,Cotton wrist support,35,pcs,1200.00,1600.00,1800.00,15,25,1,1,1,1
Wrist Wraps Heavy Duty,4792035000002,Professional wrist wraps,35,pcs,1800.00,2400.00,2600.00,12,20,1,2,1,1`;

const PRODUCT_IDS = [];
const product_stock = {};
const lines = csvContent.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split(',');

// Assign new safe IDs for these products
for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const pid = 20000 + i; // Safe ID range
    PRODUCT_IDS.push(pid);
    
    // Columns: name,product_code,description,category_id,unit_of_measure,cost_price,selling_price,mrp,min_stock_level,reorder_level,supplier_id,brand_id,branch_id,is_active
    const name = escape(row[0]);
    const code = escape(row[1]);
    const desc = escape(row[2]);
    const catId = row[3];
    const uom = escape(row[4]);
    const cost = row[5];
    const price = row[6];
    const mrp = row[7];
    const minStock = row[8];
    const reorder = row[9];
    const supId = row[10];
    const brandId = row[11];
    const active = row[13];
    
    // Insert Product
    sql_lines.push(`INSERT IGNORE INTO products (id, name, productCode, description, categoryId, unit_of_measure, costPrice, selling_price, minStockLevel, supplier_id, brand_id, branch_id, isActive, createdAt, updatedAt) VALUES (${pid}, ${name}, ${code}, ${desc}, ${catId}, ${uom}, ${cost}, ${price}, ${minStock}, ${supId}, ${brandId}, ${BRANCH_ID}, ${active}, NOW(), NOW());`);
}

// 4. Opening Stock (uses PRODUCT_IDS)
PRODUCT_IDS.forEach(pid => {
    const qty = Math.floor(50 + Math.random() * 150);
    // Rough estimate from CSV data logic or just random cost for ledger init which doesn't check products table typically
    const cost = 1000; 
    const price = 1500;
    
    product_stock[pid] = qty;

    sql_lines.push(`INSERT IGNORE INTO inventory (product_id, branch_id, quantity, unit_cost, selling_price, mrp, reference_type, created_at, updated_at) VALUES (${pid}, ${BRANCH_ID}, ${qty}, ${cost}, ${price}, ${price * 1.1}, 'opening_stock', '${fmt(START_DATE)}', '${fmt(START_DATE)}');`);
    sql_lines.push(`INSERT INTO inventory_ledger (company_id, product_id, branch_id, transaction_type, quantity_in, balance_quantity, unit_cost, total_value, reference_type, transaction_date, created_at, updated_at) VALUES (${COMPANY_ID}, ${pid}, ${BRANCH_ID}, 'in', ${qty}, ${qty}, ${cost}, ${qty * cost}, 'other', '${fmt(START_DATE)}', '${fmt(START_DATE)}', '${fmt(START_DATE)}');`);
});

// 5. Sales
let sale_id = 50000;
let item_id = 50000;
let pay_id = 50000;
let curr = new Date(START_DATE);

while (curr <= END_DATE) {
    const daily_sales = Math.floor(5 + Math.random() * 10);
    const times = [];
    for (let i = 0; i < daily_sales; i++) {
        const dt = new Date(curr);
        dt.setHours(9 + Math.floor(Math.random() * 9));
        dt.setMinutes(Math.floor(Math.random() * 60));
        dt.setSeconds(Math.floor(Math.random() * 60));
        times.push(dt);
    }
    times.sort((a, b) => a - b);

    times.forEach(dt => {
        const cid = Math.random() > 0.3 ? customer_ids[Math.floor(Math.random() * customer_ids.length)] : null;
        const cashier = CASHIER_IDS[Math.floor(Math.random() * CASHIER_IDS.length)];
        
        const num_products = Math.floor(1 + Math.random() * 5);
        const picked = [];
        for(let j=0; j<num_products; j++) picked.push(PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)]);
        
        let sale_total = 0;
        let sale_cost = 0;
        const sale_items_data = [];
        
        picked.forEach(pid => {
            const p_qty = Math.floor(1 + Math.random() * 3);
            const p_cost = 1000;
            const p_price = 1500;
            const p_subtotal = p_qty * p_price;
            
            if (product_stock[pid] !== undefined) product_stock[pid] -= p_qty;
            else product_stock[pid] = -p_qty;
            const current_balance = product_stock[pid];

            sale_total += p_subtotal;
            sale_cost += (p_qty * p_cost);
            
            sale_items_data.push({
                pid, qty: p_qty, cost: p_cost, price: p_price, subtotal: p_subtotal, balance: current_balance
            });
        });

        const sale_num = `SAL-${dt.getFullYear()}${(dt.getMonth()+1).toString().padStart(2,'0')}${dt.getDate().toString().padStart(2,'0')}-${sale_id.toString().padStart(4, '0')}`;
        
        sql_lines.push(`INSERT INTO sales (id, sale_number, customer_id, sale_date, subtotal, discount_amount, total_amount, paid_amount, total_cost, profit, payment_status, sale_status, sale_type, cashier_id, branch_id, created_at, updated_at) VALUES (${sale_id}, '${sale_num}', ${escape(cid)}, '${fmt(dt)}', ${sale_total}, 0, ${sale_total}, ${sale_total}, ${sale_cost}, ${sale_total - sale_cost}, 'paid', 'completed', 'retail', ${cashier}, ${BRANCH_ID}, '${fmt(dt)}', '${fmt(dt)}');`);
        
        sale_items_data.forEach(item => {
            const item_total_cost = item.qty * item.cost;
            const item_profit = item.subtotal - item_total_cost;
            
            sql_lines.push(`INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, unit_cost, total_cost, profit, subtotal, total_amount, branch_id, created_at, updated_at) VALUES (${item_id}, ${sale_id}, ${item.pid}, 'Product ${item.pid}', ${item.qty}, ${item.price}, ${item.cost}, ${item_total_cost}, ${item_profit}, ${item.subtotal}, ${item.subtotal}, ${BRANCH_ID}, '${fmt(dt)}', '${fmt(dt)}');`);
            item_id++;
            
            sql_lines.push(`INSERT INTO inventory_ledger (company_id, product_id, branch_id, transaction_type, quantity_out, balance_quantity, unit_cost, total_value, reference_type, reference_id, transaction_date, created_at, updated_at) VALUES (${COMPANY_ID}, ${item.pid}, ${BRANCH_ID}, 'out', ${item.qty}, ${item.balance}, ${item.cost}, ${item.subtotal}, 'sale', ${sale_id}, '${fmt(dt)}', '${fmt(dt)}', '${fmt(dt)}');`);
            
            sql_lines.push(`UPDATE inventory SET quantity = quantity - ${item.qty} WHERE product_id = ${item.pid} AND branch_id = ${BRANCH_ID};`);
        });
        
        sql_lines.push(`INSERT INTO sale_payments (id, sale_id, payment_date, payment_method, amount, processed_by, total_amount, paid_amount, remaining_amount, payment_status, branch_id, created_at, updated_at) VALUES (${pay_id}, ${sale_id}, '${fmt(dt)}', 'cash', ${sale_total}, ${cashier}, ${sale_total}, ${sale_total}, 0, 'paid', ${BRANCH_ID}, '${fmt(dt)}', '${fmt(dt)}');`);
        pay_id++;
        sale_id++;
    });

    curr.setDate(curr.getDate() + 1);
}

sql_lines.push("SET FOREIGN_KEY_CHECKS = 1;");
fs.writeFileSync('sample_data_3_months.sql', sql_lines.join('\n'));
console.log("Done");
