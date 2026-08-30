import 'dotenv/config';
import { findFollowedChoirsEvents } from './src/services/event.service.js';

async function run() {
  try {
    const result = await findFollowedChoirsEvents(1);
    console.log('FILTERED EVENTS RETURNED FOR USER 1:', result);
  } catch (err) {
    console.error(err);
  }
}
run();
