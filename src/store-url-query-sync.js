import ReduxQuerySync from "redux-query-sync";
import { setSelectedFlat } from "./actions/flat-actions";

export default store => {
  ReduxQuerySync({
    store,
    params: {
      id: {
        selector: state => state.flat.selectedFlatId,
        action: value => setSelectedFlat({ flatId: value }),
        stringToValue: string => Number.parseInt(string) || 1,
        valueToString: value => `${value}`,
        defaultValue: null
      }
    },
    initialTruth: "location"
  });
};
