import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/Leo/Documents/GitHub/Choral-Record-Backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function run() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log('ALL EVENTS IN SUPABASE:', data);
  }
}
run();
