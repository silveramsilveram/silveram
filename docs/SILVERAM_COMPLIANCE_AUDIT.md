# Silveram: Indian e-commerce compliance audit (Phase 1 and 2 report)

Date: 21 November 2026. Branch: `feat/compliance-policies`. Scope of this document: what exists, what is missing, what is contradictory, and what the law research could and could not establish. **No policy page has been written or changed yet.** This is a gap report for the owner to read before implementation.

This document is a technical and policy audit, not legal advice. Nothing here states that Silveram is legally compliant. Items marked LEGAL REVIEW REQUIRED need a qualified Indian lawyer.

Status key: PASS · PARTIAL · MISSING · VERIFY (a business fact is unknown) · OWNER INPUT REQUIRED · LEGAL REVIEW REQUIRED.

---

## 1. Source verification: what was actually read

| Source | Result | How it is used here |
|---|---|---|
| Consumer Protection (E-Commerce) Rules, 2020, Gazette notification S.O. 462(E), 23 July 2020 (consumeraffairs.gov.in PDF) | **Read directly** (the Hindi text, pages 1 to 6, as rendered images). The English half and pages 7+ were not read. The file is the original 2020 notification; no amendment is shown in the pages read | Rule 4, 5, 6 and the start of 7 are cited below. Sub-rule numbers are as they appear in the notification |
| Legal Metrology (Packaged Commodities) Rules, 2011 (thc.nic.in PDF) | **Not read.** The file exceeds the fetch tool's 10 MB limit | Everything about Legal Metrology below is VERIFY / LEGAL REVIEW REQUIRED. No rule number is quoted from this source |
| PIB release 2163768 and PIB release 2190655 | **Not read.** Both returned HTTP 403 to the fetch tool. I did not try to get around the block | Their content is unknown to this audit. They are not cited |
| BIS "Hallmarking: Jewellers" page (bis.gov.in) | **Read in part** (about 40,000 of 109,135 characters verbatim, the rest through a tool summary). Page says it was last updated 26 November 2025 | Used for the hallmark contents and the BIS Care app. See section 3 for the silver point |
| Secondary web results (news and commentary) | Seen, not primary | Used only to flag what still needs checking against the Gazette; every such point is labelled "secondary" |
| Consumer Protection Act 2019, IT Act 2000, CGST Act and invoicing rules, advertising rules and guidelines (including the 2023 dark-patterns guidelines), India Code, GST portal, MeitY | **Not researched in this pass** | Listed as open research in section 8 |

## 2. Law summary (only what is supported above)

### 2.1 Consumer Protection (E-Commerce) Rules, 2020 (read directly)

Silveram sells its own stock through its own website, so it is an **inventory e-commerce entity** under the Rules. The provisions below were read in the Gazette text (Hindi). Rule numbers are from that text.

- **Rule 4(2):** every e-commerce entity must display, clearly and accessibly, its legal name, the principal geographic address of its headquarters and all branches, its website name, and customer-care contact details (including the grievance officer's e-mail, fax, landline and mobile).
- **Rule 4(4):** appoint a grievance officer and display the officer's **name, contact details and designation**.
- **Rule 4(5):** the grievance officer must **acknowledge a complaint within 48 hours** and **redress it within one month** of receipt.
- **Rule 4(8):** after a consumer confirms a purchase, an entity must not impose a **cancellation charge** if the entity does not bear similar charges when it cancels.
- **Rule 4(9):** consent for a purchase must be recorded **only** where it is expressed through a clear and affirmative action; **no pre-ticked checkboxes**.
- **Rule 4(10):** refunds the entity has accepted must be made **within a reasonable period** under RBI directions and applicable law.
- **Rule 4(11):** no unfair pricing and no arbitrary classification of consumers.
- **Rule 6(3)** (seller duties): a seller must not refuse to take back goods, withdraw or discontinue services, or refuse a refund, where the goods or services are **defective, deficient, not as advertised or agreed**, or delivery was **late** (except for force majeure). It is worded for marketplace sellers, but it shows how the Rules treat the remedy. Whether it binds Silveram directly: LEGAL REVIEW REQUIRED.
- **Rule 6(5)(b) to (j) and the start of Rule 7:** the information an inventory entity must show per product: total price in single figure with all mandatory and voluntary charges (delivery, postage, handling, convenience fee, applicable taxes), relevant details of goods including **country of origin**, **return, refund, exchange, warranty and guarantee** information, **payment methods and their security**, **delivery and shipment** details, grievance officer name and contact. The remaining Rule 7 items (pages after 6) were not read; confirm against the full text.
- The pages read show no "no refunds" exception. Any amendment after July 2020 was not checked: LEGAL REVIEW REQUIRED.

### 2.2 Legal Metrology (Packaged Commodities) Rules, 2011

Not read. The brief requires a review of packaged-commodity declarations (manufacturer or packer name and address, net quantity, MRP inclusive of all taxes, consumer care details, date of manufacture or packing) and of any online-listing declarations, and of whether finished jewellery or precious-metal articles are exempt. **None of this is established by this audit.** Treat every Legal Metrology requirement in section 6 as VERIFY / LEGAL REVIEW REQUIRED until the Rules and current amendment notifications are read.

### 2.3 BIS hallmarking of silver

- The brief states silver hallmarking is voluntary and HUID is mandatory for silver articles hallmarked under the BIS scheme from 1 September 2025.
- **What the primary page (BIS) shows:** its "Mandatory Hallmarking Order" menu lists the **gold** jewellery and artefacts order only (15 January 2020 and amendments), and the tool's summary of its FAQ says that order applies to gold only. The BIS page describes a hallmark as the BIS logo, purity/fineness and a six-digit HUID, and says a customer can verify a HUID in the **BIS Care app** (summary of the FAQ, not verbatim).
- **What secondary sources say (not primary):** silver hallmarking remains voluntary; HUID is required on silver articles that are hallmarked, from 1 September 2025, under a standard cited as IS 2112:2025; a June 2026 article says BIS was still assessing whether to make silver hallmarking mandatory.
- **My conclusion:** the "voluntary hallmarking, mandatory HUID if hallmarked" description is plausible and consistent with the brief, but **I could not confirm it from an official BIS or PIB document**. Policy and product text must therefore make no statement about the silver order beyond what is confirmed, and must say that Silveram's products are hallmarked only where the product page says so. The effective date, the standard number and the permitted fineness grades are VERIFY.

### 2.3.1 Silver fineness grades

No grade list was confirmed from a primary source. Do not publish a grade table until it is.

### 2.4 Digital Personal Data Protection Act, 2023 and Rules, 2025 (secondary sources only)

Commentary sources agree that the Rules were notified on 13 November 2025 and come into force in stages: the definitions and Data Protection Board rules at once; consent-manager provisions after 12 months (13 November 2026, so already in force on today's date); **notice, consent, data-principal rights, breach reporting, children's data and security duties after 18 months (about 13 May 2027)**. This staging is from secondary summaries; confirm against the Gazette notifications before relying on it. Design consequence: write the Privacy Policy now to the 2027 standard (purposes, rights, grievance route, breach handling) without claiming the full regime is already in force.

### 2.5 Not researched yet

Consumer Protection Act, 2019 (product liability, unfair trade practice, unfair contract, definitions of defect/deficiency), IT Act 2000 and intermediary rules, GST and invoice requirements, advertising and misleading-claims rules, the CCPA dark-patterns guidelines. These need a primary-source pass before the policy text is final.

---

## 3. Inventory of what exists in the code

Customer-facing routes (`src/shared/routing/router.ts`): `/ /shop /product/:slug /cart /checkout /checkout/payment /order/:id /signin /signup /account /track /policy/:id` and 404. The policy ids are the type `PolicyId = 'shipping' | 'returns' | 'privacy' | 'terms'`.

Existing policy pages (text in `src/features/policies/data/policies.ts`, shown by `PolicyPage.tsx`, linked from the footer through the `POLICIES` object):

| Page | Route | State |
|---|---|---|
| Shipping Policy | `/policy/shipping` | Draft, noindex, four short paragraphs, **no facts** (no coverage, charges, timelines) |
| Return & Exchange Policy | `/policy/returns` | Draft, three paragraphs, **no position stated** |
| Privacy Policy | `/policy/privacy` | Draft, six paragraphs; describes the real integrations; no retention, rights or contact |
| Terms & Conditions | `/policy/terms` | Draft, five paragraphs, no business identity, no governing law |

Every policy page shows a banner "Draft for store review: these terms are not yet approved for production" and is set `noindex`.

Other facts established from the code:

- Business details live in `src/shared/config/site.ts`: legal name "Ranjan Jewer Mahal", owner "Aditya Ranjan", address Pani Tanki, Main Rd, beside Bank of Baroda, beside Meena Bazar Bridge, Rajendra Nagar, Motihari, Bihar 845401, phone +91 77669 11777, e-mail silveramsilveram@gmail.com, Instagram @silveram__.
- Footer: shows legal name, owner, address, phone, e-mail, WhatsApp and the four policies. No grievance officer, no GSTIN.
- Checkout payment page: Cash on delivery is the default method; UPI and card are labelled coming soon; the Cashfree path is gated. The only legal text is one caption: "By placing your order you agree to Silveram's terms and return policy" with two links. There is no checkbox.
- Customer cancellation: **no customer-facing cancel function.** The server allows an admin to cancel an unfulfilled COD order (`server/src/admin/orderStateMachine.js`, `cancellationError`). Order states include `cancelled`, `expired`, `refunded`.
- Delivery charges: the bag page says "Delivery charges: None added at checkout".
- Taxes: no GST, no "inclusive of taxes" wording and no tax line anywhere in the cart, checkout or product pages.
- Analytics and ad trackers: **none found** (no analytics script in `index.html`, `src` or `package.json`). Third parties the code does use: Appwrite (data, auth), Mailjet (service e-mail, newsletter), Cloudinary (media), Cashfree (online payment, gated), an HTTP-only session cookie after e-mail verification.
- Newsletter: a consent checkbox exists in the footer form (existing feature flag).
- About page: none. "About us" in the footer points to the homepage story section (`/#story`), which is brand copy with no business history, certification or sourcing claim.
- Contact page: none. Contact details are in the footer and the homepage Visit section.
- Product data (`src/features/products/data/products.ts`): seven products (Silver Frame, Silver Kada, Peacock Ring, Chapka, Shiv Locket, Adipurush Locket, Kurta Pin). **No material, purity, weight, dimensions, hallmark, HUID, country of origin or manufacturer is recorded for any of them**; the optional fields exist but are empty. Product pages say "Material and purity details have not been verified for this listing. Please message us on WhatsApp before buying."

---

## 4. Requirement status

### 4.1 Policy pages

| # | Requirement | Status | Evidence and gap |
|---|---|---|---|
| 1 | Privacy Policy | PARTIAL | Exists as draft. Lists real processors. Missing: retention periods, data-principal rights (access, correction, erasure, withdrawal), grievance route, breach handling, children, security safeguards, update date, owner contact. Do not name a DPO or privacy e-mail that does not exist |
| 2 | Terms & Conditions | PARTIAL | Draft. Missing: seller identity, eligibility, account duties, cancellation, intellectual property, prohibited use, liability limits written to preserve consumer rights, governing law and forum (the forum depends on the verified location). LEGAL REVIEW REQUIRED |
| 3 | Shipping & Delivery Policy | PARTIAL | Draft with no facts. Coverage, dispatch time, delivery time, charges, courier, failed delivery and returned-to-origin handling are all OWNER INPUT REQUIRED |
| 4 | Cancellation Policy | MISSING | No page and no customer flow. The actual behaviour is admin-only cancellation of unfulfilled COD orders. The policy must describe real handling; owner must confirm |
| 5 | Return & Refund Policy (no change-of-mind refunds) | PARTIAL | Page exists but states no position, tells customers to ask before ordering, and promises nothing. Needs the structure in section 5. LEGAL REVIEW REQUIRED |
| 6 | Grievance Redressal Policy | MISSING | No page, no officer. Rule 4(4) and 4(5) require the name, designation, contact details, a 48-hour acknowledgement and a one-month redressal. OWNER INPUT REQUIRED |
| 7 | Contact Us | PARTIAL | Contact details exist in the footer and homepage, but no dedicated page, no grievance escalation, no support hours, no verified statement of the business structure. Rule 4(2) wants legal name, addresses, website and customer-care contacts displayed |
| 8 | Product information and hallmarking disclosure | MISSING | No page and no product-level disclosure. See section 6 |
| 9 | About Us | PARTIAL | Homepage story only; contains no unverified credential, history or certification claim (PASS on accuracy). No separate page. Not a legal requirement; optional |
| 10 | Payment methods disclosure | PARTIAL | Checkout describes COD and "coming soon" methods accurately. No "security of payment" statement for Rule 6(5)/7 purposes. FAQ copy elsewhere should be checked against the live gateway config |
| 10 | Warranty or guarantee | VERIFY | No warranty text. OWNER INPUT REQUIRED whether any is offered |
| 10 | Product care | MISSING | Product care fields exist but are empty |
| 10 | Cookies | PARTIAL | Only a session cookie. A short statement inside the Privacy Policy is enough; no cookie banner is indicated for a strictly necessary cookie. LEGAL REVIEW REQUIRED |
| 10 | Accessibility statement | MISSING | Not required by the laws read. Optional |
| 10 | Legal notice | MISSING | Covered by the business identity in Contact and Terms. No separate page needed |

### 4.2 Contradictions and misleading statements found

1. **Returns page vs. the business position.** The Return & Exchange Policy invites customers to "confirm the return or exchange eligibility, time window..." before ordering. Silveram has no change-of-mind refunds. The page also still says "Exchange".
2. **Delivery charges.** The Terms and Shipping drafts say charges "will be confirmed before an order is accepted", while the bag page says "None added at checkout". One of these is wrong. VERIFY.
3. **Taxes.** The Terms say taxes "must be shown or confirmed", but no price anywhere says whether it includes GST. VERIFY (also GSTIN).
4. **"Silver" claims without verified material.** The product names say "Silver", but the pages themselves say material and purity are unverified, and the Chapka description says "gold tone detailing". Naming and describing a product as silver without confirmation is a misleading-claims risk. OWNER INPUT REQUIRED per product.
5. **Business name spelling.** "Ranjan Jewer Mahal" in the config. Confirm the exact registered spelling. VERIFY.
6. **Docs vs code on the gateway.** `PRODUCT.md` and `DESIGN.md` say Razorpay is "coming soon"; the code gates **Cashfree**. Not customer-facing, but the policy must name the real provider only when it is live. VERIFY.
7. **Policies are noindex.** Reasonable while drafts; must be switched once approved (`noindex: policy.draft` in `src/shared/seo/pages.ts`).

### 4.3 Checkout and product disclosure gaps

| Item | Status | Note |
|---|---|---|
| Total payable shown before placing the order | PASS | Subtotal and total in the bag, and "Pay ₹X on delivery" on the button |
| All charges and taxes in one figure | PARTIAL | No tax statement; delivery stated as none added. VERIFY |
| Payment methods described accurately | PASS (COD), VERIFY (online) | Matches the live gating in code |
| Policy links reachable from checkout | PARTIAL | Terms and returns linked in one caption; privacy, shipping, cancellation and grievance are not |
| Explicit action to order | PASS | A button must be pressed |
| No pre-ticked consent | PASS | There is no consent checkbox at all |
| No-change-of-mind-refund summary before ordering | MISSING | To be added with an unticked acknowledgement checkbox if the owner wants an explicit acknowledgement. Must not ask the customer to waive statutory rights. LEGAL REVIEW REQUIRED |
| Country of origin, manufacturer or seller details on product pages | MISSING | Required for inventory entities under Rule 6(5)/7 on the pages read. Origin and manufacturer facts are OWNER INPUT REQUIRED |
| Material, purity, weight, dimensions, hallmark, HUID | VERIFY | None recorded for any product |
| Legal Metrology declarations | VERIFY | Source not read |
| Return, refund, exchange, warranty info on the product page | PARTIAL | Product page has accordions for delivery and returns with generic text and policy links |
| Grievance officer reference near checkout or product | MISSING | Rule 4(4) |

### 4.4 Footer, navigation, technical gaps

- Footer lists only the four existing policies. It will need Cancellation, Grievance Redressal, Contact and Product information & hallmarking links. The footer builds its links from the `POLICIES` object, so new entries appear automatically once added.
- Adding ids requires: the `PolicyId` type in the router, the allow-list in `parseRoute`, `POLICIES`, SEO/prerender entries (`policySeo`, `scripts/prerender.mjs` reads the same list through `pages.ts`), and the sitemap.
- Policy text is stored as plain paragraphs with no headings or lists. The Terms, Privacy, Refund and Grievance pages need headings, lists and a table of contents for mobile readability; `Policy` should gain structured sections and a single `lastUpdated` date.
- The draft banner and noindex flag must stay until the owner approves, and must not be removed while owner-input placeholders remain.

---

## 5. Proposed approach for the Return & Refund page (for owner and lawyer review)

Structure, not final wording:

1. **What we do not refund:** change of mind, personal preference, wrong design chosen, no longer wanting the item.
2. **Your legal rights are not affected:** the above does not limit any right or remedy under applicable Indian law.
3. **Defective, damaged, wrong or not-as-described items:** report with the order reference; we may ask for photographs of the item and the parcel; each complaint is assessed and resolved with the legally available remedy (which can be replacement, repair, price reduction or refund). No promise that every case ends in a refund, and no evidence demand that removes a statutory right (no mandatory unboxing video).
4. **Late delivery:** assessed under applicable law.
5. **If a refund is due:** paid back to the original payment method (or, for COD, the method agreed with the customer), within the legally applicable period. Exact period OWNER INPUT REQUIRED / LEGAL REVIEW REQUIRED.
6. **Complaints:** link to the Grievance Redressal page.

Never use: "no refunds under any circumstances", "no replacement under any circumstances", "customer has no legal rights after purchase", "all sales final regardless of defects".

Checkout: a short summary above the order button, with an **unticked** acknowledgement checkbox linked to the full page. Whether a mandatory checkbox is wise is a business and legal decision: a required acknowledgement of a *change-of-mind* limit is defensible, but a required waiver of statutory rights is not allowed. LEGAL REVIEW REQUIRED.

---

## 6. Product-level disclosure plan

Show a field on a product page only when the owner has verified it for that product; otherwise show the existing honest "not verified" line. The data model already has optional `material`, `purity`, `weight`, `dimensions`, `care`, `deliveryInfo`, `returnInfo`. Needed additions once facts exist: hallmark status, HUID (a per-article identifier, so it is a per-piece fact and cannot be a single product-level field if pieces differ), country of origin, manufacturer or packer, and tax-inclusive wording. The hallmarking information page will explain fineness, the BIS mark, HUID and how a buyer can verify an article (BIS Care app), and will state plainly that Silveram's products are hallmarked only where the product page says so. The silver-specific dates, standard number and grades stay out of the text until confirmed.

---

## 7. Gaps summary, in priority order

1. **Owner facts that block honest policies:** the grievance officer's name, designation and e-mail; the exact legal name and business structure; the support e-mail and hours; shipping coverage, timelines and charges; the tax position (GST registration, GSTIN, price inclusive of tax); real cancellation handling; the refund method and period; per-product material, purity, weight, origin and hallmark status.
2. **Contradictions to remove:** delivery-charge statements, the "Exchange" wording, tax wording, "silver" naming without verified material.
3. **Missing pages:** Cancellation, Grievance Redressal, Contact, Product information & hallmarking.
4. **Pages to rewrite:** Return & Refund, Shipping & Delivery, Terms & Conditions, Privacy Policy.
5. **Checkout:** policy-link block, refund-position summary with an unticked acknowledgement.
6. **Research still open:** the Legal Metrology Rules, the CPA 2019, the IT Act, GST invoicing, the dark-patterns guidelines, the BIS silver order text and the DPDP Gazette notifications, from primary sources.

## 8. Sources to read next (not yet read)

- Legal Metrology (Packaged Commodities) Rules, 2011 and amendments: a smaller copy (India Code, the Department of Consumer Affairs, or the gazette) because the supplied PDF exceeds the tool limit.
- PIB releases 2163768 and 2190655: need a manual copy of the text; both returned 403.
- BIS silver hallmarking order and standard (IS 2112) from bis.gov.in; BIS Care app guidance.
- DPDP Act 2023 and the Rules 2025 as published in the Gazette (GSR numbers quoted by secondary sources: verify).
- Consumer Protection Act 2019, CCPA dark-patterns guidelines 2023, GST invoice rules.

---

## 9. Implementation status (added after the pages were generated)

Eight policy pages now exist, all **drafts** (banner, noindex, left out of the sitemap): Shipping & Delivery, Return & Refund, Cancellation, Grievance Redressal, Silver Purity & Hallmarking, Privacy, Terms & Conditions, Contact Us (`/policy/<id>`, text in `src/features/policies/data/policies.ts`). Unknown facts appear as highlighted `[OWNER INPUT REQUIRED: ...]` markers and legal questions as `[LEGAL REVIEW REQUIRED: ...]`; each page shows how many are open (currently 45 across the eight pages). The footer links all eight; checkout shows the no-change-of-mind summary, a statement that legal rights are unaffected, and links to six policies; product pages link to the hallmarking page; the FAQ answer on returns and the product-page returns accordion now match the Return & Refund page.

Still open: every OWNER INPUT marker, the lawyer review, the unresolved contradictions (the bag says "Delivery charges: None added at checkout" while the policies leave delivery charges as an owner input; the FAQ delivery answer says charges are shown before payment; no tax wording on prices), per-product disclosures (nothing recorded to show), the Legal Metrology review, and the research listed in section 8. No page claims Silveram is compliant. Checkout has no tick-box: the summary is shown with links and the button press is the action; add a required acknowledgement box only after the owner and a lawyer decide it.
