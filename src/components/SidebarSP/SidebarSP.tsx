import * as React from 'react';
import styles from './SidebarSP.module.scss';
import { ISidebarSPProps } from './ISidebarSPProps';

/**
 * Fork of src/components/Sidebar, used exclusively by the 5 SP-prefixed web
 * parts (Task A) so the original Sidebar - still imported by the live,
 * un-forked web parts - is never touched.
 *
 * Fixes the mobile collapse/expand behavior (Task B): .mobileToggle and
 * .mobileHidden now drive an actual collapsible drawer below the tablet
 * breakpoint instead of being half-wired.
 */
const SidebarSP: React.FC<ISidebarSPProps> = ({ items, activeKey }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggle = (): void => setIsExpanded((prev) => !prev);

  return (
    <nav className={styles.sidebarSP} aria-label="Section navigation">
      <button
        type="button"
        className={styles.mobileToggle}
        aria-expanded={isExpanded}
        onClick={toggle}
      >
        <span className={styles.mobileToggleLabel}>Menu</span>
        <span className={`${styles.mobileToggleIcon} ${isExpanded ? styles.expanded : ''}`}>▾</span>
      </button>
      <ul className={`${styles.navList} ${!isExpanded ? styles.mobileHidden : ''}`}>
        {items.map((item) => (
          <li key={item.key} className={styles.navItem}>
            <a
              href={item.url}
              className={`${styles.navLink} ${item.key === activeKey ? styles.active : ''}`}
            >
              <span className={styles.navLabel}>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SidebarSP;
