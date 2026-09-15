import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import Applications from './components/Applications';
import { IApplicationsProps } from './components/IApplicationsProps';
import { Service } from '../../Service/Service';

export interface ISPApplicationsWebPartProps {
  pageId: string;
}

export default class SPApplicationsWebPart extends BaseClientSideWebPart<ISPApplicationsWebPartProps> {
  private service: Service;

  protected onInit(): Promise<void> {
    this.service = new Service(this.context);
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IApplicationsProps> = React.createElement(Applications, {
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
          header: { description: 'SP Applications settings' },
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
