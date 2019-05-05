import produce from "immer";
import {
  GET_FLATS,
  GET_FLATS_SUCCESS,
  GET_FLATS_FAILURE,
  SET_PREVIEWED_FLAT,
  UNSET_PREVIEWED_FLAT,
  SET_SELECTED_FLAT,
  UNSET_SELECTED_FLAT
} from "../actions/flat-actions";
import { SET_FAVORITE_FLAT_SUCCESS } from "../actions/flat-favorite-actions";
import { SET_ACTIVE_FLAT_SUCCESS } from "../actions/flat-active-actions";

const initialState = {
  isWorking: false,
  error: null,
  flats: null,
  visibleFlatIds: null,
  selectedFlat: null,
  previewedFlat: null
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
        draftState.visibleFlatIds = Object.keys(action.flats);
        return;

      case GET_FLATS_FAILURE:
        draftState.isWorking = false;
        draftState.error = action.error;
        return;

      case SET_PREVIEWED_FLAT:
        draftState.previewedFlat = action.flat;
        return;

      case UNSET_PREVIEWED_FLAT:
        draftState.previewedFlat = null;
        return;

      case SET_SELECTED_FLAT:
        draftState.selectedFlat = action.flat;
        return;

      case UNSET_SELECTED_FLAT:
        draftState.selectedFlat = null;
        return;

      case SET_FAVORITE_FLAT_SUCCESS:
        draftState.flats[action.flat.id].favorite = action.favorite;
        return;

      case SET_ACTIVE_FLAT_SUCCESS:
        draftState.flats[action.flat.id].active = action.active;
        return;

      default:
        return;
    }
  });
};
