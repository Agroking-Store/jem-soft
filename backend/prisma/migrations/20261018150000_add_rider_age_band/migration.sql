-- Rider rates move on the same half-year boundary as the base rate: on plan 833
-- a Term Rider Benefit at age 38 costs 4116 per 10 lakh in the first half of
-- the age year and 4508 in the second, a 9.5% difference.
--
-- Nullable so every existing row keeps matching on entryAge alone.
ALTER TABLE "RiderPremiumRate"
    ADD COLUMN "ageBand" INTEGER;

CREATE INDEX "RiderPremiumRate_productId_ageBand_idx"
    ON "RiderPremiumRate"("productId", "ageBand");