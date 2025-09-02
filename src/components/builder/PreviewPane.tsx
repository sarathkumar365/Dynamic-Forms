"use client";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

export default function PreviewPane({ compiled }: { compiled: { schema:any; uiSchema:any }}) {
  return (
    <div className="rounded-2xl border p-3 h-full overflow-auto">
      <div className="text-sm font-semibold mb-2">Live Preview</div>
      <Form schema={compiled.schema} uiSchema={compiled.uiSchema} validator={validator} onSubmit={()=>{}} onChange={()=>{}} />
    </div>
  );
}
