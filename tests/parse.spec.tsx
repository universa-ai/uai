import { expect, test } from "bun:test";
import parseJSXInput from "../src/parseJSXInput";

test("parseJSXInput", async () => {
  const input = (
    <>
      <output
        path="path/to/output"
        branch="main"
        content="contentTag"
        commit="commitTag"
      />
      <temperature value="0.5" />
      <temperature value="0.9" />
      <system>
        <info>
          You are agent.
        </info>
        <details>
          <file path="./tests/test.txt" />
        </details>
      </system>
      <user>
        User message
        <file path="./tests/test.txt" wrap name="test" />
        <file path="./tests/test.txt" ignore />
        <fragment>
          <fun_fact>
            first fragment
          </fun_fact>
        </fragment>
        End of message
      </user>
      <assistant>Assistant message</assistant>
    </>
  );

  const result = await parseJSXInput(input);
  console.log(result);

  expect(result.outputPath).toBe("path/to/output");
  expect(result.outputBranch).toBe("main");
  expect(result.contentTag).toBe("contentTag");
  expect(result.commitTag).toBe("commitTag");
  // expect(result.temperatures).toEqual([0.5, 0.9]);

  expect(result.messages.length).toBe(3);
  expect(result.messages[0]).toEqual({
    role: "system",
    content:
      "<info>\nYou are agent.\n</info>\n<details>\n<file>\n<InsideOfFile>\n  Test File\n</InsideOfFile>\n</file>\n\n</details>",
  });
  expect(result.messages[1]).toEqual({
    role: "user",
    content:
      'User message<file name="test">\n```txt\n<InsideOfFile>\n  Test File\n</InsideOfFile>\n\n```\n</file>\n<fun_fact>\nfirst fragment\n</fun_fact>\nEnd of message',
  });
});
