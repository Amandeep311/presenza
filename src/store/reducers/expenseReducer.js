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
} from '../actions/types';

const initialState = {
  loading: false,
  expenses: [],
  currentExpense: null,
  uploading: false,
  uploadProgress: 0,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
};

const expenseReducer = (state = initialState, action) => {
  switch (action.type) {
    // Create Expense
    case CREATE_EXPENSE_REQUEST:
      return {
        ...state,
        creating: true,
        uploading: true,
        error: null,
      };

    case CREATE_EXPENSE_SUCCESS:
      return {
        ...state,
        creating: false,
        uploading: false,
        uploadProgress: 0,
        expenses: [action.payload, ...state.expenses],
        error: null,
      };

    case CREATE_EXPENSE_FAIL:
      return {
        ...state,
        creating: false,
        uploading: false,
        uploadProgress: 0,
        error: action.payload,
      };

    // Upload Progress
    case 'UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: action.payload,
      };

    // Fetch Expenses
    case FETCH_EXPENSES_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_EXPENSES_SUCCESS:
      return {
        ...state,
        loading: false,
        expenses: action.payload,
        error: null,
      };

    case FETCH_EXPENSES_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Fetch Single Expense
    case FETCH_EXPENSE_BY_ID_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_EXPENSE_BY_ID_SUCCESS:
      return {
        ...state,
        loading: false,
        currentExpense: action.payload,
        error: null,
      };

    case FETCH_EXPENSE_BY_ID_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Update Expense
    case UPDATE_EXPENSE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
      };

    case UPDATE_EXPENSE_SUCCESS: {
      const { expenseId, data } = action.payload;
      
      const updatedExpenses = state.expenses.map(expense =>
        expense._id === expenseId || expense.id === expenseId
          ? { ...expense, ...data }
          : expense
      );

      const updatedCurrentExpense = 
        state.currentExpense && 
        (state.currentExpense._id === expenseId || state.currentExpense.id === expenseId)
          ? { ...state.currentExpense, ...data }
          : state.currentExpense;

      return {
        ...state,
        updating: false,
        expenses: updatedExpenses,
        currentExpense: updatedCurrentExpense,
        error: null,
      };
    }

    case UPDATE_EXPENSE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    // Delete Expense
    case DELETE_EXPENSE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
      };

    case DELETE_EXPENSE_SUCCESS:
      return {
        ...state,
        deleting: false,
        expenses: state.expenses.filter(
          expense => expense._id !== action.payload && expense.id !== action.payload
        ),
        currentExpense: 
          state.currentExpense && 
          (state.currentExpense._id === action.payload || state.currentExpense.id === action.payload)
            ? null
            : state.currentExpense,
        error: null,
      };

    case DELETE_EXPENSE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default expenseReducer;