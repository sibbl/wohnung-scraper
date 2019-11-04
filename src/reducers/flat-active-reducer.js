import produce from "immer";
import {
  SET_ACTIVE_FLAT,
  SET_ACTIVE_FLAT_SUCCESS,
  SET_ACTIVE_FLAT_FAILURE
} from "../actions/flat-active-actions";

const initialState = {
  isWorking: false,
  error: null
};

export const flatActiveReducer = (state = initialState, action) => {
  return produce(state, draftState => {
    switch (action.type) {
      case SET_ACTIVE_FLAT:
        draftState.isWorking = true;
        draftState.error = null;
        return;

      case SET_ACTIVE_FLAT_SUCCESS:
        draftState.isWorking = false;
        draftState.error = null;
        return;

      case SET_ACTIVE_FLAT_FAILURE:
        draftState.isWorking = false;
        draftState.error = action.error;
        return;

      default:
        return;
    }
  });
};
