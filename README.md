# Kaltura Category Manager

Bulk-assign a Kaltura category to all media entries created by a specific user.
The script:

- Authenticates with an admin session.
- Resolves the creator’s user ID from an email-like string.
- Paginates through the creator’s entries.
- Skips entries that already have the target category.
- If an entry is already at the 32-category limit, removes one category named
“InContext” to free a slot.
- Assigns the configured category to the entry.

## Requirements

- Node.js 18+ recommended
- A Kaltura account with admin credentials and API access

## Setup

1. Clone and install

- npm ci

2. Configure environment

- cp .env.example .env
- Fill in values (see “Environment” below).

3. Run

- npm start

## Environment

Set these variables in .env:

- ADMIN_SECRET: Kaltura admin secret used to start a KS.
- USER_ID: Find your Kaltura user ID on the KMC Administration page and use this ID when starting the session.
- TYPE: Session type. Use 2 for admin sessions.
- PARTNER_ID: Numeric Kaltura partner ID.
- EXPIRY: Session expiry in seconds.
- KALTURA_SERVICE_URL: Base service URL (e.g., https://www.kaltura.com).
- CATEGORY_ID: The category ID to assign to each entry.
- CREATOR_EMAIL: String used to find the creator. The script currently searches
by screen name (screenNameLike), so ensure this matches (or partially matches)
the user’s screen name. If you use an email as the screen name, provide that
email here.

Note: PRIVILEGES exists in .env.example for future use but is not currently
passed to the session call.

## How It Works

- Authentication: Creates a Kaltura client and starts an admin session via
kaltura.services.session.start(...).
- Resolve user: Looks up the user via screenNameLike using CREATOR_EMAIL, then
takes the first match’s ID.
- Find entries: Lists all media entries for that user, paginated at 200 per
page.
- For each entry:
    - Checks if the entry already has CATEGORY_ID. If yes, skips.
    - If the entry is at 32 categories, attempts to remove one category named
“InContext” to free space.
    - Adds the category to the entry.
- Logging: Prints progress, including how many entries were processed and any
errors encountered.

## Project Structure

- src/kaltura/client.js: Main script to authenticate and bulk-assign the
category.
- src/utils/index.js: Barrel exports for utility functions.
- src/utils/getUserIdByEmail.js: Resolves a user ID via screenNameLike.
- src/utils/entryHasCategory.js: Checks if an entry is already assigned to
a category.
- src/utils/removeOneInContextIfAtLimit.js: If an entry has 32 categories,
removes one named “InContext”.


## Troubleshooting

- Missing env vars: The script will throw if required values like PARTNER_ID or
ADMIN_SECRET are missing or invalid.
- Kaltura errors: If session.start returns an error, check credentials, TYPE,
and PARTNER_ID.
- Category add failures: Check that CATEGORY_ID exists and that the session has
permission to modify entries.

