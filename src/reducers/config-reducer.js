import produce from "immer";
import {
  GET_CONFIG,
  GET_CONFIG_SUCCESS,
  GET_CONFIG_FAILURE
} from "../actions/config-actions";

const initialState = {
  isWorking: false,
  error: null,
  config: null
};

export const configReducer = (state = initialState, action) => {
  return produce(state, draftState => {
    switch (action.type) {
      case GET_CONFIG:
        draftState.isWorking = true;
        draftState.error = null;
        return;

      case GET_CONFIG_SUCCESS:
        draftState.isWorking = false;
        draftState.error = null;
        draftState.config = action.config;
        return;

      case GET_CONFIG_FAILURE:
        draftState.isWorking = false;
        draftState.error = action.error;
        return;

      default:
        return;
    }
  });
};
