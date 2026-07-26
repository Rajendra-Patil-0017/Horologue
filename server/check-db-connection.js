require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Service Key Length:", supabaseKey ? supabaseKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error("Error fetching profiles:", error);
    } else {
      console.log("Profiles in Database:");
      profiles.forEach(p => console.log(`ID: ${p.id}, Email: ${p.email}, Name: ${p.full_name}, Role: ${p.role}`));
    }
  } catch (err) {
    console.error("Exception fetching profiles:", err);
  }
}

testConnection();
