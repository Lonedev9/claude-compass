import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IDataProvider } from '../../../Service/models/IDataProvider';

export interface ICorporateHubProps {
  service: IDataProvider;
  /** Unique per department page instance - e.g. "IT", "HR", "Procurement". Drives every widget's data scope. */
  pageId: string;
  /** Editable via property pane (Task D). Defaults match the current on-screen text. */
  title: string;
  subtitle: string;
  canEdit: boolean;
  context: WebPartContext;
}
