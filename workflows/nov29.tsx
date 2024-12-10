import executePrompt from "/Users/gur/Documents/uai/src/uai.ts";
import workflow from "../src/workflow.ts";

export default workflow(async function threeWriters(userMessage, outputPath, opts) {
  // Destructure with default values
  let {
    temperatures = [0.1],
    documents = [],
    shells = [],
    task = "",
    avoids = [],
    embraces = [],
    fileName = "",
    formatFields = [],
    thoughts = [],
    prediction,
  } = opts;

    console.debug(1733132392, avoids, embraces, documents, shells)

  // Ensure temperatures is an array
  if (!Array.isArray(temperatures) || temperatures.length === 0) {
    temperatures = [0.1];
  }

  const tagsOfFormatFields = formatFields.map(it => {
                const TagName = it.tagName;
                return <TagName>{it.fieldDescription}</TagName>;
              })

  const renderDocuments = () => {
    if (documents.length === 0) return null;
    return documents.map((it) => (
      <document wrap description={it.description} path={it.path} />
    ));
  };

  const renderShells = () => {
    if (shells.length === 0) return null;
    return shells.map((it) => (
      <command label={it.label} shell={it.shell} />
    ));
  };

  const renderAvoids = () => {
    if (avoids.length === 0) return null;
    return (
      <avoidTheseExpressions>
        {avoids.map(it => (
          <fragment>
            <expr>{it.expr}</expr>
            <reason>{it.reason}</reason>
          </fragment>
        ))}
      </avoidTheseExpressions>
    );
  };

  const renderEmbraces = () => {
    if (embraces.length === 0) return null;
    return (
      <embraceThose>
        {embraces.map(it => (
          <fragment>
            <expr>{it.expr}</expr>
            <reason>{it.reason}</reason>
          </fragment>
        ))}
      </embraceThose>
    );
  };

  const renderThoughts = () => {
    if (thoughts.length === 0) return null;
    return (
      <thoughts>
        {thoughts.map(it => (
<thought>
            <good>{it.good}</good>
            <bad>{it.bad}</bad>
            {it.reason ? <reason>{it.reason}</reason> : null}
            </thought>
        )}
      </thoughts>
    )
  }

  const prompts = temperatures.map((temperature) => (
    <>
      <output
        path={outputPath}
        branch="uai"
        commit="thinking"
        content="finalResponse"
      />
      <settings temperature={temperature} model="gpt-4o" enablesPrediction={prediction} />
      <system>
        <instruction>Complete user task and respond in following format.</instruction>
        <responseFormat>
          <thinking>THINK carefully before responding.</thinking>
          {fileName ? (
            <finalResponse>
              Complete contents of {fileName} file.
            </finalResponse>
          ) : (
            <requiredFields>
              {tagsOfFormatFields}
            </requiredFields>
          )}
        </responseFormat>
      </system>
      <user>
        <context>
          {renderDocuments()}
          {renderShells()}
        </context>
        <rules>
          {renderAvoids()}
          {renderEmbraces()}
        </rules>
        <task>{task}</task>
        {renderThoughts()}
      </user>
    </>
  ));
console.debug(1733130243, prompts)

  try {
    const result = await Promise.all(prompts.map(executePrompt));
    return result;
  } catch (error) {
    console.error("Error executing prompts:", error);
    throw error; // Re-throw the error after logging
  }
});
