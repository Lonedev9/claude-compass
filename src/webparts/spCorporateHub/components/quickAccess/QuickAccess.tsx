import * as React from 'react';
import styles from './QuickAccess.module.scss';
import { IDataProvider } from '../../../../Service/models/IDataProvider';
import { IQuickAccessItem } from '../../../../Service/models/IQuickAccessItem';

export interface IQuickAccessProps {
  service: IDataProvider;
  pageId: string;
  canEdit: boolean;
}

export interface IQuickAccessState {
  items: IQuickAccessItem[];
  loading: boolean;
  isEditing: boolean;
}

/**
 * Local copy of the QuickAccess component, detached from
 * ../../quickAccess/components/QuickAccess (Task A). Per Task H, behavior
 * is preserved EXACTLY: page-scoped via `pageId` (never a personal/per-user
 * model - that's SPIntranet's separate PersonalQuickAccess, Task G),
 * editable only by page editors/admins. Every item is fetched filtered to
 * this page instance's pageId, so IT's Quick Access can never appear on, or
 * be confused with, Procurement's or any other department's.
 */
export default class QuickAccess extends React.Component<IQuickAccessProps, IQuickAccessState> {
  constructor(props: IQuickAccessProps) {
    super(props);
    this.state = { items: [], loading: true, isEditing: false };
  }

  public componentDidMount(): void {
    this.load();
  }

  public componentDidUpdate(prev: IQuickAccessProps): void {
    // Re-fetch whenever the page instance changes pageId, so navigating
    // between department pages never shows a stale, other-page's data.
    if (prev.pageId !== this.props.pageId) {
      this.load();
    }
  }

  private load = async (): Promise<void> => {
    this.setState({ loading: true });
    const items = await this.props.service.getQuickAccessItems(this.props.pageId);
    this.setState({ items, loading: false });
  };

  private removeItem = async (id: number): Promise<void> => {
    await this.props.service.deleteQuickAccessItem(id);
    this.setState((s) => ({ items: s.items.filter((i) => i.Id !== id) }));
  };

  public render(): JSX.Element {
    const { items, loading, isEditing } = this.state;
    const { canEdit } = this.props;

    return (
      <div className={styles.quickAccess}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>Quick Access</h3>
          {canEdit && (
            <button type="button" className={styles.editToggle} onClick={() => this.setState({ isEditing: !isEditing })}>
              {isEditing ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
        {loading && <div className={styles.empty}>Loading...</div>}
        {!loading && (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.Id} className={styles.row}>
                <a className={styles.link} href={item.Url}>
                  {item.Title}
                </a>
                {isEditing && (
                  <button
                    type="button"
                    className={styles.removeButton}
                    aria-label={`Remove ${item.Title}`}
                    onClick={() => this.removeItem(item.Id)}
                  >
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}
