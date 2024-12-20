// @ts-nocheck

import { basename, join } from "path";

import executePrompt from "../src/uai.ts";

const outputPath = process.argv[2];
const fileName = basename(outputPath);

const typesPath = join(process.cwd(), "src/types/server.d.ts");
console.log("typesPath ==> ", typesPath);
const typesFileExists = await Bun.file(typesPath).exists();
console.log("typesFileExists ==> ", typesFileExists, );

function generateTemperatures() {
  const secondDecimal = Math.floor(Math.random() * 9) + 1;
  const firstDecimal1 = Math.floor(Math.random() * 9) + 1;
  let firstDecimal2;
  do {
    firstDecimal2 = Math.floor(Math.random() * 9) + 1;
  } while (firstDecimal2 === firstDecimal1);
  return [
    parseFloat(`0.${firstDecimal1}${secondDecimal}`),
    parseFloat(`0.${firstDecimal2}${secondDecimal}`)
  ];
}

const temperatures = generateTemperatures();

const prompts = temperatures.map((temperature) => (
  <>
    <output
      path={outputPath}
      branch="uai"
      commit="thinking"
      content="finalResponse"
    />
    <settings temperature={temperature} model="gpt-4o" enablesPrediction={true} />
    <system>
      <instruction>Rewrite {fileName} by following all "todo" comments and completing the tasks.</instruction>
      <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <finalResponse>
              Complete contents of {fileName} file.
          </finalResponse>
      </responseFormat>
    </system>
    <user>
      <context>
        <document wrap name={fileName} path={outputPath} />
        <document wrap name="types.d.ts" path={typesPath} ignore={!typesFileExists} />
      </context>
    </user>
  </>
));
console.debug(1733130243, prompts);

await Promise.all(prompts.map(executePrompt));

console.log("Congratulations! The prompts have been successfully executed with the following temperatures:", temperatures);