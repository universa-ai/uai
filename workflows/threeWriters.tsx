import executePrompt from "/Users/gur/Documents/uai/src/uai.ts";
import workflow from "../src/workflow.ts";

export default workflow(threeWriters);

async function threeWriters(userMessage, outputPath) {
  const promptEngineer = (
    <fragment>
      <output content="finalResponse" />
      <settings temperature={0.0} model="gpt-4o" />
      <system>
        <instruction>
          As a prompt engineer, write a three set of writing rules tailored for three independent content writers,
          instructing them to complete the task given by user accordingly to their each style.
        </instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <finalResponse>
            <variations>
              <conservativeWriter>
                he should write in more technical and precise language, focused on clarity and avoidance of mistakes
              </conservativeWriter>
              <creativeWriter>
                he should express the idea in more unpredictable manner, using emoji and analogies, focused more to
                captivate reader attention, and less afraid to make mistakes
              </creativeWriter>
              <easyWriter>
                he should write using very simple words and minimal structure of each sentence, avoid applying
                non-necessary epitetes, to ensure every non-native speaker can understand the text as well
              </easyWriter>
            </variations>
          </finalResponse>
        </responseFormat>
      </system>
      <user>
        {userMessage}
      </user>
    </fragment>
  );

  console.debug(1730637750, promptEngineer);

  const agents = await executePrompt(promptEngineer);

  console.debug(1730630541, agents);

  const temperatures = {};
  temperatures.creative = Number.parseFloat(
    (Math.floor(Math.random() * 9) + 1) / 10,
  ).toFixed(3);
  temperatures.conservative = Number.parseFloat(temperatures.creative / 10)
    .toFixed(3);
  temperatures.easy = Number.parseFloat(temperatures.conservative / 10).toFixed(
    3,
  );

  console.debug(1730631070, temperatures);

  const prompts = [
    [temperatures.conservative, agents.conservativeWriter],
    [temperatures.creative, agents.creativeWriter],
    [temperatures.easy, agents.easyWriter],
  ].map(([temperature, rules]) => (
    <>
      <output
        path={outputPath}
        branch="uai"
        commit="thinking"
        content="finalResponse"
      />
      <settings temperature={temperature} model="gpt-4o" />
      <system>
        <instruction>{rules}</instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <finalResponse>
            A required wrapper containing the actual response contents.
          </finalResponse>
        </responseFormat>
      </system>
      <user>
        {userMessage}
      </user>
    </>
  ));

  console.debug(1730631145, prompts);

  const result = await Promise.all(prompts.map(executePrompt));

  console.debug(1730631201, result);

  return result;
}
