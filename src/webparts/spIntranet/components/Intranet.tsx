import * as React from 'react';
import styles from './Intranet.module.scss';
import { IIntranetProps } from './IIntranetProps';
import { IIntranetState, IFiveSectionEntry } from './IIntranetState';
import { IPhotoAlbum } from '../../../Service/models/IPhotoAlbum';
import PhotoGalleryLightbox from './PhotoGalleryLightbox';
import DelegationCard from './DelegationCard';
import PersonalQuickAccess from './PersonalQuickAccess';

const DEFAULT_FIVE_SECTIONS: IFiveSectionEntry[] = [
  { key: 'Vision', title: 'Vision', body: 'Our vision statement.' },
  { key: 'Mission', title: 'Mission', body: 'Our mission statement.' },
  { key: 'Values', title: 'Values', body: 'Our values.' },
  { key: 'Policies', title: 'Policies', body: 'Corporate policies.' },
  // This entry's data is kept (other pages/consumers of fiveSectionsData may still
  // reference it) but it is never rendered as a generic card anymore - Task F
  // replaces its card at both render sites below with <DelegationCard />.
  { key: 'BusinessApps', title: 'Business Applications', body: 'Corporate business applications.' }
];

export default class Intranet extends React.Component<IIntranetProps, IIntranetState> {
  constructor(props: IIntranetProps) {
    super(props);
    this.state = {
      fiveSectionsData: DEFAULT_FIVE_SECTIONS,
      editModalOpenKey: undefined,
      photoAlbums: [],
      photoAlbumsLoading: true,
      lightboxAlbum: undefined,
      photoGalleryIndex: 0,
      activeDelegations: [],
      delegationsLoading: true,
      personalQuickAccess: [],
      personalQuickAccessLoading: true
    };
  }

  public componentDidMount(): void {
    this.loadPhotoAlbums();
    this.loadDelegations();
    this.loadPersonalQuickAccess();
  }

  private loadPhotoAlbums = async (): Promise<void> => {
    const albums = await this.props.service.getLatestPhotoAlbums(3);
    this.setState({ photoAlbums: albums, photoAlbumsLoading: false });
  };

  private loadDelegations = async (): Promise<void> => {
    const records = await this.props.service.getActiveDelegations();
    this.setState({ activeDelegations: records, delegationsLoading: false });
  };

  private loadPersonalQuickAccess = async (): Promise<void> => {
    const items = await this.props.service.getPersonalQuickAccessItems();
    this.setState({ personalQuickAccess: items, personalQuickAccessLoading: false });
  };

  private openAlbum = async (album: IPhotoAlbum): Promise<void> => {
    const full = await this.props.service.getPhotoAlbumImages(album.ServerRelativeUrl);
    this.setState({ lightboxAlbum: full, photoGalleryIndex: 0 });
  };

  private closeLightbox = (): void => {
    this.setState({ lightboxAlbum: undefined });
  };

  /**
   * Shared renderer for the Vision/Mission/Values/Policies/BusinessApps grid
   * entries. Both render sites (desktop grid + compact list) call this so
   * the BusinessApps -> Delegation swap (Task F) only has to special-case
   * once per call site, and the Vision/Mission/Values/Policies edit-modal
   * behavior is identical in both places, untouched.
   */
  private renderSectionCard = (entry: IFiveSectionEntry): JSX.Element => {
    if (entry.key === 'BusinessApps') {
      return (
        <DelegationCard
          key={entry.key}
          records={this.state.activeDelegations}
          loading={this.state.delegationsLoading}
        />
      );
    }
    return (
      <div key={entry.key} className={styles.sectionCard}>
        <h3 className={styles.cardTitle}>{entry.title}</h3>
        <p className={styles.sectionBody}>{entry.body}</p>
        <button
          type="button"
          className={styles.editLink}
          onClick={() => this.setState({ editModalOpenKey: entry.key })}
        >
          Edit
        </button>
      </div>
    );
  };

  public render(): React.ReactElement<IIntranetProps> {
    const { fiveSectionsData, photoAlbums, photoAlbumsLoading, lightboxAlbum, photoGalleryIndex } = this.state;

    return (
      <div className={styles.intranet}>
        {/* Render site 1: desktop 2x3 grid of sections (Vision/Mission/Values/Policies + Delegation card) */}
        <div className={styles.sectionsGrid}>
          {fiveSectionsData.map((entry) => this.renderSectionCard(entry))}
        </div>

        {/* Render site 2: compact stacked list shown at narrow widths - same data, same swap */}
        <div className={styles.sectionsCompactList}>
          {fiveSectionsData.map((entry) => this.renderSectionCard(entry))}
        </div>

        <div className={styles.photoGallerySection}>
          <div className={styles.cardHeaderRow}>
            <h3 className={styles.cardTitle}>Photo Gallery</h3>
            <a className={styles.seeAllLink} href={this.props.photoGalleryLinkUrl}>
              See all
            </a>
          </div>
          {photoAlbumsLoading && <div className={styles.cardEmpty}>Loading albums...</div>}
          {!photoAlbumsLoading && (
            <div className={styles.albumGrid}>
              {photoAlbums.map((album) => (
                <button
                  type="button"
                  key={album.ServerRelativeUrl}
                  className={styles.albumThumb}
                  onClick={() => this.openAlbum(album)}
                >
                  <img src={album.CoverImageUrl} alt={album.Name} />
                  <span className={styles.albumName}>{album.Name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <PersonalQuickAccess
          service={this.props.service}
          items={this.state.personalQuickAccess}
          loading={this.state.personalQuickAccessLoading}
          onChange={(items) => this.setState({ personalQuickAccess: items })}
        />

        {lightboxAlbum && (
          <PhotoGalleryLightbox
            album={lightboxAlbum}
            startIndex={photoGalleryIndex}
            onClose={this.closeLightbox}
          />
        )}
      </div>
    );
  }
}
