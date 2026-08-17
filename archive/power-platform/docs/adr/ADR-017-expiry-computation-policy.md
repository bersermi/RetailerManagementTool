# ADR-017: Expiry computation policy (manual > lifespan > null)

- **Status:** Accepted
- **Date:** 2026-04-03
- **Decision makers:** Sergio
- **Context / Problem**
  - Each stock batch may have an expiry date. Users can override per purchase, and not all products have known lifespans.
- **Decision**
  - ExpiryDate for `StockBatch` is determined by:
    1) `PurchaseLine.ExpiryDateManual` if provided
    2) else `ProductFamily.DefaultLifespanDays` + ReceivedDateTime if configured
    3) else ExpiryDate remains null
- **Rationale**
  - Supports both manual entry and automation while not forcing lifecycle configuration.
- **Consequences**
  - **Positive:**
    - Expiry works automatically when configured, but remains optional.
  - **Negative / tradeoffs:**
    - Null expiry requires separate “no expiry configured” UX for visibility.
- **Alternatives considered**
  - Mandatory expiry for all: too heavy for v1.
- **Follow-ups**
  - Build “Expiring soon” and “Expired already” views off StockBatch.