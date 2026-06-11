'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  runId: string;
  issueId: string;
  initialConfirmed?: boolean;
  initialReviewer?: string;
  initialNote?: string;
};

export default function HumanReviewForm({ runId, issueId, initialConfirmed, initialReviewer, initialNote }: Props) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(initialConfirmed === false ? 'false' : 'true');
  const [reviewer, setReviewer] = useState(initialReviewer || '');
  const [note, setNote] = useState(initialNote || '');
  const [status, setStatus] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('保存中...');
    const response = await fetch(`/api/eval/reports/${encodeURIComponent(runId)}/issues/${encodeURIComponent(issueId)}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: confirmed === 'true', reviewer, note }),
    });
    if (!response.ok) {
      setStatus('保存失败');
      return;
    }
    setStatus('已保存');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      <label>
        人工确认：{' '}
        <select value={confirmed} onChange={(event) => setConfirmed(event.target.value)}>
          <option value="true">已确认有效</option>
          <option value="false">已确认无效</option>
        </select>
      </label>
      <label>
        reviewer:{' '}
        <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="研究者A" />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        note:
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </label>
      <button type="submit" style={{ width: 'fit-content' }}>保存人工标注</button>
      {status ? <span>{status}</span> : null}
    </form>
  );
}
