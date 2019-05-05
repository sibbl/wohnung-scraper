import { combineReducers } from "redux";

import { configReducer } from "./config-reducer";
import { flatReducer } from "./flat-reducer";
import { flatFavoriteReducer } from "./flat-favorite-reducer";
import { flatActiveReducer } from "./flat-active-reducer";

const reducers = combineReducers({
  config: configReducer,
  flat: flatReducer,
  flatActive: flatActiveReducer,
  flatFavorite: flatFavoriteReducer
});
export default reducers;
