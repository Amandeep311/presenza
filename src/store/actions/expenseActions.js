import { Platform } from 'react-native';
import apiService from '../../services/apiService';
import {
  CREATE_EXPENSE_REQUEST,
  CREATE_EXPENSE_SUCCESS,
  CREATE_EXPENSE_FAIL,
  FETCH_EXPENSES_REQUEST,
  FETCH_EXPENSES_SUCCESS,
  FETCH_EXPENSES_FAIL,
  FETCH_EXPENSE_BY_ID_REQUEST,
  FETCH_EXPENSE_BY_ID_SUCCESS,
  FETCH_EXPENSE_BY_ID_FAIL,
  UPDATE_EXPENSE_REQUEST,
  UPDATE_EXPENSE_SUCCESS,
  UPDATE_EXPENSE_FAIL,
  DELETE_EXPENSE_REQUEST,
  DELETE_EXPENSE_SUCCESS,
  DELETE_EXPENSE_FAIL,
} from './types';

/**
 * Create a new expense with optional receipt file upload
 * @param {Object} expenseData - The expense data object
 * @param {Object} receiptFile - Optional receipt file { uri, type, name }
 * @returns {Function} Redux thunk action
 */
export const createExpense = (expenseData, receiptFile = null) => async (dispatch) => {
  try {
    console.log('📝 Creating expense...');
    
    dispatch({ type: CREATE_EXPENSE_REQUEST });

    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Append the JSON data as a string field
    formData.append('jsonData', JSON.stringify(expenseData));
    
    // Append receipt file if provided
    if (receiptFile && receiptFile.uri) {
      const fileUri = Platform.OS === 'ios' 
        ? receiptFile.uri.replace('file://', '') 
        : receiptFile.uri;
      
      formData.append('image', {
        uri: fileUri,
        type: receiptFile.type === 'pdf' ? 'application/pdf' : `image/${receiptFile.type || 'jpeg'}`,
        name: receiptFile.name || `receipt_${Date.now()}.${receiptFile.type || 'jpg'}`,
      });
      
      console.log('📎 File attached:', receiptFile.name);
    }

    console.log('📦 FormData created with expense data');
    console.log('📋 Expense data:', JSON.stringify(expenseData, null, 2));

    // Use apiService with multipart/form-data headers
    const response = await apiService.post('/expense', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Optional: Track upload progress
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`📤 Upload progress: ${percentCompleted}%`);
          
          // You can dispatch a progress action if needed
          dispatch({
            type: 'UPLOAD_PROGRESS',
            payload: percentCompleted,
          });
        }
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', response.data);

    // Check for successful response
    if (response.status >= 200 && response.status < 300) {
      let expenseResult = null;
      
      // Handle different response structures
      if (response.data?.data) {
        expenseResult = response.data.data;
      } else if (response.data?.expense) {
        expenseResult = response.data.expense;
      } else {
        expenseResult = response.data;
      }

      console.log('✅ Expense created successfully');

      dispatch({
        type: CREATE_EXPENSE_SUCCESS,
        payload: expenseResult,
      });

      return {
        success: true,
        data: expenseResult,
        message: response.data?.message || 'Expense created successfully',
      };
    } else {
      throw new Error(response.data?.message || 'Failed to create expense');
    }
    
  } catch (error) {
    console.log('❌ Create expense error:', error.message);
    console.log('❌ Error details:', error.response?.data || error);
    
    const errorMessage = 
      error.response?.data?.message || 
      error.message || 
      'Failed to create expense';
    
    dispatch({
      type: CREATE_EXPENSE_FAIL,
      payload: errorMessage,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Fetch all expenses for the logged-in user
 * @returns {Function} Redux thunk action
 */
export const fetchExpenses = () => async (dispatch) => {
  try {
    console.log('📝 Fetching expenses...');
    
    dispatch({ type: FETCH_EXPENSES_REQUEST });

    const response = await apiService.get('/expense');

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      let expensesData = [];
      
      // Handle different response structures
      if (response.data?.data && Array.isArray(response.data.data)) {
        expensesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        expensesData = response.data;
      } else if (response.data?.expenses && Array.isArray(response.data.expenses)) {
        expensesData = response.data.expenses;
      }

      console.log('✅ Fetched expenses:', expensesData.length);

      dispatch({
        type: FETCH_EXPENSES_SUCCESS,
        payload: expensesData,
      });

      return {
        success: true,
        data: expensesData,
        message: response.data?.message,
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch expenses');
    }
    
  } catch (error) {
    console.log('❌ Fetch expenses error:', error.message);
    
    dispatch({
      type: FETCH_EXPENSES_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to fetch expenses',
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Fetch a single expense by ID
 * @param {string} expenseId - The expense ID
 * @returns {Function} Redux thunk action
 */
export const fetchExpenseById = (expenseId) => async (dispatch) => {
  try {
    console.log('📝 Fetching expense by ID:', expenseId);
    
    dispatch({ type: FETCH_EXPENSE_BY_ID_REQUEST });

    const response = await apiService.get(`/expense/${expenseId}`);

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      let expenseItem = response.data?.data || response.data?.expense || response.data;

      dispatch({
        type: FETCH_EXPENSE_BY_ID_SUCCESS,
        payload: expenseItem,
      });

      return {
        success: true,
        data: expenseItem,
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch expense details');
    }
    
  } catch (error) {
    console.log('❌ Fetch expense by ID error:', error.message);
    
    dispatch({
      type: FETCH_EXPENSE_BY_ID_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Update an existing expense
 * @param {string} expenseId - The expense ID
 * @param {Object} updateData - The updated expense data
 * @returns {Function} Redux thunk action
 */
export const updateExpense = (expenseId, updateData) => async (dispatch) => {
  try {
    console.log('📝 Updating expense:', expenseId);
    
    dispatch({ type: UPDATE_EXPENSE_REQUEST });

    const response = await apiService.put(`/expense/${expenseId}`, updateData);

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      const updatedExpense = response.data?.data || response.data?.expense || response.data;

      dispatch({
        type: UPDATE_EXPENSE_SUCCESS,
        payload: {
          expenseId,
          data: updatedExpense,
        },
      });

      return {
        success: true,
        data: updatedExpense,
      };
    } else {
      throw new Error(response.data?.message || 'Failed to update expense');
    }
    
  } catch (error) {
    console.log('❌ Update expense error:', error.message);
    
    dispatch({
      type: UPDATE_EXPENSE_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Delete an expense
 * @param {string} expenseId - The expense ID
 * @returns {Function} Redux thunk action
 */
export const deleteExpense = (expenseId) => async (dispatch) => {
  try {
    console.log('📝 Deleting expense:', expenseId);
    
    dispatch({ type: DELETE_EXPENSE_REQUEST });

    const response = await apiService.delete(`/expense/${expenseId}`);

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      dispatch({
        type: DELETE_EXPENSE_SUCCESS,
        payload: expenseId,
      });

      return {
        success: true,
        message: response.data?.message || 'Expense deleted successfully',
      };
    } else {
      throw new Error(response.data?.message || 'Failed to delete expense');
    }
    
  } catch (error) {
    console.log('❌ Delete expense error:', error.message);
    
    dispatch({
      type: DELETE_EXPENSE_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};