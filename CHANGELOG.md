# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-beta.0](https://github.com/Spiritbulb/mcloud/compare/v0.1.1...v1.0.0-beta.0) (2026-03-22)

### Features

* add theme support to all storefront pages
* fix theme routing and add theme-specific nav/footer
* added new themes for store type support - Fixed dark mode/light mode switch - Added a new route to support home client
* getting started drawer and tracking
* new docs editor with basic authentication

### Bug Fixes

* destructured and awaited search params for direct access

### Refactoring

* switched authentication and admin access routes

### Maintenance

* moved integrations
* written docs and added nav links
* installed claude code and initialized

All notable changes to this project will be documented in this file.

## [0.1.1](https://github.com/Spiritbulb/mcloud/compare/v0.1.0...v0.1.1) (2026-03-19)

### Features

* Introduce support and changelog pages, update settings header UI, and refactor appearance settings styling.
* Add Next.js middleware for request proxying.
* Add API endpoint to fetch a store by slug, including user authentication and membership verification.
* Implement full user authentication, onboarding, and initial store management infrastructure.
* Implement a modular theming system for stores, add new store pages and components, and introduce authentication features.
* Establish core storefront layout, global theme styling, and store settings components.
* Implement multi-tenant e-commerce store with product details, cart management, and various payment integrations.
* Add login form component with Supabase authentication and organization-based redirection.

### Bug Fixes

* Redirect subdomain protected routes to the main domain for Auth0 login and update the banner dashboard URL.

