// First, let's create a direct Clerk webhook handler to test
// pages/api/webhooks/clerk.js
import { Webhook } from 'svix';
import { connectDb } from '@/config/db';
import { User } from '@/models/User';

export default async function handler(req, res) {
  console.log("🔔 Clerk webhook received");
  console.log("📋 Headers:", req.headers);
  console.log("📦 Body:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the headers
  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Get the body
  const body = JSON.stringify(req.body);

  // Create a new Svix instance with your secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
    console.log('✅ Webhook verified successfully');
  } catch (err) {
    console.error('❌ Error verifying webhook:', err);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  console.log('📧 Event type:', evt.type);
  console.log('👤 Event data:', JSON.stringify(evt.data, null, 2));

  // Handle the webhook
  try {
    if (evt.type === 'user.created') {
      console.log('🆕 Handling user creation...');
      
      const { id, first_name, last_name, email_addresses, image_url } = evt.data;

      // Validate required data
      if (!id) {
        throw new Error('User ID is missing');
      }

      if (!email_addresses || !email_addresses[0]?.email_address) {
        throw new Error('User email is missing');
      }

      // Connect to database
      console.log('🔗 Connecting to database...');
      await connectDb();
      console.log('✅ Database connected');

      // Prepare user data
      const userData = {
        _id: id,
        name: `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User',
        email: email_addresses[0].email_address,
        imageUrl: image_url || '',
        cartItems: {},
      };

      console.log('👤 Creating user with data:', userData);

      // Check if user already exists
      const existingUser = await User.findById(id);
      if (existingUser) {
        console.log('⚠️ User already exists');
        return res.status(200).json({ success: true, message: 'User already exists' });
      }

      // Create user
      const newUser = await User.create(userData);
      console.log('🎉 User created successfully:', newUser._id);

      return res.status(200).json({ 
        success: true, 
        message: 'User created successfully',
        userId: newUser._id 
      });

    } else if (evt.type === 'user.updated') {
      console.log('🔄 Handling user update...');
      
      const { id, first_name, last_name, email_addresses, image_url } = evt.data;

      if (!id) {
        throw new Error('User ID is missing');
      }

      await connectDb();

      const userData = {
        name: `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User',
        email: email_addresses?.[0]?.email_address || '',
        imageUrl: image_url || '',
      };

      const result = await User.updateOne({ _id: id }, { $set: userData });
      console.log('✅ User updated:', result.modifiedCount);

      return res.status(200).json({ 
        success: true, 
        message: 'User updated successfully',
        modified: result.modifiedCount 
      });

    } else if (evt.type === 'user.deleted') {
      console.log('🗑️ Handling user deletion...');
      
      const { id } = evt.data;

      if (!id) {
        throw new Error('User ID is missing');
      }

      await connectDb();

      const result = await User.deleteOne({ _id: id });
      console.log('✅ User deleted:', result.deletedCount);

      return res.status(200).json({ 
        success: true, 
        message: 'User deleted successfully',
        deleted: result.deletedCount 
      });

    } else {
      console.log('ℹ️ Unhandled event type:', evt.type);
      return res.status(200).json({ success: true, message: 'Event received but not processed' });
    }

  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// API route configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// Alternative approach: Direct database save in your authentication flow
// Create this API route: pages/api/user/create.js
import { connectDb } from '@/config/db';
import { User } from '@/models/User';
import { auth } from '@clerk/nextjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = auth();
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email, imageUrl } = req.body;

    console.log('🆕 Creating user:', { userId, name, email });

    await connectDb();

    // Check if user already exists
    const existingUser = await User.findById(userId);
    if (existingUser) {
      return res.status(200).json({ 
        success: true, 
        message: 'User already exists',
        user: existingUser 
      });
    }

    // Create new user
    const userData = {
      _id: userId,
      name: name || 'Unknown User',
      email: email,
      imageUrl: imageUrl || '',
      cartItems: {},
    };

    const newUser = await User.create(userData);
    console.log('✅ User created successfully');

    return res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      user: newUser 
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Update your AppContext to manually create user if webhook fails
// Add this function to your context or create a utility file
// utils/createUser.js
import { useUser } from '@clerk/nextjs';

export const useEnsureUserInDB = () => {
  const { user, isLoaded } = useUser();

  const ensureUserExists = async () => {
    if (!isLoaded || !user) return;

    try {
      const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.primaryEmailAddress?.emailAddress,
          imageUrl: user.imageUrl,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ User ensured in database');
      } else {
        console.error('❌ Failed to ensure user in database:', data.error);
      }
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
    }
  };

  return { ensureUserExists };
};

// Updated AppContext.js (add this to your existing context)
// In your AppContext.js, add this useEffect:
/*
import { useEnsureUserInDB } from '@/utils/createUser';

// Inside your AppContext component:
const { ensureUserExists } = useEnsureUserInDB();

useEffect(() => {
  if (user && isLoaded) {
    // Ensure user exists in database when they sign in
    ensureUserExists();
  }
}, [user, isLoaded]);
*/

// Test webhook endpoint - pages/api/test-webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simulate a Clerk webhook
    const testWebhookPayload = {
      type: 'user.created',
      data: {
        id: 'test_user_' + Date.now(),
        first_name: 'Test',
        last_name: 'User',
        email_addresses: [
          {
            email_address: 'test@example.com'
          }
        ],
        image_url: 'https://example.com/avatar.jpg'
      }
    };

    console.log('🧪 Testing webhook with payload:', testWebhookPayload);

    // Send to your webhook handler
    const webhookResponse = await fetch(`${req.headers.origin}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Skip signature verification for testing
      },
      body: JSON.stringify(testWebhookPayload),
    });

    const result = await webhookResponse.json();
    console.log('📊 Webhook test result:', result);

    res.json({
      success: true,
      message: 'Webhook test completed',
      result
    });

  } catch (error) {
    console.error('❌ Webhook test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}