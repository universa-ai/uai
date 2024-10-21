import prompt from "/Users/gur/Documents/uai/src/uai.ts";

export default async function (originalQuery, targetPath) {
  // console.debug(1730397132, originalQuery)
  // 	return;

  const generatedTasks = await prompt(
    <>
      <output content="taskResponse" />
      <settings temperature={0.1330} model="gpt-4o" />
      <system>
        <instruction>
          You are prompt engineer, based on user query, provide a several prompts for different agents attempting to
          answer user query. Provide detailed instructions on answering that particular questions, describing the level
          of details, tone and etc accordingly to each agent.
        </instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          <taskResponse>
            <variations>
              <kidAgent>
                a prompt instructing agent to make 5years-old-like explanation with usage of analogies
              </kidAgent>
              <adultAgent>
                a prompt instructing agent to make an article appropriate for blogging audience
              </adultAgent>
              <professorAgent>
                a prompt instructing agent to make a deeply technical explanation for academics with usage of relevant
                formulas and code snippets
              </professorAgent>
            </variations>
          </taskResponse>
        </responseFormat>
      </system>
      <user>
        {originalQuery}
      </user>
    </>,
  );
  console.debug(1730276805, generatedTasks.length);

  // const [conservativeTemperature, creativeTemperature] = generateTuple();

  return Promise.all([
    [0.3, generatedTasks.professorAgent],
    [0.6, generatedTasks.adultAgent],
    [0.9, generatedTasks.kidAgent],
  ].map(([temperature, individualizedTask]) =>
    prompt(
      <>
        <output
          path={targetPath}
          branch="uai"
          commit="thinking"
          content="markdownFormattedFinalAnswer"
        />
        <settings temperature={temperature} model="gpt-4o" />
        <system>
          <instruction>
            You complete user task and provided a response in expected format.
          </instruction>
          <responseFormat>
            <thinking>THINK carefully before responding.</thinking>
            <markdownFormattedFinalAnswer>
              A complete answer to user query accordingly to your instructions formatted in markdown.
            </markdownFormattedFinalAnswer>
          </responseFormat>
        </system>
        <user>
          {individualizedTask}
        </user>
      </>,
    )
  ));
}
