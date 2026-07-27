"use client";

// 슬롯 선택 + 제목/본문 템플릿 편집 + 기본값 시스템 UI.
// 상태/로직은 useMailGenerator 컨트롤러가 갖고, 여기서는 표현과 이벤트 위임만 한다.

import RichEditor from "./RichEditor";
import type { MailController } from "./useMailGenerator";

interface DefaultControlsProps {
  status: string;
  editing: boolean;
  canRevert: boolean;
  onReset: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRevert: () => void;
}

// 기본값 불러오기/수정/저장/취소/되돌리기 버튼 묶음 (제목·본문 공용).
function DefaultControls({
  status,
  editing,
  canRevert,
  onReset,
  onEdit,
  onSave,
  onCancel,
  onRevert,
}: DefaultControlsProps) {
  return (
    <div className="mg-actions">
      <span className="mg-status">{status}</span>
      {editing ? (
        <>
          <button type="button" className="mg-btn mg-btn-primary" onClick={onSave}>
            기본값 저장
          </button>
          <button type="button" className="mg-btn" onClick={onCancel}>
            취소
          </button>
        </>
      ) : (
        <>
          <button type="button" className="mg-btn" onClick={onReset}>
            기본값 불러오기
          </button>
          <button type="button" className="mg-btn" onClick={onEdit}>
            기본값 수정
          </button>
          <button
            type="button"
            className="mg-btn"
            onClick={onRevert}
            disabled={!canRevert}
          >
            기본값 되돌리기
          </button>
        </>
      )}
    </div>
  );
}

export default function SlotBar({ ctrl }: { ctrl: MailController }) {
  return (
    <>
      <div className="mg-panel">
        <div className="mg-h2-row">
          <h2 className="mg-h2">1. 메일 제목</h2>
          <span className="mg-active-slot" title="편집 중인 템플릿">
            {ctrl.activeName}
          </span>
        </div>
        <textarea
          className={`mg-subject-input${
            ctrl.editingSubjectDefault ? " editing-default" : ""
          }`}
          rows={2}
          spellCheck={false}
          value={ctrl.subject}
          onChange={(e) => ctrl.setSubject(e.target.value)}
          placeholder="예: [오늘의공고 1회 편성 안내] {{회사명}} {{공고명}}"
        />
        <DefaultControls
          status={ctrl.subjectStatus}
          editing={ctrl.editingSubjectDefault}
          canRevert={ctrl.canRevertSubject}
          onReset={ctrl.resetSubject}
          onEdit={ctrl.editSubjectDefault}
          onSave={ctrl.saveSubjectDefault}
          onCancel={ctrl.cancelSubjectDefault}
          onRevert={ctrl.revertSubjectDefault}
        />
      </div>

      <div className="mg-panel">
        <h2 className="mg-h2">2. 원본 메일 본문 템플릿</h2>
        <RichEditor
          value={ctrl.body}
          onChange={ctrl.setBody}
          toolbar
          editingDefault={ctrl.editingBodyDefault}
          ariaLabel="본문 템플릿 편집기"
        />
        <DefaultControls
          status={ctrl.bodyStatus}
          editing={ctrl.editingBodyDefault}
          canRevert={ctrl.canRevertBody}
          onReset={ctrl.resetBody}
          onEdit={ctrl.editBodyDefault}
          onSave={ctrl.saveBodyDefault}
          onCancel={ctrl.cancelBodyDefault}
          onRevert={ctrl.revertBodyDefault}
        />
      </div>
    </>
  );
}
