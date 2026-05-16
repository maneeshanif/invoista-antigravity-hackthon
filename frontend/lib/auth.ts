import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenCache {
  getToken: (key: string) => Promise<string | undefined | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => Promise<void>;
}

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        const item = Platform.OS === 'web' 
          ? localStorage.getItem(key) 
          : await SecureStore.getItemAsync(key);
        return item;
      } catch (error) {
        console.error('clerk token cache get error', error);
        return null;
      }
    },
    saveToken: async (key: string, value: string) => {
      try {
        Platform.OS === 'web' 
          ? localStorage.setItem(key, value) 
          : await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.error('clerk token cache set error', error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
