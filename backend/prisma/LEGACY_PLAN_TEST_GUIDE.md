# LIC Legacy Plan Seed & Test Guide

This is the working inventory for the LIC legacy plans (847–856) seeded by
`backend/prisma/seedPremiumRates.ts`. It records what is authentic, what is
sample-only, and the exact commands used to compare the database against LIC's
live i-Magic calculator.

## Servers

| Service | URL | Start command |
| --- | --- | --- |
| Backend | http://localhost:5000 | `cd backend; .\node_modules\.bin\tsx.cmd src\server.ts` |
| Frontend | http://localhost:3000 | `cd frontend; npm.cmd run dev` |

The backend must be running before the verifier is used.

## Generic verifier

The verifier is plan-agnostic. It reads the plan's stored rows, calls LIC, and
compares every rate, rebate and rider premium.

```powershell
cd backend

# Live comparison (all stored rows)
.\node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=847

# Quick live comparison
.\node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=847 --sample=5

# Fixture comparison (for sample-only or endpoint-less plans)
.\node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=847 `
  --fixture=prisma\masterData\premiumRates847.json
```

`VERIFY_API` overrides the API base (default `http://localhost:5000/api`). The
script signs its own admin JWT, so no manual token is needed.

## Inventory (844-845 added)

| Plan | Name | Stored rates | Riders | Modes | Verification |
| --- | --- | --- | --- | --- | --- |
| 844 | Aadhaar Shila | 1 sample rate (age 33, term 10) | DAB (1 point, 0.5/1000) | Yearly, Half-Yearly, Quarterly, Monthly | Live **PASS 8/0**; base ₹9,190.78 |
| 845 | Jeevan Umang | 1 sample rate (age 33, term 67, ppt 15) | ABR (1.6), CIR (7.81), TRB (7.0756) per 1000 | Yearly, Half-Yearly, Quarterly, Monthly | Base **PASS** ₹80,406.48; riders at SA 10L only |

## Inventory (847-856)

| Plan | Name | Stored rates | Riders | Modes | Verification |
| --- | --- | --- | --- | --- | --- |
| 847 | Jeevan Shiromani | 15 sample rates | DAB, ABR, TRB, CIR (68 points) | Yearly, Half-Yearly, Quarterly, Monthly | Live **199 pass / 0 fail**; fixture **22 / 0** |
| 848 | Bima Shree | 15 sample rates | DAB, ABR, TRB, CIR (68 points) | Yearly, Half-Yearly, Quarterly, Monthly | Live **199 pass / 0 fail**; fixture **22 / 0** |
| 849 | Nivesh Plus (ULIP) | 3,408 rate/band rows | DAB (784 zero-rate rows) | Single | Base ₹1,00,000 at age 33 / T15 / SA ₹1.25L; DAB rider **0** |
| 850 | Jeevan Shanti (annuity) | 213 rate/band rows | none | Single | Base ₹1,52,700 at age 60 / T1 / SA ₹1.5L (GST ₹2,700) |
| 851 | Micro Bachat | 15 sample rates | ABR (234 points) | Yearly, Half-Yearly | Live **64 pass / 0 fail** |
| 852 | SIIP (ULIP) | 0 tabular rates | DAB (linked) | — | Manual ULIP premium |
| 853 | Navjeevan | 594 sample/flat rates | ABR (9 term-based points) | Yearly, Half-Yearly, Quarterly, Monthly, Single | Live sample **40 pass / 0 fail**, 5 no-rate-at-LIC |
| 854 | Tech-Term | 24 official sample rates | ABR (1,960 points) | Yearly, Half-Yearly, Single | Fixture-only (i-Magic returns 0) |
| 855 | Jeevan Amar | 35,296 rates | ABR, DAB (27,509 points) | Yearly, Half-Yearly, Single | Live endpoint; previously verified |
| 856 | PMVVY (Modified-2020) | 40 rates | none | Yearly, Half-Yearly, Quarterly, Monthly | Fixture-only |

Counts are the rows currently in the database. `ProductPremiumRate` stores
half-year age bands as separate rows for 849/850, so their totals are three rows
per age/term (whole age, band 2n, band 2n+1).

## Plan notes

### 847 / 848 — Jeevan Shiromani / Bima Shree

- Policy terms 14/16/18/20; PPT = term − 4 (10/12/14/16).
- Entry age 18–55 (847) or 8–55 (848), with term-specific maximums
  55/51/48/45 for terms 14/16/18/20.
- Minimum basic sum assured ₹1 crore (847) or ₹10 lakh (848); no maximum.
- High sum assured rebate: 847 ₹0.03 / ₹0.05 per ₹1,000 for ₹2cr–₹4.95cr /
  ₹5cr+; 848 ₹0.30 / ₹0.50 per ₹1,000 for ₹20L–₹49L / ₹50L+.
- Mode rebate: 2% yearly, 1% half-yearly, nil quarterly/monthly.
- GST 4.5% first year (2.25% renewal, not used by the preview).
- The public rate table is a **sample only**: ages 20/30/33/40/50 and terms
  14/16/18/20. Age 50 is invalid for terms 18/20. Any other age/term returns a
  clear "no authentic rate" error rather than an interpolation.
- Rider rates are sample-only too: 17 age/term combinations at a ₹10 lakh
  rider sum. i-Magic returns no rider data for age 40 / term 16, so that
  combination stays manual.

### 849 — Nivesh Plus

- Single-premium ULIP. Premium equals the purchase price; GST is 0.
- DAB is a built-in rider and its premium is **0** because the charge is taken
  by unit cancellation. The rider preview returns `0` with a rate of `0`, not
  `isManual`.

### 850 — Jeevan Shanti

- Single-premium annuity. The purchase price is the sum assured; GST is 1.8%.
- No riders.

### 851 — Micro Bachat

- Terms 10–15; PPT equals the policy term.
- ABR is ₹0.50 per ₹1,000, with the rider cover capped at the plan maximum of
  ₹2,00,000. The rider preview caps the cover before calculating the premium.
- ADD is listed in the catalogue but no authentic ADD rate is available, so it
  is not seeded.

### 852 — SIIP

- ULIP; no tabular premium grid. The premium is entered manually.
- DAB is linked but has no tabular rate.

### 853 — Navjeevan

- Terms 10–18; PPT 5 (limited) is seeded. PPT 1 (single) is listed in the
  catalogue but has no authentic single-premium rate table yet.
- ABR is age-independent and term-based: ₹1.80 per ₹1,000 at term 10 rising to
  ₹2.65 at term 18. Only ages 18+ are eligible for the rider.
- The public brochure publishes only one i-Magic sample point; the base grid is
  a flat-rate assumption and is marked as such.

### 854 — Tech-Term

- Official brochure sample only: term 20, male non-smoker, ₹1 crore, ages
  20/30/40, options I/II, PPT 1/10/15/20.
- i-Magic's CalcPremium endpoint returns 0 for this plan, so the verifier uses
  `premiumRates854.json` as a fixture.

### 855 / 856

- 855 (Jeevan Amar) has a full live grid and both ABR/DAB riders.
- 856 (PMVVY) has a full rate grid and no riders; verify from its fixture.

## UI smoke tests

1. **847/848 autofill**: New LIC policy → select the plan → age 33, term 14.
   PPT should autofill **10** (not 14). Enter SA ₹2cr (847) or ₹20L (848) and
   check the yearly premium. Switch to Half-Yearly / Quarterly / Monthly and
   confirm the installment changes and GST stays 4.5% of the installment.
2. **849 DAB**: Select Nivesh Plus → term 15, SA ₹1,25,000, Single. Premium
   should be ₹1,00,000 with GST 0. Add DAB; the rider premium should be **0**
   and must not show "manual entry".
3. **850 annuity**: Select Jeevan Shanti → age 60, term 1, SA ₹1,50,000,
   Single. Total should be ₹1,52,700 (GST ₹2,700).
4. **851 PPT/ABR**: Select Micro Bachat → term 10. PPT should autofill **10**.
   Add ABR; a rider sum above ₹2,00,000 should still price on ₹2,00,000.
5. **853 PPT/ABR**: Select Navjeevan → term 10. PPT options should be 1 and 5.
   PPT 5 should autofill the premium; PPT 1 is expected to show no authentic
   rate until the single-premium table is sourced.

## Known limitations

- 847/848 base and rider grids are sample-only; no interpolation is used.
- 851 ADD rider rate is unavailable from an authentic source.
- 853 PPT 1 (single) has no authentic rate table; only PPT 5 is seeded.
- 854 and 856 are fixture-verified because LIC's live endpoint does not serve
  their full tables.
- 852 is a ULIP and stays manual.
