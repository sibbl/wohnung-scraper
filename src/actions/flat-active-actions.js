import { setActiveFlat as setActiveFlatFromApi } from "../services/WohnungScraperApi";

export const SET_ACTIVE_FLAT = "SET_ACTIVE_FLAT";
export const SET_ACTIVE_FLAT_SUCCESS = "SET_ACTIVE_FLAT_SUCCESS";
export const SET_ACTIVE_FLAT_FAILURE = "SET_ACTIVE_FLAT_FAILURE";

export const setActiveFlat = ({ flat, active = true }) => {
  return async dispatch => {
    dispatch({ type: SET_ACTIVE_FLAT });

    try {
      const { success, message, details } = await setActiveFlatFromApi({
        id: flat.id,
        active
      });

      if (success === true) {
        dispatch({ type: SET_ACTIVE_FLAT_SUCCESS, flat, active });
      } else {
        dispatch({ type: SET_ACTIVE_FLAT_FAILURE, error: message, details });
      }
    } catch (error) {
      dispatch({ type: SET_ACTIVE_FLAT_FAILURE, error });
    }
  };
};
