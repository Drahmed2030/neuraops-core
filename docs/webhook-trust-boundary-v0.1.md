# Webhook Trust Boundary v0.1

## Objective

No payment provider may cause Control Plane settlement merely by returning a payment-shaped object. A provider adapter must first produce a trusted webhook envelope.

## Required trust envelope

A successful `PaymentPort.verifyWebhook()` must return:

- `signatureVerified: true`
- stable `providerEventId`
- `providerEventType`
- `verifiedAt`
- SHA-256 `rawBodyHash`
- the normalized payment event

The provider-specific adapter owns the signature algorithm. Control Plane deliberately does not assume HMAC, asymmetric signatures, header names, certificate chains, or timestamp semantics before a provider is selected.

## Control Plane invariants

1. The raw request body is hashed again by Control Plane and must match `rawBodyHash`.
2. Unverified signatures fail closed before persistence settlement.
3. Missing provider event identity fails closed.
4. `providerReference` must still match the correlated expected payment.
5. Amount, currency, organization, engagement, and paid status remain validated by payment policy.
6. `PAYMENT_RECEIVED` is keyed by provider event identity when available.
7. The Event Ledger stores only the SHA-256 raw-body hash and verification metadata, never the raw webhook body.
8. Exact replay remains idempotent; changed content under the same provider event identity is rejected by existing event/payment conflict rules.

## Provider adapter responsibilities

A real provider adapter must:

- verify the provider's documented signature scheme using the exact raw body when required;
- extract a provider-owned stable webhook/event ID;
- normalize the provider transaction into `VerifiedPaymentEvent`;
- return the trusted envelope only after cryptographic/provider verification succeeds;
- throw or return no trusted envelope on any verification failure.

## Explicit non-goals in v0.1

- No provider-specific HMAC implementation.
- No arbitrary webhook TTL; legitimate delayed webhooks must not be rejected without provider-specific semantics.
- No storage of raw payment webhook bodies.
- No live payment-provider connection or KYC change.

## Applies to

- Nexus B2B web payments.
- Cliniverse Apple transaction/server notification verification once the Apple adapter is implemented.
