import * as React from 'react';
import styles from './HorizontalCards.module.scss';
import { IHorizontalCard } from '../../../../Service/models/IHorizontalCard';

export interface IHorizontalCardsProps {
  cards: IHorizontalCard[];
}

/**
 * Local copy, detached from ../../horizontalCards/components/HorizontalCards
 * (Task A). Pure decoupling - behavior identical to the original.
 */
const HorizontalCards: React.FC<IHorizontalCardsProps> = ({ cards }) => (
  <div className={styles.horizontalCards}>
    {cards.map((card) => (
      <a key={card.Id} className={styles.card} href={card.LinkUrl}>
        {card.IconUrl && <img className={styles.cardIcon} src={card.IconUrl} alt="" />}
        <div className={styles.cardBody}>
          <h4 className={styles.cardTitle}>{card.Title}</h4>
          <p className={styles.cardDescription}>{card.Description}</p>
        </div>
      </a>
    ))}
  </div>
);

export default HorizontalCards;
