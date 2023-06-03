import { produce } from "immer";
import {
  SET_MAPNIFICENT_ENABLED,
  SET_MAPNIFICENT_DURATION
} from "../actions/mapnificent-actions";

const initialState = {
  isEnabled: true,
  duration: 30
};

export const mapnificentReducer = (state = initialState, action) => {
  return produce(state, (draftState) => {
    switch (action.type) {
      case SET_MAPNIFICENT_ENABLED:
        draftState.isEnabled = action.isEnabled;
        return;

      case SET_MAPNIFICENT_DURATION:
        draftState.duration = action.duration;
        return;

      default:
        return;
    }
  });
};
