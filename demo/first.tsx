// @ts-nocheck

import prompt from "../src/uai";

async function getWeatherRecommendation(city: string) {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=62.0355&longitude=129.6755&current_weather=true');
    const data = await response.json();
    const temperature = `Temperature is ${data.current_weather.temperature}`;
    console.log("temperature ==> ", temperature);

    const weather = <>
        <settings temperature={0.5} enablesPrediction={false} />
        <system>
            <instruction>
                You are weather assistant helpful to give advice based on current weather.
            </instruction>
            <responseFields>
                <recommendationForPicnic>Describe what to wear for picnic</recommendationForPicnic>
                <recommendationForSport>Describe what to wear for sport</recommendationForSport>
            </responseFields>
        </system>
        <user>
            <myCity>
                {city}
            </myCity>
            <cityTemperature>
                {temperature}
            </cityTemperature>
        </user>
    </>

    const responsePrompt = await prompt(weather);
    console.log("response ==> ", responsePrompt);

    const { recommendationForPicnic } = responsePrompt;
    console.log("recommendationForPicnic ==> ", recommendationForPicnic);

    return recommendationForPicnic;
}

await getWeatherRecommendation()