import { produce } from "immer";
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
import { GET_CONFIG_SUCCESS } from "../actions/config-actions";
import { getDateTime } from "../services/date-utils";
import { DateTime } from "luxon";

const initialState = {
  isWorking: false,
  error: null,
  flats: null,
  visibleFlatIds: null,
  selectedFlatId: null,
  previewedFlatId: null,
  filters: null
};

const getVisibleFlatIds = ({ flats, filters }) => {
  if (!flats || !filters) {
    return null;
  }

  return Object.entries(flats)
    .filter(([, flat]) => {
      if (filters.showOnlyFavs && !flat.favorite) {
        return false;
      }

      if (filters.hideInactive && !flat.active) {
        return false;
      }

      if (
        ["price", "rooms", "size"].some(key => {
          return flat[key] < filters[key].min || flat[key] > filters[key].max;
        })
      ) {
        return false;
      }

      if (flat.free_from) {
        const parsedFreeFromDateTime = DateTime.fromISO(flat.free_from);
        if (
          parsedFreeFromDateTime < filters.free_from.min ||
          parsedFreeFromDateTime > filters.free_from.max
        ) {
          return false;
        }
      }

      if (flat.added) {
        const parsedAddedTime = DateTime.fromISO(flat.added).startOf("day");
        if (
          parsedAddedTime < filters.age.min ||
          parsedAddedTime > filters.age.max
        ) {
          return false;
        }
      }

      if (filters.enabledSites[flat.website] !== true) {
        return false;
      }

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
        draftState.previewedFlatId = action.flatId;
        return;

      case UNSET_PREVIEWED_FLAT:
        draftState.previewedFlatId = null;
        return;

      case SET_SELECTED_FLAT:
        draftState.selectedFlatId = action.flatId;
        return;

      case UNSET_SELECTED_FLAT:
        draftState.selectedFlatId = null;
        return;

      case SET_FAVORITE_FLAT_SUCCESS:
        draftState.flats[action.flatId].favorite = action.favorite;
        draftState.visibleFlatIds = getVisibleFlatIds({
          flats: draftState.flats,
          filters: state.filters
        });
        return;

      case SET_ACTIVE_FLAT_SUCCESS:
        draftState.flats[action.flatId].active = action.active;
        draftState.visibleFlatIds = getVisibleFlatIds({
          flats: draftState.flats,
          filters: state.filters
        });
        return;

      case SET_FLAT_FILTERS:
        const newFilters = { ...state.filters, ...action.filters };
        draftState.filters = newFilters;
        draftState.visibleFlatIds = getVisibleFlatIds({
          flats: state.flats,
          filters: newFilters
        });
        return;

      case GET_CONFIG_SUCCESS:
        const configFilters = { ...action.config.filters.default };

        if (!configFilters.enabledSites) {
          // enable all sites by default
          configFilters.enabledSites = {};
          Object.keys(action.config.scraper).forEach(
            key => (configFilters.enabledSites[key] = true)
          );
        }

        ["free_from", "age"].forEach(dateRangeKey => {
          configFilters[dateRangeKey] = {
            min: getDateTime(configFilters[dateRangeKey].min),
            max: getDateTime(configFilters[dateRangeKey].max)
          };
        });

        draftState.filters = configFilters;
        draftState.visibleFlatIds = getVisibleFlatIds({
          flats: state.flats,
          filters: configFilters
        });
        break;

      default:
        return;
    }
  });
};
