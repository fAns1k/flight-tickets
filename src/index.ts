import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { FlightService } from './services/flight.service';
import { AirportService } from './services/airport.service';

const PORT = 3000;

const app = express();
app.use(bodyParser.json());

const airportService = new AirportService();
const flightService = new FlightService(airportService);

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

    const result = await flightService.searchForFlights(
      minTime,
      maxTime,
      maxDurationInHours,
      preferredCarrier
    );

    console.log('Result flights, ', result.length);
    res.status(201).send(JSON.stringify(result));
  } catch (e) {
    console.log('Error', e);
    res.status(500).send({ msg: 'Unknown error' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server started...`);

  //pre-cache (redis) airports data somehow to speed-up 1st requests
  await airportService.findAll();
});
