// utils/auth.ts
export const getAuthDataFromLocalStorage = () => {
  try {
    const authDataString = localStorage.getItem('authState');
    if (!authDataString) {
      throw new Error('No authentication data found in local storage');
    }

    const authData = JSON.parse(authDataString);
    const organization_id = authData?.organization_id;
    const userId = authData?.user?.id;

    if (!organization_id || !userId) {
      throw new Error('Organization ID or User ID missing in auth data');
    }

    return { organization_id, userId };
  } catch (error) {
    console.error('Error retrieving auth data from local storage:', error);
    throw error;
  }
};