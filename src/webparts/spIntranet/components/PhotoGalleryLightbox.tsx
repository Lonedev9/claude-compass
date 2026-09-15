import * as React from 'react';
import styles from './Intranet.module.scss';
import { IPhotoAlbum } from '../../../Service/models/IPhotoAlbum';

export interface IPhotoGalleryLightboxProps {
  album: IPhotoAlbum;
  startIndex: number;
  onClose: () => void;
}

/**
 * Simple lightbox with next/prev, reusing the same photoGalleryIndex /
 * translateX carousel pattern as the rest of the page, scoped to a single
 * album's images (Task C).
 */
const PhotoGalleryLightbox: React.FC<IPhotoGalleryLightboxProps> = ({ album, startIndex, onClose }) => {
  const [index, setIndex] = React.useState(startIndex);
  const images = album.Images || [];

  const next = (): void => setIndex((i) => (i + 1) % images.length);
  const prev = (): void => setIndex((i) => (i - 1 + images.length) % images.length);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  if (!images.length) {
    return null;
  }

  return (
    <div className={styles.lightboxOverlay} role="dialog" aria-modal="true" aria-label={`${album.Name} photo album`}>
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        &times;
      </button>
      <button type="button" className={styles.lightboxPrev} onClick={prev} aria-label="Previous photo">
        &#8249;
      </button>
      <div className={styles.lightboxTrack}>
        <div
          className={styles.lightboxSlides}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((img) => (
            <div key={img.ServerRelativeUrl} className={styles.lightboxSlide}>
              <img src={img.ServerRelativeUrl} alt={img.Name} />
            </div>
          ))}
        </div>
      </div>
      <button type="button" className={styles.lightboxNext} onClick={next} aria-label="Next photo">
        &#8250;
      </button>
      <div className={styles.lightboxCaption}>
        {album.Name} - {index + 1} / {images.length}
      </div>
    </div>
  );
};

export default PhotoGalleryLightbox;
