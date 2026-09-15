import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import CorporateHub from './components/CorporateHub';
import { ICorporateHubProps } from './components/ICorporateHubProps';
import { Service } from '../../Service/Service';

export interface ISPCorporateHubWebPartProps {
  /** Unique per department page instance (e.g. "IT", "HR", "Procurement"). Scopes every widget's data. */
  pageId: string;
  /** Task D: editable title/subtitle, defaulting to the original hardcoded text. */
  hubTitle: string;
  subtitle: string;
}

export default class SPCorporateHubWebPart extends BaseClientSideWebPart<ISPCorporateHubWebPartProps> {
  private service: Service;

  protected onInit(): Promise<void> {
    this.service = new Service(this.context);
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<ICorporateHubProps> = React.createElement(CorporateHub, {
      service: this.service,
      // Falls back to the page's server-relative URL so two instances never
      // collide even if an editor forgets to set pageId explicitly.
      pageId: this.properties.pageId || this.context.pageContext.site.serverRequestPath || 'default',
      title: this.properties.hubTitle || 'CORPORATE HUB',
      subtitle: this.properties.subtitle || 'Connecting our people, strategy and organization',
      canEdit: this.context.pageContext.legacyPageContext ? !!this.context.pageContext.legacyPageContext.isSiteAdmin : false,
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
          header: { description: 'SP Corporate Hub page settings' },
          groups: [
            {
              groupName: 'General',
              groupFields: [
                PropertyPaneTextField('pageId', {
                  label: 'Page identifier (unique per department, e.g. IT, HR, Procurement)'
                }),
                PropertyPaneTextField('hubTitle', {
                  label: 'Title'
                }),
                PropertyPaneTextField('subtitle', {
                  label: 'Subtitle'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
