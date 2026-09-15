import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import DirectoratePage from './components/DirectoratePage';
import { IDirectoratePageProps } from './components/IDirectoratePageProps';
import { Service } from '../../Service/Service';

export interface ISPDirectoratePageWebPartProps {
  pageId: string;
  directorateName: string;
  subtitle: string;
}

export default class SPDirectoratePageWebPart extends BaseClientSideWebPart<ISPDirectoratePageWebPartProps> {
  private service: Service;

  protected onInit(): Promise<void> {
    this.service = new Service(this.context);
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IDirectoratePageProps> = React.createElement(DirectoratePage, {
      service: this.service,
      pageId: this.properties.pageId || 'default',
      directorateName: this.properties.directorateName || 'Directorate',
      subtitle: this.properties.subtitle || ''
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'SP Directorate Page settings' },
          groups: [
            {
              groupName: 'General',
              groupFields: [
                PropertyPaneTextField('pageId', { label: 'Page identifier (unique per directorate)' }),
                PropertyPaneTextField('directorateName', { label: 'Directorate name' }),
                PropertyPaneTextField('subtitle', { label: 'Subtitle' })
              ]
            }
          ]
        }
      ]
    };
  }
}
