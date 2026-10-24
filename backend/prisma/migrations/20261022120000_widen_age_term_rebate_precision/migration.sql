-- Widen the age/term rebate from three to four decimals.
--
-- Plan 123 (Jeevan Sanchay 12 Yrs) rebates 3% of the tabular rate plus a flat
-- 2 per 1000. Rates carry two decimals, so the rebate routinely lands on a
-- fourth decimal (115.15 x 3% = 3.4545). At DECIMAL(10,3) that was stored as
-- 3.455 and the basic premium came out 0.50 short on a 10 lakh policy.
--
-- Widening a numeric column is safe: no existing value can lose precision.
ALTER TABLE "ProductAgeTermRebate"
    ALTER COLUMN "rebatePerThousand" TYPE DECIMAL(10,4);
