import * as React from 'react';
import styles from './CorporateHub.module.scss';
import { ICorporateHubProps } from './ICorporateHubProps';
import { ICorporateHubState } from './ICorporateHubState';

import CarouselWithButton from './carouselWithButton/CarouselWithButton';
import QuickAccess from './quickAccess/QuickAccess';
import HorizontalCards from './horizontalCards/HorizontalCards';
import Announcement from './announcement/Announcement';
import UpcomingEvents from './upcomingEvents/UpcomingEvents';
import ExecutiveMessage from './executiveMessage/ExecutiveMessage';

/**
 * SPCorporateHub container (Task A fork of corporateHub/components/CorporateHub).
 *
 * All six sibling components below are LOCAL copies - CorporateHub.tsx no
 * longer imports ../../<name>/components/<Name> from the un-forked
 * originals, so this web part has zero file dependency on them.
 *
 * Task D: title/subtitle are now props sourced from the property pane
 * (see SPCorporateHubWebPart.ts), defaulting to the original hardcoded
 * "CORPORATE HUB" / "Connecting our people, strategy and organization" text
 * so nothing changes visually until an editor edits it.
 *
 * Every widget below is fetched scoped to `this.props.pageId` - this page
 * instance's own department - so no content is ever shared across
 * department pages (Task D / Task H).
 */
export default class CorporateHub extends React.Component<ICorporateHubProps, ICorporateHubState> {
  constructor(props: ICorporateHubProps) {
    super(props);
    this.state = {
      loading: true,
      carouselItems: [],
      horizontalCards: [],
      announcements: [],
      upcomingEvents: [],
      executiveMessage: undefined
    };
  }

  public componentDidMount(): void {
    this.load();
  }

  public componentDidUpdate(prevProps: ICorporateHubProps): void {
    if (prevProps.pageId !== this.props.pageId) {
      this.load();
    }
  }

  private load = async (): Promise<void> => {
    const { service, pageId } = this.props;
    this.setState({ loading: true });
    const [carouselItems, horizontalCards, announcements, upcomingEvents, executiveMessage] = await Promise.all([
      service.getCarouselItems(pageId),
      service.getHorizontalCards(pageId),
      service.getAnnouncements(pageId),
      service.getUpcomingEvents(pageId),
      service.getExecutiveMessage(pageId)
    ]);
    this.setState({
      loading: false,
      carouselItems,
      horizontalCards,
      announcements,
      upcomingEvents,
      executiveMessage
    });
  };

  public render(): React.ReactElement<ICorporateHubProps> {
    const { title, subtitle, service, pageId, canEdit } = this.props;
    const { carouselItems, horizontalCards, announcements, upcomingEvents, executiveMessage } = this.state;

    return (
      <div className={styles.corporateHub}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        <CarouselWithButton items={carouselItems} />

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <HorizontalCards cards={horizontalCards} />
            <Announcement announcements={announcements} />
            <ExecutiveMessage message={executiveMessage} />
          </div>
          <div className={styles.sideColumn}>
            <QuickAccess service={service} pageId={pageId} canEdit={canEdit} />
            <UpcomingEvents events={upcomingEvents} />
          </div>
        </div>
      </div>
    );
  }
}
