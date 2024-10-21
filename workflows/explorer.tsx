import executePrompt from "/Users/gur/Documents/uai/src/uai.ts";
import workflow from "../src/workflow.ts";

export default workflow(async function (userMessage, outputPath) {
  const prompt = (
    <fragment>
      <output content="finalResponse" />
      <settings temperature={0.0} model="gpt-4o" />
      <system>
        <instruction>
          Given user query, you have to consider what information you might be missing to make a correct answer, and
          describe the details of missing information
        </instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <finalResponse>
            <missingTerm />
            <missingAssumptions />
            <missingKnowledge />
          </finalResponse>
        </responseFormat>
      </system>
      <user>
        {userMessage}
      </user>
    </fragment>
  );

  const response = await executePrompt(prompt);

  console.debug(1730787802, response);

  return response;
});

// another one two-layered prompt but here we execute some web search to clarify first information unknown as we figured out in first case
