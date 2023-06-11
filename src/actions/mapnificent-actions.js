export const SET_MAPNIFICENT_ENABLED = "SET_MAPNIFICENT_ENABLED";
export const SET_MAPNIFICENT_DURATION = "SET_MAPNIFICENT_DURATION";

export const setMapnificentEnabled = ({ isEnabled }) => {
  return async (dispatch) => {
    dispatch({ type: SET_MAPNIFICENT_ENABLED, isEnabled });
  };
};
export const setMapnificentDuration = ({ duration }) => {
  return async (dispatch) => {
    dispatch({ type: SET_MAPNIFICENT_DURATION, duration });
  };
};
