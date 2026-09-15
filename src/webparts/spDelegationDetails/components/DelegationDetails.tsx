import * as React from 'react';
import styles from './DelegationDetails.module.scss';
import { IDelegationDetailsProps } from './IDelegationDetailsProps';
import { IDelegationRecord } from '../../../Service/models/IDelegationRecord';

export interface IDelegationDetailsState {
  loading: boolean;
  record: IDelegationRecord | undefined;
  notFound: boolean;
}

/**
 * SPDelegationDetailsWebPart's component (Task F, second new web part).
 * Reads `delegationId` from the query string and renders the full record.
 *
 * NOTE (naming): "Delegation of Authority" also refers, org-wide, to an
 * unrelated set of formal approval-authority-limit policy PDFs filed under
 * Document Center. This feature is a different, deliberately-named concept
 * (leave coverage) - the overlap is accepted, not an oversight.
 */
export default class DelegationDetails extends React.Component<IDelegationDetailsProps, IDelegationDetailsState> {
  constructor(props: IDelegationDetailsProps) {
    super(props);
    this.state = { loading: true, record: undefined, notFound: false };
  }

  public componentDidMount(): void {
    this.load();
  }

  private getDelegationIdFromQueryString(): number | undefined {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('delegationId');
    const id = raw ? parseInt(raw, 10) : NaN;
    return isNaN(id) ? undefined : id;
  }

  private load = async (): Promise<void> => {
    const id = this.getDelegationIdFromQueryString();
    if (id === undefined) {
      this.setState({ loading: false, notFound: true });
      return;
    }
    const record = await this.props.service.getDelegationById(id);
    this.setState({ loading: false, record, notFound: !record });
  };

  public render(): JSX.Element {
    const { loading, record, notFound } = this.state;

    if (loading) {
      return <div className={styles.delegationDetails}>Loading...</div>;
    }

    if (notFound || !record) {
      return (
        <div className={styles.delegationDetails}>
          <div className={styles.notFound}>No delegation record was found for this link.</div>
        </div>
      );
    }

    return (
      <div className={styles.delegationDetails}>
        <header className={styles.header}>
          <h1 className={styles.title}>{record.Title}</h1>
          <span className={styles.statusBadge}>{record.Status}</span>
        </header>

        <div className={styles.grid}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Employee on leave</h2>
            <dl className={styles.fieldList}>
              <dt>Employee</dt>
              <dd>{record.EmployeeName}</dd>
              <dt>Designation</dt>
              <dd>{record.Designation}</dd>
              <dt>Department</dt>
              <dd>{record.Department}</dd>
              <dt>Leave from</dt>
              <dd>{record.LeaveFrom}</dd>
              <dt>Leave to</dt>
              <dd>{record.LeaveTo}</dd>
            </dl>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Delegate</h2>
            <dl className={styles.fieldList}>
              <dt>Delegate</dt>
              <dd>{record.DelegateName}</dd>
              <dt>Delegate designation</dt>
              <dd>{record.DelegateDesignation}</dd>
              <dt>Delegation from</dt>
              <dd>{record.DelegationFrom}</dd>
              <dt>Delegation to</dt>
              <dd>{record.DelegationTo}</dd>
              <dt>Contact information</dt>
              <dd>{record.ContactInformation}</dd>
            </dl>
          </section>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Scope of responsibilities</h2>
          <p className={styles.scopeText}>{record.ScopeResponsibilities}</p>
        </section>
      </div>
    );
  }
}
