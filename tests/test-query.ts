import Query from "../src/query";

const token = {
  "mint": "5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp",
  "name": "michi",
  "symbol": "$michi",
  "description": "The most memeable cat on Internet",
};

const query = await Query.from({
  name: token.name,
  symbol: token.symbol,
  description: token.description,
}, "gpt-4o-mini").embedHypothetical({
  "ideaDescription":
    "imagine which one-phrase description might have been provided in order to generate token details shown in a context",
}, {
  "partitionKey": "test-token",
});
console.log("query ==> ", query);

const newQuery = await Query.from({
  ideaDescription: "cat token",
}, "gpt-4o-mini").infer({
  inputIsGood: "TRUE or FALSE",
  name: "String, up to three words",
  symbol: "String, one word in capital case",
  description: "String, controversial introduction highlighting significant importance of token",
}, "test-token");
console.log("newQuery ==> ", newQuery);
