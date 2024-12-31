// @ts-nocheck

import prompt from "../src/uai";
import Query from "../src/query";

const temperature = `-48`;
const city = "Yakutsk";

const result = await Query.from({
    city, temperature
}).infer({
    recommendations: 'String, recommended sightsights to view now',
});

console.log("result ==> ", result);

await getWeatherRecommendation()