// Shown when the server rejected an edit because someone else changed the item first.
// The user sees both versions and decides explicitly. Nothing is overwritten silently.
import type { WorkItem } from '../../api/types';

interface Props {
  draft: { title: string; description: string };
  theirs: WorkItem;
  onUseLatest: () => void; // discard my edits, adopt the server's version
  onKeepMine: () => void;  // keep my edits, rebase them onto the latest version
}

export function ConflictPanel({ draft, theirs, onUseLatest, onKeepMine }: Props) {
  const fields = (['title', 'description'] as const).filter((f) => draft[f] !== theirs[f]);
  return (
    <div className="conflict" role="alert">
      <strong>Someone else changed this item (now version {theirs.version}).</strong>
      <p>Your edits have not been saved.</p>
      {fields.length === 0 && (
        <p className="muted">Their change did not touch the text you edited (for example assignment or status), so keeping your edits is safe.</p>
      )}
      {fields.map((f) => (
        <div className="diff" key={f}>
          <div><h5>Your {f}</h5><pre>{draft[f] || '(empty)'}</pre></div>
          <div><h5>Latest {f}</h5><pre>{theirs[f] || '(empty)'}</pre></div>
        </div>
      ))}
      <div className="actions">
        <button onClick={onUseLatest}>Discard mine, use latest</button>
        <button className="primary" onClick={onKeepMine}>Keep my edits on top of latest</button>
      </div>
    </div>
  );
}