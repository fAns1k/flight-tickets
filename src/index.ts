import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import csv from 'csvtojson';

import haversine from 'haversine';

const baseUrl = 'https://gist.githubusercontent.com/';
const endPoint =
  'bgdavidx/132a9e3b9c70897bc07cfa5ca25747be/raw/8dbbe1db38087fad4a8c8ade48e741d6fad8c872/gistfile1.txt';
const dateKeyRx = /time/i;
const PORT = 3000;

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

const api = axios.create({
  baseURL: baseUrl,
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
    const maxDurationInHours = Number.parseInt(maxDuration);

    console.log(
      `Params: ${minTime}, ${maxTime}, ${maxDurationInHours}, ${preferredCarrier}`
    );

    const allFlights = (await api.get<IFlight[]>(endPoint)).data;
    console.log('All flights, ', allFlights.length);

    const resultFlights: IFlight[] = allFlights.filter((v) => {
      const flightTime = flightTimeInHours(v);
      console.log(
        `Departure: ${v.departureTime.toLocaleString()}\n
         Arrival: ${v.arrivalTime.toLocaleString()}\n
         [flight time: ${flightTime}h; min:${minTime.toISOString()}; max:${maxTime.toISOString()}]`
      );

      return (
        flightTime <= maxDurationInHours &&
        v.departureTime.getTime() >= minTime.getTime() &&
        v.departureTime.getTime() <= maxTime.getTime()
      );
    });

    //make parallel calculations
    const scoredFlights = (
      await Promise.all(
        resultFlights.map(async (value) => {
          const flightTime = flightTimeInHours(value);
          const carrierCoefficient =
            value.carrier === preferredCarrier ? 0.9 : 1.0;
          const distance = await getDistanceBetweenAirports(
            value.origin,
            value.destination
          );

          value.score = flightTime * carrierCoefficient + distance;
          return value;
        })
      )
    ).sort((left, right) => right.score - left.score);

    console.log('Result flights, ', scoredFlights.length);
    res.status(201).send(JSON.stringify(scoredFlights));
  } catch (e) {
    console.log('Error', e);
    res.status(500).send({ msg: 'Unknown error' });
  }
});

app.listen(PORT, async () => {
  try {
    airports = await getAirports();
    console.log(`Server started...\nFound: ${airports.length} airports`);
  } catch (e) {
    console.log(`Cannot fetch airports`, e);
  }
});

function flightTimeInHours(value: IFlight): number {
  return Math.floor(
    ((value.arrivalTime.getTime() - value.departureTime.getTime()) /
      (1000 * 60 * 60)) %
      24
  );
}

async function getDistanceBetweenAirports(
  departureCode: string,
  destinationCode: string
): Promise<number> {
  const originAirport = airports.find((value) => value.iata == departureCode);
  const destAirport = airports.find((value) => value.iata == destinationCode);

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
  }).fromFile('airports.dat');
}
