import kaltura from 'kaltura-client'; 

// Find a user's ID by their display name (screenName)
export const getUserIdByEmail = async (client, creatorEmail) => {
  const userFilter = new kaltura.objects.UserFilter();
  userFilter.screenNameLike = creatorEmail; // search by display name
  const userResult = await kaltura.services.user.listAction(userFilter).execute(client);

  if (!userResult.objects || userResult.objects.length === 0) {
    throw new Error(`User with name "${creatorEmail}" not found.`);
  }

  // Assumes the first result is the correct user
  return userResult.objects[0].id;
};
