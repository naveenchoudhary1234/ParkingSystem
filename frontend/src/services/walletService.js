import { apiRequest } from '../api';

/**
 * Get user's wallet balance
 */
export const getWalletBalance = async () => {
  try {
    const response = await apiRequest('/wallet/balance', 'GET');
    return response;
  } catch (error) {
    console.error('Get Wallet Balance Error:', error);
    throw error;
  }
};

/**
 * Get wallet transaction history
 */
export const getWalletTransactions = async () => {
  try {
    const response = await apiRequest('/wallet/transactions', 'GET');
    return response;
  } catch (error) {
    console.error('Get Wallet Transactions Error:', error);
    throw error;
  }
};

/**
 * Add money to wallet (for testing)
 */
export const addMoneyToWallet = async (amount, description) => {
  try {
    const response = await apiRequest('/wallet/add', 'POST', { amount, description });
    return response;
  } catch (error) {
    console.error('Add Money to Wallet Error:', error);
    throw error;
  }
};
