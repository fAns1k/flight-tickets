import csv from 'csvtojson';
import haversine from 'haversine';

export interface IAirport {
  id: number;
  city: string;
  country: string;
  iata: string;
  icao: string;
  lat: number;
  lon: number;
  alt: number;
  timezone: string;
  dst: string;
  tzTimezone?: any;
  type: string;
  source: string;
}

export class AirportService {
  private airports?: IAirport[];

  async getDistanceBetweenAirports(
    departureCode: string,
    destinationCode: string
  ): Promise<number> {
    const airports = await this.findAll();
    const originAirport = airports.find((item) => item.iata == departureCode);
    const destAirport = airports.find((item) => item.iata == destinationCode);

    return haversine(originAirport, destAirport);
  }

  async findAll(): Promise<IAirport[]> {
    if (this.airports == null || this.airports?.length == 0) {
      this.airports = await this.readAirportsCsv();
    }

    return this.airports;
  }

  private async readAirportsCsv(): Promise<IAirport[]> {
    return csv({
      headers: [
        'id',
        'airportName',
        'city',
        'country',
        'iata',
        'icao',
        'latitude',
        'longitude',
        'alt',
        'timezone',
        'dst',
        'tzTimezone',
        'type',
        'source',
      ],
      checkType: true,
    }).fromFile('airports.dat');
  }
}
