import * as React from 'react';
import styles from './Applications.module.scss';
import { IApplicationsProps } from './IApplicationsProps';
import { IHorizontalCard } from '../../../Service/models/IHorizontalCard';

export interface IApplicationsState {
  loading: boolean;
  apps: IHorizontalCard[];
}

/**
 * Task A/E fork of applications -> SPApplications. No functional/content
 * changes beyond forking and the Task B responsive pass.
 */
export default class Applications extends React.Component<IApplicationsProps, IApplicationsState> {
  constructor(props: IApplicationsProps) {
    super(props);
    this.state = { loading: true, apps: [] };
  }

  public componentDidMount(): void {
    this.load();
  }

  private load = async (): Promise<void> => {
    const apps = await this.props.service.getHorizontalCards(this.props.pageId);
    this.setState({ apps, loading: false });
  };

  public render(): JSX.Element {
    const { apps, loading } = this.state;
    return (
      <div className={styles.applications}>
        <h2 className={styles.title}>Applications</h2>
        {loading && <div className={styles.empty}>Loading...</div>}
        <div className={styles.grid}>
          {apps.map((a) => (
            <a key={a.Id} className={styles.card} href={a.LinkUrl}>
              {a.IconUrl && <img className={styles.icon} src={a.IconUrl} alt="" />}
              <span className={styles.cardTitle}>{a.Title}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }
}
