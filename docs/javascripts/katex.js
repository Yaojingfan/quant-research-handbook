/* KaTeX rendering for MkDocs Material + pymdownx.arithmatex (generic).
 * Must load AFTER katex.min.js and auto-render.min.js.
 * Uses document$ so formulas re-render under navigation.instant.
 */
(function () {
  var options = {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
      // Keep $ last; avoid matching currency when possible
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
    strict: "ignore",
  };

  function render(root) {
    if (typeof renderMathInElement !== "function") return;
    renderMathInElement(root || document.body, options);
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(function () {
      render(document.body);
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      render(document.body);
    });
  } else {
    render(document.body);
  }
})();
