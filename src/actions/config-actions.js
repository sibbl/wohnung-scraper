import { getConfig as getConfigFromApi } from "../services/WohnungScraperApi";

export const GET_CONFIG = "GET_CONFIG";
export const GET_CONFIG_SUCCESS = "GET_CONFIG_SUCCESS";
export const GET_CONFIG_FAILURE = "GET_CONFIG_FAILURE";

export const getConfig = () => {
    return async dispatch => {
        dispatch({ type: GET_CONFIG });

        try {
            const config = await getConfigFromApi();

            dispatch({ type: GET_CONFIG_SUCCESS, config });
        } catch (error) {
            console.error(error);
            dispatch({ type: GET_CONFIG_FAILURE, error });
        }
    };
};
