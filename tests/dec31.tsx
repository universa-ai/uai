import Query from "../src/query.tsx";

const question = "did you get what you like yesterday?";

const tweets = [{ id: 1, text: "i was at restaurant X", date: new Date() }, { text: "weather is Z" }, {
  text: "i like to eat Y",
}];

const agentName = "agent-name";

for (const it of tweets) {
  const xit = await Query.from(it, "gpt-4o-mini").embedHypothetical({
    question: "which question this tweet response might be answering",
  }, {
    qaId: it.id,
    partitionKey: agentName,
  }, {
    id: true,
  });
  console.debug(1735583109, xit);
}

const relevantTweets = await Query.from({
  question,
}).recall({
  limit: 2,
  partition_key: agentName,
});
console.debug(1735583084, relevantTweets);

const result = await Query.from({
  question,
  relevantTweets,
}).infer({
  answer: "",
  success: "TRUE or FALSE whether question was appropriate",
});
console.debug(1735583094, result);

if (!result.success) throw "spam detected because " + result.thinking;

const { answer } = result;
console.debug(1735582414, answer);
