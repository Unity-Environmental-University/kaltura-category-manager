import kaltura from 'kaltura-client';

// Check if an entry already has a given category assigned
export const entryHasCategory = async (client, entryId, categoryId) => {
  const filter = new kaltura.objects.CategoryEntryFilter();
  filter.entryIdEqual = entryId;
  filter.categoryIdEqual = categoryId;
  const result = await kaltura.services.categoryEntry.listAction(filter).execute(client);
  return Array.isArray(result.objects) && result.objects.length > 0;
};
