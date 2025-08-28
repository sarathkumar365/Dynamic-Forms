'use client'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'

export default function PublicFormClient({
  schema,
  uiSchema,
  action,
}: {
  schema: any
  uiSchema?: any
  action: (formData: FormData) => void
}) {
  return (
    <form action={action}>
      <input type="hidden" name="payload" />
      <Form
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        onSubmit={(e) => {
          const input = document.querySelector('input[name=payload]') as HTMLInputElement
          if (input) input.value = JSON.stringify(e.formData)
        }}
      >
        <button type="submit" className="btn">Submit</button>
      </Form>
    </form>
  )
}
