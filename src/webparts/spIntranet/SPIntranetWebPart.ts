import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import Intranet from './components/Intranet';
import { IIntranetProps } from './components/IIntranetProps';
import { Service } from '../../Service/Service';

export interface ISPIntranetWebPartProps {
  photoGalleryLinkUrl: string;
}

export default class SPIntranetWebPart extends BaseClientSideWebPart<ISPIntranetWebPartProps> {
  private service: Service;

  protected onInit(): Promise<void> {
    this.service = new Service(this.context);
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IIntranetProps> = React.createElement(Intranet, {
      service: this.service,
      photoGalleryLinkUrl: this.properties.photoGalleryLinkUrl || '/sites/MPIntranet/Photo Albums',
      context: this.context
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
          header: { description: 'SP Intranet homepage settings' },
          groups: [
            {
              groupName: 'General',
              groupFields: [
                PropertyPaneTextField('photoGalleryLinkUrl', {
                  label: 'Photo library "See all" link'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
