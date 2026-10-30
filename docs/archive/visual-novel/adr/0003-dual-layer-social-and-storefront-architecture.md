# Dual-Layer Social & Storefront Persistence with Cross-Tab Realtime Sync

Status: accepted

The platform's storefront, multi-channel chat (World, Friend DM, Group), Steam-style review system, and 3-slot Friend Pass engine use a clean domain service contract backed by an immediate local/cross-tab real-time provider (`IndexedDB` + `BroadcastChannel`) and a pluggable cloud adapter schema (Postgres/Supabase + WebSocket).

## Why

- Enables immediate end-to-end testing of multi-user flows (switching between a Full-Bundle Owner account and up to 3 Friend Pass borrower accounts, sending interactive Game Share Cards in chat, and posting verified reviews with playtime badges) directly in local browser tabs without blocking on external cloud provisioning.
- Keeps UI components strictly decoupled from storage mechanics so migrating to a hosted backend requires swapping only the service implementation.
