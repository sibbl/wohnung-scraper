import { combineReducers } from "redux";

import { configReducer } from "./config-reducer";
import { flatReducer } from "./flat-reducer";

const reducers = combineReducers({
  config: configReducer,
  flat: flatReducer
});
export default reducers;
