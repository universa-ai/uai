# UAI: Unified AI Library

## Introduction

The Unified AI Library (UAI) is a tool that helps you interact with large language models. It uses a simple syntax
similar to JSX, which is often used in JavaScript. This makes it easier to create prompts and get structured responses
from AI models.

## Installation

Ready to start your adventure with UAI? First, clone the repository using your trusty terminal:

```bash
git clone https://github.com/universa-ai/uai
```

## Core Concepts

UAI introduces several core concepts that enhance its functionality and usability:

1. **JSX-like Syntax for Prompts:**
   - UAI allows developers to write prompts using a syntax similar to JSX, which is a syntax extension for JavaScript
     commonly used with React. This approach improves the readability and structure of prompts, making them easier for
     language models to interpret.

2. **Configuration via Builder Pattern:**
   - Developers can configure prompts directly within the JSX-like syntax or encapsulate configurations using the
     builder pattern. This pattern provides a flexible and reusable way to construct complex workflows.

3. **Special Tags:**
   - UAI utilizes special tags to define different components of a prompt:
     - `<output>`: Specifies the desired output format or location. Attributes include `content` for specifying the
       output variable, `path` for file location, `branch` for Git branch, and `commit` for commit messages.
     - `<settings>`: Configures model parameters such as `temperature` and `model`. These attributes control the
       randomness and the specific AI model used.
     - `<system>`, `<user>`, `<assistant>`: These tags are transformed into messages that guide the AI's behavior. They
       encapsulate instructions, user inputs, and assistant responses, respectively.

4. **Structured Response Handling:**
   - UAI can return structured responses in JSON format or write responses to a file, automatically committing changes
     to a specified Git branch. This feature ensures that outputs are organized and version-controlled.

5. **Parallel Execution and Race Condition Prevention:**
   - UAI supports the execution of multiple prompts in parallel, writing to the same file without encountering race
     conditions. This capability is crucial for applications requiring high concurrency.

## Example: Creating a Structured Response

Here's a simple example of how to use UAI to get a structured response:

```jsx
const { default: prompt } = await import("uai/src/uai.ts");

const result = await prompt(
  <>
    <output content="projectDetails" />
    <settings temperature={0.3} model="gpt-4o" />
    <system>
      <instruction>
        You are a project manager. Provide a response in the specified format.
      </instruction>
      <responseFormat>
        <thinking>THINK carefully before responding.</thinking>
        <projectDetails>
          <title>Project title</title>
          <codeName>Code name</codeName>
          <overview>Project overview</overview>
          <objective>Project objective</objective>
        </projectDetails>
      </responseFormat>
      <example>
        <title>Green Energy Initiative</title>
        <codeName>GREENPOWER</codeName>
        <overview>Developing sustainable energy solutions.</overview>
        <objective>Reduce carbon emissions by 30%.</objective>
      </example>
    </system>
    <user>
      {data.projectDescription}
    </user>
  </>,
);

if (!result.title || !result.codeName || !result.overview || !result.objective) {
  throw new Error("Missing response fields");
}
```

- **`<output>`**: Defines where the output should be stored. The `content` attribute specifies the which tags should be
  extracted from response.
- **`<settings>`**: Configures the AI model's parameters. The `temperature` attribute controls the randomness of the
  model's responses, while the `model` attribute specifies which AI model to use.
- **`<system>`**: Create a new systme message.
- **`<user>`**: Create a new user message.

## Git Integration

You can save responses directly to files managed by Git. Change the `<output>` tag like this:

```jsx
<output
  path={outputPath}
  branch="uai"
  commit="thinking"
  content="finalResponse"
/>;
```

- **`path`**: Specifies the file path where the output will be written.
- **`branch`**: Indicates the Git branch to which changes will be committed.
- **`commit`**: Specifies a tag in response which contains a commit message for the changes.
- **`content`**: Specifies a tag in response which contains content to be written.

## Advanced Usage: Dynamic JSX Expressions

You can use dynamic expressions in JSX to create prompts:

```jsx
const prompts = temperatures.map((temperature) => (
  <>
    <output
      path={outputPath}
      branch="uai"
      commit="thinking"
      content="finalResponse"
    />
    <settings temperature={temperature} model="gpt-4o" />
    <system>
      <instruction>Complete the user task.</instruction>
      <responseFormat>
        <thinking>THINK carefully before responding.</thinking>
        {fileName
          ? (
            <finalResponse>
              Complete contents of {fileName} file.
            </finalResponse>
          )
          : (
            <requiredFields>
              {tagsOfFormatFields}
            </requiredFields>
          )}
      </responseFormat>
    </system>
    <user>
      <context>
        {renderDocuments()}
      </context>
      <rules>
        {renderAvoids()}
        {renderEmbraces()}
      </rules>
      <task>{task}</task>
    </user>
  </>
));
```

## Chaining and Parallel Execution

You can chain multiple prompts and run them in parallel:

```jsx
const generatedTasks = await prompt(
  <>
    <output content="taskVariations" />
    <settings temperature={0.3} model="gpt-4o" />
    <system>
      <instruction>
        Generate three distinct task descriptions.
      </instruction>
      <responseFormat>
        <thinking>THINK carefully before responding.</thinking>
        <taskVariations>
          <conservativeApproach>Focus on clarity.</conservativeApproach>
          <architecturalApproach>Focus on design patterns.</architecturalApproach>
          <creativeApproach>Encourage innovation.</creativeApproach>
        </taskVariations>
      </responseFormat>
    </system>
    <user>
      {initialTask}
    </user>
  </>,
);

const [conservativeTemp, creativeTemp] = generateTemperatureTuple();
const architecturalTemp = Number.parseFloat(conservativeTemp + 0.7).toFixed(2);

const taskAgents = [];

if (generatedTasks.conservativeApproach) {
  taskAgents.push(
    [conservativeTemp, generatedTasks.conservativeApproach],
  );
}

if (generatedTasks.creativeApproach) {
  taskAgents.push(
    [creativeTemp, generatedTasks.creativeApproach],
  );
}

if (generatedTasks.architecturalApproach) {
  taskAgents.push(
    [architecturalTemp, generatedTasks.architecturalApproach],
  );
}

const subsequentPrompts = taskAgents.map(([temperature, task]) => (
  <>
    <output
      path={targetPath}
      branch="uai"
      commit="thinking"
      content="finalCode"
    />
    <settings temperature={temperature} model="gpt-4o" />
    <system>
      <instruction>{task}</instruction>
      <responseFormat>
        <thinking>THINK carefully before responding.</thinking>
        <finalCode>A fully functional code version.</finalCode>
      </responseFormat>
    </system>
    <user>
      {initialTask}
    </user>
  </>
));

const results = await Promise.all(subsequentPrompts.map(prompt));
```

## Creating Workflows

You can create reusable workflows with UAI. Here's an example:

```javascript
import workflow from "../src/workflow.ts";
import executePrompt from "../src/uai.ts";

export default workflow(async function threeWriters(userMessage, outputPath, opts) {
  let {
    temperatures = [0.1],
    documents = [],
    task = "",
    avoids = [],
    embraces = [],
    fileName = "",
    formatFields = []
  } = opts;
}
```

Check the `workflows` directory for more examples and create your own workflows by following this pattern.

## Running Workflows

```javascript
import workflow from "uai/workflows/sampleWorkflow";

const projectRoot = `$HOME/Documents/project`;

const generatedPrompts = await workflow()
  .withDocument(`${projectRoot}/MainApp.tsx`, "App.tsx")
  .withTask("enhance current application")
  .withTemperature(0.08)
  .respond({
    conservativePrompt:
      "Create a system prompt for an agent to methodically improve the application by addressing existing issues.",
    architectPrompt:
      "Create a system prompt for an agent to fundamentally enhance the application as an architectural developer.",
    creativePrompt: "Create a system prompt for an agent to creatively enhance the application.",
  });
console.debug("Generated Prompts:", generatedPrompts);

const temperatures = { creativePrompt: 0.88, architectPrompt: 0.55, conservativePrompt: 0.22 };

for (const promptType of ["conservativePrompt"]) {
  workflow().withTask(`${generatedPrompts[0][promptType]}`).withDocument(`${projectRoot}/MainApp.tsx`, "App.tsx")
    .withTemperature(temperatures[promptType])
    .embrace("flex-1 flex flex-col overflow-x-hidden", "main section class")
    .avoid("")
    .writeTo(`${projectRoot}/MainApp.tsx`);
}
```

This workflow generates prompts and executes tasks using the builder pattern's `respond` and `writeTo` methods.

## Embedding Files and Commands

```jsx
import executePrompt from "/Users/gur/Documents/uai/src/uai.ts";

await Promise.all(
  [0.1, 0.5].map((temp) => (
    <>
      <output path={outputPath} branch="uai" />
      <settings temperature={temp} model="gpt-4o" />
      <system>
        <instruction>Write a commit message based on diff.</instruction>
        <responseFormat>
          <response>
            <thinking>THINK carefully before responding.</thinking>
            <commitTitle>
              a single sentence semantic commit title with emoji
            </commitTitle>
            <commitDescription>
              a few paragraphs to describe commit changes, should mention image support, optional support for prediction
              field etc
            </commitDescription>
          </response>
        </responseFormat>
      </system>
      <user>
        <context>
          <document wrap description="current script" path={currentScriptPath} />
        </context>
        <changesDiff shell="cd $HOME/Documents/uai && git diff --staged" />
        <changesDiff ignore shell="cd $HOME/Documents/uai && git diff HEAD^" />
      </user>
    </>
  )).map(executePrompt),
);
```

In this example, we use "changesDiff" and "document" as tags to help the AI understand the content. The "path" attribute
adds file content as plain text, and the "shell" attribute runs code and embeds the result. The "ignore" attribute skips
the tag, and "wrap" adds backticks around content.

Running same prompt with multiple temperatures allows you to compare results and merge best parts of each.

## Watcher

The watcher runs prompts automatically when files change:

```bash
bun run watcher.ts ~/my-prompts
```

When you save a file in the watched directory, it runs the prompt and processes the result.

## Images Support

```tsx
import workflow from "uai/workflows/threeTemps";

await workflow(
  <fragment>
    <file wrap description="our App.tsx" path={appPath} />
    <file description="target design" path={designPath} />
    <task>rewrite our App to ensure layout similar to our target design</task>
  </fragment>,
)
  .writeTo(appPath);
```

If the "path" attribute points to an image, it adds the image to the prompt as a new message. Use "label" or
"description" to add text with the image.

## Prediction Optimization

UAI can optimize predictions by adjusting settings and configurations to improve response accuracy and relevance.
