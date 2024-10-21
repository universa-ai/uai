import prompt from "/Users/gur/Documents/uai/src/uai.ts";
import { generateTuple } from "/Users/gur/Documents/uai/src/utils.ts";

import workflow from "../src/workflow.ts";

export default workflow(threeWriters);

async function threeWriters(originalTask, targetPath) {
  // prompt engineer is kinda of spawning agents with tailored system prompt on demand instead of choosing existing one

  const generatedTasks = await prompt(
    <>
      <output content="variations" />
      <settings temperature={0.3} model="gpt-4o" />
      <system>
        <instruction>
          You are prompt engineer, given a user query, you have to write three specific tailored system agent job
          descriptions for three independent developers, to ensure they will complete user query in correspondance to
          their personality you should give them each corresponding rules in the context of user query. every variation
          should start with "You are", then describe specific rules, and ask to pay attention to specific parts of user
          query. Importantly, you must analyze task given by user and as well analyze current codebase, to construct the
          rules tailored to current task and codebase in unique way, specifying which pieces should remain the same and
          what exactly must be changed to fulfill user query.
        </instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <finalResponseWrapper>
            <variations>
              <writtenByConservativeDeveloper>
                trying to persist existing structure of code, not break but fix things, focused on clarity and cleanless
                of small details rather than big picture, ensuring logical correctness of all code and adding invariants
                whenever unsure
              </writtenByConservativeDeveloper>
              <writtenByArchitectDeveloper>
                focused on overall architecture and trying to apply best practices and software design patterns,
                applying as many design patterns as it makes sense
              </writtenByArchitectDeveloper>
              <writtenByCreativeDeveloper>
                exploring new better ideas and approaches, can change things solve problem from different angle, use
                emoji and fun comments in code, etc
              </writtenByCreativeDeveloper>
            </variations>
          </finalResponseWrapper>
        </responseFormat>
      </system>
      <user>
        {originalTask}
      </user>
    </>,
  );
  console.debug(1730276805, generatedTasks);

  const [conservativeTemperature, creativeTemperature] = generateTuple();
  const architectTemperature = Number.parseFloat(conservativeTemperature + 0.7)
    .toFixed(2);

  const agents = [];

  if (generatedTasks.writtenByConservativeDeveloper) {
    agents.push(
      [conservativeTemperature, generatedTasks.writtenByConservativeDeveloper],
    );
  }

  if (generatedTasks.writtenByCreativeDeveloper) {
    agents.push(
      [creativeTemperature, generatedTasks.writtenByCreativeDeveloper],
    );
  }

  if (generatedTasks.writtenByCreativeDeveloper) {
    agents.push(
      [architectTemperature, generatedTasks.writtenByArchitectDeveloper],
    );
  }

  console.debug(1730909901, agents);

  const nextPrompts = agents.map(([temperature, individualizedTask]) => (
    <>
      <output
        path={targetPath}
        branch="uai"
        commit="thinking"
        content="finalCode"
      />
      <settings temperature={temperature} model="gpt-4o" />
      <system>
        <instruction>{individualizedTask}</instruction>
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

  console.debug(1730909298, nextPrompts);

  const result = await Promise.all(nextPrompts.map(prompt));

  return result;
}
