export default function workflow(fn) {
  return (userMessage) => {
    return {
      documents: [],
      temperatures: [],
      avoids: [],
      embraces: [],

      task: "",

      avoid(expr, reason) {
        this.avoids.push({ expr, reason });

        return this;
      },

      embrace(expr, reason) {
        this.embraces.push({ expr, reason });

        return this;
      },

      withDocument(path, description) {
        this.documents.push({ path, description });

        return this;
      },

      withTemperature(temp) {
        this.temperatures.push(temp);

        return this;
      },

      withTask(value) {
        this.task = value;

        return this;
      },

      writeTo(outputPath, fileName) {
        outputPath ??= `$HOME/Documents/notes/${import.meta.file}`;

        const opts = {
          documents: this.documents,
          temperatures: this.temperatures,
          task: this.task,
          avoids: this.avoids,
          embraces: this.embraces,
        };

        opts.fileName = fileName ?? outputPath.split('/').pop();

        return fn(userMessage, outputPath, opts);
      },

      respond(fields) {
        const opts = {
          documents: this.documents,
          temperatures: this.temperatures,
          task: this.task,
          avoids: this.avoids,
          embraces: this.embraces,
        };

        opts.formatFields = Object.keys(fields).map((it) => {
          return {
            tagName: it,
            fieldDescription: fields[it],
          };
        });

        return fn(userMessage, null, opts);
      },
    };
  };
}
