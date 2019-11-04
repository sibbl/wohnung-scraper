import produce from "immer";
import {
  SET_FAVORITE_FLAT,
  SET_FAVORITE_FLAT_SUCCESS,
  SET_FAVORITE_FLAT_FAILURE
} from "../actions/flat-favorite-actions";

const initialState = {
  isWorking: false,
  error: null
};

export const flatFavoriteReducer = (state = initialState, action) => {
  return produce(state, draftState => {
    switch (action.type) {
      case SET_FAVORITE_FLAT:
        draftState.isWorking = true;
        draftState.error = null;
        return;

      case SET_FAVORITE_FLAT_SUCCESS:
        draftState.isWorking = false;
        draftState.error = null;
        return;

      case SET_FAVORITE_FLAT_FAILURE:
        draftState.isWorking = false;
        draftState.error = action.error;
        return;

      default:
        return;
    }
  });
};
