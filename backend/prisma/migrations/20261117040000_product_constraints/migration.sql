CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "products"
ADD CONSTRAINT "products_price_nonnegative" CHECK ("price" >= 0),
ADD CONSTRAINT "products_stock_nonnegative" CHECK ("stock_quantity" >= 0);

CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "products_description_trgm_idx" ON "products" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "products_sku_trgm_idx" ON "products" USING GIN ("sku" gin_trgm_ops);
