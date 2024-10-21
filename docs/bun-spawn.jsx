<Documentation>
  <Title>Spawn child processes with `Bun.spawn` or `Bun.spawnSync`</Title>

  <Section>
    <Title>Spawn a process (`Bun.spawn()`)</Title>
    <Paragraph>
      Provide a command as an array of strings. The result of `Bun.spawn()` is a
      `Bun.Subprocess` object.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"]);
console.log(await proc.exited); // 0`}
    </CodeBlock>
    <Paragraph>
      The second argument to `Bun.spawn` is a parameters object that can be used
      to configure the subprocess.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"], {
  cwd: "./path/to/subdir", // specify a working directory
  env: { ...process.env, FOO: "bar" }, // specify environment variables
  onExit(proc, exitCode, signalCode, error) {
    // exit handler
  },
});

proc.pid; // process ID of subprocess`}
    </CodeBlock>
  </Section>

  <Section>
    <Title>Input stream</Title>
    <Paragraph>
      By default, the input stream of the subprocess is undefined; it can be
      configured with the `stdin` parameter.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["cat"], {
  stdin: await fetch(
    "https://raw.githubusercontent.com/oven-sh/bun/main/examples/hashing.js",
  ),
});

const text = await new Response(proc.stdout).text();
console.log(text); // "const input = "hello world".repeat(400); ..."`}
    </CodeBlock>
    <Table>
      <Row>
        <Cell>
          <Code>null</Code>
        </Cell>
        <Cell>
          <strong>Default.</strong> Provide no input to the subprocess
        </Cell>
      </Row>
      <Row>
        <Cell>
          <Code>"pipe"</Code>
        </Cell>
        <Cell>Return a `FileSink` for fast incremental writing</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>"inherit"</Code>
        </Cell>
        <Cell>Inherit the `stdin` of the parent process</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>Bun.file()</Code>
        </Cell>
        <Cell>Read from the specified file.</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>TypedArray | DataView</Code>
        </Cell>
        <Cell>Use a binary buffer as input.</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>Response</Code>
        </Cell>
        <Cell>Use the response `body` as input.</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>Request</Code>
        </Cell>
        <Cell>Use the request `body` as input.</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>number</Code>
        </Cell>
        <Cell>Read from the file with a given file descriptor.</Cell>
      </Row>
    </Table>
    <Paragraph>
      The `"pipe"` option lets incrementally write to the subprocess's input
      stream from the parent process.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["cat"], {
  stdin: "pipe", // return a FileSink for writing
});

// enqueue string data
proc.stdin.write("hello");

// enqueue binary data
const enc = new TextEncoder();
proc.stdin.write(enc.encode(" world!"));

// send buffered data
proc.stdin.flush();

// close the input stream
proc.stdin.end();`}
    </CodeBlock>
  </Section>

  <Section>
    <Title>Output streams</Title>
    <Paragraph>
      You can read results from the subprocess via the `stdout` and `stderr`
      properties. By default these are instances of `ReadableStream`.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"]);
const text = await new Response(proc.stdout).text();
console.log(text); // => "1.1.7"`}
    </CodeBlock>
    <Table>
      <Row>
        <Cell>
          <Code>"pipe"</Code>
        </Cell>
        <Cell>
          <strong>Default for `stdout`.</strong>{" "}
          Pipe the output to a `ReadableStream` on the returned `Subprocess`
          object.
        </Cell>
      </Row>
      <Row>
        <Cell>
          <Code>"inherit"</Code>
        </Cell>
        <Cell>
          <strong>Default for `stderr`.</strong>{" "}
          Inherit from the parent process.
        </Cell>
      </Row>
      <Row>
        <Cell>
          <Code>Bun.file()</Code>
        </Cell>
        <Cell>Write to the specified file.</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>null</Code>
        </Cell>
        <Cell>Write to `/dev/null`.</Cell>
      </Row>
      <Row>
        <Cell>
          <Code>number</Code>
        </Cell>
        <Cell>Write to the file with the given file descriptor.</Cell>
      </Row>
    </Table>
  </Section>

  <Section>
    <Title>Exit handling</Title>
    <Paragraph>
      Use the `onExit` callback to listen for the process exiting or being
      killed.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"], {
  onExit(proc, exitCode, signalCode, error) {
    // exit handler
  },
});`}
    </CodeBlock>
    <Paragraph>
      For convenience, the `exited` property is a `Promise` that resolves when
      the process exits.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"]);

await proc.exited; // resolves when process exit
proc.killed; // boolean — was the process killed?
proc.exitCode; // null | number
proc.signalCode; // null | "SIGABRT" | "SIGALRM" | ...`}
    </CodeBlock>
    <Paragraph>
      To kill a process:
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"]);
proc.kill();
proc.killed; // true

proc.kill(); // specify an exit code`}
    </CodeBlock>
    <Paragraph>
      The parent `bun` process will not terminate until all child processes have
      exited. Use `proc.unref()` to detach the child process from the parent.
    </Paragraph>
    <CodeBlock language="typescript">
      {`const proc = Bun.spawn(["bun", "--version"]);
proc.unref();`}
    </CodeBlock>
  </Section>

  <Section>
    <Title>Reference</Title>
    <Paragraph>
      A simple reference of the Spawn API and types are shown below. The real
      types have complex generics to strongly type the `Subprocess` streams with
      the options passed to `Bun.spawn` and `Bun.spawnSync`. For full details,
      find these types as defined{" "}
      <a href="https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun.d.ts">
        bun.d.ts
      </a>.
    </Paragraph>
    <CodeBlock language="typescript">
      {`interface Bun {
  spawn(command: string[], options?: SpawnOptions.OptionsObject): Subprocess;
  spawnSync(
    command: string[],
    options?: SpawnOptions.OptionsObject,
  ): SyncSubprocess;

  spawn(options: { cmd: string[] } & SpawnOptions.OptionsObject): Subprocess;
  spawnSync(
    options: { cmd: string[] } & SpawnOptions.OptionsObject,
  ): SyncSubprocess;
}

namespace SpawnOptions {
  interface OptionsObject {
    cwd?: string;
    env?: Record<string, string>;
    stdin?: SpawnOptions.Readable;
    stdout?: SpawnOptions.Writable;
    stderr?: SpawnOptions.Writable;
    onExit?: (
      proc: Subprocess,
      exitCode: number | null,
      signalCode: string | null,
      error: Error | null,
    ) => void;
  }

  type Readable =
    | "pipe"
    | "inherit"
    | "ignore"
    | null // equivalent to "ignore"
    | undefined // to use default
    | BunFile
    | ArrayBufferView
    | number;

  type Writable =
    | "pipe"
    | "inherit"
    | "ignore"
    | null // equivalent to "ignore"
    | undefined // to use default
    | BunFile
    | ArrayBufferView
    | number
    | ReadableStream
    | Blob
    | Response
    | Request;
}

interface Subprocess<Stdin, Stdout, Stderr> {
  readonly pid: number;
  // the exact stream types here are derived from the generic parameters
  readonly stdin: number | ReadableStream | FileSink | undefined;
  readonly stdout: number | ReadableStream | undefined;
  readonly stderr: number | ReadableStream | undefined;

  readonly exited: Promise<number>;

  readonly exitCode: number | undefined;
  readonly signalCode: Signal | null;
  readonly killed: boolean;

  ref(): void;
  unref(): void;
  kill(code?: number): void;
}

interface SyncSubprocess<Stdout, Stderr> {
  readonly pid: number;
  readonly success: boolean;
  // the exact buffer types here are derived from the generic parameters
  readonly stdout: Buffer | undefined;
  readonly stderr: Buffer | undefined;
}

type ReadableSubprocess = Subprocess<any, "pipe", "pipe">;
type WritableSubprocess = Subprocess<"pipe", any, any>;
type PipedSubprocess = Subprocess<"pipe", "pipe", "pipe">;
type NullSubprocess = Subprocess<null, null, null>;

type ReadableSyncSubprocess = SyncSubprocess<"pipe", "pipe">;
type NullSyncSubprocess = SyncSubprocess<null, null>;

type Signal =
  | "SIGABRT"
  | "SIGALRM"
  | "SIGBUS"
  | "SIGCHLD"
  | "SIGCONT"
  | "SIGFPE"
  | "SIGHUP"
  | "SIGILL"
  | "SIGINT"
  | "SIGIO"
  | "SIGIOT"
  | "SIGKILL"
  | "SIGPIPE"
  | "SIGPOLL"
  | "SIGPROF"
  | "SIGPWR"
  | "SIGQUIT"
  | "SIGSEGV"
  | "SIGSTKFLT"
  | "SIGSTOP"
  | "SIGSYS"
  | "SIGTERM"
  | "SIGTRAP"
  | "SIGTSTP"
  | "SIGTTIN"
  | "SIGTTOU"
  | "SIGUNUSED"
  | "SIGURG"
  | "SIGUSR1"
  | "SIGUSR2"
  | "SIGVTALRM"
  | "SIGWINCH"
  | "SIGXCPU"
  | "SIGXFSZ"
  | "SIGBREAK"
  | "SIGLOST"
  | "SIGINFO";`}
    </CodeBlock>
  </Section>
</Documentation>;
