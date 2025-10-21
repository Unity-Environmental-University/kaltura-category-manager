import kaltura from 'kaltura-client';

// Remove one instance of the category with the given name when an entry
// has already been linked with the maximum of 32 categories.
// Returns true if a removal was performed, false otherwise.
export const removeOneInContextIfAtLimit = async (client, entryId, categoryName = 'InContext') => {
  // 1) Get total number of categories linked to this entry
  const allCatsFilter = new kaltura.objects.CategoryEntryFilter();
  allCatsFilter.entryIdEqual = entryId;
  const allCatsResult = await kaltura.services.categoryEntry.listAction(allCatsFilter).execute(client);
  const total = typeof allCatsResult.totalCount === 'number' ? allCatsResult.totalCount : (allCatsResult.objects?.length || 0);

  if (total < 32) {
    return false;
  }

  // 2) Fetch all category entries for this entry (ensure we have objects)
  const pager = new kaltura.objects.FilterPager();
  pager.pageSize = 500; // well above the 32 max
  const ceResult = await kaltura.services.categoryEntry.listAction(allCatsFilter, pager).execute(client);
  const categoryIds = (ceResult.objects || []).map(o => o.categoryId).filter(Boolean);

  if (categoryIds.length === 0) {
    console.warn(`Entry ${entryId} has 32 categories, but could not enumerate category IDs.`);
    return false;
  }

  // 3) From those category IDs, find any category whose name matches the requested name
  const catFilter = new kaltura.objects.CategoryFilter();
  catFilter.idIn = categoryIds.join(',');
  catFilter.nameEqual = categoryName;
  const catResult = await kaltura.services.category.listAction(catFilter).execute(client);

  if (Array.isArray(catResult.objects) && catResult.objects.length > 0) {
    const categoryToRemove = catResult.objects[0];
    await kaltura.services.categoryEntry.deleteAction(entryId, categoryToRemove.id).execute(client);
    console.log(`Removed category named "${categoryName}" (id ${categoryToRemove.id}) from entry ${entryId} to free space.`);
    return true;
  }

  console.warn(`Entry ${entryId} has 32 categories but no category named "${categoryName}" to remove.`);
  return false;
};
