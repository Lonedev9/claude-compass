import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFx, SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import '@pnp/sp/site-users/web';

import { IDataProvider } from './models/IDataProvider';
import { IQuickAccessItem } from './models/IQuickAccessItem';
import { ICarouselItem } from './models/ICarouselItem';
import { IHorizontalCard } from './models/IHorizontalCard';
import { IAnnouncement } from './models/IAnnouncement';
import { IUpcomingEvent } from './models/IUpcomingEvent';
import { IExecutiveMessage } from './models/IExecutiveMessage';
import { IPhotoGalleryImage } from './models/IPhotoGalleryImage';
import { IPhotoAlbum } from './models/IPhotoAlbum';
import { IDelegationRecord, DelegationStatus } from './models/IDelegationRecord';
import { IPersonalQuickAccessItem, MAX_PERSONAL_QUICK_ACCESS_ITEMS, isSafeUrl } from './models/IPersonalQuickAccessItem';

// ---- List / library names (site-relative) ------------------------------
const QUICK_ACCESS_LIST = 'Quick Access';
const CAROUSEL_LIST = 'Carousel';
const HORIZONTAL_CARDS_LIST = 'Horizontal Cards';
const ANNOUNCEMENTS_LIST = 'Announcements';
const EVENTS_LIST = 'Upcoming Events';
const EXECUTIVE_MESSAGE_LIST = 'Executive Message';
/** Legacy flat listing - left as-is; getPhotoGalleryImages must not change. */
const PHOTO_GALLERY_LIBRARY = '/sites/MPIntranet/PhotoGallery';
/** CONFIRMED against the live tenant (Task C): real library is "Photo Albums", not "PhotoGallery". */
const PHOTO_ALBUMS_LIBRARY = '/sites/MPIntranet/Photo Albums';
const DELEGATION_LIST = 'Delegation of Authority';
const PERSONAL_QUICK_ACCESS_LIST = 'MP Personal Quick Access';

/**
 * Page-agnostic backend, shared by every web part (old and new).
 * Existing methods are reused unchanged by the still-live, un-forked web
 * parts - only append new methods here, never alter an existing signature.
 */
export class Service implements IDataProvider {
  private sp: SPFI;

  constructor(context: WebPartContext) {
    this.sp = spfi().using(SPFx(context));
  }

  // =========================================================================
  // Existing, page-scoped content (pageId-filtered) - UNCHANGED behavior
  // =========================================================================

  public async getQuickAccessItems(pageId: string): Promise<IQuickAccessItem[]> {
    const items = await this.sp.web.lists
      .getByTitle(QUICK_ACCESS_LIST)
      .items.filter(`PageId eq '${this.escapeODataString(pageId)}'`)
      .orderBy('SortOrder', true)();
    return items.map(this.mapQuickAccessItem);
  }

  public async addQuickAccessItem(item: Partial<IQuickAccessItem>): Promise<IQuickAccessItem> {
    const result = await this.sp.web.lists.getByTitle(QUICK_ACCESS_LIST).items.add({
      Title: item.Title,
      Url: item.Url,
      Icon: item.Icon,
      SortOrder: item.SortOrder,
      PageId: item.PageId
    });
    return this.mapQuickAccessItem(result);
  }

  public async updateQuickAccessItem(id: number, item: Partial<IQuickAccessItem>): Promise<void> {
    await this.sp.web.lists.getByTitle(QUICK_ACCESS_LIST).items.getById(id).update({
      Title: item.Title,
      Url: item.Url,
      Icon: item.Icon,
      SortOrder: item.SortOrder
    });
  }

  public async deleteQuickAccessItem(id: number): Promise<void> {
    await this.sp.web.lists.getByTitle(QUICK_ACCESS_LIST).items.getById(id).delete();
  }

  public async getCarouselItems(pageId: string): Promise<ICarouselItem[]> {
    const items = await this.sp.web.lists
      .getByTitle(CAROUSEL_LIST)
      .items.filter(`PageId eq '${this.escapeODataString(pageId)}'`)
      .orderBy('SortOrder', true)();
    return items.map((i: any) => ({
      Id: i.Id,
      Title: i.Title,
      Description: i.Description,
      ImageUrl: i.ImageUrl,
      ButtonText: i.ButtonText,
      ButtonUrl: i.ButtonUrl,
      SortOrder: i.SortOrder,
      PageId: i.PageId
    }));
  }

  public async getHorizontalCards(pageId: string): Promise<IHorizontalCard[]> {
    const items = await this.sp.web.lists
      .getByTitle(HORIZONTAL_CARDS_LIST)
      .items.filter(`PageId eq '${this.escapeODataString(pageId)}'`)
      .orderBy('SortOrder', true)();
    return items.map((i: any) => ({
      Id: i.Id,
      Title: i.Title,
      Description: i.Description,
      IconUrl: i.IconUrl,
      LinkUrl: i.LinkUrl,
      SortOrder: i.SortOrder,
      PageId: i.PageId
    }));
  }

  public async getAnnouncements(pageId: string): Promise<IAnnouncement[]> {
    const items = await this.sp.web.lists
      .getByTitle(ANNOUNCEMENTS_LIST)
      .items.filter(`PageId eq '${this.escapeODataString(pageId)}'`)
      .orderBy('PublishDate', false)();
    return items.map((i: any) => ({
      Id: i.Id,
      Title: i.Title,
      Body: i.Body,
      PublishDate: i.PublishDate,
      LinkUrl: i.LinkUrl,
      PageId: i.PageId
    }));
  }

  public async getUpcomingEvents(pageId: string): Promise<IUpcomingEvent[]> {
    const items = await this.sp.web.lists
      .getByTitle(EVENTS_LIST)
      .items.filter(`PageId eq '${this.escapeODataString(pageId)}'`)
      .orderBy('StartDate', true)();
    return items.map((i: any) => ({
      Id: i.Id,
      Title: i.Title,
      StartDate: i.StartDate,
      EndDate: i.EndDate,
      Location: i.Location,
      LinkUrl: i.LinkUrl,
      PageId: i.PageId
    }));
  }

  public async getExecutiveMessage(pageId: string): Promise<IExecutiveMessage | undefined> {
    const items = await this.sp.web.lists
      .getByTitle(EXECUTIVE_MESSAGE_LIST)
      .items.filter(`PageId eq '${this.escapeODataString(pageId)}'`)
      .top(1)();
    if (!items.length) {
      return undefined;
    }
    const i: any = items[0];
    return {
      Id: i.Id,
      ExecutiveName: i.ExecutiveName,
      ExecutiveTitle: i.ExecutiveTitle,
      Message: i.Message,
      PhotoUrl: i.PhotoUrl,
      PageId: i.PageId
    };
  }

  /** Legacy flat-folder listing. Left untouched per Task C instructions. */
  public async getPhotoGalleryImages(): Promise<IPhotoGalleryImage[]> {
    const files = await this.sp.web.getFolderByServerRelativePath(PHOTO_GALLERY_LIBRARY).files();
    return files.map((f: any) => ({
      Name: f.Name,
      ServerRelativeUrl: f.ServerRelativeUrl,
      TimeCreated: f.TimeCreated
    }));
  }

  // =========================================================================
  // NEW - Task C: album-based photo gallery (SPIntranet only)
  // =========================================================================

  public async getLatestPhotoAlbums(count: number): Promise<IPhotoAlbum[]> {
    const rootFolder = this.sp.web.getFolderByServerRelativePath(PHOTO_ALBUMS_LIBRARY);
    const subFolders: any[] = await rootFolder.folders();

    // Loose files sitting outside any album folder are irrelevant here -
    // rootFolder.folders() already returns only subfolders, never files.
    const albums = subFolders
      // SharePoint list/library system folders (e.g. "Forms") should never surface as albums.
      .filter((f) => f.Name !== 'Forms')
      .sort((a, b) => new Date(b.TimeLastModified).getTime() - new Date(a.TimeLastModified).getTime())
      .slice(0, count);

    const results: IPhotoAlbum[] = [];
    for (const folder of albums) {
      const coverUrl = await this.findCoverImageUrl(folder.ServerRelativeUrl);
      results.push({
        Name: folder.Name,
        ServerRelativeUrl: folder.ServerRelativeUrl,
        CoverImageUrl: coverUrl,
        ModifiedDate: folder.TimeLastModified
      });
    }
    return results;
  }

  public async getPhotoAlbumImages(albumServerRelativeUrl: string): Promise<IPhotoAlbum> {
    const folder = await this.sp.web.getFolderByServerRelativePath(albumServerRelativeUrl)();
    const files: any[] = await this.sp.web.getFolderByServerRelativePath(albumServerRelativeUrl).files();
    const images = files
      .filter((f) => this.isImageFile(f.Name))
      .map((f) => ({ Name: f.Name, ServerRelativeUrl: f.ServerRelativeUrl }));
    return {
      Name: folder.Name,
      ServerRelativeUrl: folder.ServerRelativeUrl,
      CoverImageUrl: await this.findCoverImageUrl(albumServerRelativeUrl),
      ModifiedDate: folder.TimeLastModified,
      Images: images
    };
  }

  /** Case-insensitive match against "cover.jpg" - confirmed both "Cover.jpg" and "cover.jpg" exist in the live tenant. */
  private async findCoverImageUrl(albumServerRelativeUrl: string): Promise<string> {
    const files: any[] = await this.sp.web.getFolderByServerRelativePath(albumServerRelativeUrl).files();
    const cover = files.filter((f) => f.Name.toLowerCase() === 'cover.jpg')[0];
    if (cover) {
      return cover.ServerRelativeUrl;
    }
    // Fallback: no cover file present - use the first image in the album so the thumbnail is never blank.
    const firstImage = files.filter((f) => this.isImageFile(f.Name))[0];
    return firstImage ? firstImage.ServerRelativeUrl : '';
  }

  private isImageFile(name: string): boolean {
    return /\.(jpe?g|png|gif|bmp|webp)$/i.test(name);
  }

  // =========================================================================
  // NEW - Task F: Delegation of Authority (leave-coverage feature)
  // =========================================================================

  public async getActiveDelegations(): Promise<IDelegationRecord[]> {
    const today = this.toIsoDate(new Date());
    // Status/IsActive are filtered server-side; the two date-range comparisons are also
    // pushed into the OData filter so no inactive rows are ever pulled to the client.
    const filter = [
      `Status eq 'Active'`,
      `IsActive eq 1`,
      `LeaveFrom le datetime'${today}'`,
      `LeaveTo ge datetime'${today}'`
    ].join(' and ');

    const items = await this.sp.web.lists
      .getByTitle(DELEGATION_LIST)
      .items.filter(filter)
      .orderBy('SortOrder', true)();

    return items.map(this.mapDelegationRecord);
  }

  public async getDelegationById(id: number): Promise<IDelegationRecord | undefined> {
    try {
      const i = await this.sp.web.lists.getByTitle(DELEGATION_LIST).items.getById(id)();
      return this.mapDelegationRecord(i);
    } catch {
      return undefined;
    }
  }

  private mapDelegationRecord(i: any): IDelegationRecord {
    return {
      Id: i.Id,
      Title: i.Title,
      EmployeeName: i.Employee ? i.Employee.Title : i.EmployeeName,
      EmployeeEmail: i.Employee ? i.Employee.EMail : '',
      Designation: i.Designation,
      Department: i.Department,
      DelegateName: i.Delegate ? i.Delegate.Title : i.DelegateName,
      DelegateEmail: i.Delegate ? i.Delegate.EMail : '',
      DelegateDesignation: i.DelegateDesignation,
      LeaveFrom: i.LeaveFrom,
      LeaveTo: i.LeaveTo,
      DelegationFrom: i.DelegationFrom,
      DelegationTo: i.DelegationTo,
      ScopeResponsibilities: i.ScopeResponsibilities,
      ContactInformation: i.ContactInformation,
      Status: i.Status as DelegationStatus,
      SortOrder: i.SortOrder,
      IsActive: !!i.IsActive
    };
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // =========================================================================
  // NEW - Task G: personal Quick Access (SPIntranet only, max 5 per user)
  // =========================================================================

  public async getPersonalQuickAccessItems(): Promise<IPersonalQuickAccessItem[]> {
    const ownerKey = await this.getCurrentUserKey();
    // Filtered server-side by OwnerKey - never fetch all users' rows to the client.
    const items = await this.sp.web.lists
      .getByTitle(PERSONAL_QUICK_ACCESS_LIST)
      .items.filter(`OwnerKey eq '${this.escapeODataString(ownerKey)}'`)
      .orderBy('SortOrder', true)();
    return items.map(this.mapPersonalQuickAccessItem);
  }

  public async addPersonalQuickAccessItem(item: Partial<IPersonalQuickAccessItem>): Promise<IPersonalQuickAccessItem> {
    if (!isSafeUrl(item.Url || '')) {
      throw new Error('URL must use http:, https:, mailto: or tel: - rejected.');
    }
    const ownerKey = await this.getCurrentUserKey();

    // Server-side cap enforcement: re-check the current count even if the UI's
    // disabled-at-5 guard was bypassed (e.g. a direct API call).
    const existing = await this.sp.web.lists
      .getByTitle(PERSONAL_QUICK_ACCESS_LIST)
      .items.filter(`OwnerKey eq '${this.escapeODataString(ownerKey)}'`)();
    if (existing.length >= MAX_PERSONAL_QUICK_ACCESS_ITEMS) {
      throw new Error(`Maximum of ${MAX_PERSONAL_QUICK_ACCESS_ITEMS} personal shortcuts reached.`);
    }

    const currentUser = await this.sp.web.currentUser();
    const result = await this.sp.web.lists.getByTitle(PERSONAL_QUICK_ACCESS_LIST).items.add({
      Title: item.Title,
      Url: item.Url,
      Icon: item.Icon,
      SortOrder: item.SortOrder ?? existing.length,
      OwnerId: currentUser.Id,
      OwnerKey: ownerKey
    });
    return this.mapPersonalQuickAccessItem(result);
  }

  public async updatePersonalQuickAccessItem(id: number, item: Partial<IPersonalQuickAccessItem>): Promise<void> {
    if (item.Url !== undefined && !isSafeUrl(item.Url)) {
      throw new Error('URL must use http:, https:, mailto: or tel: - rejected.');
    }
    // List-level "read/write items created by the user" permissions mean SharePoint
    // itself rejects this call if it isn't the owner's own item - no ownership
    // re-check is needed (or possible without an extra round trip) here.
    await this.sp.web.lists.getByTitle(PERSONAL_QUICK_ACCESS_LIST).items.getById(id).update({
      Title: item.Title,
      Url: item.Url,
      Icon: item.Icon,
      SortOrder: item.SortOrder
    });
  }

  public async deletePersonalQuickAccessItem(id: number): Promise<void> {
    await this.sp.web.lists.getByTitle(PERSONAL_QUICK_ACCESS_LIST).items.getById(id).delete();
  }

  public async reorderPersonalQuickAccessItems(orderedIds: number[]): Promise<void> {
    const list = this.sp.web.lists.getByTitle(PERSONAL_QUICK_ACCESS_LIST);
    await Promise.all(orderedIds.map((id, index) => list.items.getById(id).update({ SortOrder: index })));
  }

  private async getCurrentUserKey(): Promise<string> {
    const user = await this.sp.web.currentUser();
    return user.LoginName;
  }

  private mapPersonalQuickAccessItem(i: any): IPersonalQuickAccessItem {
    return {
      Id: i.Id,
      Title: i.Title,
      Url: i.Url,
      Icon: i.Icon,
      SortOrder: i.SortOrder,
      OwnerKey: i.OwnerKey
    };
  }

  private mapQuickAccessItem(i: any): IQuickAccessItem {
    return {
      Id: i.Id,
      Title: i.Title,
      Url: i.Url,
      Icon: i.Icon,
      SortOrder: i.SortOrder,
      PageId: i.PageId
    };
  }

  private escapeODataString(value: string): string {
    return (value || '').replace(/'/g, "''");
  }
}
