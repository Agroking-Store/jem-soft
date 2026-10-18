-- LIC keys its premium rate table and its rebate on half-year age bands rather
-- than completed years: a customer aged 40 years 3 months and one aged 40 years
-- 9 months can be quoted different rates. 92.5% of plan 833's age/term
-- combinations differ between the two halves of an age year.
--
-- Both columns are nullable so every existing row keeps matching on entryAge
-- alone; the lookup only prefers ageBand when a band-specific row exists.
ALTER TABLE "ProductPremiumRate"
    ADD COLUMN "ageBand" INTEGER;

ALTER TABLE "ProductAgeTermRebate"
    ADD COLUMN "ageBand" INTEGER;

-- The rebate unique key has to include the band so one age can hold two rows
-- (one per half-year) for the same term and sum-assured band.
DROP INDEX IF EXISTS "ProductAgeTermRebate_productId_entryAge_policyTerm_minSumAssured_key";

CREATE UNIQUE INDEX "ProductAgeTermRebate_productId_entryAge_policyTerm_ageBand_minSumAssured_key"
    ON "ProductAgeTermRebate"("productId", "entryAge", "policyTerm", "ageBand", "minSumAssured");

CREATE INDEX "ProductPremiumRate_productId_ageBand_idx"
    ON "ProductPremiumRate"("productId", "ageBand");
ALTER TABLE "RiderPremiumRate" ADD COLUMN "ageBand" INTEGER;
