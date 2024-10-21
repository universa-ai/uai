import executePrompt from "/Users/gur/Documents/uai/src/uai.ts";

import workflow from "../src/workflow.ts";

export default workflow(async function (originalTask, targetPath) {
  const prompts = [0.1, 0.3, 0.5].map((temperature) => (
    <>
      <output
        path={targetPath}
        branch="uai"
        commit="thinking"
        content="finalCode"
      />
      <settings temperature={temperature} model="gpt-4o" />
      <system>
        <instruction>Analyze task given by user and respond following the format.</instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <finalCode>A new fully functional version of code.</finalCode>
        </responseFormat>
      </system>
      <user>
        {originalTask}
      </user>
    </>
  ));

  const result = await Promise.all(prompts.map(executePrompt));

  return result;
});
