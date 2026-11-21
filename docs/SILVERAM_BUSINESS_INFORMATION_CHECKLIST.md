# Silveram: business information checklist

Every row below is a fact the policy pages cannot honestly be finished without. "Found in code" means the value exists in the repository; it is not proof that it is correct or registered. Where a value is unknown, the policy text will use `[OWNER INPUT REQUIRED: ...]` and the page will stay a draft (noindex, draft banner) until the owner fills it.

| Information | Found in code | Required action |
|---|---|---|
| Legal business name | "Ranjan Jewer Mahal" (`src/shared/config/site.ts`) | **Verify** exact registered spelling ("Jewer" vs "Jewar"/"Jewel") and whether it is the legal trading name |
| Business structure (proprietorship, partnership, company) | Owner shown as "Aditya Ranjan" | **Verify.** Owner to state the structure |
| Principal business address | Pani Tanki, Main Rd, beside Bank of Baroda, beside Meena Bazar Bridge, Rajendra Nagar, Motihari, Bihar 845401 | **Verify** it is the registered/principal address and whether other branches or a separate dispatch address exist |
| Customer support e-mail | silveramsilveram@gmail.com | **Verify** it is the monitored support address |
| Customer support phone | +91 77669 11777 (also the WhatsApp number) | **Verify**; state whether calls are taken or WhatsApp only |
| Support hours | None | **OWNER INPUT REQUIRED** |
| Grievance Officer name | None | **Confirm with owner.** Must be a real person. Rule 4(4) wants the name displayed |
| Grievance Officer designation | None | **Confirm with owner** |
| Grievance contact e-mail | None | **Confirm with owner.** A dedicated address is recommended; do not reuse a placeholder |
| Grievance contact phone | None | **Confirm with owner** |
| GST registration status | None | **Verify** |
| GSTIN, if registered | None | **Verify.** Displayed only if it exists |
| Prices inclusive of all taxes? | Not stated anywhere | **Verify** and then add wording |
| BIS registration status (jeweller) | None | **Verify.** Never publish a registration number unless supplied |
| Product material, product by product | Not recorded for any of the 7 products; Chapka text says "gold tone" | **Verify product by product** before any "silver" wording stays |
| Purity / fineness, product by product | None | **Verify product by product.** No grades published without confirmation |
| Net weight and dimensions | None | **Verify product by product** |
| Hallmark / HUID status | None | **Verify product by product;** HUID is per article |
| Country of origin | None | **OWNER INPUT REQUIRED** |
| Manufacturer / packer / importer | None | **OWNER INPUT REQUIRED** |
| Shipping coverage | Site says "across India"; checkout validates Indian states | **Confirm**: whole of India, any excluded PIN codes |
| Order processing time | None | **Confirm** |
| Delivery timeline | None | **Confirm** |
| Shipping charges, free-shipping rule | Bag says "None added at checkout" | **Confirm** the true position and fix the contradiction |
| Delivery / courier partner | Not named | **Confirm** (optional to name) |
| Failed delivery and return-to-origin handling | None | **Confirm** actual practice |
| Cancellation procedure | Admin-only cancel of unfulfilled COD orders; no customer flow | **Confirm**: can customers cancel, until when, how to ask, any fee (the law read forbids a one-sided cancellation charge) |
| Refund method and time for a legally due refund | None | **Confirm**; **legal review** |
| Handling of defective, damaged or wrong items | None | **Confirm** process and what evidence is asked |
| Warranty or guarantee | None | **Confirm** whether any is offered |
| Payment methods in use | COD live; UPI and card "coming soon"; Cashfree gated | **Inspect live config** before naming a provider. Docs name Razorpay but code uses Cashfree |
| Data processors and third parties | Appwrite, Mailjet, Cloudinary, Cashfree (gated), WhatsApp contact link | **Inspect actual implementation** (done for code; owner to confirm live accounts) |
| Analytics and cookies | No analytics found; one HTTP-only session cookie | **Confirm** none are added through hosting dashboards |
| Data retention periods | None | **OWNER INPUT REQUIRED** |
| Privacy contact | None | **OWNER INPUT REQUIRED.** No DPO exists unless the owner names one |
| Governing law and dispute forum | None | **Verify** location; **legal review** |
| Customers under 18 | Not addressed | **Confirm** whether minors may buy |
| "About us" facts (history, sourcing, making) | Brand copy only, no claims | **Owner** may supply verified facts; otherwise keep as is |
