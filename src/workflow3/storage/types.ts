import type { RulesEngineResult } from '../evaluator/types';

export type IntakeExtractionInsert = {
  intake_id: string;
  firm_id: string;
  version: number;
  schema_version: string;
  extracted_data: {
    rules_engine: RulesEngineResult;
  };
};

export type WriteRulesEvaluationOptions = {
  schemaVersion?: string;
};

export type WriteRulesEvaluationResult = {
  id: string;
  intake_id: string;
  version: number;
  schema_version: string;
  created_at: string;
};
