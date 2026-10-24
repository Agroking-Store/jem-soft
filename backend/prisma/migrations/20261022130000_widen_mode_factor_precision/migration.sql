-- Widen the premium mode factor from four to six decimals.
--
-- LIC's mode factor is not a constant: it absorbs the flat 2 per 1000 mode
-- rebate, so it drifts down as the tabular rate rises. On plan 123 it runs from
-- 0.507870 at age 15 to 0.507847 at age 58. Stored at four decimals the best we
-- could do was 0.5079, which overstated a ten lakh half-yearly instalment by
-- about 7 rupees. Six decimals brings the worst case to about 1.5 rupees.
--
-- Widening a numeric column is safe: no existing value can lose precision.
ALTER TABLE "ProductPremiumModeFactor"
    ALTER COLUMN "factor" TYPE DECIMAL(10,6);
