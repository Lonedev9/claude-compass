import { IPhotoAlbum } from '../../../Service/models/IPhotoAlbum';
import { IDelegationRecord } from '../../../Service/models/IDelegationRecord';
import { IPersonalQuickAccessItem } from '../../../Service/models/IPersonalQuickAccessItem';

export interface IFiveSectionEntry {
  key: 'Vision' | 'Mission' | 'Values' | 'Policies' | 'BusinessApps';
  title: string;
  body: string;
}

export interface IIntranetState {
  // Vision/Mission/Values/Policies + (legacy) Business Applications section data.
  // 'BusinessApps' entry is no longer rendered as a generic card (Task F) - the
  // Delegation of Authority card is rendered in its place at both render sites -
  // but the entry/edit-modal plumbing for the other four sections is untouched.
  fiveSectionsData: IFiveSectionEntry[];
  editModalOpenKey: string | undefined;

  // Task C - album-based photo gallery
  photoAlbums: IPhotoAlbum[];
  photoAlbumsLoading: boolean;
  lightboxAlbum: IPhotoAlbum | undefined;
  photoGalleryIndex: number;

  // Task F - Delegation of Authority card
  activeDelegations: IDelegationRecord[];
  delegationsLoading: boolean;

  // Task G - personal Quick Access
  personalQuickAccess: IPersonalQuickAccessItem[];
  personalQuickAccessLoading: boolean;
}
