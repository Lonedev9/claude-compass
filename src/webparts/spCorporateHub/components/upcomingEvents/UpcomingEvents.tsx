import * as React from 'react';
import styles from './UpcomingEvents.module.scss';
import { IUpcomingEvent } from '../../../../Service/models/IUpcomingEvent';

export interface IUpcomingEventsProps {
  events: IUpcomingEvent[];
}

/**
 * Local copy, detached from ../../upcomingEvents/components/UpcomingEvents
 * (Task A). Pure decoupling - behavior identical to the original.
 */
const UpcomingEvents: React.FC<IUpcomingEventsProps> = ({ events }) => (
  <div className={styles.upcomingEvents}>
    <h3 className={styles.title}>Upcoming Events</h3>
    <ul className={styles.list}>
      {events.map((e) => (
        <li key={e.Id} className={styles.item}>
          <a className={styles.itemTitle} href={e.LinkUrl}>
            {e.Title}
          </a>
          <span className={styles.itemMeta}>
            {e.StartDate} - {e.Location}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default UpcomingEvents;
