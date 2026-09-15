import * as React from 'react';
import styles from './CarouselWithButton.module.scss';
import { ICarouselItem } from '../../../../Service/models/ICarouselItem';

export interface ICarouselWithButtonProps {
  items: ICarouselItem[];
}

/**
 * Local copy of the CarouselWithButton component, detached from
 * ../../carouselWithButton/components/CarouselWithButton (Task A) so
 * SPCorporateHub has zero file dependency on the un-forked original.
 * Behavior is identical to the original - pure decoupling.
 */
const CarouselWithButton: React.FC<ICarouselWithButtonProps> = ({ items }) => {
  const [index, setIndex] = React.useState(0);

  if (!items.length) {
    return null;
  }

  const next = (): void => setIndex((i) => (i + 1) % items.length);
  const prev = (): void => setIndex((i) => (i - 1 + items.length) % items.length);
  const active = items[index];

  return (
    <div className={styles.carousel}>
      <div className={styles.slideTrack} style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((item) => (
          <div key={item.Id} className={styles.slide} style={{ backgroundImage: `url(${item.ImageUrl})` }}>
            <div className={styles.slideContent}>
              <h3 className={styles.slideTitle}>{item.Title}</h3>
              <p className={styles.slideDescription}>{item.Description}</p>
              {item.ButtonUrl && (
                <a className={styles.slideButton} href={item.ButtonUrl}>
                  {item.ButtonText || 'Learn more'}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button type="button" className={styles.navPrev} onClick={prev} aria-label="Previous slide">
            &#8249;
          </button>
          <button type="button" className={styles.navNext} onClick={next} aria-label="Next slide">
            &#8250;
          </button>
        </>
      )}
      <div className={styles.dots}>
        {items.map((item, i) => (
          <button
            key={item.Id}
            type="button"
            className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
      <span className={styles.srOnly}>{active.Title}</span>
    </div>
  );
};

export default CarouselWithButton;
