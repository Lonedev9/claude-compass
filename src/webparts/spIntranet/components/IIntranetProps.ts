import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IDataProvider } from '../../../Service/models/IDataProvider';

export interface IIntranetProps {
  service: IDataProvider;
  photoGalleryLinkUrl: string;
  context: WebPartContext;
}
