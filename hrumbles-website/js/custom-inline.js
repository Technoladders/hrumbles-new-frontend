// This file combines the inline scripts from the original HTML

// 1. WebFont Loader configuration
WebFont.load({
  google: { families: ["Fraunces:700", "Chakra Petch:700"] },
});

// 2. Webflow feature detection script
!(function (o, c) {
  var n = c.documentElement,
    t = " w-mod-";
  (n.className += t + "js"),
    ("ontouchstart" in o ||
      (o.DocumentTouch && c instanceof DocumentTouch)) &&
      (n.className += t + "touch");
})(window, document);