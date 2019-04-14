module.exports = (scraperList) => async (scraperFuncName) => {
    console.log(`Run cron: ${scraperFuncName} (${new Date().toISOString()})`);
    for(let s of scraperList) {
      await s[scraperFuncName]();
    }
};