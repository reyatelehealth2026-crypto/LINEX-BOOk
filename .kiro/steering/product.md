---
inclusion: auto
---

# LineBook Product Overview

LineBook is a multi-tenant SaaS booking system for beauty salons, nail shops, and spas that operates entirely through LINE messaging platform. It transforms a shop's existing LINE Official Account into a complete booking and CRM system.

## Core Value Proposition

- Customers book appointments through LINE chat (natural language) or LIFF mini-app (guided flow)
- Shop owners manage their business through a web admin panel with real-time updates
- Each shop gets their own subdomain (e.g., `mysalon.linebook.app`) and uses their own LINE OA credentials
- Zero app installation required for customers (LINE is already on their phones)

## Key Features

- **Booking Flow**: Service selection → Staff selection → Date/time → Confirmation
- **Rich Menu**: 6-button menu for quick actions (book, view bookings, profile, services)
- **CRM**: Customer registration, points system, visit tracking, loyalty tiers
- **Admin Panel**: Real-time queue management, booking status updates (confirm/complete/cancel/no-show)
- **Reminders**: Automated push notifications before appointments (1h, 2h, 24h)
- **AI Vision**: Customers send reference images → Gemini analyzes and recommends services
- **AI Image Generation**: Customers describe desired look → Gemini generates preview images
- **i18n**: Thai/English language toggle

## Multi-Tenant Architecture

- Single deployment serves multiple shops (tenants)
- Each shop has its own LINE OA credentials stored in database
- Routing via subdomain: `<slug>.linebook.app` → middleware resolves shop context
- Webhook endpoint resolves shop from LINE's `destination` field in payload
- Admin authentication scoped per shop

## Target Users

- **Primary**: Beauty salons, nail shops, spas in Thailand
- **Shop owners**: Need simple setup, self-service configuration, no technical knowledge required
- **Customers**: LINE users who prefer chat-based booking over phone calls or forms

## Business Goals

- Increase booking conversion rates
- Reduce repetitive chat responses for shop staff
- Prevent double-bookings and no-shows
- Build customer loyalty through points and history tracking
- Enable shops to feel "professional" while using familiar LINE interface
