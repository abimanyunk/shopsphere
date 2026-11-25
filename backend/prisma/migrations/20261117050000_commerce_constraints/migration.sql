ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
ADD CONSTRAINT "order_items_unit_price_nonnegative" CHECK ("unit_price" >= 0),
ADD CONSTRAINT "order_items_line_total_nonnegative" CHECK ("line_total" >= 0);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_subtotal_nonnegative" CHECK ("subtotal" >= 0),
ADD CONSTRAINT "orders_total_nonnegative" CHECK ("total" >= 0);

ALTER TABLE "payments"
ADD CONSTRAINT "payments_amount_nonnegative" CHECK ("amount" >= 0);
