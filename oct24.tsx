const transpiler = new Bun.Transpiler({ loader: "jsx" });
const result = await transpiler.transform("<div>first</div>");
console.debug(1729756235, result);
