import React, { useEffect, useState } from "react";
import { loadFlatData, loadConfig } from "./api";
import { ConfigContext } from "./contexts/config-context";
import { FlatDataContext } from "./contexts/flat-data-context";
import { FlatVisualization } from "./components/flat-visualization";
import { LoadingView } from "./components/loading-view";
import { useApiData } from "./hooks/use-api-data";

const App = () => {
  const flatData = useApiData(loadFlatData);
  const config = useApiData(loadConfig);

  return (
    <ConfigContext.Provider value={config}>
      <FlatDataContext.Provider value={flatData}>
        {flatData && config ? <FlatVisualization /> : <LoadingView />}
      </FlatDataContext.Provider>
    </ConfigContext.Provider>
  );
};
export default App;
