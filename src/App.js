import React from "react";
import GlobalStyles from "./styles/global-styles";
import FlatVisualizationContainer from "./containers/flat-visualization-container";

const App = () => {
  return (
    <React.Fragment>
      <GlobalStyles />
      <FlatVisualizationContainer />
    </React.Fragment>
  );
};
export default App;
