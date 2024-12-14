declare namespace JSX {
    interface IntrinsicElements {
      output: { path?: string; branch?: string; commit?: string; content?: string };
      settings: { temperature?: number; model?: string; enablesPrediction?: boolean };
      system: React.HTMLAttributes<HTMLElement>;
      instruction: React.HTMLAttributes<HTMLElement>;
      responseFormat: React.HTMLAttributes<HTMLElement>;
      thinking: React.HTMLAttributes<HTMLElement>;
      finalResponse: React.HTMLAttributes<HTMLElement>;
      user: React.HTMLAttributes<HTMLElement>;
      context: React.HTMLAttributes<HTMLElement>;
      document: { wrap?: boolean; name?: string; path?: string };
    }
  }
  