"use client";

// "이번 발송에 적용할 값" 폼. config.fields 를 그대로 렌더링한다(제네릭).

import type { FieldDef } from "@/lib/mail/configs/types";
import type { MailController } from "./useMailGenerator";

interface ValueFormProps {
  fields: FieldDef[];
  ctrl: MailController;
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`mg-field${field.compact ? " mg-field-compact" : ""}`}>
      <label htmlFor={`mg-${field.id}`}>{field.label}</label>
      {field.type === "select" ? (
        <select
          id={`mg-${field.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`mg-${field.id}`}
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function ValueForm({ fields, ctrl }: ValueFormProps) {
  return (
    <div className="mg-panel">
      <h2 className="mg-h2">3. 이번 발송에 적용할 값</h2>
      <div className="mg-form-grid">
        {fields.map((field) => (
          <Field
            key={field.id}
            field={field}
            value={ctrl.fieldValues[field.id] ?? ""}
            onChange={(v) => ctrl.setFieldValue(field.id, v)}
          />
        ))}
      </div>
    </div>
  );
}
