import * as React from 'react';
import styles from './DirectoratePage.module.scss';
import { IDirectoratePageProps } from './IDirectoratePageProps';
import { IHorizontalCard } from '../../../Service/models/IHorizontalCard';
import { IAnnouncement } from '../../../Service/models/IAnnouncement';

export interface IDirectoratePageState {
  loading: boolean;
  cards: IHorizontalCard[];
  announcements: IAnnouncement[];
}

/**
 * Task A/E fork of directoratePage -> SPDirectoratePage. No functional/content
 * changes beyond forking and the Task B responsive pass. Reused per
 * directorate (Business Support, Legal, etc.) via the pageId property.
 */
export default class DirectoratePage extends React.Component<IDirectoratePageProps, IDirectoratePageState> {
  constructor(props: IDirectoratePageProps) {
    super(props);
    this.state = { loading: true, cards: [], announcements: [] };
  }

  public componentDidMount(): void {
    this.load();
  }

  public componentDidUpdate(prevProps: IDirectoratePageProps): void {
    if (prevProps.pageId !== this.props.pageId) {
      this.load();
    }
  }

  private load = async (): Promise<void> => {
    const { service, pageId } = this.props;
    const [cards, announcements] = await Promise.all([
      service.getHorizontalCards(pageId),
      service.getAnnouncements(pageId)
    ]);
    this.setState({ loading: false, cards, announcements });
  };

  public render(): JSX.Element {
    const { directorateName, subtitle } = this.props;
    const { cards, announcements, loading } = this.state;

    return (
      <div className={styles.directoratePage}>
        <header className={styles.header}>
          <h1 className={styles.title}>{directorateName}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>
        {loading && <div className={styles.empty}>Loading...</div>}
        <div className={styles.grid}>
          {cards.map((c) => (
            <a key={c.Id} className={styles.card} href={c.LinkUrl}>
              <h3 className={styles.cardTitle}>{c.Title}</h3>
              <p className={styles.cardDescription}>{c.Description}</p>
            </a>
          ))}
        </div>
        <div className={styles.announcements}>
          {announcements.map((a) => (
            <a key={a.Id} className={styles.announcementItem} href={a.LinkUrl}>
              {a.Title}
            </a>
          ))}
        </div>
      </div>
    );
  }
}
