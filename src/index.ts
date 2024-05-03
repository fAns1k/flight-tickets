import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import csv from 'csvtojson';

import haversine from 'haversine';

const BASE_URL = 'https://gist.githubusercontent.com/';
const END_POINT =
  'bgdavidx/132a9e3b9c70897bc07cfa5ca25747be/raw/8dbbe1db38087fad4a8c8ade48e741d6fad8c872/gistfile1.txt';

interface IFlight {
  departureTime: Date;
  arrivalTime: Date;
  carrier: string;
  origin: string;
  destination: string;
  score: number;
}

interface IAirport {
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

let airports: IAirport[];

const app = express();
app.use(bodyParser.json());

const dateKeyRx = /time/i;
const api = axios.create({
  baseURL: BASE_URL,
  transformResponse: (data) =>
    JSON.parse(data, (key, value) =>
      dateKeyRx.test(key) ? new Date(value) : value
    ),
});

app.post('/search', async (req: Request, res: Response) => {
  const { minDepartureTime, maxDepartureTime, maxDuration, preferredCarrier } =
    req.body;

  try {
    const minTime = new Date(minDepartureTime);
    const maxTime = new Date(maxDepartureTime);
    const maxDurationInMills = Number.parseInt(maxDuration) * 3600 * 1000;

    console.log(
      `Params: ${minTime}, ${maxTime}, ${maxDurationInMills}, ${preferredCarrier}`
    );

    const airports = await getAirports();
    const flights: IFlight[] = (
      await api.get<IFlight[]>(END_POINT)
    ).data.filter((v) => {
      console.log(
        `Flight time: ${flightTime(v) / 3600 / 1000} - max: ${
          maxDurationInMills / 3600 / 1000
        }\n Departure: ${v.departureTime.toISOString()} [min:${minTime.toISOString()}; max:${maxTime.toISOString()}]`
      );
      return (
        flightTime(v) <= maxDurationInMills &&
        v.departureTime >= minTime &&
        v.departureTime <= maxTime
      );
    });

    console.log('All flights, ', flights.length);

    const scoredFlights = await Promise.all(
      flights.map(async (value) => {
        const timeInAir = flightTime(value);

        const carrierDelta = value.carrier === preferredCarrier ? 0.9 : 1.0;
        const distance = await getDistanceBetweenAirports(
          value.origin,
          value.destination
        );
        value.score = timeInAir * carrierDelta + distance;
        return value;
      })
    );
    scoredFlights.sort((left, right) => {
      return right.score - left.score;
    });

    console.log('Result flights, ', scoredFlights.length);
    res.status(201).send(JSON.stringify(scoredFlights));
  } catch (e) {
    console.log('Error', e);
    res.status(500).send({ msg: 'Unknown error' });
  }
});

app.listen(3000, async () => {
  //receive initial cache data;
  airports = await getAirports();

  console.log(`Server started...\nFound: ${airports.length} airports to serve`);
});

function flightTime(value: IFlight): number {
  return value.arrivalTime.getTime() - value.departureTime.getTime();
}

async function getDistanceBetweenAirports(
  origin: string,
  destination: string
): Promise<number> {
  const originAirport = airports.find((value) => value.iata == origin);
  const destAirport = airports.find((value) => value.iata == destination);

  return haversine(originAirport, destAirport);
}

async function getAirports(): Promise<IAirport[]> {
  return await csv({
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
  }).fromFile('airports.dat.txt');
}
