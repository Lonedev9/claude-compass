import { IQuickAccessItem } from './IQuickAccessItem';
import { ICarouselItem } from './ICarouselItem';
import { IHorizontalCard } from './IHorizontalCard';
import { IAnnouncement } from './IAnnouncement';
import { IUpcomingEvent } from './IUpcomingEvent';
import { IExecutiveMessage } from './IExecutiveMessage';
import { IPhotoGalleryImage } from './IPhotoGalleryImage';
import { IPhotoAlbum } from './IPhotoAlbum';
import { IDelegationRecord } from './IDelegationRecord';
import { IPersonalQuickAccessItem } from './IPersonalQuickAccessItem';

/**
 * Page-agnostic data contract shared by every web part (old and new).
 *
 * IMPORTANT: this interface backs web parts that are already live in the
 * app catalog. Existing methods must never change signature or be removed -
 * only append new methods here.
 */
export interface IDataProvider {
  // ---- Existing, page-scoped (pageId-filtered) content ------------------
  getQuickAccessItems(pageId: string): Promise<IQuickAccessItem[]>;
  addQuickAccessItem(item: Partial<IQuickAccessItem>): Promise<IQuickAccessItem>;
  updateQuickAccessItem(id: number, item: Partial<IQuickAccessItem>): Promise<void>;
  deleteQuickAccessItem(id: number): Promise<void>;

  getCarouselItems(pageId: string): Promise<ICarouselItem[]>;
  getHorizontalCards(pageId: string): Promise<IHorizontalCard[]>;
  getAnnouncements(pageId: string): Promise<IAnnouncement[]>;
  getUpcomingEvents(pageId: string): Promise<IUpcomingEvent[]>;
  getExecutiveMessage(pageId: string): Promise<IExecutiveMessage | undefined>;

  /** Legacy flat-folder photo gallery listing. Left untouched - superseded on SPIntranet by getLatestPhotoAlbums. */
  getPhotoGalleryImages(): Promise<IPhotoGalleryImage[]>;

  // ---- NEW: Task C - album-based photo gallery (SPIntranet only) --------
  /**
   * Lists only the subfolders (albums) directly under the Photo Albums
   * library, sorted by most recent modified date, newest first, capped to
   * `count`. Loose files sitting outside any folder are ignored. Each
   * album's thumbnail is its cover file, matched case-insensitively
   * against "cover.jpg".
   */
  getLatestPhotoAlbums(count: number): Promise<IPhotoAlbum[]>;
  /** All images inside a single album folder, for the lightbox/slideshow. */
  getPhotoAlbumImages(albumServerRelativeUrl: string): Promise<IPhotoAlbum>;

  // ---- NEW: Task F - Delegation of Authority (leave-coverage feature) ---
  /** Active records only (Status=Active, IsActive=Yes, today within [LeaveFrom, LeaveTo]), ordered by SortOrder. */
  getActiveDelegations(): Promise<IDelegationRecord[]>;
  getDelegationById(id: number): Promise<IDelegationRecord | undefined>;

  // ---- NEW: Task G - personal Quick Access (SPIntranet only) ------------
  /** Server-side filtered to the current user; never fetches other users' rows. */
  getPersonalQuickAccessItems(): Promise<IPersonalQuickAccessItem[]>;
  addPersonalQuickAccessItem(item: Partial<IPersonalQuickAccessItem>): Promise<IPersonalQuickAccessItem>;
  updatePersonalQuickAccessItem(id: number, item: Partial<IPersonalQuickAccessItem>): Promise<void>;
  deletePersonalQuickAccessItem(id: number): Promise<void>;
  reorderPersonalQuickAccessItems(orderedIds: number[]): Promise<void>;
}
