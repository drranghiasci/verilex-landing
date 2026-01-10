export type NarrativePrompt = {
  id: string;
  prompt: string;
  helperText?: string;
  optional: true;
};

export type FieldPrompt = {
  fieldKey: string;
  prompt: string;
  helperText?: string;
  revealOn?: { whenValue: unknown; revealPaths: string[] };
  askIfMissing: boolean;
};

export type SectionPromptSet = {
  sectionId: string;
  sectionTitle: string;
  narrativePrompt: NarrativePrompt;
  fieldPrompts: Record<string, FieldPrompt>;
};

export type PromptLibrary = {
  version: string;
  sections: Record<string, SectionPromptSet>;
};
