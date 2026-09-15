import { ICarouselItem } from '../../../Service/models/ICarouselItem';
import { IHorizontalCard } from '../../../Service/models/IHorizontalCard';
import { IAnnouncement } from '../../../Service/models/IAnnouncement';
import { IUpcomingEvent } from '../../../Service/models/IUpcomingEvent';
import { IExecutiveMessage } from '../../../Service/models/IExecutiveMessage';

export interface ICorporateHubState {
  loading: boolean;
  carouselItems: ICarouselItem[];
  horizontalCards: IHorizontalCard[];
  announcements: IAnnouncement[];
  upcomingEvents: IUpcomingEvent[];
  executiveMessage: IExecutiveMessage | undefined;
}
