import produce from "immer";
import {
  GET_FLATS,
  GET_FLATS_SUCCESS,
  GET_FLATS_FAILURE,
  SET_PREVIEWED_FLAT,
  UNSET_PREVIEWED_FLAT,
  SET_SELECTED_FLAT,
  UNSET_SELECTED_FLAT,
  SET_FLAT_FILTERS
} from "../actions/flat-actions";
import { SET_FAVORITE_FLAT_SUCCESS } from "../actions/flat-favorite-actions";
import { SET_ACTIVE_FLAT_SUCCESS } from "../actions/flat-active-actions";

const initialState = {
  isWorking: false,
  error: null,
  flats: null,
  visibleFlatIds: null,
  selectedFlatId: null,
  previewedFlatId: null,
  filters: {
    //TODO: use GET_CONFIG_SUCCESSFUL to fill this the first time
  }
};

const getVisibleFlatIds = ({ flats, filters }) => {
  return Object.entries(flats)
    .filter(([, flat]) => {
      //TODO: implement filters and return true if flat should be shown
      return true;
    })
    .map(([id]) => id);
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
        draftState.visibleFlatIds = getVisibleFlatIds({
          flats: action.flats,
          filters: state.filters
        });
        return;

      case GET_FLATS_FAILURE:
        draftState.isWorking = false;
        draftState.error = action.error;
        return;

      case SET_PREVIEWED_FLAT:
        draftState.previewedFlatId = action.flat;
        return;

      case UNSET_PREVIEWED_FLAT:
        draftState.previewedFlatId = null;
        return;

      case SET_SELECTED_FLAT:
        draftState.selectedFlatId = action.flat.id;
        return;

      case UNSET_SELECTED_FLAT:
        draftState.selectedFlatId = null;
        return;

      case SET_FAVORITE_FLAT_SUCCESS:
        draftState.flats[action.flat.id].favorite = action.favorite;
        return;

      case SET_ACTIVE_FLAT_SUCCESS:
        draftState.flats[action.flat.id].active = action.active;
        return;

      case SET_FLAT_FILTERS:
        const newFilters = { ...state.filters, ...action.filters };
        draftState.filters = newFilters;
        draftState.visibleFlatIds = getVisibleFlatIds({
          flats: state.flats,
          filters: newFilters
        });
        return;

      default:
        return;
    }
  });
};
