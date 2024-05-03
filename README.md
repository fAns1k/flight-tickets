# WhereTo - Flight Test Project

WhereTo is a simple Node.js project using Express to fetch flight information from a CSV file and filter the flights based on specific criteria such as minimum departure time, maximum departure time, and maximum flight duration. The results are returned as a sorted list.

### Installation

Follow these steps to get your development environment running:

1. Clone the repository:
   ```bash
   git clone https://github.com/fAns1k/flight-tickets.git
   cd whereto
   ```

### Usage

Request a flight list with `body: { minDepartureTime, maxDepartureTime, maxDuration, preferredCarrier }`
