export type FSId = string;

export type FSQuestionType =
  | "text"
  | "email"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "select"
  | "multiselect"
  | "file";

export interface FSOption {
  value: string;
  label: string;
}

export interface FSVisibleWhenClause {
  // field should be the question's key, not id
  all?: Array<{ field: string; eq?: string | number | boolean; ne?: any }>;
  any?: Array<{ field: string; eq?: string | number | boolean; ne?: any }>;
}

export interface FSQuestion {
  id: FSId;
  key?: string; // human-friendly data key ("name", "mobile")
  type: FSQuestionType;
  label: string;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: FSOption[]; // for select/multiselect
  visibleWhen?: FSVisibleWhenClause[];
  disabledWhen?: FSVisibleWhenClause[];
  meta?: Record<string, any>;
}

export interface FSSection {
  id: FSId;
  title: string;
  questions: FSQuestion[];
}

export interface FSPage {
  id: FSId;
  title: string;
  sections: FSSection[];
}

export interface FSRuleActionSetRequired {
  op: "setRequired";
  field: FSId;
  value: boolean;
}
export interface FSRuleActionSetConst {
  op: "setConst";
  field: FSId;
  value: string | number | boolean;
}
export interface FSRuleActionSetEnum {
  op: "setEnum";
  field: FSId;
  values: string[];
  labels?: string[];
}

export type FSRuleAction =
  | FSRuleActionSetRequired
  | FSRuleActionSetConst
  | FSRuleActionSetEnum;

export interface FSRule {
  id: FSId;
  description?: string;
  when: FSVisibleWhenClause;
  then: FSRuleAction[];
}

export interface FSUiHints {
  order?: FSId[];
  widgets?: Record<FSId, string>;
}

export interface FormSpec {
  version: "1.0";
  id: string;
  title: string;
  description?: string;
  pages: FSPage[];
  ui?: FSUiHints;
  rules?: FSRule[];
  metadata?: Record<string, any>;
}
