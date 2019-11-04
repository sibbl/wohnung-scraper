module.exports = {
  Default: {
    name: "Stamen",
    layerOptions: {
      subdomains: ["", "a.", "b.", "c.", "d."],
      detectRetina: true,
      attribution:
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>'
    },
    url: "http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png",
    type: "xyz"
  }
};
