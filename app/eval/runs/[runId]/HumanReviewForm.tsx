'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function HumanReviewForm({
  runId,
  issueId,
  defaultConfirmed,
  defaultReviewer,
  defaultNote,
}: {
  runId: string;
  issueId: string;
  defaultConfirmed?: boolean;
  defaultReviewer?: string;
  defaultNote?: string;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(defaultConfirmed === false ? 'false' : 'true');
  const [reviewer, setReviewer] = useState(defaultReviewer || '');
  const [note, setNote] = useState(defaultNote || '');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  async function submit() {
    setMessage('');
    const response = await fetch(`/api/eval/reports/${encodeURIComponent(runId)}/issues/${encodeURIComponent(issueId)}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: confirmed === 'true', reviewer, note }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(payload.error || '保存失败');
      return;
    }
    setMessage('保存成功');
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ borderTop: '1px dashed #ddd', marginTop: 8, paddingTop: 8 }}>
      <label>
        结论：
        <select value={confirmed} onChange={(event) => setConfirmed(event.target.value)} style={{ marginLeft: 8 }}>
          <option value="true">确认有效</option>
          <option value="false">确认无效</option>
        </select>
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        reviewer：
        <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} style={{ marginLeft: 8, minWidth: 220 }} />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        note：
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} style={{ display: 'block', width: '100%', marginTop: 4 }} />
      </label>
      <button type="button" disabled={isPending} onClick={submit} style={{ marginTop: 8 }}>
        {isPending ? '保存中...' : '保存人工确认'}
      </button>
      {message ? <span style={{ marginLeft: 8 }}>{message}</span> : null}
    </div>
  );
}
