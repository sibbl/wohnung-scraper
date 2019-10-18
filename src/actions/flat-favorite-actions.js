import { setFavoriteFlat as setFavoriteFlatFromApi } from "../services/WohnungScraperApi";

export const SET_FAVORITE_FLAT = "SET_FAVORITE_FLAT";
export const SET_FAVORITE_FLAT_SUCCESS = "SET_FAVORITE_FLAT_SUCCESS";
export const SET_FAVORITE_FLAT_FAILURE = "SET_FAVORITE_FLAT_FAILURE";

export const setFavoriteFlat = ({ flatId, favorite = true }) => {
  return async dispatch => {
    dispatch({ type: SET_FAVORITE_FLAT });

    try {
      const { success, message, details } = await setFavoriteFlatFromApi({
        id: flatId,
        favorite
      });

      if (success === true) {
        dispatch({ type: SET_FAVORITE_FLAT_SUCCESS, flatId, favorite });
      } else {
        dispatch({ type: SET_FAVORITE_FLAT_FAILURE, error: message, details });
      }
    } catch (error) {
      console.error(error);
      dispatch({ type: SET_FAVORITE_FLAT_FAILURE, error });
    }
  };
};
