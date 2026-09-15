import * as React from 'react';
import styles from './Intranet.module.scss';
import { IDataProvider } from '../../../Service/models/IDataProvider';
import { IPersonalQuickAccessItem, MAX_PERSONAL_QUICK_ACCESS_ITEMS, isSafeUrl } from '../../../Service/models/IPersonalQuickAccessItem';

export interface IPersonalQuickAccessProps {
  service: IDataProvider;
  items: IPersonalQuickAccessItem[];
  loading: boolean;
  onChange: (items: IPersonalQuickAccessItem[]) => void;
}

/**
 * Task G: personal, self-service Quick Access on SPIntranet only. Replaces
 * the shared/admin-managed inline Quick Access data model with a per-user
 * list (max 5), fully separate from SPCorporateHub's page-scoped Quick
 * Access (Task H), which is untouched.
 */
const PersonalQuickAccess: React.FC<IPersonalQuickAccessProps> = ({ service, items, loading, onChange }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [error, setError] = React.useState<string | undefined>(undefined);

  const atCap = items.length >= MAX_PERSONAL_QUICK_ACCESS_ITEMS;

  const resetForm = (): void => {
    setTitle('');
    setUrl('');
    setError(undefined);
    setIsAdding(false);
  };

  const handleAdd = async (): Promise<void> => {
    setError(undefined);
    if (atCap) {
      setError(`You already have ${MAX_PERSONAL_QUICK_ACCESS_ITEMS} of ${MAX_PERSONAL_QUICK_ACCESS_ITEMS} shortcuts.`);
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!isSafeUrl(url)) {
      setError('Enter a valid http(s), mailto: or tel: URL.');
      return;
    }
    try {
      const created = await service.addPersonalQuickAccessItem({
        Title: title.trim(),
        Url: url.trim(),
        Icon: 'Link',
        SortOrder: items.length
      });
      onChange([...items, created]);
      resetForm();
    } catch (e) {
      setError((e as Error).message || 'Could not save the shortcut.');
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    await service.deletePersonalQuickAccessItem(id);
    onChange(items.filter((i) => i.Id !== id));
  };

  const openLink = (item: IPersonalQuickAccessItem): void => {
    // Defensive re-validation before use in window.open, even though the
    // value was already validated on save (a direct list edit could bypass that).
    if (!isSafeUrl(item.Url)) {
      return;
    }
    window.open(item.Url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.personalQuickAccess}>
      <div className={styles.cardHeaderRow}>
        <h3 className={styles.cardTitle}>My Quick Access</h3>
        <span className={styles.quickAccessCounter}>
          {items.length} of {MAX_PERSONAL_QUICK_ACCESS_ITEMS} shortcuts used
        </span>
      </div>

      {loading && <div className={styles.cardEmpty}>Loading...</div>}

      {!loading && (
        <ul className={styles.personalQuickAccessList}>
          {items.map((item) => (
            <li key={item.Id} className={styles.personalQuickAccessRow}>
              <button type="button" className={styles.quickAccessLinkButton} onClick={() => openLink(item)}>
                {item.Title}
              </button>
              <button
                type="button"
                className={styles.quickAccessRemoveButton}
                aria-label={`Remove ${item.Title}`}
                onClick={() => handleDelete(item.Id)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isAdding && (
        <button
          type="button"
          className={styles.quickAccessAddButton}
          disabled={atCap}
          onClick={() => setIsAdding(true)}
        >
          + Add shortcut
        </button>
      )}

      {isAdding && (
        <div className={styles.quickAccessAddForm}>
          <input
            className={styles.quickAccessInput}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className={styles.quickAccessInput}
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {error && <div className={styles.quickAccessError}>{error}</div>}
          <div className={styles.quickAccessFormActions}>
            <button type="button" onClick={handleAdd}>Save</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalQuickAccess;
