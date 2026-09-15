import { IDataProvider } from '../../../Service/models/IDataProvider';

export interface IDirectoratePageProps {
  service: IDataProvider;
  pageId: string;
  directorateName: string;
  subtitle: string;
}
