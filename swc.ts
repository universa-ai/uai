import swc from "@swc/core";

// Function to read and parse TypeScript file
async function parseTypeScriptFile(filePath) {
  try {
    // Read the TypeScript file
    const fileContent = await Bun.file(filePath).text();

    // Parse the TypeScript content into an AST
    const ast = await swc.parse(fileContent, {
      syntax: "typescript",
      isModule: true,
    });

    // Traverse the AST to extract function contents
    const functionContents = [];
    traverseAST(ast, functionContents);

    // Return the extracted function contents
    return functionContents;
  } catch (error) {
    console.error("Error processing file:", error);
    throw error; // Re-throw the error to ensure the promise is rejected
  }
}

// Function to traverse the AST and extract function contents
function traverseAST(node, functionContents) {
  if (!node) return;

  // Check for function declarations
  if (node.type === "FunctionDeclaration" && node.body) {
    extractFunctionContent(node.body, functionContents);
  }

  // Check for function expressions assigned to variables
  if (
    node.type === "VariableDeclarator" && node.init &&
    node.init.type === "FunctionExpression" && node.init.body
  ) {
    extractFunctionContent(node.init.body, functionContents);
  }

  // Recursively traverse child nodes
  for (const key in node) {
    if (node.hasOwnProperty(key) && typeof node[key] === "object") {
      traverseAST(node[key], functionContents);
    }
  }
}

// Function to extract function content and append to the array
async function extractFunctionContent(bodyNode, functionContents) {
  try {
    const { code } = await swc.transform(bodyNode);
    console.debug(1730296370, code);

    functionContents.push(code);
  } catch (error) {
    console.error("Error converting AST node to string:", error);
  }
}

// Specify the path to the TypeScript file
const filePath = "./example.ts";

// Parse the TypeScript file and extract function contents
parseTypeScriptFile(filePath).then((functionContents) => {
  console.log("Function Contents:", functionContents);
}).catch((error) => {
  console.error("Failed to extract function contents:", error);
});
