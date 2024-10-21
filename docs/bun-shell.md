<Documentation>
  <Title>Bun Shell</Title>
  <Description>
    Bun Shell makes shell scripting with JavaScript & TypeScript fun. It's a cross-platform bash-like shell with seamless JavaScript interop.
  </Description>
  <Section title="Quickstart">
    <Code language="js">
      {`import { $ } from "bun";

const response = await fetch("https://example.com");

// Use Response as stdin. await $`cat < ${response} | wc -c`; // 1256`}
</Code>

</Section>
  <Section title="Features">
    <FeatureList>
      <Feature title="Cross-platform">
        Works on Windows, Linux & macOS. Instead of `rimraf` or `cross-env`, you can use Bun Shell without installing extra dependencies. Common shell commands like `ls`, `cd`, `rm` are implemented natively.
      </Feature>
      <Feature title="Familiar">
        Bun Shell is a bash-like shell, supporting redirection, pipes, environment variables and more.
      </Feature>
      <Feature title="Globs">
        Glob patterns are supported natively, including `**`, `*`, `{expansion}`, and more.
      </Feature>
      <Feature title="Template literals">
        Template literals are used to execute shell commands. This allows for easy interpolation of variables and expressions.
      </Feature>
      <Feature title="Safety">
        Bun Shell escapes all strings by default, preventing shell injection attacks.
      </Feature>
      <Feature title="JavaScript interop">
        Use `Response`, `ArrayBuffer`, `Blob`, `Bun.file(path)` and other JavaScript objects as stdin, stdout, and stderr.
      </Feature>
      <Feature title="Shell scripting">
        Bun Shell can be used to run shell scripts (`.bun.sh` files).
      </Feature>
      <Feature title="Custom interpreter">
        Bun Shell is written in Zig, along with its lexer, parser, and interpreter. Bun Shell is a small programming language.
      </Feature>
    </FeatureList>
  </Section>
  <Section title="Getting started">
    <Paragraph>
      The simplest shell command is `echo`. To run it, use the `$` template literal tag:
    </Paragraph>
    <Code language="js">
      {`import { $ } from "bun";

await $`echo "Hello World!"`; // Hello
World!`} </Code> <Paragraph> By default, shell commands print to stdout. To quiet the output, call`.quiet()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

await $`echo "Hello World!"`.quiet(); // No
output`} </Code> <Paragraph> What if you want to access the output of the command as text? Use`.text()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

// .text() automatically calls .quiet() for you const welcome = await
$`echo "Hello World!"`.text();

console.log(welcome); // Hello
World!\n`} </Code> <Paragraph> By default,`await`ing will return stdout and stderr as`Buffer`s. </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const { stdout, stderr } = await $`echo "Hello World!"`.quiet();

console.log(stdout); // Buffer(6) [ 72, 101, 108, 108, 111, 32 ]
console.log(stderr); // Buffer(0) []`}
</Code>

</Section>
  <Section title="Error handling">
    <Paragraph>
      By default, non-zero exit codes will throw an error. This `ShellError` contains information about the command run.
    </Paragraph>
    <Code language="js">
      {`import { $ } from "bun";

try { const output = await $`something-that-may-fail`.text();
console.log(output); } catch (err) { console.log(\`Failed with code
\${err.exitCode}\`); console.log(err.stdout.toString());
console.log(err.stderr.toString());
}`} </Code> <Paragraph> Throwing can be disabled with`.nothrow()`. The result's`exitCode`will need to be checked manually. </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const { stdout, stderr, exitCode } = await $`something-that-may-fail` .nothrow()
.quiet();

if (exitCode !== 0) { console.log(\`Non-zero exit code \${exitCode}\`); }

console.log(stdout);
console.log(stderr);`} </Code> <Paragraph> The default handling of non-zero exit codes can be configured by calling`.nothrow()`or`.throws(boolean)`on the`$`function itself. </Paragraph> <Code language="js"> {`import
{ $ } from "bun"; // shell promises will not throw, meaning you will have to //
check for \`exitCode\` manually on every shell command. $.nothrow(); //
equivilent to $.throws(false)

// default behavior, non-zero exit codes will throw an error $.throws(true);

// alias for $.nothrow() $.throws(false);

await $`something-that-may-fail`; // No exception thrown`}
</Code>

</Section>
  <Section title="Redirection">
    <Paragraph>
      A command's _input_ or _output_ may be _redirected_ using the typical Bash operators:
    </Paragraph>
    <List>
      <Item>`<` redirect stdin</Item>
      <Item>`>` or `1>` redirect stdout</Item>
      <Item>`2>` redirect stderr</Item>
      <Item>`&>` redirect both stdout and stderr</Item>
      <Item>`>>` or `1>>` redirect stdout, _appending_ to the destination, instead of overwriting</Item>
      <Item>`2>>` redirect stderr, _appending_ to the destination, instead of overwriting</Item>
      <Item>`&>>` redirect both stdout and stderr, _appending_ to the destination, instead of overwriting</Item>
      <Item>`1>&2` redirect stdout to stderr (all writes to stdout will instead be in stderr)</Item>
      <Item>`2>&1` redirect stderr to stdout (all writes to stderr will instead be in stdout)</Item>
    </List>
    <Paragraph>
      Bun Shell also supports redirecting from and to JavaScript objects.
    </Paragraph>
    <SubSection title="Example: Redirect output to JavaScript objects (`>`)">
      <Code language="js">
        {`import { $ } from "bun";

const buffer = Buffer.alloc(100); await $`echo "Hello World!" > ${buffer}`;

console.log(buffer.toString()); // Hello
World!\n`} </Code> <Paragraph> The following JavaScript objects are supported for redirection to: </Paragraph> <List> <Item>`Buffer`,`Uint8Array`,`Uint16Array`,`Uint32Array`,`Int8Array`,`Int16Array`,`Int32Array`,`Float32Array`,`Float64Array`,`ArrayBuffer`,`SharedArrayBuffer`(writes to the underlying buffer)</Item> <Item>`Bun.file(path)`,`Bun.file(fd)`(writes to the file)</Item> </List> </SubSection> <SubSection title="Example: Redirect input from JavaScript objects (`<`)"> <Code language="js"> {`import
{ $ } from "bun";

const response = new Response("hello i am a response body");

const result = await $`cat < ${response}`.text();

console.log(result); // hello i am a response
body`} </Code> <Paragraph> The following JavaScript objects are supported for redirection from: </Paragraph> <List> <Item>`Buffer`,`Uint8Array`,`Uint16Array`,`Uint32Array`,`Int8Array`,`Int16Array`,`Int32Array`,`Float32Array`,`Float64Array`,`ArrayBuffer`,`SharedArrayBuffer`(reads from the underlying buffer)</Item> <Item>`Bun.file(path)`,`Bun.file(fd)`(reads from the file)</Item> <Item>`Response`(reads from the body)</Item> </List> </SubSection> <SubSection title="Example: Redirect stdin -> file"> <Code language="js"> {`import
{ $ } from "bun";

await
$`cat < myfile.txt`;`} </Code> </SubSection> <SubSection title="Example: Redirect stdout -> file"> <Code language="js"> {`import
{ $ } from "bun";

await
$`echo bun! > greeting.txt`;`} </Code> </SubSection> <SubSection title="Example: Redirect stderr -> file"> <Code language="js"> {`import
{ $ } from "bun";

await
$`bun run index.ts 2> errors.txt`;`} </Code> </SubSection> <SubSection title="Example: Redirect stderr -> stdout"> <Code language="js"> {`import
{ $ } from "bun";

// redirects stderr to stdout, so all output // will be available on stdout
await
$`bun run ./index.ts 2>&1`;`} </Code> </SubSection> <SubSection title="Example: Redirect stdout -> stderr"> <Code language="js"> {`import
{ $ } from "bun";

// redirects stdout to stderr, so all output // will be available on stderr
await $`bun run ./index.ts 1>&2`;`}
</Code>
</SubSection>

</Section>
  <Section title="Piping (`|`)">
    <Paragraph>
      Like in bash, you can pipe the output of one command to another:
    </Paragraph>
    <Code language="js">
      {`import { $ } from "bun";

const result = await $`echo "Hello World!" | wc -w`.text();

console.log(result); //
2\n`} </Code> <Paragraph> You can also pipe with JavaScript objects: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const response = new Response("hello i am a response body");

const result = await $`cat < ${response} | wc -w`.text();

console.log(result); // 6\n`}
</Code>

</Section>
  <Section title="Environment variables">
    <Paragraph>
      Environment variables can be set like in bash:
    </Paragraph>
    <Code language="js">
      {`import { $ } from "bun";

await $`FOO=foo bun -e 'console.log(process.env.FOO)'`; //
foo\n`} </Code> <Paragraph> You can use string interpolation to set environment variables: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const foo = "bar123";

await $`FOO=${foo + "456"} bun -e 'console.log(process.env.FOO)'`; //
bar123456\n`} </Code> <Paragraph> Input is escaped by default, preventing shell injection attacks: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const foo = "bar123; rm -rf /tmp";

await $`FOO=${foo} bun -e 'console.log(process.env.FOO)'`; // bar123; rm -rf
/tmp\n`} </Code> <SubSection title="Changing the environment variables"> <Paragraph> By default,`process.env`is used as the environment variables for all commands. </Paragraph> <Paragraph> You can change the environment variables for a single command by calling`.env()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

await $`echo $FOO`.env({ ...process.env, FOO: "bar" }); //
bar`} </Code> <Paragraph> You can change the default environment variables for all commands by calling`$.env`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

$.env({ FOO: "bar" });

// the globally-set $FOO await $`echo $FOO`; // bar

// the locally-set $FOO await $`echo $FOO`.env({ FOO: "baz" }); //
baz`} </Code> <Paragraph> You can reset the environment variables to the default by calling`$.env()`with no arguments: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

$.env({ FOO: "bar" });

// the globally-set $FOO await $`echo $FOO`; // bar

// the locally-set $FOO await $`echo $FOO`.env(undefined); //
""`} </Code> </SubSection> <SubSection title="Changing the working directory"> <Paragraph> You can change the working directory of a command by passing a string to`.cwd()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

await $`pwd`.cwd("/tmp"); //
/tmp`} </Code> <Paragraph> You can change the default working directory for all commands by calling`$.cwd`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

$.cwd("/tmp");

// the globally-set working directory await $`pwd`; // /tmp

// the locally-set working directory await $`pwd`.cwd("/"); // /`}
</Code>
</SubSection>

</Section>
  <Section title="Reading output">
    <Paragraph>
      To read the output of a command as a string, use `.text()`:
    </Paragraph>
    <Code language="js">
      {`import { $ } from "bun";

const result = await $`echo "Hello World!"`.text();

console.log(result); // Hello
World!\n`} </Code> <SubSection title="Reading output as JSON"> <Paragraph> To read the output of a command as JSON, use`.json()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const result = await $`echo '{"foo": "bar"}'`.json();

console.log(result); // { foo: "bar"
}`} </Code> </SubSection> <SubSection title="Reading output line-by-line"> <Paragraph> To read the output of a command line-by-line, use`.lines()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

for await (let line of $`echo "Hello World!"`.lines()) { console.log(line); //
Hello World!
}`} </Code> <Paragraph> You can also use`.lines()`on a completed command: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const search = "bun";

for await (let line of $`cat list.txt | grep ${search}`.lines()) {
console.log(line);
}`} </Code> </SubSection> <SubSection title="Reading output as a Blob"> <Paragraph> To read the output of a command as a Blob, use`.blob()`: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

const result = await $`echo "Hello World!"`.blob();

console.log(result); // Blob(13) { size: 13, type: "text/plain" }`}
</Code>
</SubSection>

</Section>
  <Section title="Builtin Commands">
    <Paragraph>
      For cross-platform compatibility, Bun Shell implements a set of builtin commands, in addition to reading commands from the PATH environment variable.
    </Paragraph>
    <List>
      <Item>`cd`: change the working directory</Item>
      <Item>`ls`: list files in a directory</Item>
      <Item>`rm`: remove files and directories</Item>
      <Item>`echo`: print text</Item>
      <Item>`pwd`: print the working directory</Item>
      <Item>`bun`: run bun in bun</Item>
      <Item>`cat`</Item>
      <Item>`touch`</Item>
      <Item>`mkdir`</Item>
      <Item>`which`</Item>
      <Item>`mv`</Item>
      <Item>`exit`</Item>
      <Item>`true`</Item>
      <Item>`false`</Item>
      <Item>`yes`</Item>
      <Item>`seq`</Item>
      <Item>`dirname`</Item>
      <Item>`basename`</Item>
    </List>
    <Paragraph>
      **Partially** implemented:
    </Paragraph>
    <List>
      <Item>`mv`: move files and directories (missing cross-device support)</Item>
    </List>
    <Paragraph>
      **Not** implemented yet, but planned:
    </Paragraph>
    <Paragraph>
      See <Link href="https://github.com/oven-sh/bun/issues/9716">Issue #9716</Link> for the full list.
    </Paragraph>
  </Section>
  <Section title="Utilities">
    <Paragraph>
      Bun Shell also implements a set of utilities for working with shells.
    </Paragraph>
    <SubSection title="`$.braces` (brace expansion)">
      <Paragraph>
        This function implements simple <Link href="https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html">brace expansion</Link> for shell commands:
      </Paragraph>
      <Code language="js">
        {`import { $ } from "bun";

await $.braces(\`echo {1,2,3}\`); // => ["echo 1", "echo 2", "echo
3"]`} </Code> </SubSection> <SubSection title="`$.escape`(escape strings)"> <Paragraph> Exposes Bun Shell's escaping logic as a function: </Paragraph> <Code language="js"> {`import
{ $ } from "bun";

console.log($.escape('$(foo) `bar` "baz"')); // => \\$(foo) \\`bar\\`
\\"baz\\"`} </Code> <Paragraph> If you do not want your string to be escaped, wrap it in a`{
raw: 'str' }`object: </Paragraph> <Code language="js"> {`import { $ } from
"bun";

await $`echo ${{ raw: '$(foo)`bar`"baz"' }}`; // => bun: command not found: foo
// => bun: command not found: bar // => baz`}
</Code>
</SubSection>

</Section>
  <Section title=".sh file loader">
    <Paragraph>
      For simple shell scripts, instead of `/bin/sh`, you can use Bun Shell to run shell scripts.
    </Paragraph>
    <Paragraph>
      To do so, just run the script with `bun` on a file with the `.sh` extension.
    </Paragraph>
    <Code language="sh">
      {`echo "Hello World! pwd=$(pwd)"`}
    </Code>
    <Code language="sh">
      {`$ bun ./script.sh
Hello World! pwd=/home/demo`}
    </Code>
    <Paragraph>
      Scripts with Bun Shell are cross platform, which means they work on Windows:
    </Paragraph>
    <Code language="powershell">
      {`> bun .\\script.sh
Hello World! pwd=C:\\Users\\Demo`}
    </Code>
  </Section>
  <Section title="Implementation notes">
    <Paragraph>
      Bun Shell is a small programming language in Bun that is implemented in Zig. It includes a handwritten lexer, parser, and interpreter. Unlike bash, zsh, and other shells, Bun Shell runs operations concurrently.
    </Paragraph>
  </Section>
  <Section title="Credits">
    <Paragraph>
      Large parts of this API were inspired by <Link href="https://github.com/google/zx">zx</Link>, <Link href="https://github.com/dsherret/dax">dax</Link>, and <Link href="https://github.com/wobsoriano/bnx">bnx</Link>. Thank you to the authors of those projects.
    </Paragraph>
  </Section>
</Documentation>
