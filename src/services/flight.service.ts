import axios from 'axios';
import { AirportService } from './airport.service';

const baseUrl = 'https://gist.githubusercontent.com/';
const endPoint =
  'bgdavidx/132a9e3b9c70897bc07cfa5ca25747be/raw/8dbbe1db38087fad4a8c8ade48e741d6fad8c872/gistfile1.txt';
const dateKeyRx = /time/i;

export interface IFlight {
  departureTime: Date;
  arrivalTime: Date;
  carrier: string;
  origin: string;
  destination: string;
  score: number;
}

const api = axios.create({
  baseURL: baseUrl,
  transformResponse: (data) =>
    JSON.parse(data, (key, value) =>
      dateKeyRx.test(key) ? new Date(value) : value
    ),
});

export class FlightService {
  private airportService: AirportService;

  constructor(airportService: AirportService) {
    this.airportService = airportService;
  }

  async searchForFlights(
    minDate: Date,
    maxDate: Date,
    maxDurationInHours: number,
    preferredCarrier: string
  ): Promise<IFlight[]> {
    const allFlights = (await api.get<IFlight[]>(endPoint)).data;
    console.log('All flights, ', allFlights.length);

    const resultFlights = allFlights.filter((v) => {
      const flightTime = this.flightTimeInHours(v);
      console.log(
        `Departure: ${v.departureTime.toLocaleString()}\n
         Arrival: ${v.arrivalTime.toLocaleString()}\n
         [flight time: ${flightTime}h; min:${minDate.toISOString()}; max:${maxDate.toISOString()}]`
      );

      return (
        flightTime <= maxDurationInHours &&
        v.departureTime.getTime() >= minDate.getTime() &&
        v.departureTime.getTime() <= maxDate.getTime()
      );
    });

    //make parallel calculations
    return (
      await Promise.all(
        resultFlights.map(async (value) => {
          const flightTime = this.flightTimeInHours(value);
          const carrierCoefficient =
            value.carrier === preferredCarrier ? 0.9 : 1.0;
          const distance = await this.airportService.getDistanceBetweenAirports(
            value.origin,
            value.destination
          );

          value.score = flightTime * carrierCoefficient + distance;
          return value;
        })
      )
    ).sort((left, right) => right.score - left.score);
  }

  private flightTimeInHours(value: IFlight): number {
    return Math.floor(
      ((value.arrivalTime.getTime() - value.departureTime.getTime()) /
        (1000 * 60 * 60)) %
        24
    );
  }
}
