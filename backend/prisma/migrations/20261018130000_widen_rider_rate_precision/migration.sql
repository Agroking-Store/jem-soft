-- Widen rider rate precision from 2 to 3 decimal places.
-- LIC rider rates are quoted per 1000 with three decimals (e.g. TRB = 4.939),
-- which Decimal(10,2) would silently round to 4.94.
--
-- Widening a numeric column is safe: no existing value can lose precision.
ALTER TABLE "RiderPremiumRate"
    ALTER COLUMN "ratePerThousand" TYPE DECIMAL(10,3);