import { getFlats as getFlatsFromApi } from "../services/WohnungScraperApi";

export const GET_FLATS = "GET_FLATS";
export const GET_FLATS_SUCCESS = "GET_FLATS_SUCCESS";
export const GET_FLATS_FAILURE = "GET_FLATS_FAILURE";

export const getFlats = () => {
    return async dispatch => {
        dispatch({ type: GET_FLATS });

        try {
            const flats = await getFlatsFromApi();

            dispatch({ type: GET_FLATS_SUCCESS, flats });
        } catch (error) {
            dispatch({ type: GET_FLATS_FAILURE, error });
        }
    };
};
