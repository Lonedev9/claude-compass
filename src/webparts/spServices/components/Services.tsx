import * as React from 'react';
import styles from './Services.module.scss';
import { IServicesProps } from './IServicesProps';
import { IHorizontalCard } from '../../../Service/models/IHorizontalCard';

export interface IServicesState {
  loading: boolean;
  services: IHorizontalCard[];
}

/**
 * Task A/E fork of services -> SPServices. No functional/content changes
 * beyond forking (new class/manifest id, SidebarSP) and the Task B
 * responsive pass - otherwise behaves identically to the original.
 */
export default class Services extends React.Component<IServicesProps, IServicesState> {
  constructor(props: IServicesProps) {
    super(props);
    this.state = { loading: true, services: [] };
  }

  public componentDidMount(): void {
    this.load();
  }

  private load = async (): Promise<void> => {
    const services = await this.props.service.getHorizontalCards(this.props.pageId);
    this.setState({ services, loading: false });
  };

  public render(): JSX.Element {
    const { services, loading } = this.state;
    return (
      <div className={styles.services}>
        <h2 className={styles.title}>Services</h2>
        {loading && <div className={styles.empty}>Loading...</div>}
        <div className={styles.grid}>
          {services.map((s) => (
            <a key={s.Id} className={styles.card} href={s.LinkUrl}>
              {s.IconUrl && <img className={styles.icon} src={s.IconUrl} alt="" />}
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{s.Title}</h3>
                <p className={styles.cardDescription}>{s.Description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }
}
