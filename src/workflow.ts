export default function workflow(fn) {
  return (userMessage) => {
    return {
      writeTo(outputPath) {
        outputPath ??= `$HOME/Documents/notes/${import.meta.file}`;

        return fn(userMessage, outputPath);
      },
    };
  };
}
