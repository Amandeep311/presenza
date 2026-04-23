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
} from "../actions/types";

const initialState = {
  loading: false,
  kraList: [],
  currentKRA: null,
  updatingMetric: false,
  error: null,
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

    case FETCH_KRA_SUCCESS:
      return {
        ...state,
        loading: false,
        kraList: action.payload,
        error: null,
      };

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
        if (kra._id === kraId) {
          const updatedMetrics = kra.metrics.map(metric => 
            metric._id === metricId ? { ...metric, ...data } : metric
          );
          return { ...kra, metrics: updatedMetrics };
        }
        return kra;
      });

      // Update currentKRA if it's the one being edited
      let updatedCurrentKRA = state.currentKRA;
      if (state.currentKRA && state.currentKRA._id === kraId) {
        const updatedMetrics = state.currentKRA.metrics.map(metric =>
          metric._id === metricId ? { ...metric, ...data } : metric
        );
        updatedCurrentKRA = { ...state.currentKRA, metrics: updatedMetrics };
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

    default:
      return state;
  }
};

export default kraReducer;