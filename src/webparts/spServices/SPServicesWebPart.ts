import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import Services from './components/Services';
import { IServicesProps } from './components/IServicesProps';
import { Service } from '../../Service/Service';

export interface ISPServicesWebPartProps {
  pageId: string;
}

export default class SPServicesWebPart extends BaseClientSideWebPart<ISPServicesWebPartProps> {
  private service: Service;

  protected onInit(): Promise<void> {
    this.service = new Service(this.context);
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IServicesProps> = React.createElement(Services, {
      service: this.service,
      pageId: this.properties.pageId || 'default'
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
          header: { description: 'SP Services settings' },
          groups: [
            {
              groupName: 'General',
              groupFields: [PropertyPaneTextField('pageId', { label: 'Page identifier' })]
            }
          ]
        }
      ]
    };
  }
}
