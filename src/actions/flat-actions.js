import { getFlats as getFlatsFromApi } from "../services/WohnungScraperApi";

export const GET_FLATS = "GET_FLATS";
export const GET_FLATS_SUCCESS = "GET_FLATS_SUCCESS";
export const GET_FLATS_FAILURE = "GET_FLATS_FAILURE";

export const SET_PREVIEWED_FLAT = "SET_PREVIEWED_FLAT";
export const UNSET_PREVIEWED_FLAT = "UNSET_PREVIEWED_FLAT";

export const SET_SELECTED_FLAT = "SET_SELECTED_FLAT";
export const UNSET_SELECTED_FLAT = "UNSET_SELECTED_FLAT";

export const SET_FLAT_FILTERS = "SET_FLAT_FILTERS";

export const getFlats = () => {
  return async dispatch => {
    dispatch({ type: GET_FLATS });

    try {
      const flats = await getFlatsFromApi();

      dispatch({ type: GET_FLATS_SUCCESS, flats });
    } catch (error) {
      console.error(error);
      dispatch({ type: GET_FLATS_FAILURE, error });
    }
  };
};

export const setPreviewedFlat = ({ flatId }) => dispatch => {
  if (flatId != null) {
    dispatch({ type: SET_PREVIEWED_FLAT, flatId });
  } else {
    dispatch({ type: UNSET_PREVIEWED_FLAT });
  }
};

export const setSelectedFlat = ({ flatId }) => dispatch => {
  if (flatId != null) {
    dispatch({ type: SET_SELECTED_FLAT, flatId });
  } else {
    dispatch({ type: UNSET_SELECTED_FLAT });
  }
};

export const setFlatFilters = filters => dispatch => {
  dispatch({ type: SET_FLAT_FILTERS, filters });
};
