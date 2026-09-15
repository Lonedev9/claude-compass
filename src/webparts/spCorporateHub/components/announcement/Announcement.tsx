import * as React from 'react';
import styles from './Announcement.module.scss';
import { IAnnouncement } from '../../../../Service/models/IAnnouncement';

export interface IAnnouncementProps {
  announcements: IAnnouncement[];
}

/**
 * Local copy, detached from ../../announcement/components/Announcement
 * (Task A). Pure decoupling - behavior identical to the original.
 */
const Announcement: React.FC<IAnnouncementProps> = ({ announcements }) => (
  <div className={styles.announcement}>
    <h3 className={styles.title}>Announcements</h3>
    <ul className={styles.list}>
      {announcements.map((a) => (
        <li key={a.Id} className={styles.item}>
          <a className={styles.itemTitle} href={a.LinkUrl}>
            {a.Title}
          </a>
          <span className={styles.itemDate}>{a.PublishDate}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Announcement;
