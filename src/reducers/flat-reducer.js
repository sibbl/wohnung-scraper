import produce from "immer";
import {
  GET_FLATS,
  GET_FLATS_SUCCESS,
  GET_FLATS_FAILURE
} from "../actions/flat-actions";

const initialState = {
  isWorking: false,
  error: null,
  flats: null
};

export const flatReducer = (state = initialState, action) => {
  return produce(state, draftState => {
    switch (action.type) {
      case GET_FLATS:
        draftState.isWorking = true;
        draftState.error = null;
        return;

      case GET_FLATS_SUCCESS:
        draftState.isWorking = false;
        draftState.error = null;
        draftState.flats = action.flats;
        return;

      case GET_FLATS_FAILURE:
        draftState.isWorking = false;
        draftState.error = action.error;
        return;

      default:
        return;
    }
  });
};
