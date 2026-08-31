# Commerce Rails v0.1

## Purpose

Keep payment compliance, product access, and revenue state separated but connected through the Control Plane.

## Rule

No payment adapter may create a checkout until Commerce Policy selects the rail.

## Rails

### Apple IAP
Use for Cliniverse consumer digital subscriptions/features on iOS by default.

Flow:
StoreKit/App Store -> verified Apple transaction -> Control Plane payment event -> entitlement -> feature activation.

### B2B Web
Use for Nexus organization pilots and professional services.

Flow:
Proposal/invoice/payment link -> verified web payment -> Control Plane payment event -> entitlement -> pilot readiness -> explicit pilot start.

### Manual Invoice
Use only for approved Nexus organization invoicing workflows where payment confirmation is separately verified before lifecycle progression.

## Enterprise-prepaid Cliniverse access
Allowed by policy only when the product is explicitly enterprise-only for organizations. Consumer/single-user/family sales are not classified as enterprise-prepaid.

## Conservative default
Regional storefront exceptions, external-purchase entitlements, and future Apple policy changes are NOT automatically enabled. They require an explicit policy extension with review evidence before use.

## Safety invariants

1. Web/B2B adapters cannot process Cliniverse consumer iOS digital purchases.
2. Apple IAP cannot process Nexus organization pilots.
3. A verified payment must match organization, engagement, amount, and currency before PAYMENT_RECEIVED is emitted.
4. PAYMENT_RECEIVED does not activate a pilot by itself.
5. Entitlement grant and explicit pilot start remain separate transitions.
6. Raw payment-card data is never stored in the Control Plane.
7. Commerce Policy is a domain gate, not UI logic.
