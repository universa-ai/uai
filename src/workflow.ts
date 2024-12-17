export default function workflow(fn) {
  return (userMessage) => {
    return {
      shells: [],
      documents: [],
      temperatures: [],
      avoids: [],
      embraces: [],
      thoughts: [],
      prediction: false,

      task: "",

      withPrediction(val: boolean) {
    this.prediction = val;

        return this;
      },

      think(good, bad, reason) {
        this.thoughts.push({good, bad, reason});
        return this;
      },

      avoid(expr, reason) {
        this.avoids.push({ expr, reason });

        return this;
      },

      embrace(expr, reason) {
        this.embraces.push({ expr, reason });

        return this;
      },

      withShell(shell, label) {
        this.shells.push({ shell, label });

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
          shells: this.shells,
  prediction: this.prediction,
thoughts: this.thoughts,

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
          shells: this.shells,
thoughts: this.thoughts,
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
