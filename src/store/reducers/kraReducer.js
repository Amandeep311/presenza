// kraReducer.js

import {
  FETCH_KRA_REQUEST,
  FETCH_KRA_SUCCESS,
  FETCH_KRA_FAIL,
  FETCH_KRA_BY_ID_REQUEST,
  FETCH_KRA_BY_ID_SUCCESS,
  FETCH_KRA_BY_ID_FAIL,
  UPDATE_KRA_METRIC_REQUEST,
  UPDATE_KRA_METRIC_SUCCESS,
  UPDATE_KRA_METRIC_FAIL,
  UPDATE_KRA_STATUS_REQUEST,
  UPDATE_KRA_STATUS_SUCCESS,
  UPDATE_KRA_STATUS_FAIL,
} from "../actions/types";

const initialState = {
  loading: false,
  kraList: [],
  currentKRA: null,
  updatingMetric: false,
  updatingStatus: false,
  error: null,
  // Additional stats
  total: 0,
  active: 0,
  completed: 0,
  pending: 0,
};

const kraReducer = (state = initialState, action) => {
  switch (action.type) {
    // Fetch all KRA
    case FETCH_KRA_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_KRA_SUCCESS: {
      // Handle different response structures
      let kraData = [];
      let stats = {
        total: 0,
        active: 0,
        completed: 0,
        pending: 0,
      };

      // If action.payload is the full API response with data object
      if (action.payload && action.payload.data && action.payload.data.kras) {
        kraData = action.payload.data.kras;
        stats = {
          total: action.payload.data.total || kraData.length,
          active: action.payload.data.active || 0,
          completed: action.payload.data.completed || 0,
          pending: action.payload.data.pending || 0,
        };
      } 
      // If action.payload is the data object directly
      else if (action.payload && action.payload.kras) {
        kraData = action.payload.kras;
        stats = {
          total: action.payload.total || kraData.length,
          active: action.payload.active || 0,
          completed: action.payload.completed || 0,
          pending: action.payload.pending || 0,
        };
      }
      // If action.payload is an array
      else if (Array.isArray(action.payload)) {
        kraData = action.payload;
        stats = {
          total: kraData.length,
          active: kraData.filter(k => k.status === 'active').length,
          completed: kraData.filter(k => k.status === 'completed').length,
          pending: kraData.filter(k => k.status === 'pending').length,
        };
      }

      return {
        ...state,
        loading: false,
        kraList: kraData,
        total: stats.total,
        active: stats.active,
        completed: stats.completed,
        pending: stats.pending,
        error: null,
      };
    }

    case FETCH_KRA_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Fetch single KRA
    case FETCH_KRA_BY_ID_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_KRA_BY_ID_SUCCESS:
      return {
        ...state,
        loading: false,
        currentKRA: action.payload,
        error: null,
      };

    case FETCH_KRA_BY_ID_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Update KRA metric
    case UPDATE_KRA_METRIC_REQUEST:
      return {
        ...state,
        updatingMetric: true,
        error: null,
      };

    case UPDATE_KRA_METRIC_SUCCESS: {
      const { kraId, metricId, data } = action.payload;
      
      // Update the metric in kraList
      const updatedKraList = state.kraList.map(kra => {
        const kraIdentifier = kra.kraId || kra._id;
        if (kraIdentifier === kraId) {
          const updatedMetrics = (kra.metrics || []).map(metric => {
            const metricIdentifier = metric._id || metric.id;
            return metricIdentifier === metricId ? { ...metric, ...data } : metric;
          });
          return { ...kra, metrics: updatedMetrics };
        }
        return kra;
      });

      // Update currentKRA if it's the one being edited
      let updatedCurrentKRA = state.currentKRA;
      if (state.currentKRA) {
        const currentKraId = state.currentKRA.kraId || state.currentKRA._id;
        if (currentKraId === kraId) {
          const updatedMetrics = (state.currentKRA.metrics || []).map(metric => {
            const metricIdentifier = metric._id || metric.id;
            return metricIdentifier === metricId ? { ...metric, ...data } : metric;
          });
          updatedCurrentKRA = { ...state.currentKRA, metrics: updatedMetrics };
        }
      }

      return {
        ...state,
        updatingMetric: false,
        kraList: updatedKraList,
        currentKRA: updatedCurrentKRA,
        error: null,
      };
    }

    case UPDATE_KRA_METRIC_FAIL:
      return {
        ...state,
        updatingMetric: false,
        error: action.payload,
      };

    // Update KRA Status
    case UPDATE_KRA_STATUS_REQUEST:
      return {
        ...state,
        updatingStatus: true,
        error: null,
      };

    case UPDATE_KRA_STATUS_SUCCESS: {
      const { kraId, status } = action.payload;
      
      // Update status in kraList
      const updatedKraList = state.kraList.map(kra => {
        const kraIdentifier = kra.kraId || kra._id;
        if (kraIdentifier === kraId) {
          return { ...kra, status };
        }
        return kra;
      });

      // Update currentKRA if it's the one being edited
      let updatedCurrentKRA = state.currentKRA;
      if (state.currentKRA) {
        const currentKraId = state.currentKRA.kraId || state.currentKRA._id;
        if (currentKraId === kraId) {
          updatedCurrentKRA = { ...state.currentKRA, status };
        }
      }

      // Update stats
      const newCompleted = updatedKraList.filter(k => k.status === 'completed').length;
      const newPending = updatedKraList.filter(k => k.status === 'pending').length;
      const newActive = updatedKraList.filter(k => k.status === 'active' || k.status === 'in_progress').length;

      return {
        ...state,
        updatingStatus: false,
        kraList: updatedKraList,
        currentKRA: updatedCurrentKRA,
        completed: newCompleted,
        pending: newPending,
        active: newActive,
        error: null,
      };
    }

    case UPDATE_KRA_STATUS_FAIL:
      return {
        ...state,
        updatingStatus: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default kraReducer;