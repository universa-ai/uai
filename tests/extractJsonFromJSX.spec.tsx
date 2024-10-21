import { expect, test } from "bun:test";
import extractJsonFromJSX from "../src/extractJsonFromJSX";

test("extractJsonFromJSX", async () => {
  const input = `<responseFormatting>
	<responseWrapper>
	<turnResult>
	<firstCharacterTurnPerspective>

	TextOne.
	</firstCharacterTurnPerspective>
	<secondCharacterTurnPerspective>
	TextTwo.
	</secondCharacterTurnPerspective>
	<firstCharacterDamage>
	42
	</firstCharacterDamage>
	<secondCharacterDamage>
	35
	</secondCharacterDamage>

	</turnResult>

	</responseWrapper>
	</responseFormatting>`;

  const result = extractJsonFromJSX(input, "responseWrapper");
  console.debug(1730095954, result);

  expect(result).toEqual({
    firstCharacterTurnPerspective: "TextOne.",
    secondCharacterTurnPerspective: "TextTwo.",
    firstCharacterDamage: 42,
    secondCharacterDamage: 35,
    turnResult: "",
  });
});
