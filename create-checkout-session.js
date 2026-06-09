// api/create-checkout-session.js
// Vercel Serverless Function — handles Stripe Checkout Session creation
// Deploy this entire folder to Vercel (free tier)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ⚠️  Your secret key goes in Vercel's Environment Variables as STRIPE_SECRET_KEY
// NEVER put it directly in this file — use the environment variable above.
// In Vercel dashboard → your project → Settings → Environment Variables → add:
// STRIPE_SECRET_KEY = sk_test_51TgGkuEOSke4ipM01988dAo1... (your full secret key)

module.exports = async (req, res) => {
  // Allow CORS from your site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    priceId,
    mode,
    customerEmail,
    customerName,
    successUrl,
    cancelUrl
  } = req.body;

  if (!priceId || !mode || !customerEmail || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { customerName: customerName || '', planType: mode }
    };

    // Add billing address collection for subscriptions
    if (mode === 'subscription') {
      sessionParams.billing_address_collection = 'auto';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
