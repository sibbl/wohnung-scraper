let config;

const getConfig = async newConfig => {
  if (config) {
    return config;
  }
  if (typeof newConfig === "function") {
    newConfig = newConfig();
  }
  config = await Promise.resolve(newConfig);
  return config;
};

module.exports = getConfig;
