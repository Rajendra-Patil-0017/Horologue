require('dotenv').config();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// 1. Init Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '') : undefined;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const firebaseAuth = admin.auth();

// 2. Init Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = 'devil01101010@gmail.com';
const ADMIN_PASSWORD = 'Password123!';

async function run() {
  console.log(`Setting up admin user: ${ADMIN_EMAIL}`);
  let userRecord;
  try {
    userRecord = await firebaseAuth.getUserByEmail(ADMIN_EMAIL);
    console.log(`Found existing Firebase Auth user. UID: ${userRecord.uid}`);
    
    // Update password
    await firebaseAuth.updateUser(userRecord.uid, {
      password: ADMIN_PASSWORD
    });
    console.log(`Successfully updated Firebase Auth password to: ${ADMIN_PASSWORD}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log("Firebase Auth user not found. Creating user...");
      userRecord = await firebaseAuth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        emailVerified: true
      });
      console.log(`Successfully created Firebase Auth user. UID: ${userRecord.uid}`);
    } else {
      console.error("Error retrieving user from Firebase:", err);
      process.exit(1);
    }
  }

  // 3. Update Supabase Profile
  try {
    const { data: profile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userRecord.uid)
      .maybeSingle();

    if (selectError) {
      console.error("Error checking profile in Supabase:", selectError);
    } else if (profile) {
      console.log(`Found existing Supabase profile for ID: ${userRecord.uid}. Role: ${profile.role}`);
      if (profile.role !== 'admin') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', userRecord.uid);
        
        if (updateError) {
          console.error("Error updating profile role to admin:", updateError);
        } else {
          console.log("Successfully updated Supabase profile role to 'admin'");
        }
      } else {
        console.log("Supabase profile role is already 'admin'.");
      }
    } else {
      console.log(`No Supabase profile found for UID: ${userRecord.uid}. Creating profile...`);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userRecord.uid,
          email: ADMIN_EMAIL,
          full_name: 'Devil Admin',
          role: 'admin',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Error creating Supabase profile:", insertError);
      } else {
        console.log("Successfully created Supabase profile with 'admin' role.");
      }
    }
  } catch (err) {
    console.error("Exception handling Supabase profile:", err);
  }

  console.log("Admin setup complete!");
}

run();
