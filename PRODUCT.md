# Invoice Keeper

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: Vue + Vite + TypeScript, Feature-Sliced Design. Separate Python API repository.

## Users

Only the administrator can access the web application and its authenticated API. The administrator creates recurring expenses and manages participant records and notification recipients. Participants work through Telegram: any participant of a connected group can confirm its shared invoice once, without a web account.

## Product Purpose

Prevent forgotten recurring payments while preserving a separate payment history for every period.

## Issuing and recipient workflow

Latest user correction overrides the earlier interpretation of the case: there is no participant web portal or in-app payment. The administrative UI issues invoices and monitors delivery and status, without demonstration payment controls. Make «Выставить счет» explicit and persistent. Participants confirm demo payment inside Telegram and receive the receipt there. In-app notifications are an administrative delivery journal.

## Capabilities and Constraints

Telegram setup uses a «Выбрать группу в Telegram» button and a one-time startgroup link; typing a command is not required. The bot validates group administrator rights and consumes the code atomically. SMTP setup distinguishes the sender mailbox configured on the server from recipient addresses configured as channels.

RUB/USD/EUR are accounted for separately. Payments and generated receipts are demonstrations; no acquiring. Monthly recurrence is required. Include calendar, monthly/yearly planned budget, SMTP, outgoing webhooks, in-app notifications, Telegram actions, attachments and audit log. Default broadcast to all configured recipients, optional administrator-defined audience groups. Two independent local Git repositories; no push or publication.

## Brand Commitments

User explicitly requested Impeccable design guidance and the color palette of https://aeza.ru/. Use Russian product copy. Retain Invoice Keeper product identity; do not imply affiliation with Aeza.

## Evidence on Hand

18-page Invoice Keeper hackathon case, studied in the parent chat, and user-approved workflow. Seeded expenses are explicitly demonstration data.
