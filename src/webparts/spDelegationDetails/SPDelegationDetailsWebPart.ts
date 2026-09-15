import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import DelegationDetails from './components/DelegationDetails';
import { IDelegationDetailsProps } from './components/IDelegationDetailsProps';
import { Service } from '../../Service/Service';

// This web part has no configurable properties - it is entirely driven by
// the ?delegationId= query string parameter of the page it's placed on
// (e.g. /sites/MPIntranet/SitePages/Delegation-of-Authority.aspx).
export type ISPDelegationDetailsWebPartProps = Record<string, never>;

export default class SPDelegationDetailsWebPart extends BaseClientSideWebPart<ISPDelegationDetailsWebPartProps> {
  private service: Service;

  protected onInit(): Promise<void> {
    this.service = new Service(this.context);
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IDelegationDetailsProps> = React.createElement(DelegationDetails, {
      service: this.service
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
          header: { description: 'Delegation of Authority details' },
          groups: []
        }
      ]
    };
  }
}
