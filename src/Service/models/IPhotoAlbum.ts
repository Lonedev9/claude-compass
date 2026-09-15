export interface IPhotoAlbumImage {
  Name: string;
  ServerRelativeUrl: string;
}

export interface IPhotoAlbum {
  /** Folder name, e.g. "Back to School Drop-off 2026" */
  Name: string;
  ServerRelativeUrl: string;
  /** Server-relative URL of the album's cover image (case-insensitive "cover.jpg" match) */
  CoverImageUrl: string;
  ModifiedDate: string;
  /** Populated only when a single album's contents are requested for the lightbox */
  Images?: IPhotoAlbumImage[];
}
