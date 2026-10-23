# Invoice Keeper

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: Vue + Vite + TypeScript, Feature-Sliced Design. Separate Python API repository.

## Users

Administrator creates recurring expenses, manages users and notification recipients. Users inspect the shared list, confirm payment and correct actual payment dates. Any participant of a connected Telegram group can confirm its shared invoice once.

## Product Purpose

Prevent forgotten recurring payments while preserving a separate payment history for every period.

## Issuing and recipient workflow

Confirmed correction: the administrative UI issues invoices and monitors their delivery and status. It does not offer demonstration payment controls. Make «Выставить счет» explicit and persistent. Recipients confirm demo payment inside Telegram or an in-app notification and receive a receipt there. The regular-user web view retains manual external-payment status/date corrections required by the case.

## Capabilities and Constraints

RUB/USD/EUR are accounted for separately. Payments and generated receipts are demonstrations; no acquiring. Monthly recurrence is required. Include calendar, monthly/yearly planned budget, SMTP, outgoing webhooks, in-app notifications, Telegram actions, attachments and audit log. Default broadcast to all configured recipients, optional administrator-defined audience groups. Two independent local Git repositories; no push or publication.

## Brand Commitments

User explicitly requested Impeccable design guidance and the color palette of https://aeza.ru/. Use Russian product copy. Retain Invoice Keeper product identity; do not imply affiliation with Aeza.

## Evidence on Hand

18-page Invoice Keeper hackathon case, studied in the parent chat, and user-approved workflow. Seeded expenses are explicitly demonstration data.
