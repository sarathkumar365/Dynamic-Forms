"use client";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

export default function PreviewPane({ compiled }: { compiled: { schema:any; uiSchema:any }}) {
  const sections = compiled?.uiSchema?.["ui:meta"]?.sections as Array<{ title: string; keys: string[] }> | undefined;

  const ObjectFieldTemplate = ({ TitleField, description, properties }: any) => {
    if (!Array.isArray(sections) || sections.length === 0) {
      return (
        <div>
          {properties.map((p: any) => p.content)}
        </div>
      );
    }
    const byName: Record<string, any> = {};
    properties.forEach((p: any) => (byName[p.name] = p));
    const rendered: any[] = [];
    // Render properties grouped by sections
    sections.forEach((sec, idx) => {
      const kids = sec.keys.map((k) => byName[k]).filter(Boolean);
      if (kids.length) {
        rendered.push(
          <div key={idx} className="mb-4 rounded-xl border p-3 bg-gray-50">
            <div className="text-sm font-medium mb-2">{sec.title}</div>
            {kids.map((k: any) => k.content)}
          </div>
        );
      }
    });
    // Any remaining (not in sections)
    const shown = new Set(sections.flatMap((s) => s.keys));
    const leftovers = properties.filter((p: any) => !shown.has(p.name));
    if (leftovers.length) {
      rendered.unshift(
        <div key="general" className="mb-4 rounded-xl border p-3">
          {leftovers.map((p: any) => p.content)}
        </div>
      );
    }
    return <div>{rendered}</div>;
  };

  return (
    <div className="rounded-2xl border p-3 h-full overflow-auto">
      <div className="text-sm font-semibold mb-2">Live Preview</div>
      <Form
        schema={compiled.schema}
        uiSchema={compiled.uiSchema}
        validator={validator}
        templates={{ ObjectFieldTemplate }}
        onSubmit={()=>{}}
        onChange={()=>{}}
      />
    </div>
  );
}
