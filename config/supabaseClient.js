const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Supabase configuration missing!");
  console.error("Please set SUPABASE_URL and SUPABASE_KEY (service role key) in your .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
