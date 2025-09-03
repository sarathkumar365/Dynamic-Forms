"use client";
import PreviewPane from "@/components/builder/PreviewPane";

export default function FormPreviewClient({ compiled }: { compiled: { schema: any; uiSchema: any } }) {
  return <PreviewPane compiled={compiled} />;
}

