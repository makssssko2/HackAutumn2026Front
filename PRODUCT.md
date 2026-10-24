# Invoice Keeper

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: Vue + Vite + TypeScript, Feature-Sliced Design. Separate Python API repository.

## Users

Both active `admin` and `user` accounts can access the web application. Participants can view invoices, recurring schedules, calendar and budget, manage the selected invoice's payment state/date, receipts and attachments. The administrator additionally creates/cancels payments, manages users, channels and groups, and accesses audit and delivery administration. Telegram and private email links also work without a web account.

Both roles have «Мой профиль»: display name, read-only login and role, own-name editing and password change with current-password verification. Password changes end all sessions and require login again. Notification channels remain administrator-managed; avatars, contact details and individual subscriptions are outside this profile scope.

## Product Purpose

Prevent forgotten recurring payments while preserving a separate payment history for every period.

## Issuing and recipient workflow

On 2026-10-24 the user explicitly adopted the new Back frontend guide: both roles can confirm demo payment, undo the mark and correct the actual payment date in the web invoice detail. Always send the current expected_revision; refresh after conflicts without repeating a mutation. Actual payment dates may be backdated but never future-dated; the due date stays unchanged. The private /pay/:token page exposes only one invoice and its active demo receipt. GET never confirms payment. In-app notifications remain an administrator-only delivery journal. Keep «Выставить счет» explicit for the administrator.

Payments can be recurring or one-time. One-time invoices create one period and support separate cancellation while unpaid. Descriptions are entered when creating the parent payment and appear in lists, details, notifications and the public invoice. Technical future periods used for budget are distinct from released notifications. A future one-time invoice is saved without immediate delivery until it reaches the three-day window. The administrator may explicitly request a missing reminder, distinct from retrying an existing failed delivery.

## Capabilities and Constraints

Public invoice view uses `/invoice/:token` without login and a separate read-only capability. Show one occurrence's full description, amount/currency, type, deadline, status, actual date and delay. Manual/focus refresh keeps data current with accessible feedback; no payment or administrative controls appear. Telegram/email/webhook add this view link while preserving existing message content and payment actions. Public documents, payer identifiers and history are outside this scope.

Telegram setup uses a «Выбрать группу в Telegram» button and a one-time startgroup link; typing a command is not required. The bot validates group administrator rights and consumes the code atomically. SMTP setup distinguishes the sender mailbox configured on the server from recipient addresses configured as channels.

Administrator-managed VK Teams and Mattermost use separate bot/server connections and recipient channels: save credentials, validate the bot API, then add a string chat/Channel ID. One connection can serve multiple chats; connections and channels can be edited, enabled or disabled. Tokens are stored by Back, never read back into the interface or persisted in browser storage. Groups and invoice creation show connection readiness separately from channel activation. API validation does not prove delivery, chat permissions or working payment buttons. An explicitly confirmed channel test queues a real saved invoice (the latest non-cancelled occurrence by due date), may include invoice data and demo-payment actions, and requires at least one such invoice. Check delivery in the journal and buttons in the target chat. Worker, credential encryption and public callback configuration belong to Back. Bitrix24 is deferred until its backend adapter exists.

RUB/USD/EUR are accounted for separately. Payments and generated receipts are demonstrations; no acquiring. Monthly recurrence is required. Include calendar, monthly/yearly planned budget, SMTP, outgoing webhooks, in-app notifications, Telegram actions, attachments and audit log. Default broadcast to all configured recipients, optional administrator-defined audience groups. Two independent Git repositories, deployed together on the user's VPS.

## Brand Commitments

User explicitly requested Impeccable design guidance and the color palette of https://aeza.ru/. Use Russian product copy. Retain Invoice Keeper product identity; do not imply affiliation with Aeza.

## Evidence on Hand

18-page Invoice Keeper hackathon case, studied in the parent chat, and user-approved workflow. Seeded expenses are explicitly demonstration data.
