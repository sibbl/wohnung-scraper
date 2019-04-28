import { useState, useEffect } from "react";

export const useApiData = (loadFunction, initialValue = null) => {
  const [data, setData] = useState(initialValue);

  useEffect(() => {
    (async () => {
      const { data } = await loadFunction();
      setData(data);
    })();
  }, []);

  return data;
};
