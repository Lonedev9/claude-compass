export type DelegationStatus = 'Draft' | 'Active' | 'Expired' | 'Cancelled';

export interface IDelegationRecord {
  Id: number;
  Title: string;
  EmployeeName: string;
  EmployeeEmail: string;
  Designation: string;
  Department: string;
  DelegateName: string;
  DelegateEmail: string;
  DelegateDesignation: string;
  LeaveFrom: string;
  LeaveTo: string;
  DelegationFrom: string;
  DelegationTo: string;
  ScopeResponsibilities: string;
  ContactInformation: string;
  Status: DelegationStatus;
  SortOrder: number;
  IsActive: boolean;
}
