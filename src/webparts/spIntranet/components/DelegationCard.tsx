import * as React from 'react';
import styles from './Intranet.module.scss';
import { IDelegationRecord } from '../../../Service/models/IDelegationRecord';

export interface IDelegationCardProps {
  records: IDelegationRecord[];
  loading: boolean;
}

/**
 * Task F: replaces the bottom-right "Business Applications" card. Renders
 * active delegation-of-authority (leave-coverage) records; clicking one
 * navigates to the standalone SPDelegationDetails page.
 */
const DelegationCard: React.FC<IDelegationCardProps> = ({ records, loading }) => {
  const goToDetails = (id: number): void => {
    window.location.href = `/sites/MPIntranet/SitePages/Delegation-of-Authority.aspx?delegationId=${id}`;
  };

  return (
    <div className={styles.delegationCard}>
      <h3 className={styles.cardTitle}>Delegation of Authority</h3>
      {loading && <div className={styles.cardEmpty}>Loading...</div>}
      {!loading && records.length === 0 && (
        <div className={styles.cardEmpty}>No active delegations right now.</div>
      )}
      {!loading && records.length > 0 && (
        <ul className={styles.delegationList}>
          {records.map((r) => (
            <li key={r.Id} className={styles.delegationRow}>
              <button
                type="button"
                className={styles.delegationRowButton}
                onClick={() => goToDetails(r.Id)}
              >
                <span className={styles.delegationEmployee}>{r.EmployeeName}</span>
                <span className={styles.delegationDesignation}>{r.Designation}</span>
                <span className={styles.delegationDates}>
                  {r.LeaveFrom} - {r.LeaveTo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DelegationCard;
