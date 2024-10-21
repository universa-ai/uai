const rewriter = new HTMLRewriter();

rewriter.on("*", {
  element(el) {
    console.log(el.text); // "body" | "div" | ...
  },
});

const it = rewriter.transform(
  new Response(Bun.file("/Users/gur/.uai/oct28-example.jsx")),
);

console.debug(1730087332, JSON.stringify(await it.text(), null, 2));
