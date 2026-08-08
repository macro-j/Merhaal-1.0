import {
  getCuratedHotels,
  type HotelCity,
  type HotelKnowledge,
} from "../../shared/hotelsData";

export interface HotelsProvider {
  listHotels(city: HotelCity): Promise<readonly HotelKnowledge[]>;
}

export class CuratedHotelsProvider implements HotelsProvider {
  async listHotels(city: HotelCity): Promise<readonly HotelKnowledge[]> {
    return getCuratedHotels(city);
  }
}

export const curatedHotelsProvider = new CuratedHotelsProvider();
