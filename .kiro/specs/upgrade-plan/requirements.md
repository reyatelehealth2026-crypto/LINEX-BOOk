# Requirements Document

## Introduction

This document specifies the requirements for the upgrade-plan feature in the LineX booking system. The feature enables shop owners to select and switch between different subscription plan tiers during the free trial period. This initial release focuses on plan definition, selection, feature gating, and usage tracking without payment processing. The system will allow shops to freely upgrade between tiers to test different feature sets, preparing the foundation for future payment integration.

## Glossary

- **Shop**: A tenant in the multi-tenant LineX booking system, representing a single business (salon, nail shop, or spa)
- **Shop_Owner**: An admin user with the 'owner' role for a specific shop
- **Plan_Manager**: The system component responsible for managing subscription plans, plan selection, and feature access
- **Plan**: A subscription tier (Free, Basic, Pro, Enterprise) with defined feature limits
- **Feature_Gate**: A system mechanism that enforces plan-based access control to features
- **Plan_Selection_Flow**: The user interface and backend process for selecting or changing between plan tiers
- **Trial_Period**: The initial free period where shops can test different plan tiers without payment

## Requirements

### Requirement 1: Define Subscription Plans

**User Story:** As a platform administrator, I want to define multiple subscription tiers with different feature limits, so that shops can choose plans that match their business needs during the trial period.

#### Acceptance Criteria

1. THE Plan_Manager SHALL store plan definitions including name, description, and feature limits
2. THE Plan_Manager SHALL support at least four plan tiers: Free, Basic, Pro, and Enterprise
3. FOR ALL plans, THE Plan_Manager SHALL define limits for monthly bookings, staff accounts, AI image generation quota, and storage capacity
4. WHERE a shop has no active plan selection, THE Plan_Manager SHALL assign the Free plan by default
5. THE Plan_Manager SHALL store plan metadata for future pricing integration without displaying prices in this release

### Requirement 2: Display Available Plans

**User Story:** As a shop owner, I want to view all available subscription plans with their features and limits, so that I can compare options and choose the best plan for my business during the trial period.

#### Acceptance Criteria

1. WHEN a Shop_Owner accesses the plan selection page, THE Plan_Selection_Flow SHALL display all available plans with their features and limits
2. THE Plan_Selection_Flow SHALL highlight the shop's current plan
3. THE Plan_Selection_Flow SHALL display feature comparisons in a table or card layout
4. THE Plan_Selection_Flow SHALL show feature limits for each plan (booking capacity, staff accounts, AI quota, storage)
5. WHERE a feature is included in a plan, THE Plan_Selection_Flow SHALL display a visual indicator (checkmark or icon)
6. WHERE a feature is not included in a plan, THE Plan_Selection_Flow SHALL display a visual indicator (cross or disabled state)
7. THE Plan_Selection_Flow SHALL display a "Trial Period" badge or indicator to communicate that all plans are available for free testing

### Requirement 3: Select and Activate Plan

**User Story:** As a shop owner, I want to select any plan tier and have it activated immediately, so that I can test different feature sets during the trial period.

#### Acceptance Criteria

1. WHEN a Shop_Owner selects a plan different from their current plan, THE Plan_Selection_Flow SHALL display a confirmation screen
2. THE Plan_Selection_Flow SHALL display a summary of features that will be available in the selected plan
3. THE Plan_Selection_Flow SHALL display a summary of feature limits for the selected plan
4. WHEN a Shop_Owner confirms the plan selection, THE Plan_Manager SHALL activate the selected plan immediately
5. THE Plan_Selection_Flow SHALL allow both upgrades and downgrades between any plan tiers during the trial period
6. WHEN plan activation is complete, THE Plan_Selection_Flow SHALL redirect the Shop_Owner to the admin dashboard with a success message

### Requirement 4: Record Plan Changes

**User Story:** As the system, I want to record all plan changes with timestamps and details, so that I can track user behavior and prepare for future billing integration.

#### Acceptance Criteria

1. WHEN a Shop_Owner changes their plan, THE Plan_Manager SHALL record the plan change event with shop ID, old plan, new plan, and timestamp
2. THE Plan_Manager SHALL maintain a history of all plan changes for each shop
3. THE Plan_Manager SHALL unlock all features associated with the new plan immediately upon activation
4. THE Plan_Manager SHALL send a confirmation notification to the Shop_Owner via LINE push message
5. THE Plan_Manager SHALL store plan change data in a format compatible with future payment system integration

### Requirement 5: Enforce Feature Access Control

**User Story:** As the system, I want to enforce plan-based feature limits, so that shops experience realistic plan restrictions during the trial period.

#### Acceptance Criteria

1. WHEN a shop attempts to use a feature, THE Feature_Gate SHALL verify the feature is included in the shop's current plan
2. IF a feature is not included in the shop's plan, THEN THE Feature_Gate SHALL block access and display a plan selection prompt
3. THE Feature_Gate SHALL enforce monthly booking limits based on the shop's plan
4. WHEN a shop reaches their booking limit, THE Feature_Gate SHALL prevent new bookings and display a plan selection prompt
5. THE Feature_Gate SHALL enforce staff account limits based on the shop's plan
6. THE Feature_Gate SHALL enforce AI image generation quota based on the shop's plan
7. THE Feature_Gate SHALL enforce storage capacity limits based on the shop's plan

### Requirement 6: Display Plan Status and Usage

**User Story:** As a shop owner, I want to view my current plan and feature usage, so that I can understand my limits and decide if I need to change plans.

#### Acceptance Criteria

1. WHEN a Shop_Owner accesses the plan settings page, THE Plan_Manager SHALL display the current plan name and description
2. THE Plan_Manager SHALL display current usage for limited features (bookings, storage, AI quota) with progress indicators
3. THE Plan_Manager SHALL display remaining capacity for each limited feature
4. THE Plan_Manager SHALL display a "Trial Period" indicator to communicate that no payment is required
5. WHERE a shop is approaching a feature limit (80% or more), THE Plan_Manager SHALL display a warning message
6. THE Plan_Manager SHALL provide a link to the plan selection page for easy plan changes

### Requirement 7: Track Plan Selection Analytics

**User Story:** As a platform administrator, I want to track which plans shops select and how they use features, so that I can optimize plan offerings and prepare for monetization.

#### Acceptance Criteria

1. WHEN a shop changes their plan, THE Plan_Manager SHALL record the plan change event with shop ID, old plan, new plan, and timestamp
2. THE Plan_Manager SHALL track the distribution of shops across plan tiers
3. THE Plan_Manager SHALL track feature usage by plan tier to inform product decisions
4. THE Plan_Manager SHALL calculate plan retention metrics (how long shops stay on each plan tier)
5. THE Plan_Manager SHALL provide an analytics dashboard for platform administrators showing plan distribution and usage patterns
6. THE Plan_Manager SHALL track which features drive plan upgrades by correlating feature gate blocks with subsequent plan changes

### Requirement 8: Handle Edge Cases and Errors

**User Story:** As a shop owner, I want the system to handle errors gracefully during the plan selection process, so that I receive clear feedback and can retry if needed.

#### Acceptance Criteria

1. IF a network error occurs during plan activation, THEN THE Plan_Selection_Flow SHALL display an error message and allow retry
2. WHEN a Shop_Owner cancels the plan selection process, THE Plan_Selection_Flow SHALL return to the previous page without changes
3. IF a database error occurs during plan activation, THEN THE Plan_Manager SHALL log the error and display a user-friendly error message
4. THE Plan_Manager SHALL implement idempotency for plan changes to prevent duplicate plan change records
5. IF a shop attempts to select the same plan they are currently on, THEN THE Plan_Selection_Flow SHALL display an informational message and skip the activation process
6. WHEN a plan change fails, THE Plan_Manager SHALL maintain the shop's current plan without disruption

