import 'dotenv/config';
import kaltura from 'kaltura-client';
import { removeOneInContextIfAtLimit, getUserIdByEmail, entryHasCategory } from '../utils/index.js';

// Load configuration from environment variables
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const USER_ID = process.env.USER_ID
const TYPE = process.env.TYPE
const EXPIRY = process.env.EXPIRY
const PARTNER_ID = Number(process.env.PARTNER_ID);
const KALTURA_SERVICE_URL = process.env.KALTURA_SERVICE_URL;
const CATEGORY_ID = process.env.CATEGORY_ID;
const CREATOR_EMAIL = process.env.CREATOR_EMAIL;

if (!PARTNER_ID || Number.isNaN(PARTNER_ID)) {
  throw new Error('Missing or invalid PARTNER_ID in environment');
}
if (!ADMIN_SECRET) {
  throw new Error('Missing ADMIN_SECRET in environment');
}

async function bulkAssignCategoryToCreatorEntries(client) {
  console.log(`Using known category ID: ${CATEGORY_ID}`);

  // 2. Get the creator's user ID
  const creatorId = await getUserIdByEmail(client, CREATOR_EMAIL);
  console.log(`Found creator "${CREATOR_EMAIL}" with ID: ${creatorId}`);

  // 3. Find entries belonging to the creator
  const entryFilter = new kaltura.objects.MediaEntryFilter();
  entryFilter.userIdEqual = creatorId; // Filter entries by the creator's ID
  // Paginate through all entries for this creator
  const pager = new kaltura.objects.FilterPager();
  pager.pageSize = 200;
  pager.pageIndex = 1;

  let pageCount = 0;
  let totalProcessed = 0; // count of entries we successfully updated
  let loggedTotalOnce = false;

  while (true) {
    const entryResult = await kaltura.services.media.listAction(entryFilter, pager).execute(client);
    const entries = entryResult.objects || [];

    if (!loggedTotalOnce) {
      const total = typeof entryResult.totalCount === 'number' ? entryResult.totalCount : entries.length;
      if (total === 0) {
        console.log('No entries found matching the creator ID.');
        break;
      }
      console.log(`Found ${total} entries for creator "${CREATOR_EMAIL}".`);
      loggedTotalOnce = true;
    }

    if (entries.length === 0) {
      break; // no more pages
    }

    // Loop through the entries and add the category when missing
    for (const entry of entries) {
      // Skip if the entry already has the category
      try {
        const alreadyHas = await entryHasCategory(client, entry.id, CATEGORY_ID);
        if (alreadyHas) {
          console.log(`Entry "${entry.name}" (${entry.id}) already has category ${CATEGORY_ID}; skipping.`);
          continue;
        }
      } catch (checkError) {
        console.warn(`Could not verify existing category for entry "${entry.name}" (${entry.id}):`, checkError);
      }

      // Try to free a slot if at limit before adding
      try {
        // Remove one instance of the "InContext" category by name if at limit
        await removeOneInContextIfAtLimit(client, entry.id, 'InContext');
      } catch (removalError) {
        console.warn(`Could not attempt removal for entry "${entry.name}" (${entry.id}):`, removalError);
      }

      try {
        const categoryEntry = new kaltura.objects.CategoryEntry();
        categoryEntry.entryId = entry.id;
        categoryEntry.categoryId = CATEGORY_ID;
        await kaltura.services.categoryEntry.add(categoryEntry).execute(client);
        console.log(`Successfully added category to entry "${entry.name}" (${entry.id})`);
        totalProcessed++;
      } catch (addError) {
        console.error(`Failed to add category to entry "${entry.name}" (${entry.id}):`, addError);
      }
    }

    pageCount++;
    if (entries.length < pager.pageSize) {
      break; // last page reached
    }
    pager.pageIndex++;
  }

  console.log(`Bulk operation completed. Processed ${totalProcessed} entries across ${pageCount} pages.`);
}

async function startBulkCategoryAssignment() {
  const config = new kaltura.Configuration();
  config.serviceUrl = KALTURA_SERVICE_URL;
  const client = new kaltura.Client(config);

  try {
    // 1. Authenticate with an admin session using callback syntax
    kaltura.services.session
      .start(ADMIN_SECRET, USER_ID, TYPE, PARTNER_ID, EXPIRY, null)
      .execute(client, function (success, results) {
        if (!success || (results && results.code && results.message)) {
          console.log('Kaltura Error', success, results);
        } else {
        console.log('Kaltura Result', results);
        client.setKs(results);
          bulkAssignCategoryToCreatorEntries(client).catch((err) => {
            console.error('An error occurred during the bulk operation:', err);
          });
        }
      });
  } catch (err) {
    console.error('An error occurred during the bulk operation:', err);
  }
}

// Run the main function
startBulkCategoryAssignment();
